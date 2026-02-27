import json
import os
from collections.abc import Mapping
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    import mysql.connector
except ImportError:
    mysql = None

ROOT_DIR = Path(__file__).resolve().parent
SCHEMA_PATH = ROOT_DIR / "schema.sql"
HOST = "127.0.0.1"
PORT = 8000
DB_ENGINE = (os.getenv("DB_CONNECTION") or "mysql").strip().lower()

MYSQL_HOST = os.getenv("MYSQL_HOST") or os.getenv("DB_HOST") or "127.0.0.1"
MYSQL_PORT = int(os.getenv("MYSQL_PORT") or os.getenv("DB_PORT") or "3306")
MYSQL_USER = os.getenv("MYSQL_USER") or os.getenv("DB_USERNAME") or "root"
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD") or os.getenv("DB_PASSWORD") or ""
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE") or os.getenv("DB_DATABASE") or "simplerfid"


def get_connection():
    if DB_ENGINE != "mysql":
        raise RuntimeError("Only MySQL is supported. Set DB_CONNECTION=mysql.")

    if mysql is None:
        raise RuntimeError(
            "MySQL driver not installed. Run: pip install mysql-connector-python"
        )

    conn = mysql.connector.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        use_pure=True,
        autocommit=False,
    )
    return conn


def to_driver_query(query: str) -> str:
    return query.replace("?", "%s")


def to_plain_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    if isinstance(row, Mapping):
        return {str(key): value for key, value in row.items()}

    return {}


def safe_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def fetchone_dict(conn, query: str, params=()) -> dict[str, Any] | None:
    cur = conn.cursor(dictionary=True)
    cur.execute(to_driver_query(query), params)
    row = cur.fetchone()
    cur.close()
    if row is None:
        return None
    return to_plain_dict(row)


def fetchall_dicts(conn, query: str, params=()) -> list[dict[str, Any]]:
    cur = conn.cursor(dictionary=True)
    cur.execute(to_driver_query(query), params)
    rows = cur.fetchall()
    cur.close()
    return [to_plain_dict(row) for row in rows]


def execute_write(conn, query: str, params=()) -> int:
    cur = conn.cursor()
    cur.execute(to_driver_query(query), params)
    last_id = cur.lastrowid
    cur.close()
    return int(last_id or 0)


def init_db() -> None:
    print(f"Using MySQL database: {MYSQL_DATABASE}@{MYSQL_HOST}:{MYSQL_PORT}")
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn = get_connection()
    try:
        cur = conn.cursor()
        for statement in [part.strip() for part in schema_sql.split(";") if part.strip()]:
            cur.execute(statement)
        conn.commit()
        cur.close()
    finally:
        conn.close()


def normalize_uid(raw_uid: str) -> str:
    uid = (raw_uid or "").strip().upper()
    if not uid:
        return ""
    uid = " ".join(uid.split())
    if len(uid) > 64:
        return ""
    return uid


def normalize_text(raw_value: str, default: str, max_len: int = 120) -> str:
    value = (raw_value or "").strip()
    if not value:
        value = default
    if len(value) > max_len:
        return value[:max_len]
    return value


class RFIDRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/scans":
            self._send_json(404, {"error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        uid = normalize_uid(data.get("uid"))
        if not uid:
            self._send_json(400, {"error": "uid is required"})
            return

        scanned_at = normalize_text(
            data.get("scanned_at"),
            datetime.now(timezone.utc).isoformat(),
            max_len=40,
        )
        source = normalize_text(data.get("source"), "web-serial", max_len=40)
        target_field_raw = data.get("target_field")
        target_field = None
        if target_field_raw is not None:
            target_field = normalize_text(str(target_field_raw), "", max_len=80)

        conn = get_connection()
        try:
            existing = fetchone_dict(
                conn,
                "SELECT id, total_scans FROM rfid_cards WHERE uid = ?",
                (uid,),
            )

            if existing:
                card_id = safe_int(existing.get("id"))
                execute_write(
                    conn,
                    "UPDATE rfid_cards SET last_seen_at = ?, total_scans = total_scans + 1 WHERE id = ?",
                    (scanned_at, card_id),
                )
            else:
                card_id = execute_write(
                    conn,
                    "INSERT INTO rfid_cards(uid, first_seen_at, last_seen_at, total_scans) VALUES(?, ?, ?, 1)",
                    (uid, scanned_at, scanned_at),
                )

            event_id = execute_write(
                conn,
                "INSERT INTO scan_events(card_id, scanned_at, source, target_field) VALUES(?, ?, ?, ?)",
                (card_id, scanned_at, source, target_field),
            )
            conn.commit()
        finally:
            conn.close()

        self._send_json(
            201,
            {
                "ok": True,
                "event_id": event_id,
                "uid": uid,
            },
        )

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/scans":
            conn = get_connection()
            try:
                rows = fetchall_dicts(
                    conn,
                    """
                    SELECT
                        se.id,
                        c.uid,
                        se.scanned_at,
                        se.source,
                        se.target_field
                    FROM scan_events se
                    JOIN rfid_cards c ON c.id = se.card_id
                    ORDER BY se.id DESC
                    LIMIT 100
                    """,
                )
            finally:
                conn.close()

            payload = {
                "items": rows,
                "count": len(rows),
            }
            self._send_json(200, payload)
            return

        if parsed.path == "/api/cards":
            conn = get_connection()
            try:
                rows = fetchall_dicts(
                    conn,
                    """
                    SELECT uid, first_seen_at, last_seen_at, total_scans
                    FROM rfid_cards
                    ORDER BY last_seen_at DESC
                    LIMIT 100
                    """,
                )
            finally:
                conn.close()

            payload = {
                "items": rows,
                "count": len(rows),
            }
            self._send_json(200, payload)
            return

        if parsed.path == "/api/safety/db":
            conn = get_connection()
            try:
                fk_enabled_row = fetchone_dict(conn, "SELECT @@FOREIGN_KEY_CHECKS AS fk_enabled")
                orphan_row = fetchone_dict(
                    conn,
                    """
                    SELECT COUNT(*) AS orphan_events
                    FROM scan_events se
                    LEFT JOIN rfid_cards rc ON rc.id = se.card_id
                    WHERE rc.id IS NULL
                    """,
                )
                duplicate_uid_rows = fetchall_dicts(
                    conn,
                    """
                    SELECT uid, COUNT(*) AS dup_count
                    FROM rfid_cards
                    GROUP BY uid
                    HAVING COUNT(*) > 1
                    """,
                )

                fk_enabled = safe_int((fk_enabled_row or {}).get("fk_enabled"), 0) == 1
                orphan_events = safe_int((orphan_row or {}).get("orphan_events"), 0)

                payload = {
                    "engine": "mysql",
                    "foreign_keys_enabled": fk_enabled,
                    "orphan_events": orphan_events,
                    "duplicate_uids": duplicate_uid_rows,
                    "is_safe": fk_enabled and orphan_events == 0 and len(duplicate_uid_rows) == 0,
                }
            finally:
                conn.close()

            self._send_json(200, payload)
            return

        return super().do_GET()


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), RFIDRequestHandler)
    print(f"RFID test server running at http://{HOST}:{PORT}")
    print(f"Database engine: {DB_ENGINE}")
    print("Open http://127.0.0.1:8000/index.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

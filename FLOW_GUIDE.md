# SimpleRFID Flow Guide

## 1) End-to-End Flow

1. Arduino scans RFID tag and writes to serial in this format:
   - `Tag Detected! ID: AA BB CC DD`
2. Browser app (`index.html` + `app.js`) opens the serial port via Web Serial.
3. `app.js` parses the UID, updates UI, autofills focused input field, then clears that field for next scan.
4. Frontend posts scan payload to API:
   - `POST /api/scans`
5. Backend writes/updates:
   - upsert card in `rfid_cards`
   - insert event row in `scan_events`
6. UI can pull history via:
   - `GET /api/scans`
   - `GET /api/cards`

---

## 2) Database Safety Rules

Use these every time:

- Ensure MySQL foreign key checks remain enabled (`@@FOREIGN_KEY_CHECKS = 1`).
- Keep `uid` unique and non-empty.
- Treat `scan_events` as append-only log.
- Prefer soft deactivate (`is_active=0`) over deleting reference data.
- Use transactions when doing multi-table writes (card + event).
- Run integrity checks periodically:
   - orphan FK check query
   - duplicate UID check query

---

## 3) Schema Extension Policy (Add New Stuff Safely)

### New column

1. Add nullable/default-safe column.
2. Backfill if required.
3. Add index only after confirming query need.

### New table

1. Create table with strict PK/FK first.
2. Add checks/defaults that represent real domain rules.
3. Add minimal indexes, then benchmark.

### Breaking changes

1. Create versioned table (`*_v2`).
2. Copy data with `INSERT INTO ... SELECT ...`.
3. Switch reads/writes in code.
4. Validate row counts and checksums.
5. Retire old table later (not immediately).

---

## 4) MySQL Setup Checklist

1. Create DB and user privileges.
2. Apply `schema.sql` (MySQL 8+).
3. Set app env:
   - `DB_CONNECTION=mysql`
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
4. Start backend and confirm `/api/health` and `/api/safety/db`.
5. Smoke-test scan flow end to end.

---

## 5) Backend Safety Query Examples

### MySQL checks

```sql
SELECT COUNT(*) AS orphan_events
FROM scan_events se
LEFT JOIN rfid_cards rc ON rc.id = se.card_id
WHERE rc.id IS NULL;

SELECT COUNT(*) AS duplicate_uids
FROM rfid_cards
GROUP BY uid
HAVING COUNT(*) > 1;
```

### Basic health query

```sql
SELECT 1;
```

---

## 6) Operational Notes

- Keep API writes idempotent where possible.
- Log rejected/invalid scans using `scan_status='error'` and `error_message`.
- Avoid deleting cards with history unless policy requires it.
- For high volume, partition/archive `scan_events` by date.

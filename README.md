# SimpleRFID

A minimal RFID tag reader that pairs an **Arduino + MFRC522** module with a **browser-based Web Serial UI**. Scan RFID tags and instantly see their UIDs in a sleek, dark-themed dashboard — no server or extra software required.

![Arduino](https://img.shields.io/badge/Arduino-UNO%2FNano-00979D?logo=arduino&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Plug & Play** — Connect your Arduino via USB, click "Connect" in the browser, and start scanning.
- **Live Tag Display** — Each scanned tag appears instantly with its UID, scan count, and last-seen timestamp.
- **Duplicate Detection** — Recognises previously scanned tags and increments their count.
- **No Backend** — Runs entirely in the browser using the [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API).
- **Dark UI** — Clean, responsive interface with status indicators and animations.
- **Focused Input Autofill** — If your cursor is inside a form field, the scanned RFID UID is inserted at that cursor position.
- **MySQL Backend** — API persists scans to MySQL for production-ready workflow.

## Hardware Requirements

| Component                 | Notes                        |
| ------------------------- | ---------------------------- |
| Arduino (Uno, Nano, etc.) | Any board with SPI support   |
| MFRC522 RFID module       | 13.56 MHz reader             |
| RFID tags / cards         | Mifare Classic or compatible |
| USB cable                 | To connect Arduino to PC     |

### Wiring (Arduino Uno / Nano)

| MFRC522 Pin | Arduino Pin |
| ----------- | ----------- |
| SDA (SS)    | 10          |
| SCK         | 13          |
| MOSI        | 11          |
| MISO        | 12          |
| RST         | 9           |
| 3.3V        | 3.3V        |
| GND         | GND         |

## Getting Started

### 1. Flash the Arduino

1. Install the **MFRC522** library in the Arduino IDE (Library Manager → search "MFRC522").
2. Open `SimpleRFID.ino` and upload it to your board.
3. Open the Serial Monitor at **9600 baud** to verify tags are being read.

### 2. Launch with MySQL Backend

Create your MySQL DB first, then run the local server (serves UI + stores scans in MySQL):

Install driver:

```
pip install mysql-connector-python
```

Set environment variables (PowerShell):

```
$env:DB_CONNECTION="mysql"
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_DATABASE="local_mis"
$env:DB_USERNAME="root"
$env:DB_PASSWORD=""
python server.py
```

Then open:

```
http://127.0.0.1:8000/index.html

access via & .\.venv\Scripts\Activate.ps1; python --version; python server.py
```

`schema.sql` now targets MySQL 8+.

### 3. Connect & Scan

1. Click **Connect to Reader**.
2. Select your Arduino's COM port from the browser prompt.
3. Hold an RFID tag near the reader — its UID will appear in the dashboard.

### 4. Test Autofill Behavior

1. Click inside any editable input/textarea in the **Form Autofill Test** panel.
2. Scan an RFID card.
3. The UID is inserted into the focused field at the cursor location.

## Project Structure

```
SimpleRFID/
├── SimpleRFID.ino   # Arduino firmware (MFRC522 reader → Serial output)
├── index.html       # Web UI entry point
├── app.js           # Web Serial logic, tag parsing & rendering
├── styles.css       # Dark-themed responsive styles
├── server.py        # Local HTTP + API server for MySQL
├── schema.sql       # MySQL schema for cards and scan events
├── laravel-ready/   # Copy-ready Laravel models/controllers/migrations/routes
└── rfid-svgrepo-com.svg  # Favicon
```

## Laravel Handoff

Use files inside `laravel-ready/` to port this project into Laravel quickly.
See `laravel-ready/README.md` for the exact copy order and commands.

## Browser Compatibility

The Web Serial API is supported in:

- Google Chrome 89+
- Microsoft Edge 89+
- Opera 75+

Firefox and Safari do **not** currently support Web Serial.

## License

MIT

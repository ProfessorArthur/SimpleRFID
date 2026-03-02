# SimpleRFID

A minimal RFID tag reader that pairs an **Arduino + MFRC522** module with a **browser-based Web Serial UI** and a **Laravel + MySQL API** backend.

![Arduino](https://img.shields.io/badge/Arduino-UNO%2FNano-00979D?logo=arduino&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Plug & Play** — Connect your Arduino via USB, click "Connect" in the browser, and start scanning.
- **Live Tag Display** — Each scanned tag appears instantly with its UID, scan count, and last-seen timestamp.
- **Duplicate Detection** — Recognises previously scanned tags and increments their count.
- **Dark UI** — Clean, responsive interface with status indicators and animations.
- **Focused Input Autofill** — If your cursor is inside a form field, the scanned RFID UID is inserted at that cursor position.
- **Laravel + MySQL Backend** — API persists scans to MySQL for production-ready workflow.

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

### 2. Launch Laravel + MySQL Backend

Create your MySQL DB first, then run the Laravel app:

```
php artisan migrate
php artisan serve
```

Then open:

```
http://127.0.0.1:8000/rfid-demo/index.html
```

The frontend posts to same-origin Laravel API (`/api/scans`, `/api/cards`, `/api/safety/db`).

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
├── app/              # Laravel application code
├── public/           # Hosted assets and RFID demo page
├── routes/           # API and web route definitions
├── database/         # Laravel migrations and DB setup
├── schema.sql        # Extended MySQL schema reference
├── SimpleRFID.ino    # Arduino firmware (MFRC522 reader → Serial output)
└── SimpleRFID_V2.ino # Alternative Arduino sketch
```

## Laravel Runtime Notes

- Hosted UI path: `public/rfid-demo/index.html`
- API routes: `routes/api.php`
- Main RFID controller: `app/Http/Controllers/Api/ScanController.php`

## Browser Compatibility

The Web Serial API is supported in:

- Google Chrome 89+
- Microsoft Edge 89+
- Opera 75+

Firefox and Safari do **not** currently support Web Serial.

## License

MIT

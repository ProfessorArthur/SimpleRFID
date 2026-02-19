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

### 2. Launch the Web UI

Open `index.html` in a browser that supports Web Serial (Chrome, Edge, or Opera):

```
# Easiest way — just double-click index.html, or:
start index.html
```

> **Note:** Web Serial requires a secure context. Opening the file directly (`file://`) works in Chrome. Alternatively, serve it over localhost.

### 3. Connect & Scan

1. Click **Connect to Reader**.
2. Select your Arduino's COM port from the browser prompt.
3. Hold an RFID tag near the reader — its UID will appear in the dashboard.

## Project Structure

```
SimpleRFID/
├── SimpleRFID.ino   # Arduino firmware (MFRC522 reader → Serial output)
├── index.html       # Web UI entry point
├── app.js           # Web Serial logic, tag parsing & rendering
├── styles.css       # Dark-themed responsive styles
└── rfid-svgrepo-com.svg  # Favicon
```

## Browser Compatibility

The Web Serial API is supported in:

- Google Chrome 89+
- Microsoft Edge 89+
- Opera 75+

Firefox and Safari do **not** currently support Web Serial.

## License

MIT

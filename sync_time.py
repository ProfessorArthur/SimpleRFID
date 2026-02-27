"""
Auto Time Sync for Arduino RFID System
---------------------------------------
This script automatically sends the current PC timestamp to the Arduino
when it starts up (or resets), so you never have to type T<epoch> manually.

Usage:
    python sync_time.py
    python sync_time.py COM5          (specify port)
    python sync_time.py COM5 9600     (specify port and baud)

Requirements:
    pip install pyserial

The script will:
  1. Open the serial port
  2. Wait for the Arduino's "SYNC_REQUEST" message
  3. Send T<epoch> with your PC's current time
  4. Continue displaying all serial output (log viewer)

Press Ctrl+C to exit.
"""

"""python Documents/SimpleRFID/sync_time.py on CMD"""

import serial
import sys
import time

# --- Configuration ---
DEFAULT_PORT = "COM5"      # Change to your Arduino's COM port
DEFAULT_BAUD = 9600

def main():
    port = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PORT
    baud = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_BAUD
    synced = False
    ser = None

    print(f"Connecting to {port} at {baud} baud...")
    print("Press Ctrl+C to exit.\n")

    try:
        ser = serial.Serial(port, baud, timeout=1)
        time.sleep(2)  # Wait for Arduino to reset after serial connection

        while True:
            if ser.in_waiting:
                line = ser.readline().decode("utf-8", errors="replace").strip()
                print(line)

                # Auto-sync when Arduino requests it
                if "SYNC_REQUEST" in line and not synced:
                    epoch = int(time.time())
                    sync_cmd = f"T{epoch}"
                    ser.write(sync_cmd.encode())
                    print(f">>> Sent: {sync_cmd}  (auto-synced PC time)")
                    synced = True

            time.sleep(0.01)

    except serial.SerialException as e:
        print(f"Serial error: {e}")
        print(f"Make sure {port} is correct and not in use by Serial Monitor.")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nExiting...")
    finally:
        if ser and ser.is_open:
            ser.close()

if __name__ == "__main__":
    main()

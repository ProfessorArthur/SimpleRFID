#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <TimeLib.h>

#define RST_PIN 9
#define SS_PIN 10
#define GREEN_PIN 2
#define RED_PIN 3
#define BUZZER_PIN 4

MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

struct User {
    byte uid[4];
    String name;
    bool isInside;
    bool active;  // Whether this slot is in use
};

#define MAX_USERS 20
User users[MAX_USERS];
int userCount = 0;

// Pool of random names for auto-registration
const char* randomNames[] = {
    "Alex Rivera", "Sam Chen", "Jordan Lee",
    "Casey Morgan", "Riley Patel", "Avery Kim",
    "Quinn Torres", "Sage Johnson", "Drew Santos",
    "Blake Carter", "Reese Nakamura", "Rowan Ellis",
    "Finley Ortiz", "Skyler Huang", "Dakota Ruiz",
    "Emery Walsh", "Lennox Park", "Harley Diaz",
    "Phoenix Grant", "Marlowe Vega"
};
const int NAME_COUNT = 20;

void addPresetUser(byte b0, byte b1, byte b2, byte b3, const char* name) {
    if (userCount >= MAX_USERS) return;
    users[userCount].uid[0] = b0;
    users[userCount].uid[1] = b1;
    users[userCount].uid[2] = b2;
    users[userCount].uid[3] = b3;
    users[userCount].name = name;
    users[userCount].isInside = false;
    users[userCount].active = true;
    userCount++;
}

// Find user by UID, returns index or -1
int findUser(byte* uid) {
    for (int i = 0; i < userCount; i++) {
        if (users[i].active && memcmp(uid, users[i].uid, 4) == 0) {
            return i;
        }
    }
    return -1;
}

// Register a new card with a random name
int registerNewUser(byte* uid) {
    if (userCount >= MAX_USERS) return -1;
    int idx = userCount;
    memcpy(users[idx].uid, uid, 4);
    users[idx].name = randomNames[random(NAME_COUNT)];
    users[idx].isInside = false;
    users[idx].active = true;
    userCount++;

    Serial.print("New card registered as: ");
    Serial.println(users[idx].name);
    return idx;
}

// Sync time from Serial: send Unix timestamp as "T<epoch>" (e.g. T1740000000)
void processSyncMessage() {
    if (Serial.available()) {
        char c = Serial.peek();
        if (c == 'T') {
            Serial.read();  // consume 'T'
            unsigned long pctime = Serial.parseInt();
            if (pctime >= 1000000000UL) {  // reasonable epoch value
                setTime(pctime);
                Serial.print("Time synced: ");
                Serial.print(getTimeString());
                Serial.print(" ");
                Serial.println(getDateString());
            }
        }
    }
}

// Format time as HH:MM:SS
String getTimeString() {
    char buf[9];
    sprintf(buf, "%02d:%02d:%02d", hour(), minute(), second());
    return String(buf);
}

// Format date as MM/DD/YYYY
String getDateString() {
    char buf[11];
    sprintf(buf, "%02d/%02d/%04d", month(), day(), year());
    return String(buf);
}

void setup() {
    pinMode(GREEN_PIN, OUTPUT);
    pinMode(RED_PIN, OUTPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(LED_BUILTIN, OUTPUT);
    Serial.begin(9600);
    randomSeed(analogRead(A0));  // Seed RNG from floating analog pin
    SPI.begin();
    mfrc522.PCD_Init();
    lcd.init();
    lcd.backlight();

    // Pre-register known users
    addPresetUser(0xB0, 0x6A, 0x0F, 0x32, "Janin Bihag");
    addPresetUser(0x63, 0xC9, 0x13, 0xB3, "Carla Jay Millang");
    addPresetUser(0x15, 0x3d, 0x40, 0x8b, "Evan Bonso");

    lcd.setCursor(0, 0);
    lcd.print("Scan Your Card");

    // ✅ Tell PLX-DAQ to clear old data and set headers
    Serial.println("CLEARDATA");
    Serial.println("LABEL,UID,Name,Status,Time,Date");

    Serial.println("System Active. Scan your tag...");
    Serial.println("SYNC_REQUEST");  // Signal for auto-sync script
}

void loop() {
    processSyncMessage();  // Check for time sync from Serial

    // Heartbeat: quick flicker on built-in LED to show Arduino is alive
    // Blocking approach — finishes before SPI uses pin 13
    digitalWrite(LED_BUILTIN, HIGH);
    delay(50);
    digitalWrite(LED_BUILTIN, LOW);
    delay(450);

    if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

    String uidString = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) uidString += "0";  // Zero-pad single hex digits
        uidString += String(mfrc522.uid.uidByte[i], HEX);
    }
    uidString.toUpperCase();

    // Tag detected — print UID to Serial
    Serial.print("Tag Detected! ID:");
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " ");
        Serial.print(mfrc522.uid.uidByte[i], HEX);
    }
    Serial.println();

    // Find existing user or auto-register with random name
    int userIdx = findUser(mfrc522.uid.uidByte);
    if (userIdx == -1) {
        userIdx = registerNewUser(mfrc522.uid.uidByte);
    }

    if (userIdx == -1) {
        // Registry full
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Registry Full!");
        lcd.setCursor(0, 1);
        lcd.print("Max "); lcd.print(MAX_USERS); lcd.print(" cards");

        digitalWrite(RED_PIN, HIGH);
        tone(BUZZER_PIN, 1500, 1000);
        delay(1000);
        noTone(BUZZER_PIN);
        digitalWrite(RED_PIN, LOW);
    } else {
        User &user = users[userIdx];
        String status;

        if (!user.isInside) {  // ✅ First scan (Check-in)
            user.isInside = true;
            status = "Checked In";

            lcd.clear();
            lcd.setCursor(0, 0);
            lcd.print("Welcome,");
            lcd.setCursor(0, 1);
            lcd.print(user.name.substring(0, 16));

            digitalWrite(GREEN_PIN, HIGH);
            tone(BUZZER_PIN, 1000, 500);
            delay(500);
            noTone(BUZZER_PIN);
            delay(1500);
            digitalWrite(GREEN_PIN, LOW);

        } else {  // ✅ Second scan (Check-out)
            user.isInside = false;
            status = "Checked Out";

            lcd.clear();
            lcd.setCursor(0, 0);
            lcd.print("Goodbye,");
            lcd.setCursor(0, 1);
            lcd.print(user.name.substring(0, 16));

            digitalWrite(GREEN_PIN, HIGH);
            tone(BUZZER_PIN, 500, 500);
            delay(500);
            noTone(BUZZER_PIN);
            delay(1500);
            digitalWrite(GREEN_PIN, LOW);
        }

        // ✅ Send properly formatted row to PLX-DAQ
        Serial.print("DATA,");
        Serial.print(uidString); Serial.print(",");
        Serial.print(user.name); Serial.print(",");
        Serial.print(status); Serial.print(",");
        Serial.print(getTimeString()); Serial.print(",");
        Serial.println(getDateString());
    }

    delay(2000);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Scan Your Card");

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();  // Properly stop encrypted communication
}

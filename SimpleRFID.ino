#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9
#define BUZZER_PIN 6

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();
  
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  tone(BUZZER_PIN, 1200, 120);
  delay(130);
  noTone(BUZZER_PIN);
  Serial.println("System Active. Scan your tag...");
}

void loop() {
  // Heartbeat: Quick flicker to show the Arduino is alive
  digitalWrite(LED_BUILTIN, HIGH);
  delay(50);
  digitalWrite(LED_BUILTIN, LOW);
  delay(450);

  // Look for new cards
  if ( ! rfid.PICC_IsNewCardPresent()) {
    return;
  }

  // Verify if the UID has been read
  if ( ! rfid.PICC_ReadCardSerial()) {
    return;
  }

  // SUCCESS: Solid light for 2 seconds and print to Serial
  digitalWrite(LED_BUILTIN, HIGH);
  tone(BUZZER_PIN, 1600, 120);
  Serial.print("Tag Detected! ID:");
  
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(rfid.uid.uidByte[i], HEX);
  }
  
  Serial.println();
  noTone(BUZZER_PIN);
  delay(2000); // Keep LED on so you can see the success
  digitalWrite(LED_BUILTIN, LOW);
  
  rfid.PICC_HaltA(); // Stop reading the same card
}
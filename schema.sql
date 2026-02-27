-- =============================================================================
-- SIMPLE RFID: EXTENSIBLE MYSQL SCHEMA
-- =============================================================================
-- Notes:
-- 1) Run this on MySQL 8+.
-- 2) Use InnoDB engine for FK support.
-- 3) Existing installations are not auto-altered by CREATE TABLE IF NOT EXISTS.
--    Add explicit ALTER TABLE migration scripts when evolving.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Optional dimension table for physical scan locations.
-- Add rows when you deploy more than one station/room.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfid_locations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rfid_locations_code (code)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Device registry: each reader/browser/terminal can have a logical device row.
-- source_key can map to COM port tag, browser instance ID, kiosk name, etc.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfid_devices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    source_key VARCHAR(120) NOT NULL,
    display_name VARCHAR(120) NULL,
    location_id BIGINT UNSIGNED NULL,
    firmware_version VARCHAR(64) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rfid_devices_source_key (source_key),
    KEY idx_rfid_devices_location_id (location_id),
    KEY idx_rfid_devices_is_active (is_active),
    CONSTRAINT fk_rfid_devices_location
        FOREIGN KEY (location_id) REFERENCES rfid_locations(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Core card table (kept compatible with existing app/server code).
-- Extension columns (label/notes/is_active) are optional metadata.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfid_cards (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uid VARCHAR(64) NOT NULL,
    first_seen_at DATETIME NOT NULL,
    last_seen_at DATETIME NOT NULL,
    total_scans INT UNSIGNED NOT NULL DEFAULT 1,
    label VARCHAR(120) NULL,
    notes TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rfid_cards_uid (uid),
    KEY idx_rfid_cards_last_seen_at (last_seen_at),
    KEY idx_rfid_cards_is_active (is_active)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Event log table for each scan action.
-- Keep card_id FK strict to ensure referential integrity.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    card_id BIGINT UNSIGNED NOT NULL,
    scanned_at DATETIME NOT NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'web-serial',
    target_field VARCHAR(120) NULL,
    device_id BIGINT UNSIGNED NULL,
    scan_status VARCHAR(20) NOT NULL DEFAULT 'accepted',
    error_message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_scan_events_card_id (card_id),
    KEY idx_scan_events_scanned_at (scanned_at),
    KEY idx_scan_events_source (source),
    KEY idx_scan_events_device_id (device_id),
    KEY idx_scan_events_status (scan_status),
    CONSTRAINT fk_scan_events_card
        FOREIGN KEY (card_id) REFERENCES rfid_cards(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_scan_events_device
        FOREIGN KEY (device_id) REFERENCES rfid_devices(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Optional key-value settings table for feature flags/config values.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(120) NOT NULL,
    setting_value TEXT NULL,
    description VARCHAR(255) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Optional audit trail for admin/config or security-sensitive changes.
-- actor_type: system | user | api | job
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'system',
    actor_id VARCHAR(120) NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(120) NULL,
    entity_id VARCHAR(120) NULL,
    payload_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_logs_created_at (created_at),
    KEY idx_audit_logs_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- =============================================================================
-- DATA INTEGRITY CHECKS (manual use during troubleshooting)
-- =============================================================================
-- SELECT @@FOREIGN_KEY_CHECKS;
-- SELECT COUNT(*) AS orphan_events
-- FROM scan_events se LEFT JOIN rfid_cards rc ON rc.id = se.card_id
-- WHERE rc.id IS NULL;

-- =============================================================================
-- HOW TO SAFELY ADD NEW STUFF (mini checklist)
-- =============================================================================
-- A) New column:
--    1. ALTER TABLE ... ADD COLUMN ... NULL/DEFAULT-safe
--    2. Backfill values if needed
--    3. Add index only if query plans need it
--
-- B) New table:
--    1. Create table with PK + FK rules first
--    2. Add constraints/checks close to data domain
--    3. Add minimal indexes, benchmark, then add more
--
-- C) Breaking changes:
--    1. Create new table version (e.g., scan_events_v2)
--    2. Copy data with INSERT INTO ... SELECT ...
--    3. Swap readers/writers in app code
--    4. Archive/drop old table only after validation

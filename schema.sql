-- =============================================================================
-- ENHANCED RFID SYSTEM: MYSQL SCHEMA (v2.0)
-- =============================================================================

-- 1. USERS: The owners of the cards and system operators.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_verified_at DATETIME NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    role ENUM('admin', 'user', 'viewer') DEFAULT 'user',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- 2. SESSIONS: Web-based session tracking.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(191) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    payload LONGTEXT NOT NULL,
    last_activity INT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_sessions_user_id (user_id),
    KEY idx_sessions_last_activity (last_activity),
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. LOCATIONS: Physical checkpoints (Gates, Rooms, Desks).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfid_locations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rfid_locations_code (code)
) ENGINE=InnoDB;

-- 4. DEVICES: Hardware readers assigned to locations.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfid_devices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    source_key VARCHAR(120) NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_rfid_devices_location
        FOREIGN KEY (location_id) REFERENCES rfid_locations(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. CARDS: The RFID tags, now linked to Users.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfid_cards (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL COMMENT 'Owner of the card',
    uid VARCHAR(64) NOT NULL COMMENT 'Hardware ID',
    label VARCHAR(120) NULL,
    status ENUM('active', 'inactive', 'lost', 'pending') DEFAULT 'pending',
    total_scans INT UNSIGNED NOT NULL DEFAULT 0,
    last_seen_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rfid_cards_uid (uid),
    KEY idx_rfid_cards_user_id (user_id),
    CONSTRAINT fk_rfid_cards_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. SCAN EVENTS: The audit log of every tap.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    card_id BIGINT UNSIGNED NOT NULL,
    device_id BIGINT UNSIGNED NULL,
    scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    access_result ENUM('granted', 'denied', 'new_card') NOT NULL DEFAULT 'granted',
    error_message VARCHAR(255) NULL,
    PRIMARY KEY (id),
    KEY idx_scan_events_card_id (card_id),
    KEY idx_scan_events_scanned_at (scanned_at),
    CONSTRAINT fk_scan_events_card
        FOREIGN KEY (card_id) REFERENCES rfid_cards(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_scan_events_device
        FOREIGN KEY (device_id) REFERENCES rfid_devices(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
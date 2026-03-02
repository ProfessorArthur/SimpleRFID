# SimpleRFID

![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

SimpleRFID is a Laravel-based RFID scan logging app. It records RFID card scans, tracks card activity, and exposes simple JSON APIs for scan and card history.

## Stack

- PHP 8.4
- Laravel 12
- MySQL (recommended)
- Vite + Tailwind CSS (frontend tooling)

## Quick Start

### 1) Install dependencies

```bash
composer install
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
php artisan key:generate
```

Set your DB connection in `.env` (host, database, username, password).

### 3) Run migrations

```bash
php artisan migrate
```

### 4) Run in development

```bash
composer run dev
```

This starts Laravel, queue listener, logs, and Vite concurrently.

## API Endpoints

Base URL: `http://127.0.0.1:8000/api`

- `GET /health` - Database connectivity check
- `POST /scans` - Store a scan event
- `GET /scans` - Latest scan events (up to 100)
- `GET /cards` - Latest cards by activity (up to 100)
- `GET /safety/db` - FK + orphan + duplicate UID safety checks

### Example: Create scan

```http
POST /api/scans
Content-Type: application/json

{
  "uid": "04AABBCCDD",
  "scanned_at": "2026-03-02T12:34:56Z",
  "source": "web-serial",
  "target_field": "rfid_input"
}
```

## Data Model (Core)

- `rfid_cards` (unique `uid`, first/last seen timestamps, total scans)
- `scan_events` (references `rfid_cards.id`, scan timestamp, source, target field)
- `users`, `sessions`, `password_reset_tokens` (Laravel auth/session defaults)

### ERD (Core)

```mermaid
erDiagram
    RFID_CARDS ||--o{ SCAN_EVENTS : has

    RFID_CARDS {
      int id PK
      string uid
      datetime first_seen_at
      datetime last_seen_at
      int total_scans
      datetime created_at
      datetime updated_at
    }

    SCAN_EVENTS {
      int id PK
      int card_id FK
      datetime scanned_at
      string source
      string target_field
      datetime created_at
      datetime updated_at
    }
```

## Project Structure (Relevant)

- `app/Http/Controllers/Api/ScanController.php` - RFID API controller
- `app/Models/RfidCard.php` - Card model
- `app/Models/ScanEvent.php` - Scan event model
- `database/migrations/` - Schema migrations
- `public/rfid-demo/` - Demo frontend

## Testing

```bash
php artisan test --compact
```

## Notes

- The project also contains an extended SQL reference in `schema.sql`.
- Prefer Laravel migrations as the source of truth for schema evolution.

## Diagrams

# Entity-Relationship Diagram
![](images/ERD_SimpleRFID.png?raw=true)

# Flowchart
![](images/Flowchart_SimpleRFID.png?raw=true)
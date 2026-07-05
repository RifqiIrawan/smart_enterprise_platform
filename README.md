# Smart Enterprise Platform (SEP)

Full-stack enterprise resource planning (ERP) platform for manufacturing — covering purchasing, sales, finance, HRIS, factory/production, warehouse, accounting, tax, quality management (QMS), budgeting, MRP, cost accounting, asset/CMMS, analytics, and more, with a database-driven role and per-user permission system.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Go (Gin)
- **Database**: PostgreSQL (the app also runs in a demo/in-memory mode with no DB connected — see [Demo mode](#demo-mode) below)
- **AI**: Google Gemini API (optional)

## Prerequisites

- **Go** 1.21+
- **Node.js** 18+ and npm
- **PostgreSQL** 14+ (optional — the backend gracefully falls back to demo mode if it can't connect)

## Setup

### 1. Clone and configure environment variables

```bash
git clone https://github.com/RifqiIrawan/smart_enterprise_platform.git
cd smart_enterprise_platform
cp .env.example .env
```

Edit `.env` and fill in at least the database credentials and `JWT_SECRET`. Everything else in `.env.example` (Redis, S3/MinIO, SMTP, WhatsApp, VAPID) is optional — the app runs fine with those left blank or default.

> Generate a strong JWT secret with: `openssl rand -hex 64`

### 2. Database

Create the database referenced by `DB_NAME` in `.env` (default `sep_db`):

```bash
psql -U postgres -c "CREATE DATABASE sep_db;"
```

No manual migration step is needed — the backend creates/updates all tables automatically on startup. **`backend/internal/database/db.go` is the source of truth for the schema**, not the files under `backend/migrations/` (those are legacy and unused).

### 3. Run the backend (port 8080)

```bash
cd backend
go run ./cmd/server
```

Or build a binary first:

```bash
cd backend
go build -o sep-backend.exe ./cmd/server   # sep-backend on Linux/Mac
./sep-backend.exe
```

Look for `Database connected` and `Smart Enterprise Platform API starting on port 8080` in the log. Run this **from the `backend/` directory**, not `backend/cmd/server/` — the `.env` loader expects that.

If it instead logs `DB ping error: ... (running without DB)`, it started successfully in **demo mode** (see below) — check your Postgres connection/credentials if that wasn't intended.

### 4. Run the frontend (port 3000)

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

### 5. Log in

| Method | Email | Password |
|---|---|---|
| Demo login button | `admin@sep.id` | `admin123` |
| Your own account | (as created) | (as set) |

The demo superadmin account is seeded automatically on first backend startup.

## Demo mode

If the backend can't reach PostgreSQL (wrong credentials, DB not running, etc.), it does **not** crash — it logs a warning and continues serving the app with in-memory sample data. This is convenient for trying out the UI without a database, but nothing you create/edit will persist across restarts. Fix your `.env`/Postgres setup and restart the backend to get real persistence.

## Docker (alternative)

```bash
docker-compose up -d
```

This starts Postgres, backend, and frontend together (see `docker-compose.yml`). Use `docker-compose.prod.yml` for a production-oriented setup.

## Project Structure

```
backend/    Go (Gin) API — internal/handlers, internal/routes, internal/database, internal/permission
frontend/   React + Vite SPA — src/pages, src/store, src/components
```

## Further Documentation

- [`PERMISSION_SYSTEM.md`](PERMISSION_SYSTEM.md) — architecture of the role/menu/per-user permission system
- [`DEVELOPMENT.md`](DEVELOPMENT.md) — development roadmap and phase history
- [`PANDUAN_RUN.md`](PANDUAN_RUN.md) — quick-start guide (Bahasa Indonesia)

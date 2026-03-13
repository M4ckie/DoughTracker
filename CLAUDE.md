# Additional Guidance

@sessions/CLAUDE.sessions.md

This file provides instructions for Claude Code for working in the cc-sessions framework.

---

# DoughTracker — KitchenKommander

A touch-friendly donut shop production management app. Staff track bins of dough moving through configurable production stages. Designed for local-network use on tablets and phones in a kitchen environment.

## Directory Structure

```
KitchenKommander/
├── compose.yaml          — Podman/Docker Compose for local deployment
├── server/               — Node.js + Express REST API
│   ├── index.js          — Server entry point: Express, Socket.io, starts Sheets sync
│   ├── db.js             — SQLite setup, schema creation, default seed data
│   ├── sheets.js         — Google Sheets async sync (optional)
│   └── routes/
│       ├── bins.js       — Bin CRUD + archive
│       ├── stages.js     — Stage configuration
│       └── units.js      — Unit configuration
└── client/               — React + Vite SPA
    └── src/
        ├── App.jsx        — Root component, routing
        ├── socket.js      — Socket.io client singleton
        └── components/
            ├── BinDashboard.jsx  — Main bin card grid view
            ├── BinCard.jsx       — Individual bin card (tap to edit)
            ├── BinHistory.jsx    — Per-bin stage/quantity history log
            ├── AddBin.jsx        — New bin form
            └── StagesConfig.jsx  — Stage management UI
```

## Architecture

- **SQLite** is the primary data store (`doughtracker.sqlite`, persisted at `./data/` in compose)
- **Google Sheets** is an optional async sync target — the app runs fully without it
- **Socket.io** broadcasts all bin, stage, and unit mutations to all connected clients in real time
- **No authentication** — intended for local network only, server binds to `0.0.0.0`
- **Bins are soft-deleted** (archived flag), never hard-deleted
- **bin_history** records every stage/quantity change for audit trail
- Stages and units are fully user-configurable; defaults are seeded on first run

### Database Tables
- `bins` — label, stage_id, quantity, unit_id, location, archived
- `stages` — name, color, sort_order
- `units` — name, abbreviation
- `bin_history` — append-only log of bin mutations

### API Routes
All routes under `/api/`:
- `GET|POST /api/bins` — list active bins / create bin
- `GET|PATCH|DELETE /api/bins/:id` — get / update / archive a bin
- `GET /api/bins/:id/history` — bin change history
- `GET|POST /api/stages` — list / create stages
- `PATCH|DELETE /api/stages/:id` — update / delete stage
- `GET|POST /api/units` — list / create units
- `PATCH|DELETE /api/units/:id` — update / delete unit
- `GET /api/health` — health check

### Socket.io Events
Emitted server-side after every mutation:
- `bins:updated` — any bin change
- `stages:updated` — any stage change
- `units:updated` — any unit change

### Google Sheets Sync
Controlled by environment variables. When `GOOGLE_SPREADSHEET_ID` is set, the server syncs bin state to a Google Sheet on an interval (default 30s). Requires a service account JSON at `GOOGLE_SERVICE_ACCOUNT_PATH`. Sheets managed: `bins`, `stages`, `units`, `orders` (orders sheet is read-only placeholder).

## Dev Commands

**Server** (from `server/`):
```
npm run dev    # node --watch index.js (auto-restart on change)
npm start      # node index.js
```

**Client** (from `client/`):
```
npm run dev    # Vite dev server with HMR
npm run build  # Production build to dist/
```

**Compose** (from repo root):
```
podman-compose up --build   # or: docker compose up --build
```

Ports: server on `3001`, client on `5173` (compose) or Vite default in dev.

## Environment Variables (server)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `DB_PATH` | `../doughtracker.sqlite` | SQLite file path |
| `GOOGLE_SPREADSHEET_ID` | _(unset)_ | Enables Sheets sync when set |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | `./service-account.json` | Path to GCP service account key |
| `SHEETS_SYNC_INTERVAL_SECONDS` | `30` | Sheets sync frequency |

## Data Notes

- Default stages seeded on first run: Raw Dough, Proofing, Frying, Cooling, Finished
- Default units seeded on first run: Kilograms, Pounds, Grams, Dozens, Each
- State persists day-to-day; no daily reset
- Archived bins remain in DB and history; they are excluded from the active dashboard

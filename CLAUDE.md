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

---

### Discovered During Implementation
[Date: 2026-03-13]

Several significant features were added that are not reflected in the directory structure or API docs above.

**Admin panel and new route.** A new `server/routes/admin.js` route was created and mounted at `/api/admin`. It provides three destructive operations: `POST /api/admin/archive-all` (soft-archives all active bins), `POST /api/admin/clear-data` (hard-deletes all bins and history, leaves stages/units intact), and `POST /api/admin/factory-reset` (wipes everything and re-seeds defaults). The route is registered in `server/index.js` and is now documented in the API surface. The factory-reset endpoint emits all three socket events (`bins:updated`, `stages:updated`, `units:updated`). Future implementations should note that `clear-data` does a hard DELETE — there is no soft-delete path for this operation.

**Client `api.js` module.** A dedicated `client/src/api.js` module was introduced as the single place for all fetch calls. All components import from `api.js` rather than calling `fetch` directly. It exposes namespaced objects: `api.bins`, `api.stages`, `api.units`, and `api.admin`. The base URL is `/api` (relative), relying on the Vite dev proxy or the production nginx reverse proxy to route requests to the server.

**AdminPanel component.** `client/src/components/AdminPanel.jsx` and `AdminPanel.css` implement the UI for the three admin operations. Each action uses a two-phase confirm flow (click to arm, then confirm), with factory-reset requiring the user to type `RESET` before executing. This is the only component that calls `api.admin.*`.

**Splash screen.** `client/src/components/SplashScreen.jsx` and `SplashScreen.css` display a logo and title on first load. It runs a timed fade-in/hold/fade-out sequence (total ~1.9 seconds) and then calls `onDone` to unmount itself. It is conditionally rendered in `App.jsx` via `showSplash` state. The logo is served from `client/public/DonutLogo.png`.

**Light/dark theming.** `App.jsx` manages a `theme` state (`'dark'` default, persisted to `localStorage`). On change it sets `document.documentElement.setAttribute('data-theme', theme)`. All theming is done via CSS custom properties scoped to `html[data-theme='light']` and `html[data-theme='dark']` selectors in `index.css`. A toggle button in the header switches between modes.

**Refined Socket.io event model.** The original docs listed only bulk events (`bins:updated`, `stages:updated`, `units:updated`). In practice the server now also emits granular per-record events: `bin:created`, `bin:updated`, `bin:archived`, `stage:created`, `stage:updated`, `stage:deleted`, `unit:created`, `unit:updated`, `unit:deleted`. `App.jsx` listens to all of these for optimistic UI updates. The bulk `bins:updated` / `stages:updated` / `units:updated` events are still emitted by admin operations and trigger a full list re-fetch.

**Playwright test suite.** A `tests/` directory was added at the repo root with its own `package.json` and `node_modules`. Two configs exist: `tests/playwright.config.js` (desktop, 1024x768) and `tests/playwright.mobile.config.js` (iPhone-sized viewport, touch enabled, iPhone 17 UA). Both target `http://192.168.68.120:9000` (the Unraid deployment), not localhost. Test specs live in `tests/specs/`. Run with `npx playwright test` from the `tests/` directory, optionally passing `--config playwright.mobile.config.js` for the mobile run.

#### Updated Directory Structure
```
KitchenKommander/
├── compose.yaml
├── server/
│   ├── index.js
│   ├── db.js
│   ├── sheets.js
│   └── routes/
│       ├── bins.js
│       ├── stages.js
│       ├── units.js
│       └── admin.js          — Admin operations (archive-all, clear-data, factory-reset)
├── client/
│   └── src/
│       ├── App.jsx            — Now manages theme state + splash visibility + admin nav
│       ├── api.js             — Centralized fetch helper (all components use this)
│       ├── socket.js
│       └── components/
│           ├── BinDashboard.jsx
│           ├── BinCard.jsx
│           ├── BinHistory.jsx
│           ├── AddBin.jsx
│           ├── StagesConfig.jsx
│           ├── AdminPanel.jsx  — Admin UI (archive/clear/reset with confirm flows)
│           └── SplashScreen.jsx — Timed fade-in logo splash on first load
└── tests/                     — Playwright E2E tests (separate package)
    ├── package.json
    ├── playwright.config.js         — Desktop config, targets Unraid IP:9000
    ├── playwright.mobile.config.js  — Mobile config (390x844, touch, iPhone UA)
    └── specs/                       — Test spec files
```

#### Updated API Routes
- `POST /api/admin/archive-all` — soft-archives all active bins, emits `bins:updated`
- `POST /api/admin/clear-data` — hard-deletes all bins + history, emits `bins:updated`
- `POST /api/admin/factory-reset` — wipes all data, re-seeds defaults, emits all three update events

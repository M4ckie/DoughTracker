---
name: feature-kitchen-kommander-webapp
branch: feature/kitchen-kommander-webapp
status: completed
created: 2026-03-11
---

# KitchenKommander Webapp Design & Build

## Problem/Goal

Build a touch-friendly dashboard webapp for a bakery donut operation. Staff need to track bins of dough moving through configurable production stages, and see order fulfillment status. Currently managed via Google Sheet which is cumbersome in a busy kitchen environment.

## Success Criteria
- [x] Bin dashboard: visual cards showing each bin's label, stage, quantity, unit
- [x] Bin management: add/remove/update bins (label, stage, quantity, unit)
- [x] Stage configuration: globally configurable with color picker
- [x] Unit configuration: flexible measurement units (kg, lbs, dozens, etc.)
- [x] Real-time sync across all devices via WebSockets
- [x] Google Sheets integration for bin state (write-through sync, server-side)
- [x] Google Sheets integration for orders (placeholder sheet tab created)
- [x] Touch-friendly UI (tablet + phone, 48px min touch targets)
- [x] Locally hosted on a single computer, accessible via local network

## Architecture Decisions

- **Backend**: Node.js + Express + Socket.io + better-sqlite3
- **Frontend**: React + Vite (dark touch-friendly UI)
- **Data**: SQLite as local store; Google Sheets as optional write-through sync target with retry queue
- **Auth**: No PIN/auth — open on local network
- **Hosting**: Docker/Podman Compose with nginx reverse proxy; accessible via local network IP

### Data Flow
```
Tablets/Phones  ←→  nginx  ←→  Express + Socket.io  ←→  SQLite (local)
                                        ↕ async retry queue
                                   Google Sheets (optional sync)
```

## Deferred

- Orders sheet integration: structure unknown; placeholder in place pending clarification of column layout and daily vs. running sheet format.

## Context Manifest

### Key Facts
- Bins: variable count, user-configurable labels; state persists day to day
- Stages: globally configurable with color picker; auto-seeded defaults on startup
- Units: user-selectable per bin; auto-seeded defaults on startup; deletion cleans up orphaned bin references
- Orders: managed in Google Sheets; no order entry in app; integration deferred
- Google Sheets sync: write-through on bin changes with server-side retry queue; no PIN auth

## Work Log

### 2026-03-11

#### Completed
- Initial design discussion; settled on Node.js + Express + WebSockets, React frontend, local hosting

#### Decisions
- Google Sheets as source of truth (later revised)
- UI questions deferred pending user answers

### 2026-03-13

#### Completed
- Built Express + Socket.io + better-sqlite3 server with REST routes for bins, stages, and units
- Implemented Google Sheets write-through sync with server-side retry queue
- Added auto-seeding of default stages and units on startup
- Built React + Vite frontend: dark touch-friendly UI, color-coded stage cards, tap-to-edit bin cards, expandable history log, add bin modal, stages config with color picker
- Fixed BinCard stale form state with conflict detection banner
- Fixed unit deletion to NULL-clean orphaned bin references before deleting
- Added missing error handling on App.jsx initial load and try/catch in StageRow
- Set up Podman/Docker Compose with nginx reverse proxy
- Wrote README with setup instructions

#### Decisions
- Switched from Google Sheets as primary store to SQLite local store with Sheets as optional sync target
- No PIN/auth — open on local network by design
- Inline tap-to-edit on bin cards (no separate edit screen)
- Bins show expandable history log of stage changes
- Stages carry colors; bin cards color-coded by stage

#### Discovered
- Unit deletion requires NULLing bin references first to avoid orphaned foreign key state

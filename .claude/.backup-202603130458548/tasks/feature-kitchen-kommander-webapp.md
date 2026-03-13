---
name: feature-kitchen-kommander-webapp
branch: feature/kitchen-kommander-webapp
status: pending
created: 2026-03-11
---

# KitchenKommander Webapp Design & Build

## Problem/Goal

Build a touch-friendly dashboard webapp for a bakery donut operation. Staff need to track bins of dough moving through configurable production stages, and see order fulfillment status. Currently managed via Google Sheet which is cumbersome in a busy kitchen environment.

## Success Criteria
- [ ] Bin dashboard: visual cards showing each bin's label, stage, quantity, unit
- [ ] Bin management: add/remove/update bins (label, stage, quantity, unit)
- [ ] Stage configuration: globally and per-bin-type configurable
- [ ] Unit configuration: flexible measurement units (kg, lbs, dozens, etc.)
- [ ] Real-time sync across all devices via WebSockets
- [ ] Google Sheets integration for bin state (read/write)
- [ ] Google Sheets integration for orders (read-only, placeholder until sheet structure is known)
- [ ] Touch-friendly UI (tablet + phone)
- [ ] Locally hosted on a single computer, accessible via local network

## Architecture Decisions

- **Backend**: Node.js + Express + WebSockets
- **Frontend**: React (touch-friendly, responsive)
- **Data**: Google Sheets as full source of truth
- **Hosting**: Local network (devices connect via IP on same WiFi)

### Google Sheets Structure (planned)
| Sheet | Purpose |
|-------|---------|
| `orders` | Incoming orders — managed manually, read by app |
| `bins` | Active bins: label, stage, quantity, unit, last_updated |
| `stages` | Configurable list of production stages |
| `units` | Configurable list of measurement units |

### Data Flow
```
Tablets/Phones  ←→  Local Server (on bakery computer)  ←→  Google Sheets
                         ↕ WebSocket (real-time)
```

## Pending Questions (needs user answers before UI implementation)

1. Should a bin card show its full history of stage changes, or just current state?
2. When updating a bin — inline edit (tap the card, edit in place) or a separate edit screen?
3. Any color coding? (e.g., stages have colors, bins change color based on fullness?)

## Deferred Questions (waiting on orders sheet)

- What columns exist on the orders sheet?
- Is there one sheet per day or a running sheet?
- How is "fulfilled" vs "remaining" currently tracked?

## Context Manifest

### Key Facts
- Bins: variable count per day, user-configurable labels
- Stages: variable, configurable globally and per-bin-type
- Units: variable, user selectable per bin
- Orders: all sources (walk-in, online, phone), pulled from Google Sheets
- State carries over day to day (no daily reset)
- No order entry needed in app — orders managed in Sheets

## User Notes
- Keep Google Sheets as source of truth for now
- App writes bin changes back to Sheets
- Orders sheet structure TBD — leave as placeholder

## Work Log
- [2026-03-11] Initial design discussion. Architecture decided. UI questions pending user answers.

# DoughTracker

Real-time donut shop production management. Track dough bins through production stages across multiple tablets on your local network.

## Quick Start (Development)

```bash
# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install

# Start server (terminal 1)
cd server && npm run dev

# Start client (terminal 2)
cd client && npm run dev
```

Open `http://localhost:5173` in your browser.

## Running with Podman (Production)

```bash
# Copy and fill in env vars
cp .env.example .env

# Create data directory
mkdir -p data

# Start
podman-compose up -d
```

Access the app at `http://<your-machine-ip>:5173` from any device on the same network.

## Google Sheets Sync (Optional)

1. Create a Google Cloud project and enable the Sheets API
2. Create a service account and download the JSON key
3. Copy the key to `data/service-account.json`
4. Share your Google Sheet with the service account email
5. Add your spreadsheet ID to `.env`

The app creates the required sheet tabs (`bins`, `stages`, `units`, `orders`) automatically on first run. If Sheets sync isn't configured, the app works fully offline using SQLite.

## Data

The SQLite database lives at `data/doughtracker.sqlite`. Back it up with:

```bash
cp data/doughtracker.sqlite data/doughtracker.sqlite.bak
```

## Default Stages

The app seeds these stages on first run (all editable):
- Raw Dough
- Proofing
- Frying
- Cooling
- Finished

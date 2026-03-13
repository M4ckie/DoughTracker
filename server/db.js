import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'doughtracker.sqlite');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    abbreviation TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    stage_id INTEGER REFERENCES stages(id),
    quantity REAL NOT NULL DEFAULT 0,
    unit_id INTEGER REFERENCES units(id),
    location TEXT NOT NULL DEFAULT '',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bin_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bin_id INTEGER NOT NULL REFERENCES bins(id),
    stage_id INTEGER REFERENCES stages(id),
    quantity REAL,
    unit_id INTEGER REFERENCES units(id),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed default stages if empty
const stageCount = db.prepare('SELECT COUNT(*) as n FROM stages').get();
if (stageCount.n === 0) {
  const insertStage = db.prepare('INSERT INTO stages (name, color, sort_order) VALUES (?, ?, ?)');
  [
    ['Raw Dough', '#f59e0b', 0],
    ['Proofing', '#3b82f6', 1],
    ['Frying', '#ef4444', 2],
    ['Cooling', '#10b981', 3],
    ['Finished', '#6366f1', 4],
  ].forEach(([name, color, sort_order]) => insertStage.run(name, color, sort_order));
}

// Seed default units if empty
const unitCount = db.prepare('SELECT COUNT(*) as n FROM units').get();
if (unitCount.n === 0) {
  const insertUnit = db.prepare('INSERT INTO units (name, abbreviation) VALUES (?, ?)');
  [
    ['Kilograms', 'kg'],
    ['Pounds', 'lbs'],
    ['Grams', 'g'],
    ['Dozens', 'doz'],
    ['Each', 'ea'],
  ].forEach(([name, abbreviation]) => insertUnit.run(name, abbreviation));
}

export default db;

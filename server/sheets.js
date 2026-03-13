import { google } from 'googleapis';
import db from './db.js';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service-account.json';
const SYNC_INTERVAL_MS = (parseInt(process.env.SHEETS_SYNC_INTERVAL_SECONDS) || 30) * 1000;

const SHEET_NAMES = ['bins', 'stages', 'units', 'orders'];

let sheetsClient = null;
let syncQueue = [];
let syncTimer = null;

async function getClient() {
  if (sheetsClient) return sheetsClient;
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (err) {
    console.warn('[sheets] Could not initialize Google Sheets client:', err.message);
    return null;
  }
}

async function ensureSheets() {
  const client = await getClient();
  if (!client || !SPREADSHEET_ID) return;

  try {
    const spreadsheet = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingNames = spreadsheet.data.sheets.map(s => s.properties.title);
    const missing = SHEET_NAMES.filter(name => !existingNames.includes(name));

    if (missing.length > 0) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: missing.map(title => ({ addSheet: { properties: { title } } })),
        },
      });
      console.log('[sheets] Created sheets:', missing.join(', '));
    }

    // Write headers if sheets are new
    await writeHeaders(client);
  } catch (err) {
    console.warn('[sheets] Error ensuring sheet tabs:', err.message);
  }
}

async function writeHeaders(client) {
  const headers = {
    bins: [['id', 'label', 'stage', 'quantity', 'unit', 'location', 'archived', 'created_at', 'updated_at']],
    stages: [['id', 'name', 'color', 'sort_order']],
    units: [['id', 'name', 'abbreviation']],
    orders: [['id', 'type', 'quantity', 'due_by', 'status', 'notes']],
  };

  for (const [sheet, rows] of Object.entries(headers)) {
    try {
      const range = `${sheet}!A1:Z1`;
      const existing = await client.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
      if (!existing.data.values || existing.data.values.length === 0) {
        await client.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: 'RAW',
          requestBody: { values: rows },
        });
      }
    } catch (err) {
      console.warn(`[sheets] Error writing headers for ${sheet}:`, err.message);
    }
  }
}

async function syncBinsToSheets() {
  const client = await getClient();
  if (!client || !SPREADSHEET_ID) return;

  try {
    const bins = db.prepare(`
      SELECT b.*, s.name as stage_name, u.abbreviation as unit_abbreviation
      FROM bins b
      LEFT JOIN stages s ON b.stage_id = s.id
      LEFT JOIN units u ON b.unit_id = u.id
    `).all();

    const rows = bins.map(b => [
      b.id, b.label, b.stage_name || '', b.quantity,
      b.unit_abbreviation || '', b.location, b.archived,
      b.created_at, b.updated_at,
    ]);

    await client.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'bins!A2',
      valueInputOption: 'RAW',
      requestBody: { values: rows.length ? rows : [[]] },
    });

    console.log(`[sheets] Synced ${bins.length} bins`);
  } catch (err) {
    console.warn('[sheets] Sync failed, queuing retry:', err.message);
    syncQueue.push({ type: 'bins', retries: 0 });
  }
}

async function processQueue() {
  if (syncQueue.length === 0) return;
  const item = syncQueue.shift();
  if (item.type === 'bins') {
    await syncBinsToSheets();
  }
}

export function queueSync() {
  syncQueue.push({ type: 'bins', retries: 0 });
}

export async function manualSync() {
  await syncBinsToSheets();
}

export async function startSheetsSync(io) {
  if (!SPREADSHEET_ID) {
    console.log('[sheets] GOOGLE_SPREADSHEET_ID not set — Sheets sync disabled');
    return;
  }

  await ensureSheets();
  await syncBinsToSheets();

  syncTimer = setInterval(async () => {
    await syncBinsToSheets();
    await processQueue();
  }, SYNC_INTERVAL_MS);

  console.log(`[sheets] Sync started — interval: ${SYNC_INTERVAL_MS / 1000}s`);
}

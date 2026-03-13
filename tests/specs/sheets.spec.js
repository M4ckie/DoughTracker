import { test, expect } from '@playwright/test';
import { google } from 'googleapis';
const SPREADSHEET_ID = '1owDurxtNXdTWfnCaXZuYdFhOkKaUTsLwDr5UkI0aIX0';
const SERVICE_ACCOUNT_PATH = '/home/jonny/projects/KitchenKommander/doughtracker-ed60f3a8e948.json';
const SYNC_WAIT_MS = 35000; // slightly over the 30s sync interval

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function getSheetRows(client, sheetName) {
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z500`,
  });
  return res.data.values || [];
}

// Helper: create a bin via the UI
async function createBin(page, { binLabel, quantity = '5' }) {
  await page.locator('button:has-text("+ New Bin")').click();
  await expect(page.locator('.modal')).toBeVisible();
  await page.locator('.modal input:not([type="number"])').first().fill(binLabel);
  await page.locator('.modal input[type="number"]').fill(quantity);
  const stageSelect = page.locator('.modal select').first();
  const opts = await stageSelect.locator('option').count();
  if (opts > 1) await stageSelect.selectOption({ index: 1 });
  await page.locator('.modal .submit-btn').click();
  await expect(page.locator('.modal')).not.toBeVisible();
}

test.describe('Google Sheets sync', () => {

  test('bins sheet has correct headers', async () => {
    const client = await getSheetsClient();
    const rows = await getSheetRows(client, 'bins');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const headers = rows[0];
    expect(headers).toContain('id');
    expect(headers).toContain('label');
    expect(headers).toContain('stage');
    expect(headers).toContain('quantity');
  });

  test('stages sheet has correct headers', async () => {
    const client = await getSheetsClient();
    const rows = await getSheetRows(client, 'stages');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const headers = rows[0];
    expect(headers).toContain('id');
    expect(headers).toContain('name');
    expect(headers).toContain('color');
  });

  test('new bin syncs to sheet within 35 seconds', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const RUN_ID = Date.now();
    const binLabel = `[SHEETS-${RUN_ID}] SyncTest`;

    await createBin(page, { binLabel, quantity: '42' });

    // Confirm it appeared on the dashboard
    await expect(page.locator('.bin-card', { hasText: binLabel })).toBeVisible();

    // Wait for sync interval to elapse
    console.log(`Bin created — waiting ${SYNC_WAIT_MS / 1000}s for sync...`);
    await page.waitForTimeout(SYNC_WAIT_MS);

    // Read the sheet and verify the bin is there
    const client = await getSheetsClient();
    const rows = await getSheetRows(client, 'bins');
    const headers = rows[0];
    const labelIdx = headers.indexOf('label');
    const qtyIdx = headers.indexOf('quantity');

    const matchingRow = rows.slice(1).find(row => row[labelIdx] === binLabel);
    expect(matchingRow, `Bin "${binLabel}" not found in sheet after sync`).toBeTruthy();
    expect(matchingRow[qtyIdx]).toBe('42');

    // Clean up: archive the test bin via admin
    await page.locator('.nav-btn:has-text("Admin")').click();
    const card = page.locator('.admin-card').nth(0);
    await card.locator('.admin-btn:has-text("Archive All Bins")').click();
    await card.locator('.admin-confirm .admin-btn:has-text("Confirm")').click();
    await expect(card.locator('.admin-result-ok')).toBeVisible({ timeout: 10000 });
  });

  test('sheet is reachable and has expected tabs', async () => {
    const client = await getSheetsClient();
    const res = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const tabNames = res.data.sheets.map(s => s.properties.title);

    expect(tabNames).toContain('bins');
    expect(tabNames).toContain('stages');
    expect(tabNames).toContain('units');
    expect(tabNames).toContain('orders');
  });

});

/**
 * Screenshot capture spec — generates README images.
 * Run with the mobile config for phone-sized captures.
 *   npx playwright test specs/screenshots.spec.js --config playwright.mobile.config.js
 *
 * Outputs to: ../docs/screenshots/
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const OUT = path.resolve('/home/jonny/projects/KitchenKommander/docs/screenshots');

const shot = (name) => path.join(OUT, name);

// Seed a handful of realistic bins so the dashboard looks populated
const SEED_BINS = [
  { label: 'Morning Mix #1',  quantity: '18', stageIdx: 1 },
  { label: 'Glazed Batch A',  quantity: '12', stageIdx: 2 },
  { label: 'Chocolate Dip',   quantity: '9',  stageIdx: 3 },
  { label: 'Sprinkle Run',    quantity: '24', stageIdx: 4 },
  { label: 'Classic Plain',   quantity: '6',  stageIdx: 5 },
];

async function createBin(page, { label, quantity, stageIdx }) {
  await page.locator('button:has-text("+ New Bin")').click();
  await expect(page.locator('.modal')).toBeVisible();
  await page.locator('.modal input:not([type="number"])').first().fill(label);
  await page.locator('.modal input[type="number"]').fill(quantity);
  const sel = page.locator('.modal select').first();
  const opts = await sel.locator('option').count();
  if (opts > stageIdx) await sel.selectOption({ index: stageIdx });
  await page.locator('.modal .submit-btn').click();
  await expect(page.locator('.modal')).not.toBeVisible();
}

test.describe.serial('README screenshots', () => {

  test('setup — factory reset and seed bins', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Factory reset for a clean slate
    await page.locator('.nav-btn:has-text("Admin")').click();
    const card = page.locator('.admin-card').nth(2);
    await card.locator('.admin-btn:has-text("Factory Reset")').click();
    await card.locator('.admin-reset-input').fill('RESET');
    await card.locator('.admin-confirm .admin-btn:has-text("Confirm")').click();
    await expect(card.locator('.admin-result-ok')).toBeVisible({ timeout: 10000 });
    await card.locator('button:has-text("Dismiss")').click();

    // Go to bins and create seed data
    await page.locator('.nav-btn:has-text("Bins")').click();
    await page.waitForLoadState('networkidle');
    for (const bin of SEED_BINS) {
      await createBin(page, bin);
    }
    await expect(page.locator('.bin-card')).toHaveCount(SEED_BINS.length, { timeout: 10000 });
  });


  test('screenshot — dashboard dark mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.bin-card')).toHaveCount(SEED_BINS.length, { timeout: 10000 });
    // Ensure dark mode
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    if (theme === 'light') await page.locator('.theme-toggle').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('dashboard-dark.png'), fullPage: false });
  });


  test('screenshot — dashboard light mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.bin-card')).toHaveCount(SEED_BINS.length, { timeout: 10000 });
    // Switch to light mode
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    if (theme !== 'light') await page.locator('.theme-toggle').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('dashboard-light.png'), fullPage: false });
    // Switch back to dark
    await page.locator('.theme-toggle').click();
  });


  test('screenshot — bin card expanded (edit mode)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.bin-card').first()).toBeVisible({ timeout: 10000 });
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    if (theme === 'light') await page.locator('.theme-toggle').click();
    await page.waitForTimeout(200);
    // Open the first card into edit mode
    await page.locator('.bin-card').first().locator('.card-header').click();
    await expect(page.locator('.bin-card.editing')).toBeVisible();
    await page.waitForTimeout(200);
    await page.screenshot({ path: shot('bin-edit.png'), fullPage: false });
    // Close edit mode
    await page.locator('.bin-card.editing .icon-btn').click();
    await expect(page.locator('.bin-card.editing')).not.toBeVisible();
  });


  test('screenshot — stages config', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn:has-text("Stages")').click();
    await expect(page.locator('.stages-config')).toBeVisible();
    await page.waitForLoadState('networkidle');
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    if (theme === 'light') await page.locator('.theme-toggle').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('stages.png'), fullPage: false });
  });


  test('screenshot — admin panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn:has-text("Admin")').click();
    await expect(page.locator('.admin-panel')).toBeVisible();
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    if (theme === 'light') await page.locator('.theme-toggle').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('admin.png'), fullPage: false });
  });


  test('teardown — archive seed bins', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.nav-btn:has-text("Admin")').click();
    const card = page.locator('.admin-card').nth(0);
    await card.locator('.admin-btn:has-text("Archive All Bins")').click();
    await card.locator('.admin-confirm .admin-btn:has-text("Confirm")').click();
    await expect(card.locator('.admin-result-ok')).toBeVisible({ timeout: 10000 });
  });

});

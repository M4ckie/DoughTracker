import { test, expect } from '@playwright/test';

// Unique prefix per test run to avoid collisions with live data
const RUN_ID = Date.now();
const label = (name) => `[T${RUN_ID}] ${name}`;

// Helper: open AddBin modal, fill, submit. Returns after modal closes.
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

// Helper: open a bin card into edit mode. Returns the editing card locator.
// Note: once in edit mode, hasText no longer matches (label moves to input value),
// so we switch to the .bin-card.editing locator.
async function openBinEdit(page, binLabel) {
  const card = page.locator('.bin-card', { hasText: binLabel });
  await card.locator('.card-header').click();
  const editing = page.locator('.bin-card.editing');
  await expect(editing.locator('.edit-title')).toBeVisible();
  return editing;
}

test.describe('DoughTracker', () => {

  test('dashboard loads with stage filters', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.app-logo')).toContainText('DoughTracker');

    // Default stages should appear as filter buttons (wait for API data)
    await expect(async () => {
      const count = await page.locator('.filter-btn').count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 8000 });

    await expect(page.locator('.filter-btn').first()).toContainText('All');
  });


  test('add a bin — appears on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const binLabel = label('Batch Alpha');
    await createBin(page, { binLabel, quantity: '12.5' });

    const card = page.locator('.bin-card', { hasText: binLabel });
    await expect(card).toBeVisible();
    await expect(card).toContainText('12.5');
  });


  test('edit a bin — quantity updates on card', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const binLabel = label('Edit Me');
    await createBin(page, { binLabel, quantity: '5' });

    // Open edit mode — card switches to .bin-card.editing
    const editing = await openBinEdit(page, binLabel);

    await editing.locator('input[type="number"]').fill('99');
    await editing.locator('input[placeholder*="moved"]').fill('test edit note');
    await editing.locator('.save-btn').click();

    // Wait for edit mode to close (save() awaits the network round-trip to the server)
    await expect(editing).not.toBeVisible({ timeout: 15000 });

    // Back to view mode — hasText locator works again
    const card = page.locator('.bin-card', { hasText: binLabel });
    await expect(card.locator('.qty-value')).toContainText('99');
  });


  test('bin history — log entries appear after edits', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const binLabel = label('History Bin');
    await createBin(page, { binLabel, quantity: '3' });

    // Edit to generate a second history entry
    const editing = await openBinEdit(page, binLabel);
    await editing.locator('input[type="number"]').fill('7');
    await editing.locator('input[placeholder*="moved"]').fill('history test edit');
    await editing.locator('.save-btn').click();

    // Wait for edit mode to close
    await expect(editing).not.toBeVisible({ timeout: 15000 });

    // Back to view mode
    const card = page.locator('.bin-card', { hasText: binLabel });

    // Expand history
    await card.locator('.history-btn').click();
    await expect(card.locator('.bin-history')).toBeVisible();

    const entries = card.locator('.history-entry');
    const entryCount = await entries.count();
    expect(entryCount).toBeGreaterThanOrEqual(2);
    await expect(entries.first()).toContainText('history test edit');
  });


  test('archive bin — disappears from dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const binLabel = label('Archive Me');
    await createBin(page, { binLabel, quantity: '1' });

    const card = page.locator('.bin-card', { hasText: binLabel });
    await expect(card).toBeVisible();

    // Open edit mode
    const editing = await openBinEdit(page, binLabel);
    page.once('dialog', (dialog) => dialog.accept());
    await editing.locator('.archive-btn').click();

    // Card should be gone
    await expect(page.locator('.bin-card', { hasText: binLabel })).not.toBeVisible();
  });


  test('stage filter — filters bin cards correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for stage filters to load
    await expect(async () => {
      const count = await page.locator('.filter-btn').count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 8000 });

    const filterBtns = page.locator('.filter-btn');
    const stageBtn = filterBtns.nth(1);
    const rawText = await stageBtn.textContent();
    const stageName = rawText.replace(/\s*\(\d+\)\s*$/, '').trim();
    await stageBtn.click();
    await expect(stageBtn).toHaveClass(/active/);

    const cards = page.locator('.bin-card');
    const cardCount = await cards.count();
    for (let i = 0; i < cardCount; i++) {
      await expect(cards.nth(i).locator('.card-stage-badge')).toContainText(stageName);
    }

    await filterBtns.first().click();
    await expect(filterBtns.first()).toHaveClass(/active/);
  });


  test('stages config — add a new stage', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-btn:has-text("Stages")').click();
    await expect(page.locator('.stages-config')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const countBefore = await page.locator('.stage-row').count();
    const stageName = label('Test Stage');

    await page.locator('button:has-text("+ Add Stage")').click();
    await expect(page.locator('.add-stage-form')).toBeVisible();
    await page.locator('.add-stage-form input').fill(stageName);
    await page.locator('.color-swatch').nth(2).click();
    await page.locator('.add-stage-form button[type="submit"]').click();
    await expect(page.locator('.add-stage-form')).not.toBeVisible();

    await expect(page.locator('.stages-list')).toContainText(stageName, { timeout: 10000 });
    expect(await page.locator('.stage-row').count()).toBe(countBefore + 1);

    // Clean up: delete the test stage
    // Click the stage-name span to enter edit mode (the row becomes .stage-row.editing)
    await page.locator('.stage-row', { hasText: stageName }).locator('.stage-name').click();
    const editingRow = page.locator('.stage-row.editing');
    page.once('dialog', (dialog) => dialog.accept());
    await editingRow.locator('.delete-btn').click();
    await expect(page.locator('.stages-list')).not.toContainText(stageName, { timeout: 5000 });
  });


  test('stages config — edit an existing stage name', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-btn:has-text("Stages")').click();
    await expect(page.locator('.stages-config')).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Use whatever the first non-test stage is
    const allRows = page.locator('.stage-row');
    if (await allRows.count() === 0) test.skip();
    const targetRow = allRows.first();
    const originalName = await targetRow.locator('.stage-name').textContent();

    await targetRow.locator('.stage-name').click();
    const editingRow = page.locator('.stage-row.editing');
    await expect(editingRow.locator('input')).toBeVisible();

    const newName = label('Renamed Stage');
    await editingRow.locator('input').fill(newName);
    await editingRow.locator('.save-btn').click();
    await expect(editingRow.locator('input')).not.toBeVisible();

    await expect(page.locator('.stages-list')).toContainText(newName, { timeout: 5000 });

    // Restore original name
    await page.locator('.stage-row', { hasText: newName }).locator('.stage-name').click();
    const restoreRow = page.locator('.stage-row.editing');
    await restoreRow.locator('input').fill(originalName);
    await restoreRow.locator('.save-btn').click();
    await expect(page.locator('.stages-list')).toContainText(originalName, { timeout: 5000 });
  });


  test.describe('Admin panel', () => {

    test('admin nav button is visible and navigates to admin panel', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.nav-btn:has-text("Admin")')).toBeVisible();
      await page.locator('.nav-btn:has-text("Admin")').click();
      await expect(page.locator('.admin-panel')).toBeVisible();
      await expect(page.locator('.admin-header h2')).toContainText('Admin');
    });


    test('all three action cards are visible', async ({ page }) => {
      await page.goto('/');
      await page.locator('.nav-btn:has-text("Admin")').click();
      await expect(page.locator('.admin-card')).toHaveCount(3);

      await expect(page.locator('.admin-card').nth(0)).toContainText('Archive Active Bins');
      await expect(page.locator('.admin-card').nth(1)).toContainText('Clear All Production Data');
      await expect(page.locator('.admin-card').nth(2)).toContainText('Factory Reset');
    });


    test('archive all bins — confirm step appears and executes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Create a bin so there is something to archive
      await createBin(page, { binLabel: label('AdminArchiveTest'), quantity: '2' });

      await page.locator('.nav-btn:has-text("Admin")').click();

      const card = page.locator('.admin-card').nth(0);

      // Trigger confirm step
      await card.locator('.admin-btn:has-text("Archive All Bins")').click();
      await expect(card.locator('.admin-confirm')).toBeVisible();

      // Execute
      await card.locator('.admin-confirm .admin-btn:has-text("Confirm")').click();
      await expect(card.locator('.admin-result-ok')).toBeVisible({ timeout: 10000 });

      // Dismiss and verify board is empty
      await card.locator('button:has-text("Dismiss")').click();
      await page.locator('.nav-btn:has-text("Bins")').click();
      const cards = page.locator('.bin-card');
      await expect(cards).toHaveCount(0, { timeout: 5000 });
    });


    test('archive all — cancel returns to idle state', async ({ page }) => {
      await page.goto('/');
      await page.locator('.nav-btn:has-text("Admin")').click();

      const card = page.locator('.admin-card').nth(0);
      await card.locator('.admin-btn:has-text("Archive All Bins")').click();
      await expect(card.locator('.admin-confirm')).toBeVisible();

      await card.locator('.admin-confirm .admin-btn:has-text("Cancel")').click();
      await expect(card.locator('.admin-confirm')).not.toBeVisible();
      await expect(card.locator('.admin-btn:has-text("Archive All Bins")')).toBeVisible();
    });


    test('factory reset — confirm button disabled until RESET typed', async ({ page }) => {
      await page.goto('/');
      await page.locator('.nav-btn:has-text("Admin")').click();

      const card = page.locator('.admin-card').nth(2);
      await card.locator('.admin-btn:has-text("Factory Reset")').click();
      await expect(card.locator('.admin-confirm')).toBeVisible();

      const confirmBtn = card.locator('.admin-confirm .admin-btn:has-text("Confirm")');
      await expect(confirmBtn).toBeDisabled();

      // Partial input — still disabled
      await card.locator('.admin-reset-input').fill('RES');
      await expect(confirmBtn).toBeDisabled();

      // Wrong case — still disabled
      await card.locator('.admin-reset-input').fill('reset');
      await expect(confirmBtn).toBeDisabled();

      // Correct — enabled
      await card.locator('.admin-reset-input').fill('RESET');
      await expect(confirmBtn).toBeEnabled();

      // Cancel out — don't actually reset
      await card.locator('.admin-confirm .admin-btn:has-text("Cancel")').click();
    });


    test('factory reset — executes and stages are restored to defaults', async ({ page }) => {
      await page.goto('/');
      await page.locator('.nav-btn:has-text("Admin")').click();

      const card = page.locator('.admin-card').nth(2);
      await card.locator('.admin-btn:has-text("Factory Reset")').click();
      await card.locator('.admin-reset-input').fill('RESET');
      await card.locator('.admin-confirm .admin-btn:has-text("Confirm")').click();
      await expect(card.locator('.admin-result-ok')).toBeVisible({ timeout: 10000 });

      // Navigate to stages and verify defaults are present
      await page.locator('.nav-btn:has-text("Stages")').click();
      await expect(page.locator('.stages-list')).toContainText('Raw Dough', { timeout: 5000 });
      await expect(page.locator('.stages-list')).toContainText('Proofing');
      await expect(page.locator('.stages-list')).toContainText('Frying');
      await expect(page.locator('.stages-list')).toContainText('Cooling');
      await expect(page.locator('.stages-list')).toContainText('Finished');
    });

  });

});

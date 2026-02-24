import { test, expect } from '@playwright/test';

test.describe('Dashboard Filtering E2E', () => {

  test('should display all claims by default', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Claims Dashboard');
    await expect(page.locator('table')).toBeVisible();

    // Should have at least one claim row in the table
    const rows = page.locator('table tbody tr, table .mat-mdc-row');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter claims by OPEN status', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Claims Dashboard');

    // Open the status filter dropdown
    await page.click('mat-select');
    await page.click('mat-option:has-text("Open")');

    // Wait for the table to update
    await page.waitForTimeout(500);

    // All visible status chips should say OPEN
    const statusCells = page.locator('table .status-chip, table td:nth-child(6) span');
    const count = await statusCells.count();
    for (let i = 0; i < count; i++) {
      await expect(statusCells.nth(i)).toContainText('OPEN');
    }
  });

  test('should filter claims by CLOSED status', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Claims Dashboard');

    // Open the status filter dropdown
    await page.click('mat-select');
    await page.click('mat-option:has-text("Closed")');

    // Wait for the table to update
    await page.waitForTimeout(500);

    // All visible status chips should say CLOSED
    const statusCells = page.locator('table .status-chip, table td:nth-child(6) span');
    const count = await statusCells.count();
    for (let i = 0; i < count; i++) {
      await expect(statusCells.nth(i)).toContainText('CLOSED');
    }
  });

  test('should show all claims when "All" filter is selected', async ({ page }) => {
    await page.goto('/dashboard');

    // First filter to OPEN
    await page.click('mat-select');
    await page.click('mat-option:has-text("Open")');
    await page.waitForTimeout(500);

    const filteredRows = page.locator('table tbody tr, table .mat-mdc-row');
    const filteredCount = await filteredRows.count();

    // Now select "All"
    await page.click('mat-select');
    await page.click('mat-option:has-text("All")');
    await page.waitForTimeout(500);

    const allRows = page.locator('table tbody tr, table .mat-mdc-row');
    const allCount = await allRows.count();

    // All should be >= filtered
    expect(allCount).toBeGreaterThanOrEqual(filteredCount);
  });
});

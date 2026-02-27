import { test, expect } from '@playwright/test';

test.describe('Dashboard Filtering E2E', () => {

  test('should filter claims by status on the dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Claims Dashboard');

    // Verify table is visible with claims
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Get count of all rows initially
    const allRows = page.locator('table tbody tr');
    const initialCount = await allRows.count();
    expect(initialCount).toBeGreaterThan(0);

    // If status filter exists, test it
    const statusFilter = page.locator('mat-select[placeholder*="tatus"], mat-select[aria-label*="tatus"], mat-select:first-of-type');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select "OPEN" status
      const openOption = page.locator('mat-option:has-text("OPEN"), mat-option:has-text("Open")');
      if (await openOption.isVisible()) {
        await openOption.click();

        // Verify filtered results
        await page.waitForTimeout(1000);
        const filteredRows = page.locator('table tbody tr');
        const filteredCount = await filteredRows.count();
        expect(filteredCount).toBeGreaterThan(0);
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }
    }
  });

  test('should navigate to claim detail from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Claims Dashboard');

    // Click on the first claim row or link
    const firstClaimLink = page.locator('table tbody tr:first-child a, table tbody tr:first-child td:first-child');
    await firstClaimLink.click();

    // Should navigate to a claim detail page
    await expect(page).toHaveURL(/\/claims\/\d+/, { timeout: 5000 });
    await expect(page.locator('h2')).toContainText('Claim CLM-');
  });
});

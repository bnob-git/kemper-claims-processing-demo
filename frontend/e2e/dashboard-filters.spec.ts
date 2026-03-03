import { test, expect } from '@playwright/test';

test.describe('Dashboard Filtering E2E', () => {

  test('should filter claims by status on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Claims Dashboard');

    // Open status filter and select OPEN
    await page.click('mat-select:has(mat-label:has-text("Filter by Status"))');
    await page.click('mat-option:has-text("Open")');

    // Table should still be visible with filtered results
    await expect(page.locator('table')).toBeVisible();
  });

  test('should search claims by text on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Claims Dashboard');

    // Type in search box
    const searchInput = page.locator('input[matInput]').first();
    await searchInput.fill('Alice');

    // Wait for debounce
    await page.waitForTimeout(400);

    // Table should still be visible
    await expect(page.locator('table')).toBeVisible();
  });

  test('full workflow with subrogation flag enabled', async ({ page }) => {
    // Step 1: Create a new claim via FNOL
    await page.goto('/fnol');
    await expect(page.locator('h2')).toContainText('First Notice of Loss');

    // Fill form
    await page.click('mat-select[formControlName="policyId"]');
    await page.click('mat-option:first-child');

    await page.click('mat-select[formControlName="lossType"]');
    await page.click('mat-option:has-text("Collision")');

    await page.fill('input[formControlName="severityScore"]', '8');
    await page.fill('input[formControlName="lossDate"]', '2024-11-01');
    await page.fill('input[formControlName="claimantName"]', 'Subrogation Test');
    await page.fill('input[formControlName="claimantPhone"]', '555-8888');
    await page.fill('textarea[formControlName="lossDescription"]', 'Third party at fault - subrogation test');

    await page.click('button:has-text("Submit FNOL")');
    await expect(page).toHaveURL(/\/claims\/\d+/, { timeout: 10000 });

    // Step 2: Triage
    await page.click('text=Triage / Assign');
    await expect(page).toHaveURL(/\/triage/);
    await page.click('button:has-text("Assign Claim")');
    await expect(page.locator('text=Assigned to')).toBeVisible({ timeout: 5000 });

    // Approve reserve
    await page.fill('input[type="number"]', '8000');
    await page.click('button:has-text("Approve Reserve")');
    await expect(page.locator('text=Reserve approved')).toBeVisible({ timeout: 5000 });

    // Step 3: Settlement
    await page.click('mat-icon:has-text("arrow_back")');
    await expect(page).toHaveURL(/\/claims\/\d+$/);
    await page.click('text=Settlement');
    await expect(page).toHaveURL(/\/settlement/);

    // Issue payment
    await page.fill('input[type="number"]', '7500');
    await page.click('button:has-text("Issue Payment")');
    await expect(page.locator('text=Payment issued')).toBeVisible({ timeout: 5000 });

    // Step 4: Close with subrogation flag
    const checkbox = page.locator('mat-checkbox');
    await checkbox.click();
    await page.click('button:has-text("Close Claim")');
    await expect(page.locator('text=Claim closed')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Subrogation flagged')).toBeVisible();
  });
});

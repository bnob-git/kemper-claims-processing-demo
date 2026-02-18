import { test, expect } from '@playwright/test';

test.describe('Claim Workflow E2E', () => {

  test('should load dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h2')).toContainText('Claims Dashboard');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should navigate to FNOL form', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=New Claim');
    await expect(page).toHaveURL(/\/fnol/);
    await expect(page.locator('h2')).toContainText('First Notice of Loss');
  });

  test('full claim workflow: create → triage → reserve → payment → close', async ({ page }) => {
    // Step 1: Navigate to FNOL
    await page.goto('/fnol');
    await expect(page.locator('h2')).toContainText('First Notice of Loss');

    // Step 2: Fill out FNOL form
    // Select policy
    await page.click('mat-select[formControlName="policyId"]');
    await page.click('mat-option:first-child');

    // Select loss type
    await page.click('mat-select[formControlName="lossType"]');
    await page.click('mat-option:has-text("Collision")');

    // Fill severity
    await page.fill('input[formControlName="severityScore"]', '6');

    // Fill date
    await page.fill('input[formControlName="lossDate"]', '2024-10-15');

    // Fill claimant info
    await page.fill('input[formControlName="claimantName"]', 'E2E Test Claimant');
    await page.fill('input[formControlName="claimantPhone"]', '555-9999');

    // Fill description
    await page.fill('textarea[formControlName="lossDescription"]', 'E2E test claim for smoke test');

    // Submit
    await page.click('button:has-text("Submit FNOL")');

    // Should navigate to claim detail
    await expect(page).toHaveURL(/\/claims\/\d+/, { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('Claim CLM-');

    // Step 3: Navigate to triage
    await page.click('text=Triage / Assign');
    await expect(page).toHaveURL(/\/triage/);

    // Auto-assign
    await page.click('button:has-text("Assign Claim")');
    await expect(page.locator('text=Assigned to')).toBeVisible({ timeout: 5000 });

    // Approve reserve with amount
    await page.fill('input[type="number"]', '5000');
    await page.click('button:has-text("Approve Reserve")');
    await expect(page.locator('text=Reserve approved')).toBeVisible({ timeout: 5000 });

    // Step 4: Navigate to settlement
    await page.click('mat-icon:has-text("arrow_back")');
    await expect(page).toHaveURL(/\/claims\/\d+$/);
    await page.click('text=Settlement');
    await expect(page).toHaveURL(/\/settlement/);

    // Issue payment
    await page.fill('input[type="number"]', '4800');
    await page.click('button:has-text("Issue Payment")');
    await expect(page.locator('text=Payment issued')).toBeVisible({ timeout: 5000 });

    // Step 5: Close claim
    await page.click('button:has-text("Close Claim")');
    await expect(page.locator('text=Claim closed')).toBeVisible({ timeout: 5000 });
  });
});

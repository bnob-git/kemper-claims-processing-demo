import { test, expect } from '@playwright/test';

test.describe('Subrogation Workflow E2E', () => {

  test('full workflow with subrogation flag enabled', async ({ page }) => {
    // Step 1: Create a new claim via FNOL
    await page.goto('/fnol');
    await expect(page.locator('h2')).toContainText('First Notice of Loss');

    // Select policy
    await page.click('mat-select[formControlName="policyId"]');
    await page.click('mat-option:first-child');

    // Select loss type - Collision
    await page.click('mat-select[formControlName="lossType"]');
    await page.click('mat-option:has-text("Collision")');

    // Fill severity
    await page.fill('input[formControlName="severityScore"]', '8');

    // Fill date
    await page.fill('input[formControlName="lossDate"]', '2024-11-01');

    // Fill claimant info
    await page.fill('input[formControlName="claimantName"]', 'Subrogation Test User');
    await page.fill('input[formControlName="claimantPhone"]', '555-7777');

    // Fill description
    await page.fill('textarea[formControlName="lossDescription"]', 'E2E subrogation test - third party at fault');

    // Submit
    await page.click('button:has-text("Submit FNOL")');

    // Should navigate to claim detail
    await expect(page).toHaveURL(/\/claims\/\d+/, { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('Claim CLM-');

    // Step 2: Triage and assign
    await page.click('text=Triage / Assign');
    await expect(page).toHaveURL(/\/triage/);

    await page.click('button:has-text("Assign Claim")');
    await expect(page.locator('text=Assigned to')).toBeVisible({ timeout: 5000 });

    // Approve reserve
    await page.fill('input[type="number"]', '8000');
    await page.click('button:has-text("Approve Reserve")');
    await expect(page.locator('text=Reserve approved')).toBeVisible({ timeout: 5000 });

    // Step 3: Navigate to settlement
    await page.click('mat-icon:has-text("arrow_back")');
    await expect(page).toHaveURL(/\/claims\/\d+$/);
    await page.click('text=Settlement');
    await expect(page).toHaveURL(/\/settlement/);

    // Issue payment
    await page.fill('input[type="number"]', '7500');
    await page.click('button:has-text("Issue Payment")');
    await expect(page.locator('text=Payment issued')).toBeVisible({ timeout: 5000 });

    // Step 4: Close claim WITH subrogation enabled
    const subrogationCheckbox = page.locator('mat-checkbox');
    if (await subrogationCheckbox.isVisible()) {
      await subrogationCheckbox.click();
    }
    await page.click('button:has-text("Close Claim")');
    await expect(page.locator('text=Claim closed')).toBeVisible({ timeout: 5000 });
  });
});

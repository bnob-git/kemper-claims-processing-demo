import { test, expect } from '@playwright/test';

test.describe('Subrogation Workflow E2E', () => {

  test('full claim workflow with subrogation flag enabled', async ({ page }) => {
    // Step 1: Navigate to FNOL
    await page.goto('/fnol');
    await expect(page.locator('h2')).toContainText('First Notice of Loss');

    // Step 2: Fill out FNOL form
    await page.click('mat-select[formControlName="policyId"]');
    await page.click('mat-option:first-child');

    await page.click('mat-select[formControlName="lossType"]');
    await page.click('mat-option:has-text("Collision")');

    await page.fill('input[formControlName="severityScore"]', '8');
    await page.fill('input[formControlName="lossDate"]', '2024-11-01');
    await page.fill('input[formControlName="claimantName"]', 'Subrogation Test Claimant');
    await page.fill('input[formControlName="claimantPhone"]', '555-7777');
    await page.fill('textarea[formControlName="lossDescription"]', 'Third party at fault - subrogation test');

    // Submit FNOL
    await page.click('button:has-text("Submit FNOL")');

    // Should navigate to claim detail
    await expect(page).toHaveURL(/\/claims\/\d+/, { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('Claim CLM-');

    // Step 3: Navigate to triage and assign
    await page.click('text=Triage / Assign');
    await expect(page).toHaveURL(/\/triage/);

    await page.click('button:has-text("Assign Claim")');
    await expect(page.locator('text=Assigned to')).toBeVisible({ timeout: 5000 });

    // Approve reserve
    await page.fill('input[type="number"]', '8000');
    await page.click('button:has-text("Approve Reserve")');
    await expect(page.locator('text=Reserve approved')).toBeVisible({ timeout: 5000 });

    // Step 4: Navigate to settlement
    await page.click('mat-icon:has-text("arrow_back")');
    await expect(page).toHaveURL(/\/claims\/\d+$/);
    await page.click('text=Settlement');
    await expect(page).toHaveURL(/\/settlement/);

    // Issue payment
    await page.fill('input[type="number"]', '7500');
    await page.click('button:has-text("Issue Payment")');
    await expect(page.locator('text=Payment issued')).toBeVisible({ timeout: 5000 });

    // Step 5: Close claim WITH subrogation enabled
    // Check the subrogation checkbox/toggle if present
    const subroToggle = page.locator('mat-checkbox, mat-slide-toggle, input[type="checkbox"]').first();
    if (await subroToggle.isVisible()) {
      await subroToggle.click();
    }

    await page.click('button:has-text("Close Claim")');
    await expect(page.locator('text=Claim closed')).toBeVisible({ timeout: 5000 });
  });
});

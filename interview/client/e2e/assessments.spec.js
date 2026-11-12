import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Phase 3 — Timed Diagnostic Assessments & Skill Profile E2E', () => {
  test('starts a timed assessment, autosaves answers, submits, and generates skill profile', async ({ page }) => {
    await registerStudent(page, { name: 'Rohan Verma' });

    await page.goto('/assessments');
    await expect(page.getByRole('heading', { name: 'Placement Assessments' })).toBeVisible();

    // Open the Full Diagnostic or first available assessment
    const startLink = page.getByRole('link', { name: /Start Diagnostic|Take Assessment/i }).first();
    await startLink.click();

    await expect(page.getByRole('button', { name: /Start Timed Assessment|Resume Active Assessment/i })).toBeVisible();
    await page.getByRole('button', { name: /Start Timed Assessment|Resume Active Assessment/i }).click();

    // Verify runner loaded with countdown timer
    await expect(page.getByLabel('Remaining time')).toBeVisible();
    await expect(page.getByText(/Question 1 of/i)).toBeVisible();

    // Select first option on Question 1 and verify autosave indicator
    const firstRadioOrCheckbox = page.locator('input[type="radio"], input[type="checkbox"]').first();
    await firstRadioOrCheckbox.check();
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // Submit assessment via confirmation modal
    await page.getByRole('button', { name: 'Submit Assessment' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm & Submit' }).click();

    // Verify redirect to AssessmentResults page
    await expect(page).toHaveURL(/\/assessment-sessions\/.*\/result/);
    await expect(page.getByRole('link', { name: /View Skill Profile/i })).toBeVisible();

    // Navigate to Skill Profile and verify topics assessed
    await page.getByRole('link', { name: /View Skill Profile/i }).click();
    await expect(page).toHaveURL(/\/skill-profile/);
    await expect(page.getByRole('heading', { name: 'Initial Skill Profile' })).toBeVisible();
  });
});


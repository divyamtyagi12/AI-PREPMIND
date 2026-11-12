import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Phase 4 — BKT Mastery & Adaptive Practice E2E', () => {
  test('views BKT mastery dashboard, starts adaptive practice session, and updates mastery', async ({ page }) => {
    await registerStudent(page, { name: 'Sneha Iyer' });

    // Visit BKT Mastery Dashboard
    await page.goto('/mastery');
    await expect(page.getByRole('heading', { name: 'My Learning Progress' })).toBeVisible();
    await expect(page.getByText('Bayesian Knowledge Tracing (BKT)')).toBeVisible();

    // Navigate to Adaptive Practice Setup
    await page.getByRole('link', { name: /Start Adaptive Practice/i }).click();
    await expect(page).toHaveURL(/\/adaptive\/setup/);
    await expect(page.getByRole('heading', { name: 'Configure Adaptive Practice' })).toBeVisible();

    // Select first Preparation Category
    const categorySelect = page.locator('select').first();
    await expect(categorySelect.locator('option')).not.toHaveCount(1);
    await categorySelect.selectOption({ index: 1 });

    // Start 5-question session
    await page.getByRole('button', { name: /Start Session/i }).click();
    await expect(page).toHaveURL(/\/adaptive\/sessions\/.+/);

    // Answer the first adaptive question and verify BKT Mastery Estimate delta appears
    const firstOptionLabel = page.locator('form label').first();
    await firstOptionLabel.click();
    await page.getByRole('button', { name: 'Submit Answer' }).click();

    await expect(page.getByText('BKT Mastery Estimate')).toBeVisible();
    await expect(page.getByRole('button', { name: /Next Adaptive Question|View Performance Results/i })).toBeVisible();
  });
});


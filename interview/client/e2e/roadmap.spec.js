import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Phase 5 — Personalized Learning Roadmap E2E', () => {
  test('generates a personalized prerequisite-aware roadmap and completes a study task', async ({ page }) => {
    await registerStudent(page, { name: 'Vikram Singh' });

    await page.goto('/roadmap');
    await expect(page.getByRole('heading', { name: 'No Active Placement Roadmap' })).toBeVisible();
    await page.getByRole('link', { name: /Setup My Learning Roadmap/i }).click();

    await expect(page).toHaveURL(/\/roadmap\/setup/);
    await expect(page.getByRole('heading', { name: 'Roadmap Setup Wizard' })).toBeVisible();

    // Step 1 -> Step 2 -> Step 3 -> Step 4 -> Generate
    await page.getByRole('button', { name: /Continue to Timeline/i }).click();
    await page.getByRole('button', { name: /Continue to Availability/i }).click();
    await page.getByRole('button', { name: /Review & Generate/i }).click();
    await page.getByRole('button', { name: /Generate My Roadmap/i }).click();

    await expect(page).toHaveURL(/\/roadmap$/);
    await expect(page.getByRole('heading', { name: 'Personalized Learning Roadmap' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "Today's Study Plan" })).toBeVisible();

    // Complete first task in Today's Study Plan
    const markDoneBtn = page.getByRole('button', { name: /Mark Done/i }).first();
    await expect(markDoneBtn).toBeVisible();
    await markDoneBtn.click();

    await expect(page.getByText('Completed').first()).toBeVisible();
  });
});


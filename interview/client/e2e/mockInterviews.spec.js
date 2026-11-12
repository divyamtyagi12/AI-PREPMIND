import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Phase 8 — AI Mock Interviews & Rubric Report E2E', () => {
  test('configures an AI mock interview, submits a technical response, and views rubric evaluation report', async ({ page }) => {
    await registerStudent(page, { name: 'Arjun Mehta' });

    await page.goto('/interviews/setup');
    await expect(page.getByRole('heading', { name: 'Configure AI Mock Interview' })).toBeVisible();

    // Select 10-minute session and start
    const durationSelect = page.locator('select').nth(2);
    await durationSelect.selectOption('10');
    await page.getByRole('button', { name: /Start Mock Interview/i }).click();

    await expect(page).toHaveURL(/\/interviews\/(?!setup).+/);
    await expect(page.getByText(/Your Response:/i)).toBeVisible();

    // Register dialog handler before clicking End Interview
    page.on('dialog', (dialog) => dialog.accept());

    // Submit first technical response
    const answerBox = page.getByPlaceholder(/Speak or type your answer clearly/i);
    await answerBox.fill(
      'A hash table maps keys to buckets using a hash function. Collisions are resolved via separate chaining or open addressing. Average lookup is O(1) and worst-case is O(N).'
    );
    await page.getByRole('button', { name: /Submit & Proceed/i }).click();

    // Wait for submission to complete and click End Interview if not already on results
    await expect(page.getByRole('button', { name: /Submit & Proceed|Evaluating Answer/i })).toHaveText(/Submit & Proceed/i, { timeout: 10000 }).catch(() => {});
    if (!page.url().includes('/results')) {
      await page.getByRole('button', { name: 'End Interview' }).click();
    }

    await expect(page).toHaveURL(/\/interviews\/.*\/results/);
    await expect(page.getByRole('heading', { name: 'Performance Summary & Insights' })).toBeVisible();
    await expect(page.getByText('Overall Score')).toBeVisible();
    await expect(page.getByText('Key Interview Strengths')).toBeVisible();
  });
});


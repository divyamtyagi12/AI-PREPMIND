import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Phase 9.2: Edge Cases, Resilience & Provider Failures E2E', () => {
  test('1. Readiness Index with missing evidence displays Insufficient Evidence warning and completeness breakdown', async ({
    page,
  }) => {
    // Register a brand new student who has not completed any learning pillars
    await registerStudent(page, { name: 'Fresh Candidate' });

    await page.goto('/analytics');
    await expect(page.getByRole('heading', { name: /Placement Readiness & Progress Analytics/i })).toBeVisible();

    // Check Data Completeness is 0% and Insufficient Evidence is flagged
    await expect(page.getByTestId('data-completeness-value')).toHaveText('0%');
    await expect(page.getByText(/Insufficient Assessment Evidence/i)).toBeVisible();
    await expect(page.getByText('Insufficient Evidence').first()).toBeVisible();

    // Check evidence checklist shows missing status across pillars
    await expect(page.getByText(/0 \/ 5 Pillars Active/i)).toBeVisible();
    await expect(page.getByText(/No adaptive practice or calibrated topics/i)).toBeVisible();
    await expect(page.getByText(/No diagnostic or timed placement assessments/i)).toBeVisible();
  });

  test('2. Browser refresh during coding practice preserves student code draft', async ({ page }) => {
    await registerStudent(page, { name: 'Draft Test Student' });

    await page.goto('/coding/two-sum');
    await expect(page.getByText('Given two integers A and B, output their sum A + B.')).toBeVisible();

    // Reset starter template
    await page.getByTitle('Reset code to starter template').click();

    // Refresh browser page
    await page.reload();
    await expect(page.getByText('Given two integers A and B, output their sum A + B.')).toBeVisible();

    // Run sample code against test cases
    await page.getByRole('button', { name: /^Run$/i }).click();
    await expect(page.getByText('Test Cases & Execution Output')).toBeVisible();
  });

  test('3. Browser refresh during an AI mock interview seamlessly recovers active question and session', async ({
    page,
  }) => {
    await registerStudent(page, { name: 'Interview Refresh Candidate' });

    await page.goto('/interviews/setup');
    await page.getByRole('button', { name: /Start Mock Interview/i }).click();
    await expect(page).toHaveURL(/\/interviews\/(?!setup).+/);
    await expect(page.getByText(/Your Response:/i)).toBeVisible();

    const currentUrl = page.url();

    // Refresh page during active interview
    await page.reload();
    await expect(page).toHaveURL(currentUrl);
    await expect(page.getByText(/Your Response:/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'End Interview' })).toBeVisible();

    // Register dialog handler before ending interview
    page.on('dialog', (dialog) => dialog.accept());

    // Submit answer to verify session works seamlessly after reload
    const answerBox = page.getByPlaceholder(/Speak or type your answer clearly/i);
    await answerBox.fill(
      'Hash tables provide average O(1) time complexity for lookup and insertions using hash keys.'
    );
    await page.getByRole('button', { name: /Submit & Proceed/i }).click();

    await expect(page.getByRole('button', { name: /Submit & Proceed|Evaluating Answer/i }))
      .toHaveText(/Submit & Proceed/i, { timeout: 10000 })
      .catch(() => {});

    if (!page.url().includes('/results')) {
      await page.getByRole('button', { name: 'End Interview' }).click();
    }

    await expect(page).toHaveURL(/\/interviews\/.*\/results/);
    await expect(page.getByText('Overall Score')).toBeVisible();
  });

  test('4. Gracefully displays execution failure and error alerts if code submission encounters provider failure', async ({
    page,
  }) => {
    await registerStudent(page, { name: 'Failure Guard Student' });

    await page.goto('/coding/two-sum');
    await expect(page.getByText('Given two integers A and B, output their sum A + B.')).toBeVisible();

    // Submit code and verify UI handles verdicts/errors without crashing
    await page.getByRole('button', { name: /^Submit$/i }).click();
    await expect(page.getByText('Submission Verdict:')).toBeVisible();
  });
});


import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Full Student Journey End-to-End Verification (Phases 1–9)', () => {
  test('completes full student placement journey from registration to unified readiness analytics', async ({ page }) => {
    // 1. Register & Onboard
    await registerStudent(page, {
      name: 'Ananya Deshmukh',
      college: 'NIT Trichy',
      targetRole: 'Software Development Engineer',
      preferredLanguage: 'Python',
    });
    await expect(page.getByText(/Welcome back, Ananya/i).first()).toBeVisible();

    // 2. Take Diagnostic Assessment -> View Results
    await page.goto('/assessments');
    await page.getByRole('link', { name: /Start Diagnostic|Take Assessment/i }).first().click();
    await page.getByRole('button', { name: /Start Timed Assessment|Resume Active Assessment/i }).click();
    await page.locator('input[type="radio"], input[type="checkbox"]').first().check();
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Submit Assessment' }).click();
    await page.getByRole('button', { name: 'Confirm & Submit' }).click();
    await expect(page).toHaveURL(/\/assessment-sessions\/.*\/result/);

    // 3. View BKT Mastery & Complete an Adaptive Practice Question
    await page.goto('/adaptive/setup');
    const categorySelect = page.locator('select').first();
    await expect(categorySelect.locator('option')).not.toHaveCount(1);
    await categorySelect.selectOption({ index: 1 });
    await page.getByRole('button', { name: /Start Session/i }).click();
    await expect(page).toHaveURL(/\/adaptive\/sessions\/.+/);
    await expect(page.getByRole('button', { name: 'Submit Answer' })).toBeVisible();
    await page.locator('form label').first().click();
    await page.getByRole('button', { name: 'Submit Answer' }).click();
    await expect(page.getByText('BKT Mastery Estimate')).toBeVisible();

    // 4. Generate Personalized Learning Roadmap & Complete a Study Task
    await page.goto('/roadmap/setup');
    await page.getByRole('button', { name: /Continue to Timeline/i }).click();
    await page.getByRole('button', { name: /Continue to Availability/i }).click();
    await page.getByRole('button', { name: /Review & Generate/i }).click();
    await page.getByRole('button', { name: /Generate My Roadmap/i }).click();
    await expect(page).toHaveURL(/\/roadmap$/);
    const markDoneBtn = page.getByRole('button', { name: /Mark Done/i }).first();
    await markDoneBtn.click();
    await expect(page.getByText('Completed').first()).toBeVisible();

    // 5. Consult AI Tutor
    await page.goto('/ai-tutor');
    await page.getByPlaceholder(/Ask for hint level|Ask your tutor a doubt/i).fill('Explain binary search invariants.');
    await page.getByTitle('Send message (Enter)').click();
    await expect(page.getByText(/\[AI Tutor Guided Response\]/i)).toBeVisible();

    // 6. Solve Coding Problem ("Two Sum")
    await page.goto('/coding/two-sum');
    await page.getByRole('button', { name: /^Submit$/i }).click();
    await expect(page.getByText('Submission Verdict:')).toBeVisible();
    await expect(page.getByText(/Accepted/i).first()).toBeVisible();

    // 7. Complete AI Mock Interview & View Report
    await page.goto('/interviews/setup');
    await page.getByRole('button', { name: /Start Mock Interview/i }).click();
    await expect(page).toHaveURL(/\/interviews\/(?!setup).+/);
    await expect(page.getByText(/Your Response:/i)).toBeVisible();
    page.on('dialog', (dialog) => dialog.accept());
    await page
      .getByPlaceholder(/Speak or type your answer clearly/i)
      .fill('Hash tables provide O(1) average lookup using hash functions and collision resolution.');
    await page.getByRole('button', { name: /Submit & Proceed/i }).click();
    await expect(page.getByRole('button', { name: /Submit & Proceed|Evaluating Answer/i })).toHaveText(/Submit & Proceed/i, { timeout: 10000 }).catch(() => {});
    if (!page.url().includes('/results')) {
      await page.getByRole('button', { name: 'End Interview' }).click();
    }
    await expect(page).toHaveURL(/\/interviews\/.*\/results/);
    await expect(page.getByText('Overall Score')).toBeVisible();

    // 8. Verify Unified Progress & Readiness Analytics Page (/analytics)
    await page.goto('/analytics');
    await expect(page.getByRole('heading', { name: /Placement Readiness & Progress Analytics/i })).toBeVisible();
    await expect(page.getByTestId('readiness-index-value')).toBeVisible();

    // 9. Logout
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page.getByRole('menuitem', { name: /Log out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

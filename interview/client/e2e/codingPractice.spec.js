import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Phase 7 — Online Coding Platform & Evaluation E2E', () => {
  test('browses coding problem library, runs sample test cases, and submits code for Accepted verdict', async ({ page }) => {
    await registerStudent(page, { name: 'Devika Patel' });

    await page.goto('/coding');
    await expect(page.getByRole('heading', { name: 'Coding Problem Library' })).toBeVisible();
    await expect(page.getByText('Two Sum')).toBeVisible();

    // Open "Two Sum" coding workspace
    await page.getByRole('link', { name: 'Two Sum' }).click();
    await expect(page).toHaveURL(/\/coding\/two-sum/);
    await expect(page.getByText('Given two integers A and B, output their sum A + B.')).toBeVisible();

    // Click Run against sample test cases
    await page.getByRole('button', { name: /^Run$/i }).click();
    await expect(page.getByText('Test Cases & Execution Output')).toBeVisible();

    // Click Submit for full evaluation against sample + hidden test cases
    await page.getByRole('button', { name: /^Submit$/i }).click();
    await expect(page.getByText('Submission Verdict:')).toBeVisible();
    await expect(page.getByText(/Accepted/i).first()).toBeVisible();
  });
});


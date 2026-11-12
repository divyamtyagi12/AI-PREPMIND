import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Phase 6 — Personalized AI Tutor E2E', () => {
  test('opens AI Tutor, switches tutoring modes, sends a prompt, and receives guided response', async ({ page }) => {
    await registerStudent(page, { name: 'Kavya Rao' });

    await page.goto('/ai-tutor');
    await expect(page.getByText(/How can I assist your prep today\?/i)).toBeVisible();

    // Switch to Hint mode and verify Hint Level selector appears
    await page.getByRole('button', { name: 'Hint', exact: true }).click();
    await expect(page.getByText('Hint Level:')).toBeVisible();

    // Send a prompt via TutorInput
    const input = page.getByPlaceholder(/Ask for hint level|Ask your tutor a doubt/i);
    await input.fill('How does the two-pointer approach work on a sorted array?');
    await page.getByTitle('Send message (Enter)').click();

    // Verify user message and AI Tutor response render
    await expect(page.getByText('How does the two-pointer approach work on a sorted array?')).toBeVisible();
    await expect(page.getByText(/\[AI Tutor Guided Response\]/i)).toBeVisible();
  });
});


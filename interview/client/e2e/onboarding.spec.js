import { test, expect } from '@playwright/test';
import { registerStudent, completeStudentOnboarding } from './helpers';

test.describe('Phase 1 — Student Onboarding & Profile Persistence E2E', () => {
  test('completes 2-step onboarding wizard and persists profile fields to /profile', async ({ page }) => {
    await registerStudent(page, {
      name: 'Priya Nair',
      completeOnboarding: false,
    });

    await expect(page.getByText(/Step 1 of 2/i)).toBeVisible();

    await completeStudentOnboarding(page, {
      college: 'IIT Bombay',
      degree: 'B.Tech / B.E.',
      branch: 'Electrical Engineering',
      graduationYear: '2027',
      targetRole: 'Backend Developer',
      preparationLevel: 'Intermediate',
      preferredLanguage: 'C++',
    });

    // Verify persistence on /profile
    await page.goto('/profile');
    await expect(page.getByLabel(/College \/ University/i)).toHaveValue('IIT Bombay');
    await expect(page.getByLabel(/Branch \/ Major/i)).toHaveValue('Electrical Engineering');
    await expect(page.getByLabel(/Graduation year/i)).toHaveValue('2027');
    await expect(page.getByLabel(/Target job role/i)).toHaveValue('Backend Developer');
  });
});


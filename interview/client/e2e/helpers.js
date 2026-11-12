import { expect } from '@playwright/test';

/**
 * Registers a brand new student and optionally completes the 2-step onboarding flow.
 */
export async function registerStudent(page, options = {}) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const name = options.name || `Student ${uniqueId}`;
  const email = options.email || `student.${uniqueId}@prepmind.edu`;
  const password = options.password || 'StudentPass123!';
  const completeOnboarding = options.completeOnboarding ?? true;

  await page.goto('/register');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/onboarding/);

  if (completeOnboarding) {
    await completeStudentOnboarding(page, options);
  }

  return { name, email, password };
}

export async function completeStudentOnboarding(page, options = {}) {
  const college = options.college || 'National Institute of Technology';
  const degree = options.degree || 'B.Tech / B.E.';
  const branch = options.branch || 'Computer Science & Engineering';
  const graduationYear = options.graduationYear || String(new Date().getFullYear() + 1);
  const targetRole = options.targetRole || 'Software Development Engineer';
  const preparationLevel = options.preparationLevel || 'Intermediate';
  const preferredLanguage = options.preferredLanguage || 'Python';

  // Step 1: Academic Information
  await page.getByLabel(/College \/ University/i).fill(college);
  await page.getByLabel(/Degree/i).selectOption(degree);
  await page.getByLabel(/Branch \/ Major/i).fill(branch);
  await page.getByLabel(/Graduation year/i).fill(graduationYear);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2: Placement Goals
  await page.getByLabel(/Target job role/i).selectOption(targetRole);
  await page.getByLabel(/Preparation level/i).selectOption(preparationLevel);
  await page.getByLabel(/Preferred programming language/i).selectOption(preferredLanguage);
  await page.locator('label', { hasText: 'DSA' }).click();
  await page.locator('label', { hasText: 'Core CS' }).click();
  await page.getByRole('button', { name: 'Finish setup' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
}


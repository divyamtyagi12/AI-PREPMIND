import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Phase 1 — Authentication & Route Protection E2E', () => {
  test('redirects unauthenticated users from protected routes to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('displays validation error on invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nonexistent.user@prepmind.edu');
    await page.getByLabel('Password').fill('WrongPass123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByRole('alert')).toContainText(/incorrect email or password/i);
  });

  test('registers a new student, completes onboarding, logs out, and logs back in', async ({ page }) => {
    const creds = await registerStudent(page, { name: 'Aarav Sharma' });

    await expect(page.getByText(/Welcome back, Aarav/i).first()).toBeVisible();

    // Open profile menu & log out
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page.getByRole('menuitem', { name: /Log out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Log back in with the registered credentials
    await page.getByLabel('Email').fill(creds.email);
    await page.getByLabel('Password').fill(creds.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Welcome back, Aarav/i).first()).toBeVisible();
  });
});


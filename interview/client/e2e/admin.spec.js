import { test, expect } from '@playwright/test';
import { registerStudent } from './helpers';

test.describe('Admin Access Control & Management E2E', () => {
  test('blocks non-admin students from accessing /admin routes', async ({ page }) => {
    await registerStudent(page, { name: 'Student NonAdmin' });

    await page.goto('/admin');
    // AdminRoute redirects non-admin users away from /admin to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('allows admin user to log in, view Admin Overview, and create a new coding problem', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@prepmind.edu');
    await page.getByLabel('Password').fill('AdminPass123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    // Visit Admin Overview
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Overview' })).toBeVisible();
    await expect(page.getByText('Question Bank Management')).toBeVisible();

    // Visit Admin Coding Problems Manager and create a problem
    await page.goto('/admin/coding');
    await expect(page.getByRole('heading', { name: /Coding Problems Management/i })).toBeVisible();

    const uniqueTitle = `Binary Search Check ${Date.now()}`;
    await page.getByLabel('Problem Title').fill(uniqueTitle);
    await page
      .getByLabel('Problem Statement')
      .fill('Given a sorted array of N integers and a target K, return the index of K or -1 if not found.');

    await page.getByRole('button', { name: /Publish Coding Problem/i }).click();
    await expect(page.getByText(uniqueTitle).first()).toBeVisible();
  });
});


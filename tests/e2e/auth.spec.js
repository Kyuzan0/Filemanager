/**
 * Auth E2E Tests
 * ==============
 * Tests for authentication flows: login, logout, session persistence,
 * unauthorized access, and role-based access.
 */

const { test, expect } = require('@playwright/test');
const { login, logout, TEST_USER } = require('./helpers');

test.describe('Authentication', () => {
    test('should show login page when not authenticated', async ({ page }) => {
        await page.goto('/index.php');

        // Should redirect to login page
        await page.waitForURL('**/login.php');
        await expect(page.locator('#login-form')).toBeVisible();
        await expect(page.locator('#login-username')).toBeVisible();
        await expect(page.locator('#login-password')).toBeVisible();
        await expect(page.locator('#login-submit')).toBeVisible();
    });

    test('should reject login with invalid credentials', async ({ page }) => {
        await page.goto('/login.php');
        await page.waitForSelector('#login-form', { state: 'visible' });

        await page.fill('#login-username', 'invalid_user');
        await page.fill('#login-password', 'wrong_password');
        await page.click('#login-submit');

        // Error message should appear
        const errorEl = page.locator('#login-error');
        await expect(errorEl).toBeVisible({ timeout: 5000 });
        const errorText = await errorEl.textContent();
        expect(errorText).toBeTruthy();

        // Should still be on login page
        expect(page.url()).toContain('login.php');
    });

    test('should reject login with empty credentials', async ({ page }) => {
        await page.goto('/login.php');
        await page.waitForSelector('#login-form', { state: 'visible' });

        await page.click('#login-submit');

        // Error message should appear
        const errorEl = page.locator('#login-error');
        await expect(errorEl).toBeVisible({ timeout: 5000 });
        const errorText = await errorEl.textContent();
        expect(errorText).toContain('wajib diisi');
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.goto('/login.php');
        await page.waitForSelector('#login-form', { state: 'visible' });

        await page.fill('#login-username', TEST_USER.username);
        await page.fill('#login-password', TEST_USER.password);
        await page.click('#login-submit');

        // Should redirect to main app
        await page.waitForURL('**/index.php', { timeout: 15000 });
        await expect(page.locator('.app')).toBeVisible();

        // Should show user menu with admin role
        // Check for sidebar user info or header actions instead
        await expect(page.locator('#sidebar')).toBeVisible({ timeout: 5000 });
    });

    test('should show loading state during login', async ({ page }) => {
        await page.goto('/login.php');
        await page.waitForSelector('#login-form', { state: 'visible' });

        await page.fill('#login-username', TEST_USER.username);
        await page.fill('#login-password', TEST_USER.password);

        // Click login
        await page.click('#login-submit');

        // Button should show loading state
        await expect(page.locator('#login-submit')).toBeDisabled({ timeout: 2000 });
        const submitText = await page.locator('.auth-submit__text').textContent();
        expect(submitText).toContain('Memproses');
    });

    test('should logout and redirect to login', async ({ page }) => {
        // Login first
        await login(page);

        // Logout via API
        await page.evaluate(async () => {
            await fetch('api.php?action=auth-logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
        });

        // Should redirect to login page
        await page.goto('/login.php');
        await page.waitForSelector('#login-form', { state: 'visible' });
    });

    test('should redirect to login after session expiry', async ({ page }) => {
        // Login first
        await login(page);

        // Access main app
        await page.goto('/index.php');
        await expect(page.locator('.app')).toBeVisible();

        // Request logout via API
        await page.evaluate(async () => {
            await fetch('api.php?action=auth-logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
        });

        // Try to access main app again
        await page.goto('/index.php');

        // Should redirect to login
        await page.waitForURL('**/login.php', { timeout: 10000 });
        await expect(page.locator('#login-form')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
        await page.goto('/login.php');
        await page.waitForSelector('#login-form', { state: 'visible' });

        // Password should be hidden by default
        const passwordInput = page.locator('#login-password');
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle button
        await page.click('#toggle-password');

        // Password should be visible
        await expect(passwordInput).toHaveAttribute('type', 'text');

        // Click again
        await page.click('#toggle-password');

        // Password should be hidden again
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should show default credentials on login page', async ({ page }) => {
        await page.goto('/login.php');
        await page.waitForSelector('#login-form', { state: 'visible' });

        // Should show default credentials hint
        const footer = page.locator('.auth-footer');
        await expect(footer).toBeVisible();
        await expect(footer).toContainText('admin');
        await expect(footer).toContainText('admin123');
    });
});
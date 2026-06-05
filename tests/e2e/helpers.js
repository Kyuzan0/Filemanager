/**
 * E2E Test Helpers & Fixtures
 * ===========================
 * Shared utilities for Playwright tests.
 */

const { test: base, expect } = require('@playwright/test');

/**
 * Default test credentials
 */
const TEST_USER = {
    username: 'admin',
    password: 'admin123',
};

/**
 * Login via UI form - fills the login form and submits
 * @param {import('@playwright/test').Page} page
 * @param {object} credentials
 */
async function login(page, credentials = TEST_USER) {
    await page.goto('/login.php');
    await page.waitForSelector('#login-form', { state: 'visible' });

    await page.fill('#login-username', credentials.username);
    await page.fill('#login-password', credentials.password);
    await page.click('#login-submit');

    // Wait for redirect to main app
    await page.waitForURL('**/index.php', { timeout: 15000 });
    await page.waitForSelector('.app', { state: 'visible', timeout: 10000 });
}

/**
 * Login via API using fetch() in the browser context
 * This properly sets Referer header for CSRF check
 * @param {import('@playwright/test').Page} page
 * @param {object} credentials
 */
async function loginViaApi(page, credentials = TEST_USER) {
    // First navigate to login page to get session cookie and set Referer
    await page.goto('/login.php');
    await page.waitForSelector('#login-form', { state: 'visible' });

    // Use fetch() in the browser context - this sets Referer header
    const result = await page.evaluate(async (creds) => {
        const response = await fetch('api.php?action=auth-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds),
        });
        return response.json();
    }, credentials);

    if (!result || !result.success) {
        throw new Error(`Login via API failed: ${result?.error || 'Unknown error'}`);
    }

    // Navigate to main app
    await page.goto('/index.php');
    await page.waitForSelector('.app', { state: 'visible', timeout: 10000 });
}

/**
 * Logout via API
 * @param {import('@playwright/test').Page} page
 */
async function logout(page) {
    await page.evaluate(async () => {
        await fetch('api.php?action=auth-logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        });
    });
    await page.goto('/login.php');
    await page.waitForSelector('#login-form', { state: 'visible' });
}

/**
 * Create a folder via API
 * @param {import('@playwright/test').Page} page
 * @param {string} folderName
 * @param {string} path - relative path, defaults to ''
 */
async function createFolderViaApi(page, folderName, path = '') {
    const result = await page.evaluate(async ({ name, filePath }) => {
        const res = await fetch(
            `api.php?action=create&path=${encodeURIComponent(filePath)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type: 'folder' }),
            }
        );
        const data = await res.json();
        return data;
    }, { name: folderName, filePath: path });
    if (!result || result.success === false) {
        throw new Error(`createFolderViaApi failed: ${result?.error || 'Unknown error'}`);
    }
    return result;
}

/**
 * Delete a file/folder via API
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} path - relative path, defaults to ''
 */
async function deleteItemViaApi(page, name, path = '') {
    const fullPath = path ? `${path}/${name}` : name;
    const result = await page.evaluate(async (encodedPath) => {
        const res = await fetch(
            `api.php?action=delete`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: encodedPath })
            }
        );
        const data = await res.json();
        return data;
    }, fullPath);
    if (!result || result.success === false) {
        throw new Error(`deleteItemViaApi failed: ${result?.error || 'Unknown error'}`);
    }
    return result;
}

/**
 * Wait for the loader overlay to disappear
 * @param {import('@playwright/test').Page} page
 */
async function waitForLoader(page) {
    const loader = page.locator('#loader-overlay');
    try {
        await loader.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
        // Loader might not appear
    }
    await loader.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
}

/**
 * Open the "New" overlay to create a file/folder
 * @param {import('@playwright/test').Page} page
 */
async function openNewOverlay(page) {
    await page.click('#newBtn');
    await page.waitForSelector('#create-overlay', { state: 'visible', timeout: 5000 });
}

/**
 * Open the rename overlay for a specific item
 * @param {import('@playwright/test').Page} page
 * @param {string} itemName
 */
async function openRenameOverlay(page, itemName) {
    // Right-click to open context menu
    const row = page.locator(`tr[data-path="${itemName}"]`);
    await row.click({ button: 'right' });
    await page.waitForSelector('#contextMenu:not(.hidden)', { state: 'visible', timeout: 3000 });
    await page.click('#contextMenu [data-action="rename"]');
    await page.waitForSelector('#rename-overlay', { state: 'visible', timeout: 5000 });
}

/**
 * Get the count of items in the file table
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function getItemCount(page) {
    await waitForLoader(page);
    const rows = page.locator('#fileTable tbody tr');
    return rows.count();
}

/**
 * Wait for toast notification
 * @param {import('@playwright/test').Page} page
 * @param {string} text - partial text to match
 */
async function waitForToast(page, text) {
    const toast = page.locator('.toast', { hasText: text });
    await toast.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Reload the page and wait for the directory listing response
 * @param {import('@playwright/test').Page} page
 */
async function reloadPage(page) {
    await Promise.all([
        page.reload(),
        page.waitForResponse(res => res.url().includes('action=list') && res.status() === 200, { timeout: 10000 }).catch(() => {})
    ]);
    await waitForLoader(page);
}

module.exports = {
    TEST_USER,
    login,
    loginViaApi,
    logout,
    createFolderViaApi,
    deleteItemViaApi,
    waitForLoader,
    openNewOverlay,
    openRenameOverlay,
    getItemCount,
    waitForToast,
    reloadPage,
};
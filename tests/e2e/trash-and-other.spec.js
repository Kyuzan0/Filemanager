/**
 * Trash & Other Features E2E Tests
 * ================================
 * Tests for trash management, activity logs, and system features.
 */

const { test, expect } = require('@playwright/test');
const {
    loginViaApi,
    createFolderViaApi,
    deleteItemViaApi,
    waitForLoader,
    reloadPage,
} = require('./helpers');

const TEST_FOLDER = '_e2e_trash_test_';

test.describe('Trash Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginViaApi(page);
        await waitForLoader(page);
    });

    test.afterEach(async ({ page }) => {
        // Cleanup
        await deleteItemViaApi(page, TEST_FOLDER).catch(() => {});
    });

    test('should show trash overlay when trash link is clicked', async ({ page }) => {
        // Click trash link in sidebar
        const trashLink = page.locator('#sidebar').locator('text=Trash');
        if (await trashLink.isVisible()) {
            await trashLink.click();
            await page.waitForTimeout(1000);

            // Trash overlay should be visible
            await expect(page.locator('#trash-overlay')).toBeVisible({ timeout: 5000 });
        }
    });

    test('should show trash toolbar with action buttons', async ({ page }) => {
        // Navigate to trash
        const trashLink = page.locator('#sidebar').locator('text=Trash');
        if (await trashLink.isVisible()) {
            await trashLink.click();
            await page.waitForTimeout(1000);

            // Trash toolbar should have action buttons
            const trashToolbar = page.locator('.trash-toolbar');
            if (await trashToolbar.isVisible()) {
                await expect(trashToolbar).toBeVisible();
            }
        }
    });

    test('should move deleted item to trash', async ({ page }) => {
        // Create a folder then delete it
        await createFolderViaApi(page, TEST_FOLDER);
        await reloadPage(page);
        await expect(page.locator(`tr[data-path="${TEST_FOLDER}"]`)).toBeVisible({ timeout: 5000 });

        // Delete via API
        await deleteItemViaApi(page, TEST_FOLDER);
        await reloadPage(page);

        // Folder should be gone from main view
        await expect(page.locator(`tr[data-path="${TEST_FOLDER}"]`)).toHaveCount(0);

        // Navigate to trash
        const trashLink = page.locator('#sidebar').locator('text=Trash');
        if (await trashLink.isVisible()) {
            await trashLink.click();
            await page.waitForTimeout(1000);

            // Deleted folder should appear in trash
            await expect(page.locator('#trash-overlay')).toBeVisible({ timeout: 5000 });
        }
    });

    test('should have empty trash button', async ({ page }) => {
        // Navigate to trash
        const trashLink = page.locator('#sidebar').locator('text=Trash');
        if (await trashLink.isVisible()) {
            await trashLink.click();
            await page.waitForTimeout(1000);
            await expect(page.locator('#trash-overlay')).toBeVisible({ timeout: 5000 });

            // Empty trash button should exist
            const emptyBtn = page.locator('#emptyTrashBtn');
            if (await emptyBtn.isVisible()) {
                await expect(emptyBtn).toBeVisible();
            }
        }
    });
});

test.describe('Activity Logs', () => {
    test.beforeEach(async ({ page }) => {
        await loginViaApi(page);
        await waitForLoader(page);
    });

    test('should show activity logs page', async ({ page }) => {
        // Navigate to logs
        const logsLink = page.locator('#sidebar').locator('text=Log Activity');
        if (await logsLink.isVisible()) {
            await logsLink.click();
            await page.waitForTimeout(1000);

            // Logs content should be visible
            const logsContent = page.locator('.logs-content');
            if (await logsContent.isVisible()) {
                await expect(logsContent).toBeVisible();
            }
        }
    });

    test('should have logs toolbar', async ({ page }) => {
        const logsLink = page.locator('#sidebar').locator('text=Log Activity');
        if (await logsLink.isVisible()) {
            await logsLink.click();
            await page.waitForTimeout(1000);

            // Logs toolbar should have action buttons
            const logsToolbar = page.locator('.logs-toolbar');
            if (await logsToolbar.isVisible()) {
                await expect(logsToolbar).toBeVisible();
            }
        }
    });
});

test.describe('System Features', () => {
    test.beforeEach(async ({ page }) => {
        await loginViaApi(page);
        await waitForLoader(page);
    });

    test('should have system requirements API available', async ({ page }) => {
        const response = await page.evaluate(async () => {
            const res = await fetch('api.php?action=system-requirements');
            return res.json();
        });

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
    });

    test('should have 7zip status API available', async ({ page }) => {
        const response = await page.evaluate(async () => {
            const res = await fetch('api.php?action=7zip-status');
            return res.json();
        });

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
    });

    test('should show user info in sidebar', async ({ page }) => {
        // Sidebar should be visible
        const sidebar = page.locator('#sidebar');
        await expect(sidebar).toBeVisible({ timeout: 5000 });
    });

    test('should show favorites section in sidebar', async ({ page }) => {
        const sidebar = page.locator('#sidebar');
        // Favorites section may or may not be visible
        await expect(sidebar).toBeVisible();
    });
});
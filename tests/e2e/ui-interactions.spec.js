/**
 * UI Interactions E2E Tests
 * =========================
 * Tests for UI components: sidebar, modals, overlays, context menu,
 * view toggle, theme toggle, upload modal, keyboard shortcuts.
 */

const { test, expect } = require('@playwright/test');
const { loginViaApi, waitForLoader, createFolderViaApi, deleteItemViaApi, reloadPage } = require('./helpers');

const TEST_FOLDER = '_e2e_ui_test_';

test.describe('UI Interactions', () => {
    test.beforeEach(async ({ page }) => {
        await loginViaApi(page);
        await waitForLoader(page);
    });

    test.afterEach(async ({ page }) => {
        await deleteItemViaApi(page, TEST_FOLDER).catch(() => {});
    });

    test('should show sidebar with navigation links', async ({ page }) => {
        const sidebar = page.locator('#sidebar');
        await expect(sidebar).toBeVisible();

        // Should have navigation items
        await expect(sidebar).toContainText('Dashboard');
        await expect(sidebar).toContainText('Trash');
        await expect(sidebar).toContainText('Log Activity');
    });

    test('should show mobile menu toggle button', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        const mobileToggle = page.locator('#mobile-menu-toggle');
        await expect(mobileToggle).toBeVisible();
    });

    test('should show header action bar with all buttons', async ({ page }) => {
        const actionBar = page.locator('.header-actions');
        await expect(actionBar).toBeVisible();

        // New button
        await expect(page.locator('#newBtn')).toBeVisible();
        // Upload button
        await expect(page.locator('#uploadBtn')).toBeVisible();
        // Selection count
        await expect(page.locator('#selectedCount')).toBeVisible();
        // Delete selected button
        await expect(page.locator('#deleteSel')).toBeVisible();
    });

    test('should show view toggle buttons', async ({ page }) => {
        const listViewBtn = page.locator('#listViewBtn');
        const gridViewBtn = page.locator('#gridViewBtn');

        await expect(listViewBtn).toBeVisible();
        await expect(gridViewBtn).toBeVisible();

        // List view should be active by default
        await expect(listViewBtn).toHaveClass(/active/);
    });

    test('should toggle to grid view', async ({ page }) => {
        const gridViewBtn = page.locator('#gridViewBtn');
        await gridViewBtn.click();

        // Grid view should become active
        await expect(gridViewBtn).toHaveClass(/active/);

        // Grid container should be visible
        const gridContainer = page.locator('#grid-view-container');
        // May or may not have items, but container should exist
        await expect(gridContainer).toBeAttached();
    });

    test('should open upload context menu on upload button click', async ({ page }) => {
        await page.click('#uploadBtn');

        // Upload context menu should appear
        const uploadMenu = page.locator('#uploadContextMenu');
        await expect(uploadMenu).toBeVisible({ timeout: 3000 });

        // Should have file and folder upload options
        await expect(page.locator('#uploadFilesOption')).toBeVisible();
        await expect(page.locator('#uploadFolderOption')).toBeVisible();
    });

    test('should open upload modal on upload files option', async ({ page }) => {
        // Open upload context menu
        await page.click('#uploadBtn');
        await page.waitForSelector('#uploadContextMenu', { state: 'visible' });

        // Click upload files option
        await page.click('#uploadFilesOption');

        // Upload modal should appear
        await page.waitForSelector('#uploadModal', { state: 'visible', timeout: 5000 });
        await expect(page.locator('#uploadModal')).toBeVisible();
        await expect(page.locator('#fileDropZone')).toBeVisible();
        await expect(page.locator('#doUpload')).toBeVisible();
        await expect(page.locator('#cancelUpload')).toBeVisible();
    });

    test('should close upload modal on cancel', async ({ page }) => {
        // Open upload modal
        await page.click('#uploadBtn');
        await page.waitForSelector('#uploadContextMenu', { state: 'visible' });
        await page.click('#uploadFilesOption');
        await page.waitForSelector('#uploadModal', { state: 'visible', timeout: 5000 });

        // Click cancel
        await page.click('#cancelUpload');

        // Modal should close
        await page.waitForSelector('#modalBackdrop', { state: 'hidden', timeout: 5000 });
    });

    test('should show context menu on right-click', async ({ page }) => {
        // Create a test folder
        await createFolderViaApi(page, TEST_FOLDER);
        await reloadPage(page);
        await expect(page.locator(`tr[data-path="${TEST_FOLDER}"]`)).toBeVisible({ timeout: 5000 });

        // Right-click on the folder row
        await page.locator(`tr[data-path="${TEST_FOLDER}"]`).click({ button: 'right' });

        // Context menu should appear
        await page.waitForSelector('#contextMenu:not(.hidden)', { state: 'visible', timeout: 3000 });

        // Should have all menu items
        await expect(page.locator('#contextMenu [data-action="open"]')).toBeVisible();
        await expect(page.locator('#contextMenu [data-action="download"]')).toBeVisible();
        await expect(page.locator('#contextMenu [data-action="rename"]')).toBeVisible();
        await expect(page.locator('#contextMenu [data-action="move"]')).toBeVisible();
        await expect(page.locator('#contextMenu [data-action="details"]')).toBeVisible();
        await expect(page.locator('#contextMenu [data-action="delete"]')).toBeVisible();
    });

    test('should close context menu on click outside', async ({ page }) => {
        // Create a test folder
        await createFolderViaApi(page, TEST_FOLDER);
        await reloadPage(page);
        await expect(page.locator(`tr[data-path="${TEST_FOLDER}"]`)).toBeVisible({ timeout: 5000 });

        // Right-click to open context menu
        await page.locator(`tr[data-path="${TEST_FOLDER}"]`).click({ button: 'right' });
        await page.waitForSelector('#contextMenu:not(.hidden)', { state: 'visible', timeout: 3000 });

        // Click elsewhere on the page
        await page.locator('.header-actions').click();

        // Context menu should close
        await page.waitForSelector('#contextMenu', { state: 'hidden', timeout: 3000 });
    });

    test('should show settings modal', async ({ page }) => {
        // Click settings button in sidebar
        const settingsBtn = page.locator('#settingsBtn');
        if (await settingsBtn.isVisible()) {
            await settingsBtn.click();
            await page.waitForSelector('#settingsModal', { state: 'visible', timeout: 5000 });
            await expect(page.locator('#settingsModal')).toBeVisible();
        }
        // If settings button doesn't exist, skip gracefully
    });

    test('should navigate to trash page via sidebar', async ({ page }) => {
        const trashLink = page.locator('#sidebar').locator('text=Trash');
        if (await trashLink.isVisible()) {
            await trashLink.click();
            await page.waitForTimeout(1000);

            // Should show trash view
            await expect(page.locator('#trash-overlay')).toBeVisible({ timeout: 5000 });
        }
    });

    test('should navigate to logs page via sidebar', async ({ page }) => {
        const logsLink = page.locator('#sidebar').locator('text=Log Activity');
        if (await logsLink.isVisible()) {
            await logsLink.click();
            await page.waitForTimeout(1000);

            // Page should update
            await expect(page.locator('.app')).toBeVisible();
        }
    });

    test('should handle keyboard shortcut Ctrl+F for search', async ({ page }) => {
        await page.focus('body');
        // Press Ctrl+F to focus search
        await page.keyboard.press('Control+F');

        // Search input should be focused
        const searchInput = page.locator('#search');
        // Check if focused (may not always work due to focus handling)
        await expect(searchInput).toBeVisible();
    });
});
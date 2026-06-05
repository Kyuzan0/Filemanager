/**
 * App Initializer Module
 * Berisi fungsi-fungsi untuk menginisialisasi aplikasi
 * @version 1.3.0 - Added state persistence with localStorage
 */

import { state, updateState } from './state.js';
import { elements, config, previewableExtensions, mediaPreviewableExtensions } from './constants.js';
import {
    saveSortPreferences,
    loadSortPreferences,
    saveLastPath,
    loadLastPath,
    isLocalStorageAvailable,
    savePaginationPageSize,
    loadPaginationPageSize
} from './storage.js';
import {
    setupFilterHandler,
    setupSortHandlers,
    setupSelectAllHandler,
    setupDeleteSelectedHandler,
    setupUploadHandler,
    setupPreviewEditorHandler,
    setupPreviewOverlayHandler,
    setupConfirmOverlayHandler,
    setupCreateOverlayHandler,
    setupRenameOverlayHandler,
    setupUnsavedOverlayHandler,
    setupKeyboardHandler,
    setupVisibilityHandler,
    setupContextMenuHandler,
    setupSplitActionHandler,
    setupLogExportHandler,
    setupUploadDesktopHandler,
    setupUploadFolderHandler,
    setupUploadFolderDesktopHandler,
    setupDeleteSelectedDesktopHandler,
    setupSearchModalHandler,
    setupSelectAllMobileButtonHandler,
    setupMobileActionsHandler
} from './eventHandlers.js';
import {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleDragLeave,
    setupFileCardDropZone
} from './dragDrop.js';
import { fetchDirectory } from './apiService.js';
import { pasteItems } from './fileOperations.js';
import { copySelectedItems, cutSelectedItems, getClipboard, clearClipboard, hasClipboardItems, registerHandlers as registerShortcutHandlers } from './keyboardShortcuts.js';
import { renderItems as renderItemsComplex, updateSortUI, syncRowSelection, syncMobileSelection } from './uiRenderer.js';
import { updatePaginationState } from './pagination.js';
import { showSkeletons } from './ui/skeletonRenderer.js';
import { initUploadManager, showUploadModal } from './ui/uploadManager.js';
import { initCommandPalette, open as openCommandPalette } from './ui/commandPalette.js';
import { initUndoManager, undo as undoLastAction, canUndo } from './ui/undoManager.js';
import { openBulkRename } from './ui/bulkRenameModal.js';
import { initContentSearch, open as openContentSearch } from './ui/contentSearch.js';
import { initAuth, isAdmin, canWrite } from './auth.js';
import { openShareModal } from './ui/shareModal.js';
import { initDualPane, toggleDualPane, isDualPaneActive } from './ui/dualPane.js';
import { initI18n, t, setLanguage, getCurrentLanguage, getSupportedLanguages } from './i18n.js';
import { initErrorBoundary } from './ui/errorBoundary.js';

// Lazy-loaded modules (loaded on-demand for better performance)
let moveOverlayModule = null;
let logManagerModule = null;

// ---------------------------------------------------------------------------
// Pagination state (inlined from pagination-simple to reduce module latency)
// ---------------------------------------------------------------------------

const paginationConfig = {
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 0,
    totalItems: 0
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const compactLayoutState = {
    active: false,
    resizeListenerAttached: false
};

const storedItemsPerPage = loadPaginationPageSize(paginationConfig.itemsPerPage);
if (PAGE_SIZE_OPTIONS.includes(storedItemsPerPage)) {
    paginationConfig.itemsPerPage = storedItemsPerPage;
} else if (storedItemsPerPage !== paginationConfig.itemsPerPage) {
    savePaginationPageSize(paginationConfig.itemsPerPage);
}

function updatePaginationInfo(totalItems) {
    paginationConfig.totalItems = totalItems;
    paginationConfig.totalPages = Math.max(1, Math.ceil(totalItems / paginationConfig.itemsPerPage));

    if (paginationConfig.currentPage > paginationConfig.totalPages) {
        paginationConfig.currentPage = Math.max(1, paginationConfig.totalPages);
    }
}

function getCurrentPageItems(items) {
    const startIdx = (paginationConfig.currentPage - 1) * paginationConfig.itemsPerPage;
    const endIdx = startIdx + paginationConfig.itemsPerPage;
    return items.slice(startIdx, endIdx);
}

function goToPage(page, allItems) {
    if (page < 1 || page > paginationConfig.totalPages || page === paginationConfig.currentPage) {
        return getCurrentPageItems(allItems);
    }

    paginationConfig.currentPage = page;
    return getCurrentPageItems(allItems);
}

function renderSimplePagination(container, onPageChange) {
    if (!container) {
        return;
    }

    const { currentPage, totalPages, totalItems, itemsPerPage } = paginationConfig;
    const hasItems = totalItems > 0;
    const showNavigation = totalPages > 1;

    container.innerHTML = '';

    // Don't hide the container, let the wrapper handle visibility
    if (!hasItems) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    const wrapper = document.createElement('div');
    wrapper.className = 'pagination-controls';

    const info = document.createElement('div');
    info.className = 'pagination-info text-sm text-muted';
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    info.textContent = `Menampilkan ${startItem}-${endItem} dari ${totalItems.toLocaleString('id-ID')} items`;

    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'pagination-nav';

    const navigationWrapper = document.createElement('div');
    navigationWrapper.className = 'pagination-buttons';
    if (!showNavigation) {
        navigationWrapper.classList.add('hidden');
    }

    if (showNavigation) {
        const prevBtn = createPaginationButton('&laquo; Prev', currentPage > 1, () => {
            goToPageAndUpdate(currentPage - 1, onPageChange);
        });
        navigationWrapper.appendChild(prevBtn);

        const pageRange = getPageRange(currentPage, totalPages);
        pageRange.forEach(page => {
            if (page === '...') {
                const dots = document.createElement('span');
                dots.className = 'pagination-ellipsis';
                dots.textContent = '...';
                navigationWrapper.appendChild(dots);
            } else {
                const pageBtn = createPaginationButton(
                    page.toString(),
                    true,
                    () => goToPageAndUpdate(page, onPageChange),
                    page === currentPage
                );
                navigationWrapper.appendChild(pageBtn);
            }
        });

        const nextBtn = createPaginationButton('Next &raquo;', currentPage < totalPages, () => {
            goToPageAndUpdate(currentPage + 1, onPageChange);
        });
        navigationWrapper.appendChild(nextBtn);
    }

    const perPageWrapper = document.createElement('div');
    perPageWrapper.className = 'pagination-page-size';

    const perPageLabel = document.createElement('span');
    perPageLabel.className = 'pagination-page-size-label';
    perPageLabel.textContent = 'Item per halaman';

    const perPageSelect = document.createElement('select');
    perPageSelect.className = 'pagination-page-size-select';
    perPageSelect.setAttribute('aria-label', 'Item per halaman');

    PAGE_SIZE_OPTIONS.forEach((size) => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        if (size === itemsPerPage) {
            option.selected = true;
        }
        perPageSelect.appendChild(option);
    });

    perPageSelect.addEventListener('change', (event) => {
        const selectedValue = Number(event.target.value);
        if (!Number.isNaN(selectedValue)) {
            changeItemsPerPage(selectedValue);
        }
    });

    perPageWrapper.appendChild(perPageLabel);
    perPageWrapper.appendChild(perPageSelect);

    controlsWrapper.appendChild(navigationWrapper);
    controlsWrapper.appendChild(perPageWrapper);

    wrapper.appendChild(info);
    wrapper.appendChild(controlsWrapper);
    container.appendChild(wrapper);
}

/**
 * Render mobile pagination UI
 */
function renderMobilePagination(container, onPageChange) {
    if (!container) {
        return;
    }

    const { currentPage, totalPages, totalItems, itemsPerPage } = paginationConfig;
    const hasItems = totalItems > 0;

    container.innerHTML = '';

    if (!hasItems) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    // Top row: Info text with dropdown
    const topRow = document.createElement('div');
    topRow.className = 'pagination-mobile-top-row-new';

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Info text
    const info = document.createElement('span');
    info.className = 'pagination-mobile-info-new';
    info.textContent = `Menampilkan ${startItem}-${endItem} dari ${totalItems} items`;
    topRow.appendChild(info);

    // Dropdown selector
    const select = document.createElement('select');
    select.className = 'pagination-mobile-select-new';
    select.setAttribute('aria-label', 'Items per page');

    const itemsOptions = [10, 25, 50, 100];
    itemsOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === itemsPerPage) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
        const newValue = parseInt(e.target.value, 10);
        paginationConfig.itemsPerPage = newValue;
        paginationConfig.currentPage = 1;
        resetPagination();
        renderItems(state.items, state.lastUpdated, false);
        updatePaginationState();
    });

    topRow.appendChild(select);
    container.appendChild(topRow);

    // Bottom row: Navigation with page numbers
    const bottomRow = document.createElement('div');
    bottomRow.className = 'pagination-mobile-bottom-row-new';

    // Left arrow button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-mobile-arrow-btn';
    prevBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            goToPageAndUpdate(currentPage - 1, onPageChange);
        }
    });
    bottomRow.appendChild(prevBtn);

    // Page numbers in center
    const pageNumbersContainer = document.createElement('div');
    pageNumbersContainer.className = 'pagination-mobile-page-numbers';

    if (totalPages > 1) {
        const pageRange = getPageRange(currentPage, totalPages);
        pageRange.forEach(page => {
            if (page === '...') {
                const dots = document.createElement('span');
                dots.className = 'pagination-ellipsis';
                dots.textContent = '...';
                pageNumbersContainer.appendChild(dots);
            } else {
                const pageBtn = document.createElement('button');
                const isActive = page === currentPage;
                pageBtn.className = isActive
                    ? 'pagination-mobile-page-btn active'
                    : 'pagination-mobile-page-btn';
                pageBtn.textContent = page;
                pageBtn.disabled = isActive;
                if (!isActive) {
                    pageBtn.addEventListener('click', () => {
                        goToPageAndUpdate(page, onPageChange);
                    });
                }
                pageNumbersContainer.appendChild(pageBtn);
            }
        });
    } else {
        // Single page - show "1" button
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-mobile-page-btn active';
        pageBtn.textContent = '1';
        pageBtn.disabled = true;
        pageNumbersContainer.appendChild(pageBtn);
    }

    bottomRow.appendChild(pageNumbersContainer);

    // Right arrow button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-mobile-arrow-btn';
    nextBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            goToPageAndUpdate(currentPage + 1, onPageChange);
        }
    });
    bottomRow.appendChild(nextBtn);

    container.appendChild(bottomRow);
}

function createPaginationButton(text, enabled, onClick, isActive = false) {
    const btn = document.createElement('button');
    btn.className = isActive
        ? 'pagination-page-btn active'
        : 'pagination-page-btn';
    btn.innerHTML = text;
    btn.disabled = !enabled || isActive;

    if (enabled && !isActive) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            onClick();
        });
    }

    return btn;
}

function getPageRange(currentPage, totalPages) {
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [1];

    if (currentPage > 3) {
        pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i += 1) {
        pages.push(i);
    }

    if (currentPage < totalPages - 2) {
        pages.push('...');
    }

    if (totalPages > 1) {
        pages.push(totalPages);
    }

    return pages;
}

function goToPageAndUpdate(page, callback) {
    if (page < 1 || page > paginationConfig.totalPages || page === paginationConfig.currentPage) {
        return;
    }

    paginationConfig.currentPage = page;

    if (callback) {
        callback(page);
    }
}

function resetPagination() {
    paginationConfig.currentPage = 1;
}

function changeItemsPerPage(newItemsPerPage) {
    const parsedValue = Number(newItemsPerPage);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return;
    }

    const normalizedValue = PAGE_SIZE_OPTIONS.includes(parsedValue)
        ? parsedValue
        : PAGE_SIZE_OPTIONS[0];

    if (paginationConfig.itemsPerPage === normalizedValue) {
        return;
    }

    paginationConfig.itemsPerPage = normalizedValue;
    paginationConfig.currentPage = 1;

    savePaginationPageSize(normalizedValue);
    updatePaginationInfo(paginationConfig.totalItems);

    const items = Array.isArray(state.items) ? state.items : [];
    renderItems(items, state.lastUpdated, false);
}
let moveOverlayLoading = null;
let logManagerLoading = null;

/**
 * Lazy load MoveOverlay module
 * Reduces initial bundle size by ~15KB
 * @returns {Promise<Object>} The MoveOverlay module
 */
async function loadMoveOverlay() {
    if (moveOverlayModule) {
        return moveOverlayModule;
    }
    if (moveOverlayLoading) {
        return moveOverlayLoading;
    }

    const startTime = performance.now();

    moveOverlayLoading = import('./moveOverlay.js')
        .then(module => {
            moveOverlayModule = module;
            return module;
        })
        .catch(error => {
            console.error('[Code Splitting] Failed to load MoveOverlay:', error);
            moveOverlayLoading = null;
            throw error;
        });

    return moveOverlayLoading;
}

/**
 * Lazy load LogManager module
 * Reduces initial bundle size by ~20KB
 * @returns {Promise<Object>} The LogManager module
 */
import {
    openPreviewOverlay,
    closePreviewOverlay,
    openConfirmOverlay,
    closeConfirmOverlay,
    openCreateOverlay,
    closeCreateOverlay,
    openRenameOverlay,
    closeRenameOverlay,
    closeUnsavedOverlay,
    setPreviewMode,
    ensurePreviewViewer,
    openMediaPreview as openMediaPreviewModal
} from './modals.js';
import {
    deleteItems,
    moveItem,
    renameItem,
    createItem,
    uploadFiles,
    uploadFolder
} from './fileOperations.js';
import {
    hasUnsavedChanges,
    compareItems,
    getSortDescription,
    synchronizeSelection,
    copyPathToClipboard,
    getFileExtension,
    isWordDocument,
    buildFileUrl,
    formatBytes,
    formatDate,
    throttle
} from './utils.js';
// LogManager will be lazy-loaded when needed
// Create a basic logger that will be replaced when logManager loads
const logger = {
    info: (msg, data) => console.error(`[INITIALIZER INFO] ${msg}`, data || ''),
    error: (msg, error) => console.error(`[INITIALIZER ERROR] ${msg}`, error || ''),
    warn: (msg, data) => console.warn(`[INITIALIZER WARN] ${msg}`, data || '')
};

// Internal helper functions
function confirmDiscardChanges(message) {
    return new Promise((resolve) => {
        if (confirm(message)) {
            resolve(true);
        } else {
            resolve(false);
        }
    });
}

function setSelectionForVisible(isSelected) {
    state.visibleItems.forEach((item) => {
        if (isSelected) {
            state.selected.add(item.path);
        } else {
            state.selected.delete(item.path);
        }
    });
    updateSelectionUI();
}

// Helper function for flash status
function flashStatus(message) {
    if (elements.statusInfo) {
        elements.statusInfo.textContent = message;
        setTimeout(() => {
            if (elements.statusInfo && elements.statusInfo.textContent === message) {
                elements.statusInfo.textContent = `${state.visibleItems.length} item ditampilkan`;
            }
        }, 3000);
    }
}

// Helper function for set error
function setError(message) {
    if (elements.errorBanner) {
        elements.errorBanner.textContent = message;
        elements.errorBanner.hidden = !message;
        if (message) {
            setTimeout(() => {
                if (elements.errorBanner) {
                    elements.errorBanner.hidden = true;
                    elements.errorBanner.textContent = '';
                }
            }, 5000);
        }
    }
}

// Helper function for set loading
function setLoading(loading) {
    updateState({ isLoading: loading });
    if (elements.loaderOverlay) {
        elements.loaderOverlay.classList.toggle('visible', loading);
    }
    if (elements.btnRefresh) {
        elements.btnRefresh.disabled = loading;
    }
}

/**
 * EMERGENCY FAILSAFE: Force clear ALL loading states
 * Call this if loading indicators get stuck
 * @param {string} source - Where this was called from for debugging
 */
function clearAllLoadingStates(source = 'unknown') {
    const timestamp = new Date().toISOString();
    console.warn(`[EMERGENCY_CLEAR ${timestamp}] Forcing all loading states to clear. Called from:`, source);
    console.trace('[EMERGENCY_CLEAR] Stack trace:');

    // Find and clear ALL possible loading indicators
    const selectors = [
        '.loader-overlay',
        '.loader',
        '.loading',
        '.spinner',
        '[class*="loading"]',
        '[id*="loading"]',
        '[id*="loader"]'
    ];

    let clearedCount = 0;
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el.classList.contains('visible') ||
                el.style.display === 'flex' ||
                el.style.display === 'block') {

                el.classList.remove('visible', 'active', 'loading');
                if (el.classList.contains('loader-overlay') || el.classList.contains('loader')) {
                    el.style.display = 'none';
                }
                clearedCount++;

            }
        });
    });

    // Force state updates
    updateState({ isLoading: false });
    if (state.logs) {
        updateState({
            logs: {
                ...state.logs,
                isLoading: false
            }
        });
    }

    // Re-enable buttons
    const buttons = document.querySelectorAll('button[disabled]');
    buttons.forEach(btn => {
        if (btn.disabled) {
            btn.disabled = false;
        }
    });

    console.warn(`[EMERGENCY_CLEAR] ✓ Cleared ${clearedCount} loading elements and reset all states`);

    return clearedCount;
}

// Make clearAllLoadingStates available globally for emergency use
window.clearAllLoadingStates = clearAllLoadingStates;

function deactivateCompactLayout() {
    const body = document.body;
    const tableWrapper = document.querySelector('.table-wrapper');

    if (body) {
        body.classList.remove('compact-pagination');
    }

    if (tableWrapper) {
        tableWrapper.classList.remove('compact-pagination-table');
        tableWrapper.style.maxHeight = '';
        tableWrapper.style.overflowY = '';
    }

    compactLayoutState.active = false;
}

function setCompactTableHeight(tableWrapper) {
    if (!tableWrapper) {
        return;
    }

    // Reset before measuring to avoid compounding styles
    tableWrapper.style.maxHeight = '';
    tableWrapper.style.overflowY = '';

    const paginationEl = document.getElementById('pagination-container');
    const statusBar = document.querySelector('.status-bar');
    const rect = tableWrapper.getBoundingClientRect();
    const paginationHeight = paginationEl ? paginationEl.getBoundingClientRect().height : 0;
    const statusHeight = statusBar ? statusBar.getBoundingClientRect().height : 0;
    const bottomSpacing = 24;

    const available = window.innerHeight - rect.top - paginationHeight - statusHeight - bottomSpacing;

    if (available > 0) {
        tableWrapper.style.maxHeight = `${Math.floor(available)}px`;
        tableWrapper.style.overflowY = 'hidden';
    }
}

function handleCompactResize() {
    if (window.innerWidth < 768) {
        if (compactLayoutState.active) {
            deactivateCompactLayout();
        }
        return;
    }

    if (!compactLayoutState.active) {
        return;
    }

    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        requestAnimationFrame(() => setCompactTableHeight(tableWrapper));
    }
}

function updateCompactPaginationLayout(pageItemsLength) {
    const tableWrapper = document.querySelector('.table-wrapper');
    const body = document.body;

    if (!body || !tableWrapper) {
        return;
    }

    const shouldActivate = window.innerWidth >= 768
        && paginationConfig.itemsPerPage === 10
        && pageItemsLength > 0
        && pageItemsLength <= 10;

    if (!shouldActivate) {
        if (compactLayoutState.active) {
            deactivateCompactLayout();
        }
        return;
    }

    body.classList.add('compact-pagination');
    tableWrapper.classList.add('compact-pagination-table');
    compactLayoutState.active = true;

    requestAnimationFrame(() => setCompactTableHeight(tableWrapper));

    if (!compactLayoutState.resizeListenerAttached) {
        window.addEventListener('resize', handleCompactResize);
        compactLayoutState.resizeListenerAttached = true;
    }
}

// Wrapper for renderItems that calls the complex renderer from uiRenderer.js
function renderItems(items, lastUpdated, highlightNew) {

    // Get items for current page using pagination-simple
    const pageItems = getCurrentPageItems(items);

    // Sync pagination.js state to prevent double-pagination in uiRenderer
    // We tell uiRenderer that we are on page 1 of 1, with all items shown
    // This ensures uiRenderer renders the slice as-is without trying to paginate it again
    updatePaginationState(1, 1, pageItems.length);

    // Call the complex renderer with paginated items
    renderItemsComplex(
        elements.tableBody,
        elements.emptyState,
        state,
        pageItems, // Use paginated items instead of all items
        lastUpdated,
        highlightNew,
        openTextPreview,
        openMediaPreview,
        navigateTo,
        null, // openInWord - not implemented yet
        copyPathToClipboard,
        openRenameOverlayWrapper,
        null, // openMoveOverlay - not implemented yet
        openConfirmOverlayWrapper,
        toggleSelection,
        openContextMenu,
        isWordDocument,
        buildFileUrl,
        hasUnsavedChanges,
        confirmDiscardChanges,
        previewableExtensions,
        mediaPreviewableExtensions,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop,
        handleDragLeave,
        flashStatus, // Add flashStatus helper
        setError // Add setError helper
    );

    // Render pagination UI
    renderPaginationUI();

    updateCompactPaginationLayout(pageItems.length);
}

/**
 * Render pagination UI controls
 */
function renderPaginationUI() {
    const container = elements.paginationContainer || document.getElementById('pagination-container');
    const mobileContainer = document.getElementById('pagination-mobile');

    if (!container) {
        console.warn('[Pagination] Container not found');
        return;
    }

    // Render desktop pagination with callback
    renderSimplePagination(container, handlePageChange);

    // Render mobile pagination
    if (mobileContainer) {
        renderMobilePagination(mobileContainer, handlePageChange);
    }
}

/**
 * Handle page change (called when user clicks pagination button)
 * @param {number} newPage - New page number
 */
function handlePageChange(newPage) {


    // Re-render items for new page (synchronous)
    renderItems(state.items, state.lastUpdated, false);

    // Optional: Scroll to top
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.scrollTo({ top: 0, behavior: 'auto' });
    }
}

// Helper functions for renderItems
function toggleSelection(path, isSelected) {
    if (isSelected) {
        state.selected.add(path);
    } else {
        state.selected.delete(path);
    }
    updateSelectionUI();
}

function openContextMenu(x, y, item) {
    // Close any existing context menu first
    closeContextMenu();

    // Update state with target item
    updateState({
        contextMenu: {
            isOpen: true,
            targetItem: item
        }
    });

    // Get or create the context menu DOM element
    let menu = document.getElementById('context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.className = 'context-menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', 'Context menu');
        document.body.appendChild(menu);
    }

    // Check clipboard state for paste availability
    const clipboardHasItems = hasClipboardItems();
    const clipboardState = getClipboard();
    const isFolder = item.type === 'folder';

    // Build menu items
    const menuItems = [];

    // Open
    menuItems.push({
        action: 'open',
        label: isFolder ? 'Buka' : 'Buka File',
        icon: isFolder ? '📂' : '📄',
        className: ''
    });

    menuItems.push({ divider: true });

    // Cut
    menuItems.push({
        action: 'cut',
        label: 'Potong',
        icon: '✂️',
        shortcut: 'Ctrl+X',
        className: ''
    });

    // Copy
    menuItems.push({
        action: 'copy',
        label: 'Salin',
        icon: '📋',
        shortcut: 'Ctrl+C',
        className: ''
    });

    // Paste (only enabled if clipboard has items)
    menuItems.push({
        action: 'paste',
        label: 'Tempel',
        icon: '📌',
        shortcut: 'Ctrl+V',
        className: '',
        disabled: !clipboardHasItems
    });

    menuItems.push({ divider: true });

    // Rename
    menuItems.push({
        action: 'rename',
        label: 'Ubah Nama',
        icon: '✏️',
        shortcut: 'F2',
        className: ''
    });

    // Bulk Rename (only when multiple items selected)
    if (state.selected.size > 1) {
        menuItems.push({
            action: 'bulk-rename',
            label: 'Bulk Rename',
            icon: '📝',
            className: ''
        });
    }

    // Move
    menuItems.push({
        action: 'move',
        label: 'Pindahkan',
        icon: '📦',
        className: ''
    });

    // Download (files only)
    if (!isFolder) {
        menuItems.push({
            action: 'download',
            label: 'Unduh',
            icon: '⬇️',
            className: ''
        });
    }

    // Copy Path
    menuItems.push({
        action: 'copy-path',
        label: 'Salin Path',
        icon: '🔗',
        className: ''
    });

    // Share
    menuItems.push({
        action: 'share',
        label: 'Bagikan',
        icon: '🔗',
        className: ''
    });

    // Details
    menuItems.push({
        action: 'details',
        label: 'Detail',
        icon: 'ℹ️',
        className: ''
    });

    menuItems.push({ divider: true });

    // Delete (danger)
    menuItems.push({
        action: 'delete',
        label: 'Hapus',
        icon: '🗑️',
        className: 'context-menu-item-danger'
    });

    // Render menu HTML
    const inner = document.createElement('div');
    inner.className = 'context-menu-inner';

    menuItems.forEach((menuItem, index) => {
        if (menuItem.divider) {
            const divider = document.createElement('div');
            divider.className = 'context-menu-divider';
            divider.setAttribute('role', 'separator');
            inner.appendChild(divider);
            return;
        }

        const btn = document.createElement('button');
        btn.className = `context-menu-item ${menuItem.className}`.trim();
        btn.setAttribute('role', 'menuitem');
        btn.setAttribute('data-action', menuItem.action);
        btn.tabIndex = 0;

        if (menuItem.disabled) {
            btn.disabled = true;
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
        }

        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.className = 'context-menu-icon';
        iconSpan.textContent = menuItem.icon;
        btn.appendChild(iconSpan);

        // Label
        const labelSpan = document.createElement('span');
        labelSpan.textContent = menuItem.label;
        labelSpan.style.flex = '1';
        btn.appendChild(labelSpan);

        // Shortcut hint
        if (menuItem.shortcut) {
            const shortcutSpan = document.createElement('span');
            shortcutSpan.textContent = menuItem.shortcut;
            shortcutSpan.style.fontSize = '11px';
            shortcutSpan.style.opacity = '0.5';
            shortcutSpan.style.marginLeft = '12px';
            btn.appendChild(shortcutSpan);
        }

        // Click handler
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!menuItem.disabled) {
                handleContextMenuAction(menuItem.action);
            }
        });

        inner.appendChild(btn);
    });

    menu.innerHTML = '';
    menu.appendChild(inner);

    // Position the menu
    menu.style.display = 'block';
    menu.classList.remove('hidden');
    menu.setAttribute('aria-hidden', 'false');

    // Calculate position to keep menu within viewport
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX = x;
    let posY = y;

    if (x + menuRect.width > viewportWidth) {
        posX = viewportWidth - menuRect.width - 8;
    }
    if (y + menuRect.height > viewportHeight) {
        posY = viewportHeight - menuRect.height - 8;
    }

    // Ensure minimum position
    posX = Math.max(8, posX);
    posY = Math.max(8, posY);

    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';

    // Focus first item for keyboard navigation
    const firstItem = menu.querySelector('.context-menu-item:not([disabled])');
    if (firstItem) {
        firstItem.focus();
    }

    // Setup keyboard navigation within menu
    const handleMenuKeydown = (e) => {
        const items = Array.from(menu.querySelectorAll('.context-menu-item:not([disabled])'));
        const currentIndex = items.indexOf(document.activeElement);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            items[next]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            items[prev]?.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeContextMenu();
        }
    };

    menu.addEventListener('keydown', handleMenuKeydown);
    menu._keydownHandler = handleMenuKeydown;

    // Close on click outside
    const handleClickOutside = (e) => {
        if (!menu.contains(e.target)) {
            closeContextMenu();
            document.removeEventListener('click', handleClickOutside, true);
        }
    };

    // Use setTimeout to avoid the current right-click event from closing the menu
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
        menu._clickOutsideHandler = handleClickOutside;
    }, 0);

    // Close on scroll
    const handleScroll = () => {
        closeContextMenu();
        window.removeEventListener('scroll', handleScroll, true);
    };
    window.addEventListener('scroll', handleScroll, true);
    menu._scrollHandler = handleScroll;
}

function changeSort(key) {
    const newDirection = state.sortKey === key && state.sortDirection === 'asc' ? 'desc' : 'asc';
    updateState({
        sortKey: key,
        sortDirection: newDirection
    });

    // Save sort preferences to localStorage
    saveSortPreferences(key, newDirection);

    // Reset pagination to page 1 when sorting changes
    resetPagination();

    renderItems(state.items, state.lastUpdated, false);
    updateSortUI(elements.sortHeaders, elements.statusSort, state);
}

function navigateTo(path) {


    // Validate path is string
    if (typeof path !== 'string') {
        console.error('[ERROR] Invalid path type:', typeof path, path);
        return;
    }

    // Save last visited path to localStorage
    saveLastPath(path);

    fetchDirectoryWrapper(path);
}

/**
 * Wrapper function for fetchDirectory that integrates with state and UI
 * @param {string} path - Directory path to fetch
 * @param {Object} options - Options for the fetch operation
 */
async function fetchDirectoryWrapper(path = '', options = {}) {
    try {

        // Update loading state
        updateState({ isLoading: true });

        // Show skeleton placeholders instead of spinner overlay
        if (!options.silent) {
            // Hide empty state while loading
            if (elements.emptyState) {
                elements.emptyState.hidden = true;
            }
            showSkeletons({
                tableBody: elements.tableBody || document.getElementById('tbody'),
                gridContainer: document.getElementById('grid-view-container'),
                mobileList: document.getElementById('mobile-file-list')
            });
        }

        // Call the API
        const data = await fetchDirectory(path, options);

        if (data && data.success) {
            // Ensure state.selected is a Set before updating
            if (!(state.selected instanceof Set)) {
                state.selected = new Set();
            }

            // Update state with the fetched data
            updateState({
                currentPath: data.path || path,
                parentPath: data.parent !== undefined ? data.parent : null,
                items: data.items || [],
                lastUpdated: data.lastUpdated || new Date().toISOString(),
                isLoading: false
            });

            // Create itemMap for quick lookup
            const itemMap = new Map();
            if (data.items && Array.isArray(data.items)) {
                data.items.forEach(item => {
                    itemMap.set(item.path, item);
                });
            }
            updateState({ itemMap });

            // Synchronize selection (remove selected items that no longer exist)
            // This was previously done in uiRenderer, but we moved it here to avoid state corruption
            const newSelected = synchronizeSelection(data.items || [], state.selected);
            updateState({ selected: newSelected });

            // Update visibleItems based on filter
            const visibleItems = state.items.filter(item => {
                if (!state.filter) {
                    return true;
                }
                return item.name.toLowerCase().includes(state.filter.toLowerCase());
            });
            updateState({ visibleItems });

            // Update pagination info with total items
            updatePaginationInfo(state.items.length);

            // Render the items (will use pagination)
            renderItems(state.items, state.lastUpdated, false);

            // Update UI elements
            updateSelectionUI();

        } else {
            console.error('[DEBUG] API returned unsuccessful response:', data);
            updateState({ isLoading: false });
            if (elements.statusInfo) {
                elements.statusInfo.textContent = 'Gagal memuat data direktori';
            }
        }
    } catch (error) {
        console.error('[DEBUG] fetchDirectoryWrapper error:', error);
        updateState({ isLoading: false });
        if (elements.statusInfo) {
            elements.statusInfo.textContent = 'Error: ' + (error.message || 'Gagal memuat data');
        }
    }
}

function startPolling() {
    if (state.polling) {
        clearInterval(state.polling);
    }
    state.polling = setInterval(() => {
        if (!document.hidden) {
            fetchDirectoryWrapper(state.currentPath, { silent: true });
        }
    }, config.pollingInterval || 30000);
}

function handleContextMenuAction(action) {
    const { targetItem } = state.contextMenu;

    closeContextMenu();

    // Paste doesn't require a target item
    if (action === 'paste') {
        const clipboard = getClipboard();
        pasteItems(clipboard, state, (path, opts) => fetchDirectoryWrapper(path, opts), clearClipboard);
        return;
    }

    if (!targetItem) {
        return;
    }

    switch (action) {
        case 'open':
            if (targetItem.type === 'folder') {
                navigateTo(targetItem.path);
            } else {
                window.open(buildFileUrl(targetItem.path), '_blank');
            }
            break;
        case 'copy': {
            // Select the target item if not already selected, then copy
            if (!state.selected.has(targetItem.path)) {
                state.selected.clear();
                state.selected.add(targetItem.path);
                updateSelectionUI();
            }
            copySelectedItems();
            window.showInfo?.(`"${targetItem.name}" disalin ke clipboard.`);
            break;
        }
        case 'cut': {
            // Select the target item if not already selected, then cut
            if (!state.selected.has(targetItem.path)) {
                state.selected.clear();
                state.selected.add(targetItem.path);
                updateSelectionUI();
            }
            cutSelectedItems();
            window.showInfo?.(`"${targetItem.name}" dipotong ke clipboard.`);
            break;
        }
        case 'rename':
            openRenameOverlayWrapper(targetItem);
            break;
        case 'bulk-rename': {
            const selectedItems = state.items.filter(i => state.selected.has(i.path));
            if (selectedItems.length >= 2) {
                openBulkRename(selectedItems, () => fetchDirectoryWrapper(state.currentPath, { silent: true }));
            }
            break;
        }
        case 'delete':
            openConfirmOverlayWrapper({
                message: `Hapus "${targetItem.name}"?`,
                description: 'Item yang dihapus tidak dapat dikembalikan.',
                paths: [targetItem.path],
                showList: false,
                confirmLabel: 'Hapus',
            });
            break;
        case 'copy-path':
            copyPathToClipboard(targetItem.path);
            break;
        case 'share':
            openShareModal(targetItem);
            break;
        case 'details':
            if (typeof window.openDetailsOverlay === 'function') {
                window.openDetailsOverlay(targetItem);
            }
            break;
        case 'download':
            if (targetItem && targetItem.type === 'file') {
                const url = buildFileUrl(targetItem.path);
                const a = document.createElement('a');
                a.href = url;
                a.download = targetItem.name;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            break;
        case 'move':
            if (targetItem) {
                loadMoveOverlay().then(module => {
                    if (module && module.openMoveOverlay) {
                        module.openMoveOverlay([targetItem.path], state, fetchDirectoryWrapper);
                    }
                });
            }
            break;
    }
}

function closeContextMenu() {
    updateState({
        contextMenu: {
            ...state.contextMenu,
            isOpen: false,
            targetItem: null
        }
    });

    // Hide the DOM element
    const menu = document.getElementById('context-menu');
    if (menu) {
        menu.style.display = 'none';
        menu.classList.add('hidden');
        menu.setAttribute('aria-hidden', 'true');

        // Clean up event listeners
        if (menu._keydownHandler) {
            menu.removeEventListener('keydown', menu._keydownHandler);
            menu._keydownHandler = null;
        }
        if (menu._clickOutsideHandler) {
            document.removeEventListener('click', menu._clickOutsideHandler, true);
            menu._clickOutsideHandler = null;
        }
        if (menu._scrollHandler) {
            window.removeEventListener('scroll', menu._scrollHandler, true);
            menu._scrollHandler = null;
        }
    }
}

function updatePreviewStatus() {
    // Basic implementation - can be enhanced
    const { previewStatus } = elements;
    if (previewStatus) {
        const { dirty, isSaving } = state.preview;
        if (isSaving) {
            previewStatus.textContent = 'Menyimpan...';
        } else if (dirty) {
            previewStatus.textContent = 'Perubahan belum disimpan';
        } else {
            previewStatus.textContent = 'Disimpan';
        }
    }
}

function updateLineNumbers() {
    const { previewEditor, previewLineNumbersInner } = elements;
    if (!previewLineNumbersInner || !previewEditor) {
        return;
    }

    const value = previewEditor.value;
    const sanitized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Count actual lines - If empty = 1 line, otherwise split by newline
    let totalLines = sanitized.length === 0 ? 1 : sanitized.split('\n').length;

    // Performance optimization untuk file sangat besar
    if (totalLines > 10000) {
        previewLineNumbersInner.innerHTML = '<span>1</span>';
        return;
    }

    // Get computed styles from editor for consistent styling
    const editorStyle = window.getComputedStyle(previewEditor);
    const lineHeight = editorStyle.lineHeight;
    const fontSize = editorStyle.fontSize;
    const fontFamily = editorStyle.fontFamily;

    // Convert to numeric values for precise calculation
    const lineHeightNum = parseFloat(lineHeight);
    const fontSizeNum = parseFloat(fontSize);
    const actualLineHeight = isNaN(lineHeightNum) ? fontSizeNum * 1.5 : lineHeightNum;

    // Build line numbers HTML - more efficient with document fragment
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= totalLines; i += 1) {
        const span = document.createElement('span');
        span.textContent = i;
        span.style.height = `${actualLineHeight}px`;
        span.style.lineHeight = `${actualLineHeight}px`;
        span.style.display = 'block';
        span.style.margin = '0';
        span.style.padding = '0';
        span.style.fontSize = fontSize;
        span.style.fontFamily = fontFamily;
        fragment.appendChild(span);
    }

    // Clear and append new content
    previewLineNumbersInner.innerHTML = '';
    previewLineNumbersInner.appendChild(fragment);

    // Apply container styling
    previewLineNumbersInner.style.fontSize = fontSize;
    previewLineNumbersInner.style.lineHeight = lineHeight;
    previewLineNumbersInner.style.fontFamily = fontFamily;

    // Pastikan styling konsisten setelah update
    ensureConsistentStyling();

    // Sinkron scroll position
    syncLineNumbersScroll();
}

function ensureConsistentStyling() {
    const { previewEditor, previewLineNumbersInner } = elements;
    const { previewLineNumbers } = elements;
    if (!previewLineNumbersInner || !previewEditor || !previewLineNumbers) {
        return;
    }

    // Get computed styles dari editor
    const editorStyle = window.getComputedStyle(previewEditor);
    const lineHeight = editorStyle.lineHeight;
    const fontSize = editorStyle.fontSize;
    const fontFamily = editorStyle.fontFamily;
    const paddingTop = editorStyle.paddingTop;
    const paddingBottom = editorStyle.paddingBottom;

    // Convert to numeric values for precise calculation
    const lineHeightNum = parseFloat(lineHeight);
    const fontSizeNum = parseFloat(fontSize);
    const paddingTopNum = parseFloat(paddingTop);
    const paddingBottomNum = parseFloat(paddingBottom);

    // Calculate exact line height in pixels
    const actualLineHeight = isNaN(lineHeightNum) ? fontSizeNum * 1.5 : lineHeightNum;

    // Apply consistent styling to line numbers
    previewLineNumbersInner.style.fontSize = fontSize;
    previewLineNumbersInner.style.lineHeight = lineHeight;
    previewLineNumbersInner.style.fontFamily = fontFamily;

    // Apply matching padding to ensure perfect alignment
    previewLineNumbersInner.style.paddingTop = paddingTop;
    previewLineNumbersInner.style.paddingBottom = paddingBottom;

    // Ensure each line number span has exact same height
    const lineSpans = previewLineNumbersInner.querySelectorAll('span');
    lineSpans.forEach(span => {
        span.style.height = `${actualLineHeight}px`;
        span.style.lineHeight = `${actualLineHeight}px`;
        span.style.display = 'block';
        span.style.margin = '0';
        span.style.padding = '0';
    });

}

// `syncLineNumbersScroll` implemented later (enhanced 2-way sync)
/**
 * Debug function to compare element styles between editor and line numbers
 * Useful for troubleshooting alignment issues
 */
function debugElementStyles() {
    const { previewEditor, previewLineNumbersInner } = elements;
    if (!previewLineNumbersInner || !previewEditor) {

        return;
    }

    const editorStyle = window.getComputedStyle(previewEditor);
    const lineNumbersStyle = window.getComputedStyle(previewLineNumbersInner);

}


async function savePreviewContent() {
    if (state.preview.isSaving) {
        return;
    }

    // Update state to saving
    updateState({
        preview: {
            ...state.preview,
            isSaving: true
        }
    });
    updatePreviewStatus();

    // Update save button UI
    if (elements.previewSave) {
        elements.previewSave.disabled = true;
        elements.previewSave.textContent = 'Menyimpan...';
        elements.previewSave.classList.add('saving');
    }

    try {
        const content = elements.previewEditor.value;

        // Call API to save file
        const response = await fetch(`api.php?action=save&path=${encodeURIComponent(state.preview.path)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to save file');
        }

        // Update state - no longer dirty, save successful
        updateState({
            preview: {
                ...state.preview,
                isSaving: false,
                dirty: false,
                originalContent: content
            }
        });

        // Update status
        if (elements.previewStatus) {
            const charCount = content.length.toLocaleString('id-ID');
            elements.previewStatus.textContent = `Disimpan • ${charCount} karakter`;
        }

        // Update save button
        if (elements.previewSave) {
            elements.previewSave.disabled = true;
            elements.previewSave.textContent = 'Simpan';
            elements.previewSave.classList.remove('saving', 'dirty');
        }

        // Update window title (remove asterisk)
        const originalTitle = document.title.replace(/^\* /, '');
        document.title = originalTitle;

        // Show success notification
        flashStatus('File berhasil disimpan');

        return Promise.resolve(data);

    } catch (error) {
        console.error('[PREVIEW] Error saving file:', error);

        // Update state - save failed
        updateState({
            preview: {
                ...state.preview,
                isSaving: false
            }
        });

        // Update status with error
        if (elements.previewStatus) {
            elements.previewStatus.textContent = 'Gagal menyimpan: ' + error.message;
        }

        // Update save button
        if (elements.previewSave) {
            elements.previewSave.disabled = false;
            elements.previewSave.textContent = 'Simpan *';
            elements.previewSave.classList.add('dirty');
            elements.previewSave.classList.remove('saving');
        }

        // Show error notification
        setError('Gagal menyimpan file: ' + error.message);

        return Promise.reject(error);
    }
}

function updateSelectionUI() {
    const { btnDeleteSelected, btnDeleteSelectedDesktop, btnMoveSelected, selectAllCheckbox, selectAllCheckboxMobile, tableBody, mobileFileList, mobileSelectedCount, mobileClearSelection } = elements;
    const selectedCount = state.selected.size;

    if (btnDeleteSelected) {
        btnDeleteSelected.disabled = selectedCount === 0 || state.isLoading;
    }

    // Update desktop delete button as well
    if (btnDeleteSelectedDesktop) {
        btnDeleteSelectedDesktop.disabled = selectedCount === 0 || state.isLoading;
        const span = btnDeleteSelectedDesktop.querySelector('span');
        if (span) {
            span.textContent = selectedCount > 0
                ? `Hapus Terpilih (${selectedCount})`
                : 'Hapus Terpilih';
        }
    }

    if (btnMoveSelected) {
        btnMoveSelected.disabled = selectedCount === 0 || state.isLoading;
    }

    if (selectAllCheckbox) {
        const totalVisible = state.visibleItems.length;
        const selectedVisible = state.visibleItems.filter(item => state.selected.has(item.path)).length;
        selectAllCheckbox.checked = totalVisible > 0 && selectedVisible === totalVisible;
        selectAllCheckbox.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible;
    }

    // Sync mobile select-all checkbox
    if (selectAllCheckboxMobile) {
        const totalVisible = state.visibleItems.length;
        const selectedVisible = state.visibleItems.filter(item => state.selected.has(item.path)).length;
        selectAllCheckboxMobile.checked = totalVisible > 0 && selectedVisible === totalVisible;
        selectAllCheckboxMobile.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible;
    }

    // Update floating selected count badge for mobile
    if (mobileSelectedCount) {
        const countText = mobileSelectedCount.querySelector('.selected-count-text');
        if (countText) {
            countText.textContent = selectedCount > 0 ? `${selectedCount} dipilih` : '0 dipilih';
        }

        // Show/hide floating badge based on selection
        mobileSelectedCount.classList.toggle('hidden', selectedCount === 0);
    }

    // Sync checkbox visual state in desktop table
    if (tableBody) {
        syncRowSelection(tableBody, state);
    }

    // Sync checkbox visual state in mobile list
    if (mobileFileList) {
        syncMobileSelection(mobileFileList, state);
    }
}

/**
 * Wrapper function for openCreateOverlay with proper parameters
 * @param {string} kind - Type of item to create ('file' or 'folder')
 */
function openCreateOverlayWrapper(kind) {
    openCreateOverlay(
        state,
        elements.createOverlay,
        elements.createTitle,
        elements.createSubtitle,
        elements.createLabel,
        elements.createName,
        elements.createHint,
        elements.createSubmit,
        kind
    );
}

/**
 * Wrapper function for openRenameOverlay with proper parameters
 * @param {Object} item - Item to rename
 */
function openRenameOverlayWrapper(item) {
    openRenameOverlay(
        state,
        elements.renameOverlay,
        elements.renameTitle,
        elements.renameSubtitle,
        elements.renameLabel,
        elements.renameName,
        elements.renameHint,
        elements.renameSubmit,
        item
    );
}

/**
 * Wrapper function for openConfirmOverlay with proper parameters
 * @param {Object} options - Confirmation options
 */
function openConfirmOverlayWrapper(options) {
    openConfirmOverlay(
        state,
        elements.confirmOverlay,
        elements.confirmMessage,
        elements.confirmDescription,
        elements.confirmList,
        elements.confirmConfirm,
        options
    );
}

/**
 * Wrapper function for closeCreateOverlay with proper parameters
 */
function closeCreateOverlayWrapper() {
    closeCreateOverlay(
        state,
        elements.createOverlay,
        elements.createForm,
        elements.createHint,
        elements.createSubmit,
        elements.createName
    );
}

/**
 * Wrapper function for closeRenameOverlay with proper parameters
 */
function closeRenameOverlayWrapper() {
    closeRenameOverlay(
        state,
        elements.renameOverlay,
        elements.renameForm,
        elements.renameHint,
        elements.renameSubmit,
        elements.renameName
    );
}

/**
 * Wrapper function for closeConfirmOverlay with proper parameters
 */
function closeConfirmOverlayWrapper() {
    closeConfirmOverlay(state, elements.confirmOverlay);
}

/**
 * Wrapper function untuk upload files dengan parameter lengkap
 * @param {FileList} files - Daftar file yang akan diunggah
 */
async function uploadFilesWrapper(files) {
    // Use the new upload progress modal for visual feedback
    showUploadModal(files);
}

/**
 * Wrapper function untuk upload folder dengan parameter lengkap
 * @param {FileList} files - Daftar file dari folder yang akan diunggah
 */
async function uploadFolderWrapper(files) {
    // Use the new upload progress modal for visual feedback
    showUploadModal(files);
}

/**
 * Wrapper function untuk create item dengan parameter lengkap
 * @param {string} kind - Jenis item ('file' atau 'folder')
 * @param {string} name - Nama item
 */
async function createItemWrapper(kind, name) {

    await createItem(
        kind,
        name,
        state,
        setLoading,
        setError,
        fetchDirectoryWrapper,
        flashStatus,
        closeCreateOverlayWrapper,
        elements.createSubmit,
        elements.createName,
        elements.createHint,
        (path) => path // encodePathSegments - simple passthrough for now
    );
}

/**
 * Wrapper function untuk delete items dengan parameter lengkap
 * @param {Array} paths - Array path item yang akan dihapus
 */
async function deleteItemsWrapper(paths) {

    await deleteItems(
        paths,
        state,
        setLoading,
        setError,
        fetchDirectoryWrapper,
        closeConfirmOverlayWrapper,
        updateSelectionUI,
        closePreviewOverlay,
        elements.btnDeleteSelected
    );
}

/**
 * Wrapper function untuk rename item dengan parameter lengkap
 */
async function renameItemWrapper() {

    if (!state.rename.targetItem) {
        console.error('[DEBUG] No target item for rename');
        return;
    }

    const newName = elements.renameName.value.trim();
    if (!newName) {
        elements.renameHint.textContent = 'Nama tidak boleh kosong.';
        elements.renameHint.classList.add('error');
        return;
    }

    await renameItem(
        state.rename.targetItem,
        newName,
        state,
        setLoading,
        setError,
        fetchDirectoryWrapper,
        flashStatus,
        closeRenameOverlayWrapper,
        elements.renameSubmit,
        elements.renameName,
        elements.renameHint,
        elements.previewTitle,
        elements.previewMeta,
        elements.previewOpenRaw,
        buildFileUrl,
        (path) => path // encodePathSegments - simple passthrough for now
    );
}
/**
 * Wrapper function untuk closePreviewOverlay - simplified like backup
 * @param {boolean} force - Force close without checking unsaved changes
 */
function closePreviewOverlayWrapper(force = false) {
    return closePreviewOverlay(
        state,
        elements.previewOverlay,
        elements.previewEditor,
        elements.previewLineNumbers,
        elements.previewMeta,
        elements.previewStatus,
        elements.previewLoader,
        elements.previewSave,
        elements.previewOpenRaw,
        confirmDiscardChanges,
        updateLineNumbers
    );
}


/**
 * Wrapper function untuk membuka text preview
 * @param {Object} item - Item yang akan di-preview
 */
async function openTextPreview(item) {

    if (hasUnsavedChanges(state.preview)) {
        const confirmed = await confirmDiscardChanges('Perubahan belum disimpan. Buka file lain tanpa menyimpan?');
        if (!confirmed) {
            return;
        }
    }

    // Prepare overlay
    elements.previewTitle.textContent = item.name;
    const sizeInfo = typeof item.size === 'number' ? formatBytes(item.size) : '-';
    const modifiedInfo = item.modified ? formatDate(item.modified) : '-';
    elements.previewMeta.textContent = `${item.path} • ${sizeInfo} • ${modifiedInfo}`;
    elements.previewOpenRaw.href = buildFileUrl(item.path);

    state.preview.path = item.path;
    state.preview.mode = 'text';
    state.preview.dirty = false;
    state.preview.isSaving = false;

    // Enable text actions
    elements.previewSave.disabled = true;
    elements.previewCopy.disabled = false;

    // Show loading state
    elements.previewLoader.hidden = false;
    elements.previewEditor.classList.add('is-loading');
    elements.previewEditor.readOnly = true;
    elements.previewEditor.value = '';

    // CRITICAL: Reset line numbers completely
    elements.previewLineNumbersInner.innerHTML = '<span>1</span>';
    elements.previewLineNumbersInner.style.transform = 'translateY(0px)';

    updateLineNumbers();

    // Open overlay
    openPreviewOverlay(state, elements.previewOverlay, elements.previewClose);

    // Ensure text mode
    if (elements.previewEditorWrapper) {
        elements.previewEditorWrapper.style.display = '';
    }
    const wrapper = document.getElementById('preview-viewer-wrapper');
    if (wrapper) {
        wrapper.style.display = 'none';
    }

    try {
        // Fetch file content - using 'content' action
        const encodedPath = encodeURIComponent(item.path);
        const apiUrl = `api.php?action=content&path=${encodedPath}`;


        const response = await fetch(apiUrl);

        const responseText = await response.text();
        const data = JSON.parse(responseText);

        if (!response.ok || !data.success) {
            throw new Error(data.error || `Failed to load file (Status: ${response.status})`);
        }

        // Ensure content is a string
        const content = typeof data.content === 'string' ? data.content : String(data.content || '');

        state.preview.originalContent = content;
        elements.previewEditor.value = content;

        elements.previewEditor.readOnly = false;
        updateLineNumbers();
        ensureConsistentStyling();

        if (elements.previewStatus) {
            elements.previewStatus.textContent = `Karakter: ${content.length.toLocaleString('id-ID')}`;
        }

        // Debug element styles after loading
        setTimeout(() => {
            debugElementStyles();
        }, 100);
    } catch (error) {
        console.error('[PREVIEW] Error loading file:', error);
        console.error('[PREVIEW] Error stack:', error.stack);
        elements.previewEditor.value = `Error: ${error.message}`;
        if (elements.previewStatus) {
            elements.previewStatus.textContent = 'Gagal memuat file';
        }
    } finally {
        elements.previewLoader.hidden = true;
        elements.previewEditor.classList.remove('is-loading');
    }
}

/**
 * Wrapper function untuk membuka media preview
 * @param {Object} item - Item yang akan di-preview
 */
async function openMediaPreview(item) {

    // Open overlay first
    openPreviewOverlay(state, elements.previewOverlay, elements.previewClose);

    // Call the modal function
    await openMediaPreviewModal(
        item,
        state,
        {
            previewTitle: elements.previewTitle,
            previewMeta: elements.previewMeta,
            previewOpenRaw: elements.previewOpenRaw,
            previewSave: elements.previewSave,
            previewCopy: elements.previewCopy,
            previewBody: elements.previewBody,
            previewEditorWrapper: elements.previewEditorWrapper
        },
        buildFileUrl,
        formatBytes,
        formatDate,
        getFileExtension,
        hasUnsavedChanges,
        confirmDiscardChanges
    );
}

/**
 * Wrapper function untuk membuka log modal
 */
/**
 * Menginisialisasi aplikasi
 */
export async function initializeApp() {
    try {

        logger.info('Initializing application...');

        // Load saved preferences from localStorage
        const savedSort = loadSortPreferences();
        const savedPath = loadLastPath();

        logger.info('Loaded preferences:', {
            sort: savedSort,
            lastPath: savedPath,
            storageAvailable: isLocalStorageAvailable()
        });

        // Set initial state with saved preferences
        updateState({
            currentPath: savedPath || elements.currentPath,
            isLoading: true,
            items: [],
            itemMap: new Map(),
            selected: new Set(),
            sortKey: savedSort.sortKey,
            sortDirection: savedSort.sortDirection,
            filter: '',
            lastUpdated: null,
            polling: null,
            preview: {
                isOpen: false,
                item: null,
                content: null,
                originalContent: null,
                dirty: false,
                isSaving: false,
                saveTimeout: null,
                lastSaveTime: null,
                saveStatus: '',
                saveStatusClass: '',
                editor: null,
                lineNumbers: null,
                lineNumbersContent: '',
                isUpdatingLineNumbers: false,
                isScrollingFromLineNumbers: false,
                isScrollingFromEditor: false
            },
            confirm: {
                isOpen: false,
                message: '',
                description: '',
                paths: [],
                showList: false,
                confirmLabel: 'Hapus'
            },
            create: {
                isOpen: false,
                kind: 'file',
                defaultName: '',
                hint: ''
            },
            rename: {
                isOpen: false,
                targetPath: '',
                targetItem: null,
                originalName: ''
            },
            unsaved: {
                isOpen: false,
                callback: null
            },
            contextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                targetPath: null,
                targetItem: null
            },
            move: {
                isOpen: false,
                paths: [],
                targetPath: '',
                isLoading: false,
                error: null
            }
        });

        // Initialize error boundary (must be very early to catch init errors)
        initErrorBoundary();

        // Initialize i18n (must be early, before any t() calls)
        await initI18n();

        // Initialize auth (user menu, 401 interceptor)
        if (window.__currentUser) {
            initAuth({ user: window.__currentUser });
        }

        // Setup event handlers
        setupEventHandlers();

        // Setup drag and drop - fileCard drop zone
        setupFileCardDropZone();

        // Setup upload manager with drag-to-upload drop zone
        const mainContent = document.getElementById('main-content');
        initUploadManager({
            dropTarget: mainContent,
            onComplete: () => fetchDirectoryWrapper(state.currentPath, { silent: true })
        });

        // Setup command palette (Ctrl+K)
        initCommandPalette({
            // File Operations
            'copy': () => copySelectedItems(),
            'cut': () => cutSelectedItems(),
            'paste': () => {
                const clipboard = getClipboard();
                if (clipboard && clipboard.items.length > 0) {
                    pasteItems(clipboard, state, (path, opts) => fetchDirectoryWrapper(path, opts), clearClipboard);
                }
            },
            'rename': () => {
                const selected = Array.from(state.selected);
                if (selected.length === 1) {
                    const item = state.items.find(i => i.path === selected[0]);
                    if (item) openRenameOverlayWrapper(item);
                }
            },
            'delete': () => {
                const paths = Array.from(state.selected);
                if (paths.length > 0) {
                    deleteItemsWrapper(paths);
                }
            },
            'download': () => {
                const selected = Array.from(state.selected);
                if (selected.length === 1) {
                    const item = state.items.find(i => i.path === selected[0]);
                    if (item && item.type === 'file') {
                        const url = buildFileUrl(item.path);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = item.name;
                        a.click();
                    }
                }
            },
            'details': () => {
                const selected = Array.from(state.selected);
                if (selected.length === 1) {
                    const item = state.items.find(i => i.path === selected[0]);
                    if (item && typeof window.openDetailsOverlay === 'function') {
                        window.openDetailsOverlay(item);
                    }
                }
            },
            'select-all': () => {
                if (elements.selectAllCheckbox) {
                    elements.selectAllCheckbox.checked = true;
                    elements.selectAllCheckbox.dispatchEvent(new Event('change'));
                }
            },
            'undo': () => {
                undoLastAction();
            },
            'bulk-rename': () => {
                const selectedItems = state.items.filter(i => state.selected.has(i.path));
                if (selectedItems.length >= 2) {
                    openBulkRename(selectedItems, () => fetchDirectoryWrapper(state.currentPath, { silent: true }));
                } else {
                    window.showWarning?.('Pilih minimal 2 item untuk bulk rename.');
                }
            },
            'content-search': () => {
                openContentSearch();
            },
            'share': () => {
                const selected = Array.from(state.selected);
                if (selected.length === 1) {
                    const item = state.items.find(i => i.path === selected[0]);
                    if (item) openShareModal(item);
                } else {
                    window.showWarning?.('Pilih 1 item untuk dibagikan.');
                }
            },

            // Create
            'new-file': () => openCreateOverlayWrapper('file'),
            'new-folder': () => openCreateOverlayWrapper('folder'),

            // Navigation
            'go-up': () => {
                if (state.parentPath !== null) {
                    navigateTo(state.parentPath);
                }
            },
            'go-back': () => {
                window.history.back();
            },
            'refresh': () => {
                fetchDirectoryWrapper(state.currentPath);
            },

            // Views
            'view-logs': () => {
                if (typeof window.SmoothNav?.navigateTo === 'function') {
                    window.SmoothNav.navigateTo('logs');
                }
            },
            'view-trash': () => {
                if (typeof window.SmoothNav?.navigateTo === 'function') {
                    window.SmoothNav.navigateTo('trash');
                }
            },
            'view-dashboard': () => {
                if (typeof window.SmoothNav?.navigateTo === 'function') {
                    window.SmoothNav.navigateTo('dashboard');
                }
            },

            // Upload
            'upload-files': () => {
                const input = elements.uploadInput || elements.uploadInputDesktop;
                if (input) input.click();
            },
            'upload-folder': () => {
                const input = elements.uploadFolderInput || elements.uploadFolderInputDesktop;
                if (input) input.click();
            },

            // Settings
            'toggle-theme': () => {
                const html = document.documentElement;
                const current = html.getAttribute('data-theme');
                html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
                try { localStorage.setItem('theme', current === 'dark' ? 'light' : 'dark'); } catch (e) { /* ignore */ }
            },
            'show-shortcuts': () => {
                if (typeof window.showHelpModal === 'function') {
                    window.showHelpModal();
                }
            },
            'change-language': () => {
                // Open settings overlay and switch to language tab
                const overlay = document.getElementById('settings-overlay');
                const langTab = document.getElementById('settings-tab-language');
                if (overlay && langTab) {
                    overlay.classList.remove('hidden');
                    overlay.setAttribute('aria-hidden', 'false');
                    langTab.click();
                }
            },
            'split-pane': () => {
                toggleDualPane(state.currentPath);
            },
            'logout': async () => {
                try {
                    await fetch('api.php?action=auth-logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: '{}',
                    });
                } catch { /* ignore */ }
                window.location.href = 'login.php';
            },

            // File navigation (from file search mode)
            'navigateTo': (path) => navigateTo(path),
            'openFile': (path, name) => {
                if (typeof window.openPreviewModal === 'function') {
                    window.openPreviewModal(path, name);
                }
            },
        });

        // Setup undo manager
        initUndoManager({
            fetchDirectory: (path, opts) => fetchDirectoryWrapper(path, opts),
            getCurrentPath: () => state.currentPath
        });

        // Setup content search (Ctrl+Shift+F)
        initContentSearch({
            openFile: (path, name) => {
                if (typeof window.openPreviewModal === 'function') {
                    window.openPreviewModal(path, name);
                }
            },
            navigateTo: (path) => navigateTo(path),
            getCurrentPath: () => state.currentPath,
        });

        // Setup dual pane mode (Ctrl+\)
        initDualPane({
            fetchDirectory: (path, opts) => fetchDirectoryWrapper(path, opts),
            getCurrentPath: () => state.currentPath,
        });

        // Expose openContextMenu for dual pane's context menu delegation
        window.openContextMenuForItem = (x, y, item) => openContextMenu(x, y, item);

        // Wire split pane toggle buttons
        const btnSplitPane = document.getElementById('btn-split-pane');
        const btnSplitPaneDesktop = document.getElementById('btn-split-pane-desktop');
        if (btnSplitPane) {
            btnSplitPane.addEventListener('click', () => toggleDualPane(state.currentPath));
        }
        if (btnSplitPaneDesktop) {
            btnSplitPaneDesktop.addEventListener('click', () => toggleDualPane(state.currentPath));
        }

        // Setup language settings panel
        setupLanguageSettings();

        // Setup move overlay handlers (lazy-loaded on first move operation)
        // Will be loaded when user clicks move button
        logger.info('Move overlay will be loaded on demand');

        // Load initial directory
        await loadInitialDirectory();

        // Start polling for updates
        startPolling();

        // Initialize additional features (PWA, Theme, Keyboard Shortcuts, etc.)
        initializeAdditionalFeatures();

        logger.info('Application initialized successfully');

    } catch (error) {
        logger.error('Failed to initialize application', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Mengatur semua event handlers
 */
function setupEventHandlers() {
    logger.info('Setting up event handlers...');

    // Defensive helper to log skipped handlers
    const warnIfMissing = (name, el) => {
        if (!el) {
            logger.warn(`Skipping handler: ${name} - element not found`);
            return true;
        }
        return false;
    };

    // Setup filter handler
    if (!warnIfMissing('filter', elements.filterInput) && !warnIfMissing('clearSearch', elements.clearSearch)) {
        setupFilterHandler(elements.filterInput, elements.clearSearch, state, renderItems, resetPagination);
    }

    // Setup mobile search modal handler
    if (!warnIfMissing('searchMobile', elements.btnSearchMobile)) {
        setupSearchModalHandler(
            elements.btnSearchMobile,
            elements.searchModal,
            elements.searchModalInput,
            elements.searchClose,
            elements.searchClear,
            elements.searchApply,
            elements.filterInput
        );
    }

    // Setup sort handlers (sortHeaders is a NodeList; call only when it exists and has items)
    if (elements.sortHeaders && elements.sortHeaders.length > 0) {
        setupSortHandlers(elements.sortHeaders, state, changeSort);
    } else {
        logger.warn('Skipping sort handlers - sortHeaders not found or empty');
    }

    // Setup select all handler
    if (!warnIfMissing('selectAll', elements.selectAllCheckbox)) {
        setupSelectAllHandler(elements.selectAllCheckbox, state, setSelectionForVisible);
    }

    // Setup select all handler for mobile checkbox
    if (!warnIfMissing('selectAllMobile', elements.selectAllCheckboxMobile)) {
        setupSelectAllHandler(elements.selectAllCheckboxMobile, state, setSelectionForVisible);
    }

    // Setup select all mobile button handler
    if (!warnIfMissing('selectAllMobileButton', elements.btnSelectAllMobile)) {
        setupSelectAllMobileButtonHandler(
            elements.btnSelectAllMobile,
            elements.selectAllCheckboxMobile,
            state,
            setSelectionForVisible
        );
    }

    // Setup mobile actions context menu handler
    if (!warnIfMissing('mobileActionsMenu', elements.mobileActionsMenu)) {
        setupMobileActionsHandler(
            elements.mobileActionsMenu,
            elements.mobileActionsViewBtn,
            elements.mobileActionsEditBtn,
            elements.mobileActionsMoveBtn,
            elements.mobileActionsDeleteBtn,
            state,
            openTextPreview,
            openMediaPreview,
            openRenameOverlayWrapper,
            openConfirmOverlayWrapper,
            navigateTo,
            buildFileUrl,
            previewableExtensions,
            mediaPreviewableExtensions
        );
    }

    // Setup delete selected handler
    if (!warnIfMissing('deleteSelected', elements.btnDeleteSelected)) {
        setupDeleteSelectedHandler(
            elements.btnDeleteSelected,
            state,
            () => hasUnsavedChanges(state.preview),
            confirmDiscardChanges,
            openConfirmOverlayWrapper
        );
    }

    // Setup upload handler
    if (!warnIfMissing('upload', elements.btnUpload) && !warnIfMissing('uploadInput', elements.uploadInput)) {
        setupUploadHandler(
            elements.btnUpload,
            elements.uploadInput,
            state,
            () => hasUnsavedChanges(state.preview),
            confirmDiscardChanges,
            uploadFilesWrapper
        );
    }

    // Setup desktop upload handler
    if (!warnIfMissing('uploadDesktop', elements.btnUploadDesktop) && !warnIfMissing('uploadInputDesktop', elements.uploadInputDesktop)) {
        setupUploadDesktopHandler(
            elements.btnUploadDesktop,
            elements.uploadInputDesktop,
            state,
            () => hasUnsavedChanges(state.preview),
            confirmDiscardChanges,
            uploadFilesWrapper
        );
    }

    // Setup folder upload handler (mobile)
    if (!warnIfMissing('uploadFolder', elements.btnUploadFolder) && !warnIfMissing('uploadFolderInput', elements.uploadFolderInput)) {
        setupUploadFolderHandler(
            elements.btnUploadFolder,
            elements.uploadFolderInput,
            state,
            () => hasUnsavedChanges(state.preview),
            confirmDiscardChanges,
            uploadFolderWrapper
        );
    }

    // Setup folder upload handler (top bar - new buttons)
    if (!warnIfMissing('uploadFolderBtn', elements.uploadFolderBtn) && !warnIfMissing('folderInput', elements.folderInput)) {
        setupUploadFolderHandler(
            elements.uploadFolderBtn,
            elements.folderInput,
            state,
            () => hasUnsavedChanges(state.preview),
            confirmDiscardChanges,
            uploadFolderWrapper
        );
    }

    // Setup folder upload handler (desktop)
    if (!warnIfMissing('uploadFolderDesktop', elements.btnUploadFolderDesktop) && !warnIfMissing('uploadFolderInputDesktop', elements.uploadFolderInputDesktop)) {
        setupUploadFolderDesktopHandler(
            elements.btnUploadFolderDesktop,
            elements.uploadFolderInputDesktop,
            state,
            () => hasUnsavedChanges(state.preview),
            confirmDiscardChanges,
            uploadFolderWrapper
        );
    }

    // Setup desktop delete selected handler
    if (!warnIfMissing('deleteSelectedDesktop', elements.btnDeleteSelectedDesktop)) {
        setupDeleteSelectedDesktopHandler(
            elements.btnDeleteSelectedDesktop,
            state,
            () => hasUnsavedChanges(state.preview),
            confirmDiscardChanges,
            openConfirmOverlayWrapper
        );
    }

    // Setup preview editor handler
    if (!warnIfMissing('previewEditor', elements.previewEditor) &&
        !warnIfMissing('previewSave', elements.previewSave) &&
        !warnIfMissing('previewStatus', elements.previewStatus)) {
        setupPreviewEditorHandler(
            elements.previewEditor,
            elements.previewSave,
            elements.previewStatus,
            state,
            updatePreviewStatus,
            updateLineNumbers,
            ensureConsistentStyling,
            syncLineNumbersScroll,
            savePreviewContent
        );
    }

    // Setup enhanced scroll synchronization for line numbers
    if (elements.previewEditor) {
        initializeScrollSync();
    }

    // Setup scroll listener for virtual scrolling on table
    if (elements.tableBody && elements.tableBody.parentElement) {
        const tableContainer = elements.tableBody.parentElement;
        const throttledVirtualScroll = throttle(() => {
            if (window.virtualScrollManager && window.virtualScrollManager.isActive) {
                renderItems(state.items, state.lastUpdated, false);
            }
        }, 16);

        tableContainer.addEventListener('scroll', throttledVirtualScroll, { passive: true });
    }

    // Setup preview overlay handler
    if (!warnIfMissing('previewOverlay', elements.previewOverlay) && !warnIfMissing('previewClose', elements.previewClose)) {
        setupPreviewOverlayHandler(elements.previewOverlay, elements.previewClose, closePreviewOverlayWrapper);
    }

    // Setup confirm overlay handler
    if (!warnIfMissing('confirmOverlay', elements.confirmOverlay) &&
        !warnIfMissing('confirmCancel', elements.confirmCancel) &&
        !warnIfMissing('confirmConfirm', elements.confirmConfirm)) {
        setupConfirmOverlayHandler(
            elements.confirmOverlay,
            elements.confirmCancel,
            elements.confirmConfirm,
            state,
            closeConfirmOverlayWrapper,
            deleteItemsWrapper
        );
    }

    // Setup create overlay handler
    if (!warnIfMissing('createOverlay', elements.createOverlay) &&
        !warnIfMissing('createForm', elements.createForm) &&
        !warnIfMissing('createName', elements.createName) &&
        !warnIfMissing('createHint', elements.createHint) &&
        !warnIfMissing('createCancel', elements.createCancel) &&
        !warnIfMissing('createSubmit', elements.createSubmit)) {
        setupCreateOverlayHandler(
            elements.createOverlay,
            elements.createForm,
            elements.createName,
            elements.createHint,
            elements.createCancel,
            elements.createSubmit,
            state,
            closeCreateOverlayWrapper,
            createItemWrapper
        );
    }

    // Setup rename overlay handler
    if (!warnIfMissing('renameOverlay', elements.renameOverlay) &&
        !warnIfMissing('renameForm', elements.renameForm) &&
        !warnIfMissing('renameName', elements.renameName) &&
        !warnIfMissing('renameHint', elements.renameHint) &&
        !warnIfMissing('renameCancel', elements.renameCancel) &&
        !warnIfMissing('renameSubmit', elements.renameSubmit)) {
        setupRenameOverlayHandler(
            elements.renameOverlay,
            elements.renameForm,
            elements.renameName,
            elements.renameHint,
            elements.renameCancel,
            elements.renameSubmit,
            state,
            closeRenameOverlayWrapper,
            renameItemWrapper
        );
    }

    // Setup unsaved overlay handler
    if (!warnIfMissing('unsavedOverlay', elements.unsavedOverlay) &&
        !warnIfMissing('unsavedSave', elements.unsavedSave) &&
        !warnIfMissing('unsavedDiscard', elements.unsavedDiscard) &&
        !warnIfMissing('unsavedCancel', elements.unsavedCancel)) {
        setupUnsavedOverlayHandler(
            elements.unsavedOverlay,
            elements.unsavedSave,
            elements.unsavedDiscard,
            elements.unsavedCancel,
            state,
            closeUnsavedOverlay
        );
    }

    // Setup keyboard handler
    setupKeyboardHandler(
        state,
        closeUnsavedOverlay,
        closeConfirmOverlayWrapper,
        closeCreateOverlayWrapper,
        closeRenameOverlayWrapper,
        closePreviewOverlayWrapper,
        () => hasUnsavedChanges(state.preview)
    );

    // Setup visibility handler
    setupVisibilityHandler(state, fetchDirectoryWrapper, startPolling);

    // Context menu is now dynamically created in openContextMenu()
    // No static DOM setup needed — the old setupContextMenuHandler is bypassed
    logger.info('Context menu will be created dynamically on right-click');

    // Register paste and undo handlers for keyboard shortcuts (Ctrl+V, Ctrl+Z)
    registerShortcutHandlers({
        paste: () => {
            const clipboard = getClipboard();
            pasteItems(clipboard, state, (path, opts) => fetchDirectoryWrapper(path, opts), clearClipboard);
        },
        undo: () => {
            undoLastAction();
        },
        splitPane: () => {
            toggleDualPane(state.currentPath);
        }
    });

    // Setup split action handler (guard all related elements)
    if (elements.splitAction && elements.splitToggle && elements.splitMenu && elements.splitOptions && elements.splitMain) {
        setupSplitActionHandler(
            elements.splitAction,
            elements.splitToggle,
            elements.splitMenu,
            elements.splitOptions,
            elements.splitMain,
            openCreateOverlayWrapper
        );
    } else {
        logger.warn('Skipping split action handler - missing split action elements');
    }

    // Setup standalone Add Item buttons (both mobile & desktop)
    // Exclude buttons inside the `.split-action` menu to avoid duplicate triggers
    try {
        const addButtons = Array.from(document.querySelectorAll('[data-action="add-modal"]'));
        addButtons.forEach((btn) => {
            if (btn.closest && btn.closest('.split-action')) {
                return;
            } // skip split-action items
            btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                // If button has a kind (file/folder), set the radio inside the modal before opening
                try {
                    const kind = (btn.dataset && btn.dataset.kind) ? btn.dataset.kind : null;
                    if (kind) {
                        const target = document.querySelector(`input[name="create-type"][value="${kind}"]`);
                        if (target) {
                            target.checked = true;
                        }
                    }
                } catch (err) { /* ignore */ }
                // Use wrapper to keep API consistent
                try {
                    openCreateOverlayWrapper();
                } catch (err) {
                    console.error('openCreateOverlayWrapper failed', err);
                }
            });
            // Keyboard support: Enter / Space
            btn.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    try {
                        openCreateOverlayWrapper();
                    } catch (err) {
                        console.error('openCreateOverlayWrapper failed', err);
                    }
                }
            });
        });
    } catch (err) {
        logger.warn('Failed to attach Add Item button handlers', err);
    }

    // Setup move selected button handler (lazy-load moveOverlay module)
    if (elements.btnMoveSelected) {
        elements.btnMoveSelected.addEventListener('click', async () => {
            if (state.selected.size === 0) {
                return;
            }

            try {
                const module = await loadMoveOverlay();
                if (module.setupMoveOverlayHandlers) {
                    module.setupMoveOverlayHandlers();
                }
                if (module.openMoveOverlay) {
                    const selectedPaths = Array.from(state.selected);
                    module.openMoveOverlay(selectedPaths, state, fetchDirectoryWrapper);
                }
            } catch (error) {
                logger.error('Failed to load move overlay', error);
                alert('Failed to load move interface. Please try again.');
            }
        });
    }

    // Setup mobile clear selection handler
    if (elements.mobileClearSelection) {
        elements.mobileClearSelection.addEventListener('click', () => {
            state.selected.clear();
            updateSelectionUI();
        });
    }

    logger.info('Event handlers setup completed');
}

/**
 * Memuat direktori awal
 */
async function loadInitialDirectory() {
    try {
        logger.info('Loading initial directory...');

        // Use saved path from state (already loaded in initializeApp)
        const path = state.currentPath || '';
        await fetchDirectoryWrapper(path);

        // Update sort UI
        updateSortUI(elements.sortHeaders, elements.statusSort, state);

        logger.info('Initial directory loaded successfully');

    } catch (error) {
        logger.error('Failed to load initial directory', error);
        showError('Failed to load directory. Please refresh the page.');
    }
}

/**
 * Menampilkan pesan error
 * @param {string} message - Pesan error
 */
function showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-notification');
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--danger, #f44336);
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 300px;
    `;

    document.body.appendChild(errorDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

/**
 * Mengatur service worker (jika diperlukan)
 */
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                logger.info('Service Worker registered', registration);
            })
            .catch(error => {
                logger.error('Service Worker registration failed', error);
            });
    }
}

/**
 * Mengatur PWA (Progressive Web App) (jika diperlukan)
 */
function setupPWA() {
    // Register for install prompt
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Show install button or banner
        showInstallButton();
    });

    function showInstallButton() {
        const installButton = document.createElement('button');
        installButton.textContent = 'Install App';
        installButton.classList.add('install-button');
        installButton.classList.add('btn');
        installButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--accent, #2196F3);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            box-shadow: var(--shadow-md, 0 2px 5px rgba(0,0,0,0.2));
            z-index: 10000;
        `;

        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;

                if (outcome === 'accepted') {
                    logger.info('App installed successfully');
                }

                document.body.removeChild(installButton);
            }
        });

        document.body.appendChild(installButton);
    }
}

/**
 * Mengatur analytics (jika diperlukan)
 */
function setupAnalytics() {
    // Example: Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('config', 'GA_MEASUREMENT_ID', {
            page_path: window.location.pathname
        });
    }
}

/**
 * Mengatur tema aplikasi
 */
function setupTheme() {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Add theme toggle button if needed
    const themeToggle = document.createElement('button');
    themeToggle.innerHTML = savedTheme === 'dark' ? '🌙' : '☀️';
    themeToggle.classList.add('theme-toggle');
    themeToggle.classList.add('btn');
    themeToggle.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: transparent;
        border: none;
        font-size: 20px;
        cursor: pointer;
        z-index: 10000;
    `;

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? '🌙' : '☀️';
    });

    document.body.appendChild(themeToggle);
}

/**
 * Mengatur notifikasi (jika diperlukan)
 */
function setupNotifications() {
    if ('Notification' in window) {
        // Request permission for notifications
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                logger.info('Notification permission granted');
            }
        });
    }
}

/**
 * Mengatur shortcut keyboard
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + K is now handled by Command Palette module
        console.error('[KeyboardShortcuts Debug] key:', event.key, 'ctrlKey:', event.ctrlKey, 'metaKey:', event.metaKey, 'shiftKey:', event.shiftKey);

        // Ctrl/Cmd + N for new file
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n' && !event.shiftKey) {
            event.preventDefault();
            openCreateOverlayWrapper('file');
        }

        // Ctrl/Cmd + Shift + N for new folder
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            openCreateOverlayWrapper('folder');
        }

        // Ctrl/Cmd + R for refresh (prevent browser refresh)
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
            event.preventDefault();
            elements.btnRefresh.click();
        }
    });
}

/**
 * Menginisialisasi fitur-fitur tambahan
 */
function initializeAdditionalFeatures() {
    try { setupServiceWorker(); } catch (e) { console.error('setupServiceWorker error:', e); }
    try { setupPWA(); } catch (e) { console.error('setupPWA error:', e); }
    try { setupAnalytics(); } catch (e) { console.error('setupAnalytics error:', e); }
    try { setupTheme(); } catch (e) { console.error('setupTheme error:', e); }
    try { setupNotifications(); } catch (e) { console.error('setupNotifications error:', e); }
    try { setupKeyboardShortcuts(); } catch (e) { console.error('setupKeyboardShortcuts error:', e); }
}

// Enhanced scroll synchronization state
const scrollSyncState = {
    isScrollingFromEditor: false,
    isScrollingFromLineNumbers: false,
    lastScrollTime: 0,
    rafId: null,
    isInitialized: false,
    heightCheckTimeout: null,
    contentChangeTimeout: null
};

/**
 * Enhanced scroll synchronization with two-way binding and smooth behavior
 * @param {boolean} fromEditor - Whether scroll is triggered from editor
 */
function syncLineNumbersScroll(fromEditor = true) {
    const { previewEditor, previewLineNumbersInner } = elements;
    if (!previewLineNumbersInner || !previewEditor) {
        return;
    }

    // Simply sync line numbers to editor scroll position using transform
    const scrollTop = previewEditor.scrollTop;

    // Apply transform for smooth sync without transition (immediate)
    previewLineNumbersInner.style.transform = `translateY(${-scrollTop}px)`;
}

/**
 * Validate and fix scroll height mismatches
 */
function validateScrollHeights() {
    const { previewEditor, previewLineNumbersInner } = elements;
    if (!previewLineNumbersInner || !previewEditor) {
        return;
    }

    const editorScrollHeight = previewEditor.scrollHeight;
    const lineNumbersHeight = previewLineNumbersInner.scrollHeight;
    const heightDiff = Math.abs(editorScrollHeight - lineNumbersHeight);

    // Update line numbers if height difference is significant
    if (heightDiff > 10) {

        // Debounced update to prevent excessive re-renders
        clearTimeout(scrollSyncState.heightCheckTimeout);
        scrollSyncState.heightCheckTimeout = setTimeout(() => {
            updateLineNumbers();
        }, 100);
    }
}

/**
 * Throttled scroll logging for debugging
 */
function logScrollSync(direction, data) {
    const now = Date.now();
    if (now - scrollSyncState.lastScrollTime > 200) { // Log every 200ms max

        scrollSyncState.lastScrollTime = now;
    }
}

/**
 * Initialize scroll synchronization with proper event listeners
 */
function initializeScrollSync() {
    const { previewEditor, previewLineNumbersInner } = elements;
    if (!previewLineNumbersInner || !previewEditor || scrollSyncState.isInitialized) {
        return;
    }

    // Throttled scroll handler for editor (60fps = ~16ms)
    const throttledEditorScroll = throttle(() => {
        syncLineNumbersScroll(true);
    }, 16);
    scrollSyncState.throttledEditorScroll = throttledEditorScroll;

    // Throttled scroll handler for line numbers (wheel/scroll/touch)
    const throttledLineNumbersScroll = throttle(() => {
        syncLineNumbersScroll(false);
    }, 16);
    scrollSyncState.throttledLineNumbersScroll = throttledLineNumbersScroll;

    // Add event listeners with passive option for better performance
    previewEditor.addEventListener('scroll', throttledEditorScroll, { passive: true });

    // Handle wheel events on editor to normalize delta values
    const onEditorWheel = (e) => {
        // No-op handler kept for potential future normalization or intercepting
    };
    previewEditor.addEventListener('wheel', onEditorWheel, { passive: true });
    scrollSyncState.onEditorWheel = onEditorWheel;

    // Helper: animate editor scroll to a target top (smooth falling back to direct assignment)
    let smoothAnimId = null;
    let smoothTarget = null;
    function animateEditorScrollTo(target) {
        if (!previewEditor) {
            return;
        }
        smoothTarget = Math.max(0, Math.min(target, previewEditor.scrollHeight - previewEditor.clientHeight));
        if ('scrollBehavior' in document.documentElement.style) {
            // Browser supports smooth scroll via property
            previewEditor.scrollTo({ top: smoothTarget, behavior: 'smooth' });
            return;
        }
        // Fallback manual animation
        if (smoothAnimId) {
            cancelAnimationFrame(smoothAnimId);
        }
        const start = previewEditor.scrollTop;
        const diff = smoothTarget - start;
        const duration = 180; // ms
        const startTime = performance.now();
        function step(now) {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = (--t) * t * t + 1; // easeOutCubic
            previewEditor.scrollTop = start + diff * eased;
            if (Math.abs(previewEditor.scrollTop - smoothTarget) > 0.5) {
                smoothAnimId = requestAnimationFrame(step);
            } else {
                previewEditor.scrollTop = smoothTarget;
                smoothAnimId = null;
            }
        }
        smoothAnimId = requestAnimationFrame(step);
    }

    // Handle resize events to maintain synchronization
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target === previewEditor) {
                // Re-sync on resize
                syncLineNumbersScroll(true);
            }
        }
    });

    resizeObserver.observe(previewEditor);
    scrollSyncState.resizeObserver = resizeObserver;

    // Handle window resize
    const throttledWindowResize = throttle(() => {
        ensureConsistentStyling();
        syncLineNumbersScroll(true);
    }, 100);
    scrollSyncState.windowResizeHandler = throttledWindowResize;

    window.addEventListener('resize', throttledWindowResize, { passive: true });

    // Handle content changes
    const mutationObserver = new MutationObserver((mutations) => {
        let shouldResync = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' ||
                mutation.type === 'childList' ||
                (mutation.type === 'attributes' && mutation.attributeName === 'style')) {
                shouldResync = true;
            }
        });

        if (shouldResync) {
            // Debounced resync
            clearTimeout(scrollSyncState.contentChangeTimeout);
            scrollSyncState.contentChangeTimeout = setTimeout(() => {
                updateLineNumbers();
                syncLineNumbersScroll(true);
            }, 50);
        }
    });

    mutationObserver.observe(previewEditor, {
        characterData: true,
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });
    scrollSyncState.mutationObserver = mutationObserver;

    // Mark as initialized
    scrollSyncState.isInitialized = true;

    // Two-way: Allow mouse wheel / touch on line numbers to control editor scroll
    const { previewLineNumbers } = elements;
    if (previewLineNumbers) {
        // Wheel handler - convert wheel on line numbers to editor.scrollTop
        const onLineNumbersWheel = throttle((e) => {
            // Prevent default so only editor scroll changes (this helps mobile and trackpad)
            if (e.cancelable) {
                e.preventDefault();
            }

            // Normalize deltaY based on deltaMode
            let deltaY = e.deltaY;
            if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                deltaY *= 16;
            } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                deltaY *= previewEditor.clientHeight;
            }

            // Add to editor scrollTop with smooth animation
            animateEditorScrollTo(previewEditor.scrollTop + deltaY);
            // Update side too
            syncLineNumbersScroll(false);
        }, 16);

        // Pointer drag to scroll (desktop) & touch move (mobile)
        let isDragging = false;
        let dragStartY = 0;
        let dragStartTop = 0;

        function onPointerDown(e) {
            isDragging = true;
            dragStartY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            dragStartTop = previewEditor.scrollTop;
            previewLineNumbers.setPointerCapture?.(e.pointerId);
            e.preventDefault?.();
        }

        function onPointerMove(e) {
            if (!isDragging) {
                return;
            }
            const y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            const delta = dragStartY - y;
            const target = dragStartTop + delta;
            animateEditorScrollTo(target);
            syncLineNumbersScroll(false);
        }

        function onPointerUp(e) {
            isDragging = false;
            previewLineNumbers.releasePointerCapture?.(e.pointerId);
        }

        // Add listeners
        previewLineNumbers.addEventListener('wheel', onLineNumbersWheel, { passive: false });
        // pointer events
        previewLineNumbers.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        // touch fallback
        const onTouchStart = (e) => {
            isDragging = true; dragStartY = e.touches[0].clientY; dragStartTop = previewEditor.scrollTop;
        };
        const onTouchMove = throttle((e) => {
            if (!isDragging) {
                return;
            } const cur = e.touches[0].clientY; const delta = dragStartY - cur; animateEditorScrollTo(dragStartTop + delta); syncLineNumbersScroll(false);
        }, 16);
        const onTouchEnd = () => {
            isDragging = false;
        };
        previewLineNumbers.addEventListener('touchstart', onTouchStart, { passive: true });
        previewLineNumbers.addEventListener('touchmove', onTouchMove, { passive: false });
        previewLineNumbers.addEventListener('touchend', onTouchEnd, { passive: true });

        // If the line numbers container becomes scrollable, listen to its scroll event
        previewLineNumbers.addEventListener('scroll', throttledLineNumbersScroll, { passive: true });

        // Cleanup hook - ensure we remove listeners on cleanup
        const cleanupListeners = () => {
            previewLineNumbers.removeEventListener('wheel', onLineNumbersWheel);
            previewLineNumbers.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            previewLineNumbers.removeEventListener('touchstart', onTouchStart);
            previewLineNumbers.removeEventListener('touchmove', onTouchMove);
            previewLineNumbers.removeEventListener('touchend', onTouchEnd);
            previewLineNumbers.removeEventListener('scroll', throttledLineNumbersScroll);
        };

        // Expose cleanup for the existing cleanupScrollSync which uses other timers
        scrollSyncState.cleanupListeners = cleanupListeners;
    }

    // store editor listeners to cleanup later
    scrollSyncState.previewEditor = previewEditor;
    scrollSyncState.previewLineNumbers = elements.previewLineNumbers;
    // attach cancel function for smooth animation
    scrollSyncState.cancelSmoothAnim = () => {
        try {
            if (smoothAnimId) {
                cancelAnimationFrame(smoothAnimId);
            }
        } catch (e) {}
        smoothAnimId = null;
    };
}

/**
 * Cleanup scroll synchronization
 */
function cleanupScrollSync() {
    if (scrollSyncState.rafId) {
        cancelAnimationFrame(scrollSyncState.rafId);
    }
    // Cancel any autoraf for smooth scroll
    if (scrollSyncState.cancelSmoothAnim) {
        try {
            scrollSyncState.cancelSmoothAnim();
        } catch (e) {}
    }
    clearTimeout(scrollSyncState.heightCheckTimeout);
    clearTimeout(scrollSyncState.contentChangeTimeout);
    // Remove editor listeners
    try {
        if (scrollSyncState.previewEditor && scrollSyncState.throttledEditorScroll) {
            scrollSyncState.previewEditor.removeEventListener('scroll', scrollSyncState.throttledEditorScroll);
        }
        if (scrollSyncState.previewEditor && scrollSyncState.onEditorWheel) {
            scrollSyncState.previewEditor.removeEventListener('wheel', scrollSyncState.onEditorWheel);
        }
    } catch (e) { /* swallow */ }

    // Remove line numbers listeners and cleanup
    try {
        if (scrollSyncState.cleanupListeners) {
            scrollSyncState.cleanupListeners();
        }
    } catch (e) { /* swallow */ }

    // Disconnect observers
    try {
        if (scrollSyncState.resizeObserver) {
            scrollSyncState.resizeObserver.disconnect();
        }
    } catch (e) {}
    try {
        if (scrollSyncState.mutationObserver) {
            scrollSyncState.mutationObserver.disconnect();
        }
    } catch (e) {}

    // Remove window resize listener
    try {
        if (scrollSyncState.windowResizeHandler) {
            window.removeEventListener('resize', scrollSyncState.windowResizeHandler);
        }
    } catch (e) {}

    scrollSyncState.isInitialized = false;
    // unset saved references
    scrollSyncState.throttledEditorScroll = null;
    scrollSyncState.throttledLineNumbersScroll = null;
    scrollSyncState.onEditorWheel = null;
    scrollSyncState.resizeObserver = null;
    scrollSyncState.mutationObserver = null;
    scrollSyncState.windowResizeHandler = null;
    scrollSyncState.previewEditor = null;
    scrollSyncState.previewLineNumbers = null;
    scrollSyncState.cleanupListeners = null;
    scrollSyncState.cancelSmoothAnim = null;

}

/**
 * Setup language settings panel in the settings overlay.
 * Populates language options and handles language switching.
 */
function setupLanguageSettings() {
    const container = document.getElementById('language-options');
    if (!container) return;

    const langs = getSupportedLanguages();
    const current = getCurrentLanguage();

    container.innerHTML = '';
    langs.forEach(lang => {
        const isActive = lang.code === current;
        const option = document.createElement('label');
        option.className = `language-option d-flex items-center gap-3 cursor-pointer${isActive ? ' language-option--active' : ''}`;
        option.innerHTML = `
            <input type="radio" name="app-language" value="${lang.code}"
                   class="language-radio" ${isActive ? 'checked' : ''}>
            <span class="language-info">
                <span class="language-native font-medium">${lang.nativeName}</span>
                <span class="language-name text-sm text-muted">${lang.name}</span>
            </span>
            ${isActive ? '<span class="language-check">✓</span>' : ''}
        `;
        container.appendChild(option);
    });

    // Handle language change
    container.addEventListener('change', async (e) => {
        if (e.target.name !== 'app-language') return;
        const newLang = e.target.value;
        if (newLang === getCurrentLanguage()) return;

        const ok = await setLanguage(newLang);
        if (ok) {
            window.showSuccess?.(t('success.languageChanged'));
            // Reload page after short delay to apply all translations
            setTimeout(() => window.location.reload(), 800);
        }
    });
}

// Export fungsi utama
export {
    setupEventHandlers,
    loadInitialDirectory,
    initializeAdditionalFeatures,
    handleContextMenuAction,
    initializeScrollSync,
    cleanupScrollSync
};

// Expose some helper functions to legacy modules that call them directly
try {
    window.updateLineNumbers = updateLineNumbers;
    window.ensureConsistentStyling = ensureConsistentStyling;
    window.syncLineNumbersScroll = syncLineNumbersScroll;
    window.initializeScrollSync = initializeScrollSync;
    window.cleanupScrollSync = cleanupScrollSync;
    // Expose state getter for modals-handler.js (gallery navigation needs items list)
    window.getState = () => state;
} catch (e) { /* silent */ }

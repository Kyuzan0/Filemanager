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
import { fetchDirectory, fetchLogData, cleanupLogs } from './apiService.js';
import { renderItems as renderItemsComplex, updateSortUI, syncRowSelection, syncMobileSelection } from './uiRenderer.js';
import { updatePaginationState } from './pagination.js';

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
    container.classList.toggle('hidden', !hasItems);

    if (!hasItems) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'pagination-controls flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between';

    const info = document.createElement('div');
    info.className = 'text-sm text-gray-700';
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    info.textContent = `Menampilkan ${startItem}-${endItem} dari ${totalItems.toLocaleString('id-ID')} items`;

    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'flex flex-col gap-3 md:flex-row md:items-center md:justify-end md:gap-4';

    const navigationWrapper = document.createElement('div');
    navigationWrapper.className = 'pagination-buttons flex items-center gap-2';
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
                dots.className = 'px-2 text-gray-400';
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
    perPageWrapper.className = 'pagination-page-size flex items-center gap-2 text-sm text-gray-600';

    const perPageLabel = document.createElement('span');
    perPageLabel.className = 'hidden sm:inline text-gray-500';
    perPageLabel.textContent = 'Item per halaman';

    const perPageSelect = document.createElement('select');
    perPageSelect.className = 'pagination-page-size-select px-3 py-1.5 text-sm rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500';
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

function createPaginationButton(text, enabled, onClick, isActive = false) {
    const btn = document.createElement('button');
    btn.className = isActive
        ? 'px-3 py-1.5 text-sm rounded bg-blue-600 text-white font-medium'
        : 'px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
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
    if (moveOverlayModule) return moveOverlayModule;
    if (moveOverlayLoading) return moveOverlayLoading;
    
    console.log('[Code Splitting] Loading MoveOverlay module...');
    const startTime = performance.now();
    
    moveOverlayLoading = import('./moveOverlay.js')
        .then(module => {
            moveOverlayModule = module;
            const loadTime = performance.now() - startTime;
            console.log(`[Code Splitting] MoveOverlay loaded in ${loadTime.toFixed(2)}ms`);
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
async function loadLogManager() {
    if (logManagerModule) return logManagerModule;
    if (logManagerLoading) return logManagerLoading;
    
    console.log('[Code Splitting] Loading LogManager module...');
    const startTime = performance.now();
    
    logManagerLoading = import('./logManager.js')
        .then(module => {
            logManagerModule = module;
            const loadTime = performance.now() - startTime;
            console.log(`[Code Splitting] LogManager loaded in ${loadTime.toFixed(2)}ms`);
            return module;
        })
        .catch(error => {
            console.error('[Code Splitting] Failed to load LogManager:', error);
            logManagerLoading = null;
            throw error;
        });
    
    return logManagerLoading;
}
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
    openMediaPreview as openMediaPreviewModal,
    openLogModal,
    closeLogModal,
    setLogLoading,
    updateLogPagination
} from './modals.js';
import { 
    deleteItems, 
    moveItem, 
    renameItem, 
    createItem, 
    uploadFiles 
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
    info: (msg, data) => console.log(`[INITIALIZER] ${msg}`, data || ''),
    error: (msg, error) => console.error(`[INITIALIZER] ${msg}`, error || ''),
    warn: (msg, data) => console.warn(`[INITIALIZER] ${msg}`, data || '')
};

// Cache for lazy-loaded logManager functions
let logManagerFunctions = null;

/**
 * Get logManager functions (loads module if needed)
 * @returns {Promise<Object>} LogManager functions
 */
async function getLogManagerFunctions() {
    if (logManagerFunctions) return logManagerFunctions;
    
    const module = await loadLogManager();
    logManagerFunctions = {
        logInfo: module.logInfo,
        logError: module.logError,
        createLogger: module.createLogger,
        formatLogEntry: module.formatLogEntry,
        renderLogTable: module.renderLogTable,
        exportLogsToCSV: module.exportLogsToCSV,
        exportLogsToJSON: module.exportLogsToJSON,
        applyLogFilter: module.applyLogFilter,
        updateActiveFiltersDisplay: module.updateActiveFiltersDisplay,
        performLogCleanup: module.performLogCleanup,
        setupLogAutoRefresh: module.setupLogAutoRefresh,
        stopLogAutoRefresh: module.stopLogAutoRefresh,
        toggleLogAutoRefresh: module.toggleLogAutoRefresh
    };
    
    // Replace basic logger with real logger
    const realLogger = module.createLogger('INITIALIZER');
    logger.info = realLogger.info;
    logger.error = realLogger.error;
    logger.warn = realLogger.warn;
    
    return logManagerFunctions;
}

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
                console.log(`[EMERGENCY_CLEAR] Cleared element:`, {
                    selector: selector,
                    element: el.className || el.id,
                    was: el.style.display
                });
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
    console.log('[DEBUG] renderItems wrapper called');
    
    // Get items for current page using pagination-simple
    const pageItems = getCurrentPageItems(items);
    
    console.log('[DEBUG] Total items:', items.length, 'Page items:', pageItems.length);
    
    // Sync pagination.js state to prevent double-pagination in uiRenderer
    // We tell uiRenderer that we are on page 1 of 1, with all items shown
    // This ensures uiRenderer renders the slice as-is without trying to paginate it again
    updatePaginationState(1, 1, pageItems.length);

    // Call the complex renderer with paginated items
    renderItemsComplex(
        elements.tableBody,
        elements.emptyState,
        state,
        pageItems,  // Use paginated items instead of all items
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
        flashStatus,  // Add flashStatus helper
        setError      // Add setError helper
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
    if (!container) {
        console.warn('[Pagination] Container not found');
        return;
    }
    
    // Render pagination with callback
    renderSimplePagination(container, handlePageChange);
}

/**
 * Handle page change (called when user clicks pagination button)
 * @param {number} newPage - New page number
 */
function handlePageChange(newPage) {
    console.log('[Pagination] Page changed to:', newPage);
    console.log('[Pagination] Current path:', state.currentPath);
    console.log('[Pagination] Total items:', state.items.length);
    
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
    console.log('[DEBUG] openContextMenu called for:', item.name);
    // Context menu implementation would go here
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
    console.log('[DEBUG] navigateTo called with path:', path);
    console.log('[DEBUG] Path type:', typeof path);
    console.log('[DEBUG] Current state path before navigation:', state.currentPath);
    
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
        console.log('[DEBUG] fetchDirectoryWrapper called with path:', path);
        console.log('[DEBUG] Path length:', path ? path.length : 0);
        console.log('[DEBUG] Path characters:', path ? Array.from(path).map(c => c.charCodeAt(0)) : []);
        
        // Update loading state
        updateState({ isLoading: true });
        
        // Call the API
        const data = await fetchDirectory(path, options);
        console.log('[DEBUG] API response for path "' + path + '":', data);
        
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
                if (!state.filter) return true;
                return item.name.toLowerCase().includes(state.filter.toLowerCase());
            });
            updateState({ visibleItems });
            
            // Update pagination info with total items
            updatePaginationInfo(state.items.length);
            
            // Render the items (will use pagination)
            renderItems(state.items, state.lastUpdated, false);
            
            // Update UI elements
            updateSelectionUI();
            
            console.log('[DEBUG] State updated successfully:', state);
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
            fetchDirectoryWrapper(state.currentPath);
        }
    }, config.pollingInterval || 30000);
}

function handleContextMenuAction(action) {
    const { targetItem } = state.contextMenu;
    if (!targetItem) return;
    
    closeContextMenu();
    
    switch (action) {
        case 'open':
            if (targetItem.type === 'folder') {
                navigateTo(targetItem.path);
            } else {
                window.open(buildFileUrl(targetItem.path), '_blank');
            }
            break;
        case 'rename':
            openRenameOverlayWrapper(targetItem);
            break;
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
    let totalLines = sanitized.length === 0 ? 1 : sanitized.split('\n').length;

    // Fix for files ending without newline (e.g., </html> at end)
    // Add an extra line to ensure last line number is visible when scrolling to bottom
    if (value.length > 0 && !sanitized.endsWith('\n')) {
        totalLines += 1;
        console.log('[LINE_NUMBERS] Added extra line for file without newline ending');
    }

    // Performance optimization: skip rendering for very large files
    if (totalLines > 10000) {
        previewLineNumbersInner.innerHTML = '<span>1</span>';
        return;
    }

    // Build line numbers HTML
    let html = '';
    for (let i = 1; i <= totalLines; i += 1) {
        html += `<span>${i}</span>`;
    }

    previewLineNumbersInner.innerHTML = html || '<span>1</span>';
    
    // Debug logging
    console.log('[LINE_NUMBERS] Updated:', {
        totalLines,
        editorScrollTop: previewEditor.scrollTop,
        editorScrollHeight: previewEditor.scrollHeight,
        editorClientHeight: previewEditor.clientHeight,
        endsWithNewline: sanitized.endsWith('\n')
    });
    
    // Force a recalculation of styles to ensure alignment
    previewLineNumbersInner.style.transform = 'translateY(0px)';
    
    // Ensure consistent styling between line numbers and editor
    ensureConsistentStyling();
    
    // Sync scroll position
    syncLineNumbersScroll();
}

function ensureConsistentStyling() {
    const { previewEditor, previewLineNumbersInner } = elements;
    if (!previewLineNumbersInner || !previewEditor) {
        return;
    }
    
    const editorStyle = window.getComputedStyle(previewEditor);
    const editorLineHeight = parseFloat(editorStyle.lineHeight);
    const editorFontSize = parseFloat(editorStyle.fontSize);
    const calculatedLineHeight = isNaN(editorLineHeight) ? editorFontSize * 1.6 : editorLineHeight;
    
    // Apply the same line height to the line numbers spans for consistency
    const lineSpans = previewLineNumbersInner.querySelectorAll('span');
    lineSpans.forEach(span => {
        span.style.height = `${calculatedLineHeight}px`;
        span.style.lineHeight = `${calculatedLineHeight}px`;
    });
    
    console.log('[LINE_NUMBERS] Ensured consistent styling with line height:', calculatedLineHeight);
}

function syncLineNumbersScroll() {
    const { previewEditor, previewLineNumbersInner } = elements;
    if (!previewLineNumbersInner || !previewEditor) {
        return;
    }

    const scrollTop = previewEditor.scrollTop;
    const scrollHeight = previewEditor.scrollHeight;
    const clientHeight = previewEditor.clientHeight;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
    
    // Get the computed line height for more accurate alignment
    const editorStyle = window.getComputedStyle(previewEditor);
    const lineNumbersStyle = window.getComputedStyle(previewLineNumbersInner);
    
    // Calculate the exact line height
    const editorLineHeight = parseFloat(editorStyle.lineHeight);
    const editorFontSize = parseFloat(editorStyle.fontSize);
    const calculatedLineHeight = isNaN(editorLineHeight) ? editorFontSize * 1.6 : editorLineHeight;
    
    // Improved scroll synchronization for files ending without newline
    let transformOffset = -scrollTop;
    
    // If at bottom and file doesn't end with newline, adjust offset
    if (isAtBottom && previewEditor.value && !previewEditor.value.endsWith('\n')) {
        // Add a small adjustment to ensure the last line number is visible
        // Use the calculated line height for more precise adjustment
        transformOffset -= calculatedLineHeight * 0.125; // 1/8 of line height adjustment
        console.log('[LINE_NUMBERS] Applied bottom adjustment:', calculatedLineHeight * 0.125);
    }
    
    // Debug logging
    console.log('[LINE_NUMBERS] Scroll sync:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        isAtBottom,
        transformOffset,
        calculatedLineHeight,
        editorLineHeight,
        editorFontSize,
        endsWithNewline: previewEditor.value ? previewEditor.value.endsWith('\n') : 'empty'
    });
    
    previewLineNumbersInner.style.transform = `translateY(${transformOffset}px)`;
}
/**
 * Debug function to compare element styles between editor and line numbers
 * Useful for troubleshooting alignment issues
 */
function debugElementStyles() {
    const { previewEditor, previewLineNumbersInner } = elements;
    if (!previewLineNumbersInner || !previewEditor) {
        console.log('[LINE_NUMBERS] Debug: Elements not found');
        return;
    }
    
    const editorStyle = window.getComputedStyle(previewEditor);
    const lineNumbersStyle = window.getComputedStyle(previewLineNumbersInner);
    
    console.log('[LINE_NUMBERS] Debug element styles:', {
        editor: {
            fontSize: editorStyle.fontSize,
            lineHeight: editorStyle.lineHeight,
            fontFamily: editorStyle.fontFamily,
            paddingTop: editorStyle.paddingTop,
            paddingBottom: editorStyle.paddingBottom
        },
        lineNumbers: {
            fontSize: lineNumbersStyle.fontSize,
            lineHeight: lineNumbersStyle.lineHeight,
            fontFamily: lineNumbersStyle.fontFamily,
            paddingTop: lineNumbersStyle.paddingTop,
            paddingBottom: lineNumbersStyle.paddingBottom
        }
    });
}


async function savePreviewContent() {
    if (state.preview.isSaving) return;
    
    console.log('[PREVIEW] Saving file:', state.preview.path);
    
    // Update state to saving
    updateState({
        preview: {
            ...state.preview,
            isSaving: true
        }
    });
    updatePreviewStatus();
    
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
        
        console.log('[PREVIEW] File saved successfully:', data);
        
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
            elements.previewStatus.textContent = `Disimpan • ${data.characters.toLocaleString('id-ID')} karakter`;
        }
        
        // Disable save button
        if (elements.previewSave) {
            elements.previewSave.disabled = true;
        }
        
        // Show success notification
        flashStatus('File berhasil disimpan');
        
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
        
        // Show error notification
        setError('Gagal menyimpan file: ' + error.message);
    }
}

function updateSelectionUI() {
    const { btnDeleteSelected, btnDeleteSelectedDesktop, btnMoveSelected, selectAllCheckbox, selectAllCheckboxMobile, tableBody, mobileFileList } = elements;
    const selectedCount = state.selected.size;
    
    if (btnDeleteSelected) {
        btnDeleteSelected.disabled = selectedCount === 0 || state.isLoading;
        btnDeleteSelected.textContent = selectedCount > 0
            ? `Hapus (${selectedCount})`
            : 'Hapus';
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
    console.log('[DEBUG] uploadFilesWrapper called with files:', files);
    
    await uploadFiles(
        files,
        state,
        setLoading,
        setError,
        fetchDirectoryWrapper,
        flashStatus,
        elements.btnUpload
    );
}

/**
 * Wrapper function untuk create item dengan parameter lengkap
 * @param {string} kind - Jenis item ('file' atau 'folder')
 * @param {string} name - Nama item
 */
async function createItemWrapper(kind, name) {
    console.log('[DEBUG] createItemWrapper called with kind:', kind, 'name:', name);
    
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
    console.log('[DEBUG] deleteItemsWrapper called with paths:', paths);
    
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
    console.log('[DEBUG] renameItemWrapper called');
    
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
    console.log('[PREVIEW] Opening text preview for:', item.name);
    
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
        // Fetch file content - using 'content' action instead of 'preview'
        const response = await fetch(`api.php?action=content&path=${encodeURIComponent(item.path)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to load file');
        }

        state.preview.originalContent = data.content || '';
        elements.previewEditor.value = state.preview.originalContent;
        elements.previewEditor.readOnly = false;
        updateLineNumbers();
        ensureConsistentStyling();

        if (elements.previewStatus) {
            elements.previewStatus.textContent = `Karakter: ${data.content.length.toLocaleString('id-ID')}`;
        }
        
        // Debug element styles after loading for troubleshooting
        setTimeout(() => {
            debugElementStyles();
        }, 100);
    } catch (error) {
        console.error('[PREVIEW] Error loading file:', error);
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
    console.log('[PREVIEW] Opening media preview for:', item.name);
    
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
async function openLogModalWrapper() {
    logger.info('Opening log modal...');
    
    // Lazy load logManager module
    await loadLogManager();
    
    // Open the modal
    openLogModal(
        state,
        elements.logOverlay,
        elements.logClose
    );
    
    // Fetch initial log data
    await fetchLogDataWrapper();
}

/**
 * Wrapper function untuk menutup log modal
 */
async function closeLogModalWrapper() {
    logger.info('Closing log modal...');
    
    // Stop auto-refresh if active
    if (state.logs.refreshInterval) {
        const { stopLogAutoRefresh } = await getLogManagerFunctions();
        stopLogAutoRefresh(state);
    }
    
    closeLogModal(
        state,
        elements.logOverlay
    );
}

/**
 * Wrapper function untuk fetch log data dengan filters
 * ENHANCED: Comprehensive debug logging and multiple failsafes
 */
async function fetchLogDataWrapper(filters = null, page = 1, limit = 50) {
    const startTime = performance.now();
    const requestId = `LOG_${Date.now()}`;
    
    console.log(`[${requestId}] ========== LOG FETCH START ==========`);
    console.log(`[${requestId}] Params:`, { filters, page, limit });
    console.trace(`[${requestId}] Called from:`);
    
    // FAILSAFE 1: Timeout with forced cleanup after 10 seconds
    const loadingTimeout = setTimeout(() => {
        const elapsed = performance.now() - startTime;
        console.error(`[${requestId}] ⚠️ TIMEOUT after ${elapsed.toFixed(0)}ms - forcing cleanup`);
        
        // Force clear loading state
        setLogLoading(state, elements.logTableBody, false);
        updateState({
            logs: {
                ...state.logs,
                isLoading: false
            }
        });
        
        if (elements.logTableBody) {
            elements.logTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #f44336;">
                        ⚠️ Loading timeout after ${(elapsed/1000).toFixed(1)}s - please try refreshing
                    </td>
                </tr>
            `;
        }
        
        // FAILSAFE 2: Double-check global loader is hidden
        const loaderOverlay = document.querySelector('.loader-overlay');
        if (loaderOverlay) {
            loaderOverlay.classList.remove('visible');
            console.error(`[${requestId}] Timeout failsafe: Global loader force-hidden`);
        }
    }, 10000);
    
    try {
        // Use active filters if no filters provided
        const activeFilters = filters || state.logs.activeFilters || {};
        console.log(`[${requestId}] Active filters:`, activeFilters);
        
        // Set loading state
        console.log(`[${requestId}] Setting loading state TRUE`);
        setLogLoading(state, elements.logTableBody, true);
        
        // Fetch data from API
        console.log(`[${requestId}] Calling fetchLogData API...`);
        const fetchStart = performance.now();
        const data = await fetchLogData(activeFilters, page, limit);
        const fetchDuration = performance.now() - fetchStart;
        console.log(`[${requestId}] API response received in ${fetchDuration.toFixed(0)}ms:`, {
            success: data?.success,
            logCount: data?.logs?.length,
            pagination: data?.pagination
        });
        
        if (data && data.success) {
            // Update state with fetched data
            console.log(`[${requestId}] Updating state with ${data.logs?.length || 0} logs`);
            updateState({
                logs: {
                    ...state.logs,
                    data: data.logs || [],
                    currentPage: data.pagination?.current_page || page,
                    totalPages: data.pagination?.total_pages || 1,
                    isLoading: false
                }
            });
            
            // Render log table
            console.log(`[${requestId}] Rendering log table...`);
            const renderStart = performance.now();
            const { renderLogTable } = await getLogManagerFunctions();
            renderLogTable(
                state.logs.data,
                elements.logTableBody,
                formatDate
            );
            const renderDuration = performance.now() - renderStart;
            console.log(`[${requestId}] Table rendered in ${renderDuration.toFixed(0)}ms`);
            
            // Update pagination UI
            console.log(`[${requestId}] Updating pagination UI`);
            updateLogPagination(
                state,
                elements.logPrevPage,
                elements.logNextPage,
                elements.logPageInfo
            );
            
            console.log(`[${requestId}] ✓ Fetch completed successfully`);
        } else {
            throw new Error(data?.error || 'Failed to fetch log data');
        }
    } catch (error) {
        console.error(`[${requestId}] ✗ Error fetching log data:`, error);
        logger.error('Error fetching log data', error);
        
        // Show error in table
        if (elements.logTableBody) {
            elements.logTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                        Error: ${error.message}
                    </td>
                </tr>
            `;
        }
    } finally {
        // Clear the timeout since operation completed
        clearTimeout(loadingTimeout);
        
        const totalDuration = performance.now() - startTime;
        console.log(`[${requestId}] Finally block executing after ${totalDuration.toFixed(0)}ms`);
        
        // CRITICAL: Always clear loading state, even on error
        console.log(`[${requestId}] Setting loading state FALSE`);
        setLogLoading(state, elements.logTableBody, false);
        
        // Update state to ensure isLoading is false
        updateState({
            logs: {
                ...state.logs,
                isLoading: false
            }
        });
        
        console.log(`[${requestId}] State updated - isLoading: ${state.logs.isLoading}`);
        
        // FAILSAFE 3: Triple-check everything is cleared
        setTimeout(() => {
            const loaderOverlay = document.querySelector('.loader-overlay');
            if (loaderOverlay && loaderOverlay.classList.contains('visible')) {
                console.error(`[${requestId}] ⚠️ CRITICAL: Loader STILL visible 100ms after clear! Force removing...`);
                loaderOverlay.classList.remove('visible');
            } else if (loaderOverlay) {
                console.log(`[${requestId}] ✓ Loader correctly hidden after cleanup`);
            }
            
            if (state.logs.isLoading) {
                console.error(`[${requestId}] ⚠️ CRITICAL: state.logs.isLoading still TRUE! Force clearing...`);
                updateState({
                    logs: {
                        ...state.logs,
                        isLoading: false
                    }
                });
            }
        }, 100);
        
        console.log(`[${requestId}] ========== LOG FETCH END (${totalDuration.toFixed(0)}ms) ==========`);
        logger.info(`Log fetch completed in ${totalDuration.toFixed(0)}ms`);
    }
}

/**
 * Wrapper function untuk apply log filter
 */
async function applyLogFilterWrapper() {
    // Apply filter using the logManager function
    const { applyLogFilter } = await getLogManagerFunctions();
    applyLogFilter(state, fetchLogDataWrapper);
}

/**
 * Wrapper function untuk clear log filters
 */
async function clearLogFiltersWrapper() {
    // Reset all filter inputs
    if (elements.logFilterAction) elements.logFilterAction.value = '';
    if (elements.logFilterStartDate) elements.logFilterStartDate.value = '';
    if (elements.logFilterEndDate) elements.logFilterEndDate.value = '';
    if (elements.logFilterType) elements.logFilterType.value = '';
    if (elements.logFilterPath) elements.logFilterPath.value = '';
    if (elements.logFilterSort) elements.logFilterSort.value = 'desc';
    
    // Clear active filters
    updateState({
        logs: {
            ...state.logs,
            activeFilters: {}
        }
    });
    
    // Update active filters display
    const { updateActiveFiltersDisplay } = await getLogManagerFunctions();
    updateActiveFiltersDisplay({}, elements.logActiveFilters);
    
    // Fetch data without filters
    await fetchLogDataWrapper({}, 1, 50);
}

/**
 * Wrapper function untuk export logs to CSV
 */
async function exportLogsToCSVWrapper() {
    try {
        const { exportLogsToCSV } = await getLogManagerFunctions();
        exportLogsToCSV(state.logs.data, formatDate);
        logger.info('Logs exported to CSV successfully');
    } catch (error) {
        logger.error('Error exporting logs to CSV', error);
        alert('Error exporting logs to CSV: ' + error.message);
    }
}

/**
 * Wrapper function untuk export logs to JSON
 */
async function exportLogsToJSONWrapper() {
    try {
        const { exportLogsToJSON } = await getLogManagerFunctions();
        exportLogsToJSON(state.logs.data);
        logger.info('Logs exported to JSON successfully');
    } catch (error) {
        logger.error('Error exporting logs to JSON', error);
        alert('Error exporting logs to JSON: ' + error.message);
    }
}

/**
 * Wrapper function untuk cleanup logs
 */
async function performLogCleanupWrapper() {
    if (!confirm('Are you sure you want to cleanup old logs? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Set cleanup state
        updateState({
            logs: {
                ...state.logs,
                isCleaningUp: true
            }
        });
        
        // Disable cleanup button
        if (elements.logCleanupBtn) {
            elements.logCleanupBtn.disabled = true;
            elements.logCleanupBtn.textContent = 'Cleaning up...';
        }
        
        // Perform cleanup
        const { performLogCleanup } = await getLogManagerFunctions();
        const result = await performLogCleanup(cleanupLogs);
        
        if (result.success) {
            alert(`Cleanup successful! Deleted ${result.deleted} old log entries.`);
            
            // Refresh log data
            await fetchLogDataWrapper();
        } else {
            throw new Error(result.error || 'Cleanup failed');
        }
    } catch (error) {
        logger.error('Error performing log cleanup', error);
        alert('Error cleaning up logs: ' + error.message);
    } finally {
        // Reset cleanup state
        updateState({
            logs: {
                ...state.logs,
                isCleaningUp: false
            }
        });
        
        // Re-enable cleanup button
        if (elements.logCleanupBtn) {
            elements.logCleanupBtn.disabled = false;
            elements.logCleanupBtn.textContent = 'Cleanup Old Logs';
        }
    }
}

/**
 * Wrapper function untuk toggle auto-refresh
 */
async function toggleLogAutoRefreshWrapper() {
    const { toggleLogAutoRefresh } = await getLogManagerFunctions();
    toggleLogAutoRefresh(
        state,
        fetchLogDataWrapper,
        elements.logAutoRefreshToggle
    );
}

/**
 * Wrapper function untuk pagination - previous page
 */
async function logPreviousPageWrapper() {
    if (state.logs.currentPage > 1) {
        await fetchLogDataWrapper(state.logs.activeFilters, state.logs.currentPage - 1, 50);
    }
}

/**
 * Wrapper function untuk pagination - next page
 */
async function logNextPageWrapper() {
    if (state.logs.currentPage < state.logs.totalPages) {
        await fetchLogDataWrapper(state.logs.activeFilters, state.logs.currentPage + 1, 50);
    }
}

/**
 * Setup log modal event handlers
 */
function setupLogModalHandlers() {
    logger.info('Setting up log modal handlers...');
    
    // Open log modal button (assuming there's a button with id 'btn-logs')
    const btnLogs = document.getElementById('btn-logs');
    if (btnLogs) {
        btnLogs.addEventListener('click', openLogModalWrapper);
    }
    
    // Close log modal
    if (elements.logClose) {
        elements.logClose.addEventListener('click', closeLogModalWrapper);
    }
    
    // Close on overlay click
    if (elements.logOverlay) {
        elements.logOverlay.addEventListener('click', (e) => {
            if (e.target === elements.logOverlay) {
                closeLogModalWrapper();
            }
        });
    }
    
    // Apply filters button
    if (elements.logApplyFilters) {
        elements.logApplyFilters.addEventListener('click', applyLogFilterWrapper);
    }
    
    // Clear filters button
    if (elements.logClearFilters) {
        elements.logClearFilters.addEventListener('click', clearLogFiltersWrapper);
    }
    
    // Toggle filter section
    const logToggleFilters = document.getElementById('log-toggle-filters');
    const logFilterSection = document.querySelector('.log-filter-section');
    if (logToggleFilters && logFilterSection) {
        logToggleFilters.addEventListener('click', () => {
            logFilterSection.classList.toggle('collapsed');
            const isCollapsed = logFilterSection.classList.contains('collapsed');
            logToggleFilters.textContent = isCollapsed ? '▼ Show Filters' : '▲ Hide Filters';
        });
    }
    
    // Setup export dropdown handler
    const logExportToggle = document.getElementById('log-export-toggle');
    const logExportMenu = document.getElementById('log-export-menu');
    const logExportCSV = document.getElementById('log-export-csv');
    const logExportJSON = document.getElementById('log-export-json');
    
    if (logExportToggle && logExportMenu && logExportCSV && logExportJSON) {
        setupLogExportHandler(
            logExportToggle,
            logExportMenu,
            logExportCSV,
            logExportJSON,
            exportLogsToCSVWrapper,
            exportLogsToJSONWrapper
        );
    }
    
    // Cleanup button
    if (elements.logCleanupBtn) {
        elements.logCleanupBtn.addEventListener('click', performLogCleanupWrapper);
    }
    
    // Auto-refresh toggle
    if (elements.logAutoRefreshToggle) {
        elements.logAutoRefreshToggle.addEventListener('click', toggleLogAutoRefreshWrapper);
    }
    
    // Pagination buttons
    if (elements.logPrevPage) {
        elements.logPrevPage.addEventListener('click', logPreviousPageWrapper);
    }
    
    if (elements.logNextPage) {
        elements.logNextPage.addEventListener('click', logNextPageWrapper);
    }
    
    // Filter inputs - apply on Enter key
    const filterInputs = [
        elements.logFilterAction,
        elements.logFilterStartDate,
        elements.logFilterEndDate,
        elements.logFilterType,
        elements.logFilterPath,
        elements.logFilterSort
    ];
    
    filterInputs.forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    applyLogFilterWrapper();
                }
            });
        }
    });
    
    logger.info('Log modal handlers setup completed');
}

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

        // Setup event handlers
        setupEventHandlers();
        
        // Setup drag and drop - fileCard drop zone
        setupFileCardDropZone();
        
        // Setup move overlay handlers (lazy-loaded on first move operation)
        // Will be loaded when user clicks move button
        logger.info('Move overlay will be loaded on demand');
        
        // Load initial directory
        await loadInitialDirectory();
        
        // Start polling for updates
        startPolling();
        
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

    // Setup throttled scroll sync for line numbers (60fps = ~16ms)
    if (elements.previewEditor) {
        const throttledScrollSync = throttle(() => {
            syncLineNumbersScroll();
        }, 16);

        elements.previewEditor.addEventListener('scroll', throttledScrollSync, { passive: true });
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

    // Setup context menu handler (ensure items nodeList exists)
    if (elements.contextMenuItems && elements.contextMenu) {
        setupContextMenuHandler(
            elements.contextMenuItems,
            elements.contextMenu,
            state,
            handleContextMenuAction,
            closeContextMenu
        );
    } else {
        logger.warn('Skipping context menu handler - elements.contextMenu or contextMenuItems missing');
    }

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
            if (btn.closest && btn.closest('.split-action')) return; // skip split-action items
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
                try { openCreateOverlayWrapper(); } catch (err) { console.error('openCreateOverlayWrapper failed', err); }
            });
            // Keyboard support: Enter / Space
            btn.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    try { openCreateOverlayWrapper(); } catch (err) { console.error('openCreateOverlayWrapper failed', err); }
                }
            });
        });
    } catch (err) {
        logger.warn('Failed to attach Add Item button handlers', err);
    }

    // Setup move selected button handler (lazy-load moveOverlay module)
    if (elements.btnMoveSelected) {
        elements.btnMoveSelected.addEventListener('click', async () => {
            if (state.selected.size === 0) return;

            try {
                const module = await loadMoveOverlay();
                if (module.setupMoveOverlayHandlers) module.setupMoveOverlayHandlers();
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

    // Setup log modal handlers (always attempt; internal function will guard)
    try {
        setupLogModalHandlers();
    } catch (e) {
        logger.warn('setupLogModalHandlers failed or partially unavailable', e);
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
        background: #f44336;
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
            background: #2196F3;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
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
    const savedTheme = localStorage.getItem('theme') || 'light';
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
        // Ctrl/Cmd + K for search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            elements.filterInput.focus();
        }
        
        // Ctrl/Cmd + N for new file
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            openCreateOverlayWrapper('file');
        }
        
        // Ctrl/Cmd + Shift + N for new folder
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
            event.preventDefault();
            openCreateOverlayWrapper('folder');
        }
        
        // Ctrl/Cmd + R for refresh (prevent browser refresh)
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            elements.btnRefresh.click();
        }
    });
}

/**
 * Menginisialisasi fitur-fitur tambahan
 */
function initializeAdditionalFeatures() {
    setupServiceWorker();
    setupPWA();
    setupAnalytics();
    setupTheme();
    setupNotifications();
    setupKeyboardShortcuts();
}

// Export fungsi utama
export {
    setupEventHandlers,
    loadInitialDirectory,
    initializeAdditionalFeatures,
    handleContextMenuAction
};
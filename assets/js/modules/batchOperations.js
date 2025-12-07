/**
 * Batch Operations UI Module
 * Provides enhanced multi-select and batch operations for the File Manager
 * 
 * Features:
 * - Shift+Click for range selection
 * - Ctrl+Click for individual toggle
 * - Selection count indicator
 * - Select All / Deselect All buttons
 * - Batch delete, move, download operations
 * - Progress indicator for batch operations
 */

import { state, updateState } from './state.js';
import { debugLog } from './debug.js';
import { announce, announceSelection } from './accessibility.js';

// ============================================================================
// State Management
// ============================================================================

let lastSelectedIndex = -1;
let isOperationInProgress = false;
let operationProgress = { current: 0, total: 0, action: '' };
let hasBeenActivated = false; // Track if indicator has been shown before

// Callback holders for external integration
let callbacks = {
    onSelectionChange: null,
    onBatchDelete: null,
    onBatchMove: null,
    onBatchDownload: null,
    getItems: () => state.visibleItems || [],
};

// ============================================================================
// Selection UI Components
// ============================================================================

/**
 * Create or get the selection indicator element
 * @returns {HTMLElement} The selection indicator element
 */
function getOrCreateSelectionIndicator() {
    let indicator = document.getElementById('batch-selection-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'batch-selection-indicator';
        indicator.className = 'batch-selection-indicator';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');
        indicator.innerHTML = `
            <div class="selection-info">
                <span class="selection-count">0 item dipilih</span>
            </div>
            <div class="selection-actions">
                <button type="button" class="batch-btn batch-btn-select-all" aria-label="Pilih semua">
                    <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
                        <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                    </svg>
                    <span>Pilih Semua</span>
                </button>
                <button type="button" class="batch-btn batch-btn-deselect" aria-label="Batalkan pilihan">
                    <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    <span>Batalkan</span>
                </button>
            </div>
        `;

        // Insert after action bar or at the top of the file card
        const actionBar = document.querySelector('.action-bar, .file-actions');
        if (actionBar) {
            actionBar.parentNode.insertBefore(indicator, actionBar.nextSibling);
        } else {
            const fileCard = document.querySelector('.file-card, .files-container');
            if (fileCard) {
                fileCard.insertBefore(indicator, fileCard.firstChild);
            } else {
                document.body.appendChild(indicator);
            }
        }

        // Attach event listeners
        const selectAllBtn = indicator.querySelector('.batch-btn-select-all');
        const deselectBtn = indicator.querySelector('.batch-btn-deselect');

        selectAllBtn.addEventListener('click', selectAllItems);
        deselectBtn.addEventListener('click', deselectAllItems);

        debugLog('[BatchOperations] Selection indicator created');
    }

    return indicator;
}

/**
 * Update the selection indicator UI
 * @param {boolean} isCheckboxTrigger - Whether this was triggered by a checkbox click
 */
export function updateSelectionIndicator(isCheckboxTrigger = false) {
    const indicator = getOrCreateSelectionIndicator();
    const count = state.selected?.size || 0;
    const countSpan = indicator.querySelector('.selection-count');

    if (countSpan) {
        countSpan.textContent = count === 0
            ? 'Tidak ada item dipilih'
            : `${count} item dipilih`;
    }

    // Show/hide indicator based on selection
    if (count > 0) {
        const wasHidden = !indicator.classList.contains('visible');
        indicator.classList.add('visible');
        indicator.classList.remove('hidden');
        
        // Add first-activation class when showing for the first time via checkbox
        if (wasHidden && isCheckboxTrigger && !hasBeenActivated) {
            hasBeenActivated = true;
            indicator.classList.add('first-activation');
            
            // Remove the class after animation completes
            setTimeout(() => {
                indicator.classList.remove('first-activation');
            }, 600); // Match animation duration
            
            debugLog('[BatchOperations] First activation triggered');
        }
    } else {
        indicator.classList.remove('visible');
        indicator.classList.add('hidden');
        // Reset activation state when all items are deselected
        hasBeenActivated = false;
    }

    // Update batch action buttons visibility
    updateBatchActionsVisibility(count);
}

/**
 * Update batch action buttons visibility
 * @param {number} count - Number of selected items
 */
function updateBatchActionsVisibility(count) {
    const batchButtons = document.querySelectorAll('[data-batch-action]');
    batchButtons.forEach(btn => {
        if (count > 0) {
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
        } else {
            btn.setAttribute('disabled', 'true');
            btn.classList.add('disabled');
        }
    });
}

// ============================================================================
// Selection Logic
// ============================================================================

/**
 * Handle item click with range and toggle selection support
 * @param {Event} event - The click event
 * @param {string} itemPath - The path of the clicked item
 * @param {number} itemIndex - The index of the item in the list
 */
export function handleItemClick(event, itemPath, itemIndex) {
    const items = callbacks.getItems();
    
    if (event.shiftKey && lastSelectedIndex >= 0) {
        // Range selection: Shift+Click
        handleRangeSelection(itemIndex, items);
    } else if (event.ctrlKey || event.metaKey) {
        // Toggle selection: Ctrl+Click / Cmd+Click
        handleToggleSelection(itemPath, itemIndex);
    } else {
        // Single selection (if not clicking on checkbox)
        if (event.target.type !== 'checkbox') {
            // Clear previous selection and select only this item
            state.selected.clear();
            state.selected.add(itemPath);
            lastSelectedIndex = itemIndex;
        }
    }

    // Update UI
    updateSelectionUI();
    announceSelectionChange();

    // Trigger callback
    if (callbacks.onSelectionChange) {
        callbacks.onSelectionChange(Array.from(state.selected));
    }

    debugLog('[BatchOperations] Item clicked:', itemPath, 'Selected:', state.selected.size);
}

/**
 * Handle range selection (Shift+Click)
 * @param {number} currentIndex - The current item index
 * @param {Array} items - The list of items
 */
function handleRangeSelection(currentIndex, items) {
    const start = Math.min(lastSelectedIndex, currentIndex);
    const end = Math.max(lastSelectedIndex, currentIndex);

    // Select all items in range
    for (let i = start; i <= end; i++) {
        if (items[i]) {
            state.selected.add(items[i].path);
        }
    }

    debugLog('[BatchOperations] Range selection:', start, 'to', end);
}

/**
 * Handle toggle selection (Ctrl+Click)
 * @param {string} itemPath - The item path
 * @param {number} itemIndex - The item index
 */
function handleToggleSelection(itemPath, itemIndex) {
    if (state.selected.has(itemPath)) {
        state.selected.delete(itemPath);
    } else {
        state.selected.add(itemPath);
    }
    lastSelectedIndex = itemIndex;

    debugLog('[BatchOperations] Toggle selection:', itemPath);
}

/**
 * Select all visible items
 */
export function selectAllItems() {
    const items = callbacks.getItems();
    
    items.forEach(item => {
        state.selected.add(item.path);
    });

    lastSelectedIndex = items.length - 1;

    updateSelectionUI();
    announceSelectionChange();

    if (callbacks.onSelectionChange) {
        callbacks.onSelectionChange(Array.from(state.selected));
    }

    debugLog('[BatchOperations] Selected all items:', state.selected.size);
}

/**
 * Deselect all items
 */
export function deselectAllItems() {
    state.selected.clear();
    lastSelectedIndex = -1;

    updateSelectionUI();
    announceSelectionChange();

    if (callbacks.onSelectionChange) {
        callbacks.onSelectionChange([]);
    }

    debugLog('[BatchOperations] Deselected all items');
}

/**
 * Toggle selection for a specific item
 * @param {string} itemPath - The item path
 * @param {boolean} selected - Whether to select or deselect
 * @param {boolean} isCheckboxTrigger - Whether this was triggered by a checkbox click
 */
export function toggleItemSelection(itemPath, selected, isCheckboxTrigger = true) {
    if (selected) {
        state.selected.add(itemPath);
    } else {
        state.selected.delete(itemPath);
    }

    updateSelectionUI(isCheckboxTrigger);
    announceSelectionChange();

    if (callbacks.onSelectionChange) {
        callbacks.onSelectionChange(Array.from(state.selected));
    }
}

/**
 * Get selected items
 * @returns {Array} Array of selected item paths
 */
export function getSelectedItems() {
    return Array.from(state.selected || []);
}

/**
 * Check if an item is selected
 * @param {string} itemPath - The item path
 * @returns {boolean} Whether the item is selected
 */
export function isItemSelected(itemPath) {
    return state.selected?.has(itemPath) || false;
}

// ============================================================================
// Selection UI Update
// ============================================================================

/**
 * Update all selection-related UI elements
 * @param {boolean} isCheckboxTrigger - Whether this was triggered by a checkbox click
 */
function updateSelectionUI(isCheckboxTrigger = false) {
    // Update indicator
    updateSelectionIndicator(isCheckboxTrigger);

    // Update checkboxes
    const checkboxes = document.querySelectorAll('.item-select, input[data-path]');
    checkboxes.forEach(checkbox => {
        const path = checkbox.dataset.path;
        if (path) {
            checkbox.checked = state.selected.has(path);
        }
    });

    // Update row visual state
    const rows = document.querySelectorAll('tr[data-item-path], div[data-item-path]');
    
    // Get the first item from the Set (insertion order)
    const iterator = state.selected.values();
    const firstResult = iterator.next();
    const currentFirstSelected = firstResult.done ? null : firstResult.value;
    
    rows.forEach(row => {
        const path = row.dataset.itemPath;
        if (path) {
            if (state.selected.has(path)) {
                row.classList.add('selected');
                row.setAttribute('aria-selected', 'true');
                
                // Maintain first-selected class for the first selected item
                if (path === currentFirstSelected) {
                    row.classList.add('first-selected');
                } else {
                    row.classList.remove('first-selected');
                }
            } else {
                row.classList.remove('selected', 'first-selected');
                row.setAttribute('aria-selected', 'false');
            }
        }
    });

    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        const items = callbacks.getItems();
        const allSelected = items.length > 0 && items.every(item => state.selected.has(item.path));
        const someSelected = items.some(item => state.selected.has(item.path));
        
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
    }
}

/**
 * Announce selection change for screen readers
 */
function announceSelectionChange() {
    announceSelection(state.selected?.size || 0);
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Create or get the progress indicator element
 * @returns {HTMLElement} The progress indicator element
 */
function getOrCreateProgressIndicator() {
    let progress = document.getElementById('batch-progress-indicator');
    
    if (!progress) {
        progress = document.createElement('div');
        progress.id = 'batch-progress-indicator';
        progress.className = 'batch-progress-indicator hidden';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');
        progress.innerHTML = `
            <div class="progress-content">
                <div class="progress-text">
                    <span class="progress-action">Memproses...</span>
                    <span class="progress-count">0 / 0</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill"></div>
                </div>
            </div>
        `;
        document.body.appendChild(progress);

        debugLog('[BatchOperations] Progress indicator created');
    }

    return progress;
}

/**
 * Show batch operation progress
 * @param {string} action - The action being performed
 * @param {number} current - Current progress
 * @param {number} total - Total items
 */
export function showProgress(action, current, total) {
    const progress = getOrCreateProgressIndicator();
    const percentage = Math.round((current / total) * 100);

    progress.querySelector('.progress-action').textContent = action;
    progress.querySelector('.progress-count').textContent = `${current} / ${total}`;
    progress.querySelector('.progress-bar-fill').style.width = `${percentage}%`;
    progress.setAttribute('aria-valuenow', String(percentage));

    progress.classList.remove('hidden');

    operationProgress = { current, total, action };
    isOperationInProgress = true;

    debugLog('[BatchOperations] Progress:', current, '/', total);
}

/**
 * Hide batch operation progress
 */
export function hideProgress() {
    const progress = document.getElementById('batch-progress-indicator');
    if (progress) {
        progress.classList.add('hidden');
    }

    isOperationInProgress = false;
    operationProgress = { current: 0, total: 0, action: '' };
}

/**
 * Execute batch delete operation
 */
export async function batchDelete() {
    const selectedPaths = getSelectedItems();
    if (selectedPaths.length === 0) {
        announce('Tidak ada item yang dipilih untuk dihapus');
        return;
    }

    if (callbacks.onBatchDelete) {
        await callbacks.onBatchDelete(selectedPaths);
    } else {
        debugLog('[BatchOperations] No batch delete handler registered');
    }
}

/**
 * Execute batch move operation
 */
export async function batchMove() {
    const selectedPaths = getSelectedItems();
    if (selectedPaths.length === 0) {
        announce('Tidak ada item yang dipilih untuk dipindahkan');
        return;
    }

    if (callbacks.onBatchMove) {
        await callbacks.onBatchMove(selectedPaths);
    } else {
        debugLog('[BatchOperations] No batch move handler registered');
    }
}

/**
 * Execute batch download operation (zip)
 */
export async function batchDownload() {
    const selectedPaths = getSelectedItems();
    if (selectedPaths.length === 0) {
        announce('Tidak ada item yang dipilih untuk diunduh');
        return;
    }

    if (selectedPaths.length === 1) {
        // Single file download - direct download
        announce('Mengunduh file...');
    } else {
        // Multiple files - will be zipped
        announce(`Mengunduh ${selectedPaths.length} item sebagai ZIP...`);
    }

    if (callbacks.onBatchDownload) {
        await callbacks.onBatchDownload(selectedPaths);
    } else {
        debugLog('[BatchOperations] No batch download handler registered');
    }
}

// ============================================================================
// Batch Actions Bar
// ============================================================================

/**
 * Create or get the batch actions bar
 * @returns {HTMLElement} The batch actions bar element
 */
function getOrCreateBatchActionsBar() {
    let bar = document.getElementById('batch-actions-bar');
    
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'batch-actions-bar';
        bar.className = 'batch-actions-bar hidden';
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', 'Aksi batch untuk item terpilih');
        bar.innerHTML = `
            <div class="batch-actions-content">
                <span class="batch-selection-info">
                    <strong id="batch-count">0</strong> item dipilih
                </span>
                <div class="batch-actions-buttons">
                    <button type="button" class="batch-action-btn" data-batch-action="move" title="Pindahkan item terpilih">
                        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
                            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12l-4-4h3V10h2v4h3l-4 4z"/>
                        </svg>
                        <span>Pindahkan</span>
                    </button>
                    <button type="button" class="batch-action-btn" data-batch-action="download" title="Unduh item terpilih">
                        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        <span>Unduh</span>
                    </button>
                    <button type="button" class="batch-action-btn batch-action-btn-danger" data-batch-action="delete" title="Hapus item terpilih">
                        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        <span>Hapus</span>
                    </button>
                </div>
                <button type="button" class="batch-close-btn" aria-label="Batalkan pilihan">
                    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;

        // Insert at bottom of the page
        document.body.appendChild(bar);

        // Attach event listeners
        const moveBtn = bar.querySelector('[data-batch-action="move"]');
        const downloadBtn = bar.querySelector('[data-batch-action="download"]');
        const deleteBtn = bar.querySelector('[data-batch-action="delete"]');
        const closeBtn = bar.querySelector('.batch-close-btn');

        moveBtn.addEventListener('click', batchMove);
        downloadBtn.addEventListener('click', batchDownload);
        deleteBtn.addEventListener('click', batchDelete);
        closeBtn.addEventListener('click', deselectAllItems);

        debugLog('[BatchOperations] Batch actions bar created');
    }

    return bar;
}

/**
 * Show the batch actions bar
 */
function showBatchActionsBar() {
    const bar = getOrCreateBatchActionsBar();
    const count = state.selected?.size || 0;

    const countEl = bar.querySelector('#batch-count');
    if (countEl) {
        countEl.textContent = String(count);
    }

    if (count > 0) {
        bar.classList.remove('hidden');
        bar.classList.add('visible');
    } else {
        bar.classList.add('hidden');
        bar.classList.remove('visible');
    }
}

/**
 * Hide the batch actions bar
 */
function hideBatchActionsBar() {
    const bar = document.getElementById('batch-actions-bar');
    if (bar) {
        bar.classList.add('hidden');
        bar.classList.remove('visible');
    }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Setup click event delegation for selection
 * @param {HTMLElement} container - The container element
 */
export function setupSelectionHandlers(container) {
    if (!container) return;

    container.addEventListener('click', (event) => {
        const row = event.target.closest('tr[data-item-path], div[data-item-path]');
        if (!row) return;

        const checkbox = event.target.closest('input[type="checkbox"]');
        const itemPath = row.dataset.itemPath;
        const items = callbacks.getItems();
        const itemIndex = items.findIndex(item => item.path === itemPath);

        if (checkbox) {
            // Checkbox click - handled by the checkbox change event
            return;
        }

        // Handle row click with modifiers
        handleItemClick(event, itemPath, itemIndex);
    });

    // Handle checkbox changes
    container.addEventListener('change', (event) => {
        if (event.target.type !== 'checkbox') return;
        
        const checkbox = event.target;
        const path = checkbox.dataset.path;
        
        if (path) {
            toggleItemSelection(path, checkbox.checked);
        }
    });

    debugLog('[BatchOperations] Selection handlers setup');
}

/**
 * Setup select all checkbox handler
 * @param {HTMLElement} selectAllCheckbox - The select all checkbox
 */
export function setupSelectAllHandler(selectAllCheckbox) {
    if (!selectAllCheckbox) return;

    selectAllCheckbox.addEventListener('change', (event) => {
        if (event.target.checked) {
            selectAllItems();
        } else {
            deselectAllItems();
        }
    });

    debugLog('[BatchOperations] Select all handler setup');
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize batch operations module
 * @param {Object} options - Configuration options
 */
export function initBatchOperations(options = {}) {
    // Register callbacks
    if (options.onSelectionChange) {
        callbacks.onSelectionChange = options.onSelectionChange;
    }
    if (options.onBatchDelete) {
        callbacks.onBatchDelete = options.onBatchDelete;
    }
    if (options.onBatchMove) {
        callbacks.onBatchMove = options.onBatchMove;
    }
    if (options.onBatchDownload) {
        callbacks.onBatchDownload = options.onBatchDownload;
    }
    if (options.getItems) {
        callbacks.getItems = options.getItems;
    }

    // Create UI components
    getOrCreateSelectionIndicator();
    getOrCreateBatchActionsBar();

    // Setup handlers for existing elements
    const tableBody = document.getElementById('file-table') || document.getElementById('tbody');
    if (tableBody) {
        setupSelectionHandlers(tableBody);
    }

    const mobileList = document.getElementById('mobile-file-list');
    if (mobileList) {
        setupSelectionHandlers(mobileList);
    }

    const selectAllCheckbox = document.getElementById('select-all') || document.getElementById('selectAll');
    if (selectAllCheckbox) {
        setupSelectAllHandler(selectAllCheckbox);
    }

    // Initial UI update
    updateSelectionUI();

    debugLog('[BatchOperations] Batch operations initialized');
}

/**
 * Cleanup batch operations module
 */
export function cleanupBatchOperations() {
    // Remove UI elements
    const indicator = document.getElementById('batch-selection-indicator');
    if (indicator) indicator.remove();

    const progress = document.getElementById('batch-progress-indicator');
    if (progress) progress.remove();

    const bar = document.getElementById('batch-actions-bar');
    if (bar) bar.remove();

    // Reset state
    lastSelectedIndex = -1;
    isOperationInProgress = false;
    operationProgress = { current: 0, total: 0, action: '' };
    hasBeenActivated = false;

    debugLog('[BatchOperations] Batch operations cleaned up');
}

// ============================================================================
// Export convenience object
// ============================================================================

export const batchOperations = {
    init: initBatchOperations,
    cleanup: cleanupBatchOperations,
    handleItemClick,
    selectAll: selectAllItems,
    deselectAll: deselectAllItems,
    toggleItem: toggleItemSelection,
    getSelected: getSelectedItems,
    isSelected: isItemSelected,
    showProgress,
    hideProgress,
    batchDelete,
    batchMove,
    batchDownload,
    updateIndicator: updateSelectionIndicator,
};

export default batchOperations;
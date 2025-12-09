/**
 * UI Renderer Module (Facade)
 * 
 * This is the main orchestrator that imports and re-exports from sub-modules.
 * Split into focused modules for better maintainability:
 * - tableRenderer.js: Table/list rendering logic
 * - overlayRenderer.js: Overlay/modal rendering
 * - breadcrumbRenderer.js: Breadcrumb navigation rendering
 * - statusRenderer.js: Status bar and indicators
 * 
 * All exports are re-exported here for backward compatibility.
 */

// Re-export everything from sub-modules
export {
    getIconColors,
    renderItemRow,
    renderVirtualItems,
    renderNormalItems,
    renderMobileItems,
    createMobileItem,
    getVirtualScrollManager,
    resetVirtualScrollManager,
    cleanupScrollTracking
} from './ui/tableRenderer.js';

export {
    showMobileContextMenu,
    closeMobileContextMenu,
    handleMobileContextAction,
    moveRowInDOM,
    rollbackMove,
    renderPreviewContent,
    renderMediaPreview,
    renderDetailsOverlay
} from './ui/overlayRenderer.js';

export {
    renderBreadcrumbs,
    createBreadcrumbTrail,
    createCompactBreadcrumbTrail,
    renderCompactBreadcrumbs,
    updatePageTitle,
    getParentPath
} from './ui/breadcrumbRenderer.js';

export {
    updateSortUI,
    updateSelectionUI,
    syncRowSelection,
    syncMobileSelection,
    updateStatus,
    setLoading,
    setError,
    flashStatus,
    updateSelectionCount,
    showSpinner,
    hideSpinner,
    updateProgress
} from './ui/statusRenderer.js';

// Import modules for local use
import {
    renderItemRow,
    renderVirtualItems,
    renderNormalItems,
    renderMobileItems,
    getVirtualScrollManager,
    cleanupScrollTracking
} from './ui/tableRenderer.js';

import {
    showMobileContextMenu
} from './ui/overlayRenderer.js';

import {
    renderBreadcrumbs
} from './ui/breadcrumbRenderer.js';

import {
    setLoading,
    setError,
    updateSortUI,
    updateSelectionUI,
    syncRowSelection,
    syncMobileSelection,
    updateStatus
} from './ui/statusRenderer.js';

// Additional imports needed for renderItems
import {
    compareItems,
    synchronizeSelection
} from './utils.js';
import { config } from './constants.js';
import { moveItem } from './fileOperations.js';
import { fetchDirectory } from './apiService.js';
import { shouldUseVirtualScroll } from './virtualScroll.js';
import { invalidateDOMCache } from './dragDrop.js';
import { debugLog } from './debug.js';
import { 
    calculatePagination, 
    updatePaginationState,
    getItemsForPage
} from './pagination.js';

// Global flag to prevent multiple simultaneous renders
let isRendering = false;
let lastRenderTime = 0;
const RENDER_DEBOUNCE = 16; // ~60fps for smooth UI

// Cache for sorted and filtered items to avoid re-processing
let renderCache = {
    items: null,
    sortKey: null,
    sortDirection: null,
    filter: null,
    sortedItems: null,
    filteredItems: null,
    lastCacheTime: 0
};

/**
 * Main render function for file items
 * This is the primary entry point for rendering the file table.
 * 
 * @param {HTMLElement} tableBody - Table body element
 * @param {HTMLElement} emptyState - Empty state element
 * @param {Object} state - Application state
 * @param {Array} items - Items to render
 * @param {number} generatedAt - Timestamp
 * @param {boolean} highlightNew - Whether to highlight new items
 * @param {Function} openTextPreview - Open text preview function
 * @param {Function} openMediaPreview - Open media preview function
 * @param {Function} navigateTo - Navigation function
 * @param {Function} openInWord - Open in Word function
 * @param {Function} copyPathToClipboard - Copy path function
 * @param {Function} openRenameOverlay - Open rename overlay function
 * @param {Function} openMoveOverlay - Open move overlay function
 * @param {Function} openConfirmOverlay - Open confirm overlay function
 * @param {Function} toggleSelection - Toggle selection function
 * @param {Function} openContextMenu - Open context menu function
 * @param {Function} isWordDocument - Check if Word document function
 * @param {Function} buildFileUrl - Build file URL function
 * @param {Function} hasUnsavedChanges - Check unsaved changes function
 * @param {Function} confirmDiscardChanges - Confirm discard changes function
 * @param {Set} previewableExtensions - Previewable extensions
 * @param {Set} mediaPreviewableExtensions - Media previewable extensions
 * @param {Function} handleDragStart - Drag start handler
 * @param {Function} handleDragEnd - Drag end handler
 * @param {Function} handleDragOver - Drag over handler
 * @param {Function} handleDrop - Drop handler
 * @param {Function} handleDragLeave - Drag leave handler
 * @param {Function} flashStatusFn - Flash status function
 * @param {Function} setErrorFn - Set error function
 * @returns {Object} - Result with items, filtered, and meta
 */
export function renderItems(
    tableBody,
    emptyState,
    state,
    items,
    generatedAt,
    highlightNew,
    openTextPreview,
    openMediaPreview,
    navigateTo,
    openInWord,
    copyPathToClipboard,
    openRenameOverlay,
    openMoveOverlay,
    openConfirmOverlay,
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
    flashStatusFn,
    setErrorFn
) {
    const renderStartTime = performance.now();
    console.log('[PAGINATION DEBUG] renderItems called at:', renderStartTime);
    
    // Prevent concurrent renders
    if (isRendering) {
        console.log('[PAGINATION DEBUG] Skipping render - already rendering');
        return { items, filtered: state.visibleItems || [], meta: {} };
    }
    
    isRendering = true;
    lastRenderTime = performance.now();
    
    try {
        // Clear render cache when items change significantly
        const cacheClearTime = performance.now();
        if (renderCache.items !== items || renderCache.items.length !== items.length) {
            console.log('[RENDER DEBUG] Clearing render cache due to items change');
            renderCache = {
                items: null,
                sortKey: null,
                sortDirection: null,
                filter: null,
                sortedItems: null,
                filteredItems: null,
                lastCacheTime: 0
            };
        }
        console.log('[RENDER DEBUG] Cache check completed at:', cacheClearTime, 'delta:', cacheClearTime - renderStartTime);
        
        const stateUpdateTime = performance.now();
        console.log('[RENDER DEBUG] State updated at:', stateUpdateTime, 'delta:', stateUpdateTime - cacheClearTime);
        
        const sortingTime = performance.now();
        const query = state.filter.toLowerCase();
        
        // Check cache validity
        const canUseCache = renderCache.items === items &&
                            renderCache.sortKey === state.sortKey &&
                            renderCache.sortDirection === state.sortDirection &&
                            renderCache.filter === query;
        
        let sortedItems, filtered;
        
        if (canUseCache) {
            console.log('[PAGINATION DEBUG] Using cached sorted/filtered items');
            sortedItems = renderCache.sortedItems;
            filtered = renderCache.filteredItems;
        } else {
            console.log('[PAGINATION DEBUG] Cache miss - processing items');
            
            const arrayCreationTime = performance.now();
            const itemsCopy = [...items];
            console.log('[PAGINATION DEBUG] Array copy created at:', arrayCreationTime, 'delta:', arrayCreationTime - sortingTime);
            
            const sortStartTime = performance.now();
            sortedItems = itemsCopy.sort((a, b) => compareItems(a, b, state.sortKey, state.sortDirection));
            console.log('[PAGINATION DEBUG] Sorting completed at:', sortStartTime, 'items:', sortedItems.length);
            
            const filterStartTime = performance.now();
            filtered = query
                ? sortedItems.filter((item) => item.name.toLowerCase().includes(query))
                : sortedItems;
            console.log('[PAGINATION DEBUG] Filtering completed at:', filterStartTime, 'query:', query, 'filtered:', filtered.length);
            
            // Update cache
            renderCache = {
                items,
                sortKey: state.sortKey,
                sortDirection: state.sortDirection,
                filter: query,
                sortedItems,
                filteredItems: filtered,
                lastCacheTime: performance.now()
            };
        }
        
        state.visibleItems = filtered;
        console.log('[RENDER DEBUG] Sorting/filtering completed items:', items.length, 'filtered:', filtered.length);

        const totalFolders = items.filter((item) => item.type === 'folder').length;
        const filteredFolders = filtered.filter((item) => item.type === 'folder').length;
        const meta = {
            totalFolders,
            totalFiles: items.length - totalFolders,
            filteredFolders,
            filteredFiles: filtered.length - filteredFolders,
        };

        // Clear table body
        const clearStartTime = performance.now();
        tableBody.innerHTML = '';
        console.log('[RENDER DEBUG] Table cleared at:', clearStartTime);
        
        // Clear mobile list
        const mobileList = document.getElementById('mobile-file-list');
        if (mobileList) {
            mobileList.innerHTML = '';
        }

        // Insert "Up (..)" row at the top
        const upRow = document.createElement('tr');
        upRow.classList.add('up-row','cursor-pointer','transition-colors');
        upRow.tabIndex = 0;
        try { upRow.setAttribute('role', 'row'); } catch (e) {}
        try { upRow.setAttribute('aria-label', 'Kembali ke folder sebelumnya'); } catch (e) {}

        // Empty selection cell
        const upSel = document.createElement('td');
        upSel.classList.add('selection-cell','w-12','px-3','text-center','align-middle');
        upRow.appendChild(upSel);

        // Name cell with icon + "Back" label
        const upName = document.createElement('td');
        upName.classList.add('name-cell','item-name','flex','items-center','gap-4','min-w-0','flex-1','px-3','text-sm');
        
        const backIcon = document.createElement('span');
        backIcon.classList.add('up-icon', 'small', 'inline-flex', 'items-center', 'justify-center', 'flex-shrink-0');
        backIcon.textContent = '...';
        upName.appendChild(backIcon);
        
        const upLink = document.createElement('a');
        upLink.classList.add('item-link');
        upLink.href = '#';
        upLink.textContent = '...';
        upLink.setAttribute('title', 'Kembali ke folder sebelumnya');
        upLink.addEventListener('click', (event) => {
            event.preventDefault();
            navigateTo(state.parentPath || '');
        });
        upName.appendChild(upLink);
        upRow.appendChild(upName);

        // Modified column
        const upModified = document.createElement('td');
        upModified.classList.add('modified-cell','text-sm','text-gray-500','w-36','text-right','whitespace-nowrap','px-3');
        upModified.textContent = '-';
        upRow.appendChild(upModified);

        // Size column
        const upSize = document.createElement('td');
        upSize.classList.add('size-cell','text-sm','text-gray-500','w-[100px]','text-right','whitespace-nowrap','px-2');
        upSize.textContent = '-';
        upRow.appendChild(upSize);

        // Empty actions cell
        const upActions = document.createElement('td');
        upActions.classList.add('actions-cell','w-36','pr-2','px-3','text-right');
        upRow.appendChild(upActions);

        // Event handlers
        upRow.addEventListener('dblclick', () => navigateTo(state.parentPath || ''));
        upRow.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigateTo(state.parentPath || '');
            }
        });

        // Drag and drop for up-row
        upRow.addEventListener('dragover', (event) => {
            if (!state.drag.isDragging) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            upRow.classList.add('drop-target');
        });

        upRow.addEventListener('dragleave', (event) => {
            if (event.currentTarget === event.target) {
                upRow.classList.remove('drop-target');
            }
        });

        upRow.addEventListener('drop', (event) => {
            if (!state.drag.isDragging || !state.drag.draggedItem) return;
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }

            const targetPath = state.parentPath || '';
            debugLog('[DEBUG] Dropping', state.drag.draggedItem.name, 'onto up-row to move into parent', targetPath);

            moveItem(
                state.drag.draggedItem.path,
                targetPath,
                state,
                (isLoading) => {
                    setLoading(document.querySelector('.loader-overlay'), null, isLoading);
                    debugLog('[DEBUG] Loading:', isLoading);
                },
                (error) => { debugLog('[DEBUG] Move error:', error); },
                () => fetchDirectory(state.currentPath, { silent: true }),
                (message) => { debugLog('[DEBUG] Status:', message); },
                null,
                null,
                null,
                null
            );

            tableBody.appendChild(upRow);
            state.drag.dropTarget = null;
        });

        tableBody.appendChild(upRow);

        // Add up-row for mobile view
        if (mobileList) {
            const mobileUpItem = document.createElement('div');
            mobileUpItem.classList.add('flex', 'items-center', 'justify-between', 'p-3', 'cursor-pointer', 'up-mobile-row', 'transition-colors', 'border-b');
            mobileUpItem.dataset.itemPath = state.parentPath || '';
            mobileUpItem.dataset.itemType = 'parent';
            
            const leftSide = document.createElement('div');
            leftSide.classList.add('flex', 'items-center', 'gap-3');
            
            const iconContainer = document.createElement('div');
            iconContainer.classList.add('flex', 'items-center', 'justify-center');
            const icon = document.createElement('span');
            icon.classList.add('up-icon', 'small', 'inline-flex', 'items-center', 'justify-center');
            icon.textContent = '...';
            iconContainer.appendChild(icon);
            leftSide.appendChild(iconContainer);
            
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('font-medium');
            nameSpan.style.color = 'var(--muted)';
            nameSpan.textContent = '...';
            leftSide.appendChild(nameSpan);
            
            mobileUpItem.appendChild(leftSide);
            
            mobileUpItem.addEventListener('click', () => {
                navigateTo(state.parentPath || '');
            });
            
            mobileList.appendChild(mobileUpItem);
        }

        // Show/hide empty state
        if (filtered.length === 0) {
            emptyState.hidden = false;
            emptyState.textContent = items.length === 0
                ? 'Direktori ini kosong.'
                : `Tidak ada hasil untuk "${state.filter}".`;
        } else {
            emptyState.hidden = true;
        }

        // Prepare rendering parameters
        const renderParams = {
            previewableExtensions,
            mediaPreviewableExtensions,
            openTextPreview,
            openMediaPreview,
            navigateTo,
            openInWord,
            copyPathToClipboard,
            openRenameOverlay,
            openMoveOverlay,
            openConfirmOverlay,
            toggleSelection,
            openContextMenu,
            isWordDocument,
            buildFileUrl,
            hasUnsavedChanges,
            confirmDiscardChanges,
            handleDragStart,
            handleDragEnd,
            handleDragOver,
            handleDrop,
            handleDragLeave,
            flashStatus: flashStatusFn,
            setError: setErrorFn,
            highlightNew,
            generatedAt,
            showMobileContextMenu
        };

        // Use virtual scrolling for large lists
        const vsConfig = config.virtualScroll || {
            enabled: false,
            threshold: 100,
            itemHeight: 40,
            overscan: 5
        };
        
        const useVirtual = shouldUseVirtualScroll(
            filtered.length,
            vsConfig.threshold,
            vsConfig.enabled
        );

        if (useVirtual) {
            debugLog(`[Virtual Scroll] Rendering ${filtered.length} items with virtual scrolling`);
            renderVirtualItems(tableBody, filtered, state, renderParams);
        } else {
            debugLog(`[Normal Render] Rendering ${filtered.length} items normally`);
            renderNormalItems(tableBody, filtered, state, renderParams);
        }
        
        // Mobile render (only on mobile devices)
        const mobileRenderTime = performance.now();
        if (window.innerWidth < 768) {
            renderMobileItems(mobileList, filtered, state, renderParams);
            console.log('[RENDER DEBUG] Mobile items rendered at:', mobileRenderTime);
        } else {
            console.log('[RENDER DEBUG] Skipped mobile render on desktop');
        }
        
        // Invalidate DOM cache
        invalidateDOMCache();

        // Update pagination state
        const pagination = calculatePagination(filtered.length);
        updatePaginationState(pagination.currentPage, pagination.totalPages, filtered.length);
        console.log('[PAGINATION DEBUG] Final pagination state:', pagination);

        // Update known items
        const newMap = new Map();
        items.forEach((item) => {
            newMap.set(item.path, generatedAt);
        });
        state.knownItems = newMap;

        const renderEndTime = performance.now();
        console.log('[RENDER DEBUG] renderItems completed at:', renderEndTime, 'total delta:', renderEndTime - renderStartTime);

        return { items, filtered, meta };
    } finally {
        isRendering = false;
    }
}
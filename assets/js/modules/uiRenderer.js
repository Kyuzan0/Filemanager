/**
 * UI Renderer Module
 * Berisi fungsi-fungsi untuk merender UI aplikasi
 */

import {
    compareItems,
    getSortDescription,
    synchronizeSelection,
    createRowActionButton,
    getFileExtension,
    formatBytes,
    formatDate
} from './utils.js';
import { getItemIcon } from './fileIcons.js';
import { actionIcons, config } from './constants.js';
import { moveItem } from './fileOperations.js';
import { fetchDirectory } from './apiService.js';
import { VirtualScrollManager, createSpacer, shouldUseVirtualScroll } from './virtualScroll.js';
import { invalidateDOMCache } from './dragDrop.js';
import { debugLog } from './debug.js';
import { 
    calculatePagination, 
    updatePaginationState, 
    initScrollTracking,
    getSimplePaginationInfo,
    getItemsForPage,
    getPaginationState
} from './pagination.js';

// Global virtual scroll manager instance
let virtualScrollManager = null;

// Global scroll tracking cleanup function
let scrollTrackingCleanup = null;

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
 * Get icon colors based on file type
 * Returns { backgroundColor, color } for colorful icons
 */
function getIconColors(item) {
    if (!item || !item.type) {
        return { backgroundColor: '#e0e7ff', color: '#4f46e5' }; // Indigo for unknown files
    }
    
    if (item.type === 'folder') {
        return { backgroundColor: '#fef3c7', color: '#f59e0b' }; // Amber for folders
    }
    
    // Get file extension for file type detection
    const ext = getFileExtension(item.name);
    
    // Images - Red
    const images = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','ico','tiff','tif','avif']);
    if (images.has(ext)) {
        return { backgroundColor: '#fee2e2', color: '#dc2626' };
    }
    
    // PDF - Red/Orange
    if (ext === 'pdf') {
        return { backgroundColor: '#fecaca', color: '#ea580c' };
    }
    
    // Documents - Blue
    const docs = new Set(['doc','docx','odt','rtf']);
    if (docs.has(ext)) {
        return { backgroundColor: '#dbeafe', color: '#0284c7' };
    }
    
    // Presentations - Orange
    const ppts = new Set(['ppt','pptx','odp']);
    if (ppts.has(ext)) {
        return { backgroundColor: '#fed7aa', color: '#d97706' };
    }
    
    // Spreadsheets - Green
    const sheets = new Set(['xls','xlsx','ods','csv']);
    if (sheets.has(ext)) {
        return { backgroundColor: '#dcfce7', color: '#16a34a' };
    }
    
    // Archives - Purple
    const archives = new Set(['zip','rar','7z','tar','gz','bz2','tgz','xz']);
    if (archives.has(ext)) {
        return { backgroundColor: '#e9d5ff', color: '#a855f7' };
    }
    
    // Audio - Violet
    const audio = new Set(['mp3','wav','flac','ogg','m4a','aac']);
    if (audio.has(ext)) {
        return { backgroundColor: '#ede9fe', color: '#7c3aed' };
    }
    
    // Video - Rose
    const video = new Set(['mp4','webm','mkv','mov','avi','m4v']);
    if (video.has(ext)) {
        return { backgroundColor: '#ffe4e6', color: '#be123c' };
    }
    
    // JavaScript/TypeScript - Yellow
    const javascript = new Set(['js','jsx']);
    if (javascript.has(ext)) {
        return { backgroundColor: '#fef08a', color: '#ca8a04' };
    }
    
    // TypeScript - Blue
    const typescript = new Set(['ts','tsx']);
    if (typescript.has(ext)) {
        return { backgroundColor: '#dbeafe', color: '#0369a1' };
    }
    
    // Python - Blue/Yellow
    if (ext === 'py') {
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
    }
    
    // PHP - Violet
    if (ext === 'php') {
        return { backgroundColor: '#ede9fe', color: '#6d28d9' };
    }
    
    // HTML - Orange/Red
    const html = new Set(['html','htm']);
    if (html.has(ext)) {
        return { backgroundColor: '#fed7aa', color: '#ea580c' };
    }
    
    // CSS - Blue
    if (ext === 'css') {
        return { backgroundColor: '#bfdbfe', color: '#1e40af' };
    }
    
    // SCSS/LESS - Pink
    const scss = new Set(['scss','less']);
    if (scss.has(ext)) {
        return { backgroundColor: '#fbcfe8', color: '#be185d' };
    }
    
    // JSON - Green
    if (ext === 'json') {
        return { backgroundColor: '#dcfce7', color: '#16a34a' };
    }
    
    // XML - Emerald
    if (ext === 'xml') {
        return { backgroundColor: '#d1fae5', color: '#059669' };
    }
    
    // YAML - Cyan
    const yaml = new Set(['yml','yaml']);
    if (yaml.has(ext)) {
        return { backgroundColor: '#cffafe', color: '#0891b2' };
    }
    
    // Text - Gray
    const text = new Set(['txt','md','markdown','log','ini','conf','cfg','env']);
    if (text.has(ext)) {
        return { backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
    
    // Default - Indigo
    return { backgroundColor: '#e0e7ff', color: '#4f46e5' };
}

/**
 * Moves a row in the DOM immediately for optimistic UI update
 * @param {string} itemPath - Path of the item being moved
 * @returns {Object|null} - Object with row element and original position for rollback, or null if not found
 */
export function moveRowInDOM(itemPath) {
    const tableBody = document.getElementById('file-table');
    if (!tableBody) return null;
    
    const row = tableBody.querySelector(`tr[data-item-path="${CSS.escape(itemPath)}"]`);
    if (!row) return null;
    
    // Store original position for rollback
    const originalPosition = {
        row: row,
        parent: row.parentNode,
        nextSibling: row.nextSibling
    };
    
    // Remove row from DOM immediately
    row.remove();
    
    return originalPosition;
}

/**
 * Rolls back a DOM move operation
 * @param {Object} originalPosition - Original position object from moveRowInDOM
 */
export function rollbackMove(originalPosition) {
    if (!originalPosition || !originalPosition.row) return;
    
    const { row, parent, nextSibling } = originalPosition;
    
    // Re-insert the row at its original position
    if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(row, nextSibling);
    } else {
        parent.appendChild(row);
    }
}

/**
 * Merender breadcrumbs navigasi
 * @param {HTMLElement} breadcrumbsEl - Elemen breadcrumbs
 * @param {Array} breadcrumbs - Data breadcrumbs
 * @param {Function} navigateTo - Fungsi navigasi
 */
export function renderBreadcrumbs(breadcrumbsEl, breadcrumbs, navigateTo) {
    // Clear children safely to avoid HTML parsing side-effects during Tailwind migration
    while (breadcrumbsEl.firstChild) {
        breadcrumbsEl.removeChild(breadcrumbsEl.firstChild);
    }
    breadcrumbs.forEach((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const element = document.createElement(isLast ? 'span' : 'a');
        element.textContent = crumb.label;

        if (!isLast) {
            element.href = '#';
            element.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo(crumb.path);
            });
        }

        breadcrumbsEl.appendChild(element);

        if (!isLast) {
            const separator = document.createElement('span');
            separator.classList.add('breadcrumb-separator');
            separator.textContent = '\u203A';
            separator.setAttribute('aria-hidden', 'true');
            breadcrumbsEl.appendChild(separator);
        }
    });
}

/**
 * Render single item row (extracted from renderItems for reusability)
 * @param {Object} item - Item data
 * @param {Object} state - Application state
 * @param {Object} params - Rendering parameters (callbacks, elements, etc.)
 * @returns {HTMLElement} - The created row element
 */
function renderItemRow(item, state, params) {
    const rowStartTime = performance.now();
    
    const {
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
        flashStatus,
        setError,
        highlightNew,
        generatedAt
    } = params;

    const key = item.path;
    const previouslySeen = state.knownItems.has(key);
    const row = document.createElement('tr');
    row.dataset.itemPath = key;
    row.dataset.itemType = item.type;
    row.tabIndex = 0;
    // Accessibility: explicit role for assistive tech when headers are visually hidden
    try { row.setAttribute('role', 'row'); } catch (e) {}
    // Tailwind utility classes added progressively (migration): hover + group support
    // Keep table semantics but add a conservative visual layer so rows get subtle hover/appearance
    // transition-colors included to smooth hover changes during migration
    // Preserve existing classes and add Tailwind utilities conservatively
    row.classList.add('tw-row','group','hover:bg-gray-50','cursor-default','transition-colors');
    const extension = item.type === 'file' ? getFileExtension(item.name) : '';
    const isPreviewable = item.type === 'file' && previewableExtensions.has(extension);
    const isMediaPreviewable = item.type === 'file' && mediaPreviewableExtensions.has(extension);
    
    if (isPreviewable || isMediaPreviewable) {
        row.dataset.previewable = 'true';
    }

    if (!previouslySeen && highlightNew) {
        row.classList.add('is-new');
    }

    // Selection cell
    const selectionCell = document.createElement('td');
    selectionCell.classList.add('selection-cell','px-3','w-12','text-center','align-middle');
    try { selectionCell.setAttribute('role', 'gridcell'); } catch (e) {}
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('item-select','form-checkbox','h-4','w-4','text-primary');
    checkbox.dataset.path = key;
    checkbox.checked = state.selected.has(key);
    checkbox.setAttribute('aria-label', `Pilih ${item.name}`);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('keydown', (event) => event.stopPropagation());
    checkbox.addEventListener('change', (event) => toggleSelection(key, event.target.checked));
    selectionCell.appendChild(checkbox);
    row.appendChild(selectionCell);

    // Double-click and keyboard handlers
    if (item.type === 'folder') {
        row.addEventListener('dblclick', () => navigateTo(item.path));
        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigateTo(item.path);
            }
        });
    } else if (isPreviewable || isMediaPreviewable) {
        const openPreview = () => {
            if (isPreviewable) {
                openTextPreview(item);
            } else {
                openMediaPreview(item);
            }
        };
        row.addEventListener('dblclick', openPreview);
        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openPreview();
            }
        });
    } else {
        const openFile = () => {
            const ext = getFileExtension(item.name);
            if (isWordDocument(ext)) {
                openInWord(item);
            } else {
                const url = buildFileUrl(item.path);
                const newWindow = window.open(url, '_blank');
                if (newWindow) newWindow.opener = null;
            }
        };
        row.addEventListener('dblclick', openFile);
        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openFile();
            }
        });
    }

    // Context menu
    row.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        openContextMenu(event.clientX, event.clientY, item);
    });

    // Drag and drop
    row.draggable = true;
    row.addEventListener('dragstart', (event) => handleDragStart(event, item));
    row.addEventListener('dragend', (event) => handleDragEnd(event));
    
    if (item.type === 'folder') {
        row.addEventListener('dragover', (event) => handleDragOver(event, item));
        row.addEventListener('drop', (event) => handleDrop(event, item));
        row.addEventListener('dragleave', (event) => handleDragLeave(event));
    }

    // Name cell with icon
    const cellName = document.createElement('td');
    cellName.classList.add('name-cell','item-name','flex','items-center','gap-4','min-w-0','flex-1');
    try { cellName.setAttribute('role', 'gridcell'); } catch (e) {}
    const iconInfo = getItemIcon(item);
    const icon = document.createElement('span');
    // Preserve any classes provided by iconInfo but avoid overwriting existing classes.
    icon.classList.add('item-icon');
    if (iconInfo.className && iconInfo.className.trim()) {
        iconInfo.className.trim().split(/\s+/).forEach(c => icon.classList.add(c));
    }
    // Apply inline styles to ensure icon is visible
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.width = '25px';
    icon.style.height = '25px';
    icon.style.borderRadius = '8px';
    
    // Apply colorful icon styles based on file type
    const iconColors = getIconColors(item);
    icon.style.backgroundColor = iconColors.backgroundColor;
    icon.style.color = iconColors.color;
    
    icon.style.flexShrink = '0';
    icon.style.marginTop = '2px';
    // Insert SVG safely: support both legacy string SVGs and Element nodes returned by the icons module.
    // Prefer Element nodes (created via createElementNS) to avoid relying on innerHTML parsing.
    if (iconInfo && iconInfo.svg) {
        try {
            // DOM Element (preferred)
            if (typeof iconInfo.svg === 'object' && iconInfo.svg.nodeType === 1) {
                // Clone to avoid moving the canonical node out of the cache
                const svgClone = iconInfo.svg.cloneNode(true);
                // Ensure SVG has size
                svgClone.style.width = '24px';
                svgClone.style.height = '24px';
                icon.appendChild(svgClone);
            } else if (typeof iconInfo.svg === 'string') {
                // Legacy: trusted SVG string from this module — set as innerHTML
                icon.innerHTML = iconInfo.svg;
            }
        } catch (e) {
            // Fallback: if anything goes wrong, gracefully degrade to empty icon
            console.warn('[uiRenderer] Failed to render icon for', item && item.path, e);
        }
    }
    icon.style.cursor = 'pointer';
    
    // Add click handler to icon
    if (item.type === 'folder') {
        icon.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            navigateTo(item.path);
        });
    } else if (isPreviewable || isMediaPreviewable) {
        icon.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isPreviewable) {
                openTextPreview(item);
            } else {
                openMediaPreview(item);
            }
        });
    } else {
        const extForIcon = getFileExtension(item.name);
        if (isWordDocument(extForIcon)) {
            icon.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openInWord(item);
            });
        } else {
            icon.addEventListener('click', (event) => {
                event.stopPropagation();
                const url = buildFileUrl(item.path);
                const newWindow = window.open(url, '_blank');
                if (newWindow) newWindow.opener = null;
            });
        }
    }
    
    cellName.appendChild(icon);

    const link = document.createElement('a');
    link.classList.add('item-link','truncate','block','text-sm','text-gray-800');
    link.textContent = item.name;

    if (item.type === 'folder') {
        link.href = '#';
        link.addEventListener('click', (event) => {
            event.preventDefault();
            navigateTo(item.path);
        });
    } else if (isPreviewable || isMediaPreviewable) {
        link.href = '#';
        link.addEventListener('click', (event) => {
            event.preventDefault();
            if (isPreviewable) {
                openTextPreview(item);
            } else {
                openMediaPreview(item);
            }
        });
    } else {
        const extForLink = getFileExtension(item.name);
        if (isWordDocument(extForLink)) {
            link.href = '#';
            link.addEventListener('click', (event) => {
                event.preventDefault();
                openInWord(item);
            });
        } else {
            link.href = buildFileUrl(item.path);
            link.target = '_blank';
            link.rel = 'noopener';
        }
    }

    cellName.appendChild(link);

    // Badge for new items
    let badge = null;
    if (!previouslySeen && highlightNew) {
        badge = document.createElement('span');
        badge.classList.add('badge','badge-new','inline-flex','items-center','px-2','py-0.5','text-xs','font-semibold','bg-green-100','text-green-700','rounded-full','ml-2');
        badge.textContent = 'Baru';
        cellName.appendChild(badge);
    }

    // Modified date cell
    const cellModified = document.createElement('td');
    cellModified.classList.add('modified-cell','text-sm','text-gray-500','w-36','text-right','whitespace-nowrap');
    try { cellModified.setAttribute('role', 'gridcell'); } catch (e) {}
    cellModified.textContent = formatDate(item.modified);
    row.appendChild(cellModified);

    // Size cell
    const cellSize = document.createElement('td');
    cellSize.classList.add('size-cell','text-sm','text-gray-500','w-[100px]','text-right','whitespace-nowrap','px-2');
    try { cellSize.setAttribute('role', 'gridcell'); } catch (e) {}
    if (item.type === 'folder') {
        cellSize.textContent = '-';
    } else {
        // Format file size
        const size = item.size || 0;
        cellSize.textContent = formatBytes(size);
    }
    row.appendChild(cellSize);

    // Actions cell
    const actionCell = document.createElement('td');
    actionCell.classList.add('actions-cell','w-36','pr-2','text-right');
    try { actionCell.setAttribute('role', 'gridcell'); } catch (e) {}
    const actionGroup = document.createElement('div');
    actionGroup.classList.add('row-actions','inline-flex','items-center','gap-2','justify-end');

    // View button
    const viewBtn = document.createElement('button');
    viewBtn.classList.add('p-1', 'text-blue-600');
    viewBtn.innerHTML = '<i class="ri-eye-line"></i>';
    viewBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (isPreviewable) {
            openTextPreview(item);
        } else if (isMediaPreviewable) {
            openMediaPreview(item);
        } else {
            const ext = getFileExtension(item.name);
            if (isWordDocument(ext)) {
                openInWord(item);
            } else {
                const url = buildFileUrl(item.path);
                const newWindow = window.open(url, '_blank');
                if (newWindow) newWindow.opener = null;
            }
        }
    });
    actionGroup.appendChild(viewBtn);

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.classList.add('p-1', 'text-blue-600');
    editBtn.innerHTML = '<i class="ri-edit-line"></i>';
    editBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (isPreviewable) {
            openTextPreview(item);
        } else {
            openRenameOverlay(item);
        }
    });
    actionGroup.appendChild(editBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('p-1', 'text-red-500');
    deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (hasUnsavedChanges(state.preview)) {
            confirmDiscardChanges('Perubahan belum disimpan. Tetap hapus item terpilih?')
                .then((proceed) => {
                    if (!proceed) return;
                    openConfirmOverlay({
                        message: `Hapus "${item.name}"?`,
                        description: 'Item yang dihapus tidak dapat dikembalikan.',
                        paths: [item.path],
                        showList: false,
                        confirmLabel: 'Hapus',
                    });
                });
            return;
        }

        openConfirmOverlay({
            message: `Hapus "${item.name}"?`,
            description: 'Item yang dihapus tidak dapat dikembalikan.',
            paths: [item.path],
            showList: false,
            confirmLabel: 'Hapus',
        });
    });
    actionGroup.appendChild(deleteBtn);
    
    actionCell.appendChild(actionGroup);
    row.appendChild(cellName);
    row.appendChild(cellModified);
    row.appendChild(cellSize);
    row.appendChild(actionCell);

    // Auto-remove highlight after 5s
    if (!previouslySeen && highlightNew) {
        setTimeout(() => {
            row.classList.remove('is-new');
            if (badge) badge.remove();
        }, 5000);
    }

    // Debug log: show computed classes and (if measurable) height to validate migration
    try {
        const rowEndTime = performance.now();
        console.log('[PAGINATION DEBUG] renderItemRow ->', {
            path: key,
            classes: row.className,
            height: (typeof row.getBoundingClientRect === 'function') ? Math.round(row.getBoundingClientRect().height) : null,
            renderTime: rowEndTime - rowStartTime
        });
    } catch (e) { /* ignore */ }

    return row;
}

/**
 * Render items using virtual scrolling
 * @param {HTMLElement} tableBody - Table body element
 * @param {Array} filtered - Filtered items array
 * @param {Object} state - Application state
 * @param {Object} params - Rendering parameters
 */
function renderVirtualItems(tableBody, filtered, state, params) {
    const renderStartTime = performance.now();
    console.log('[PAGINATION DEBUG] renderVirtualItems called at:', renderStartTime, 'with', filtered.length, 'items');
    
    // Get items for current page FIRST
    const paginatedItems = getItemsForPage(filtered);
    console.log('[PAGINATION DEBUG] Showing', paginatedItems.length, 'items for current page');
    
    const vsConfig = config.virtualScroll || {
        enabled: true,
        threshold: 100,
        itemHeight: 40,
        overscan: 5
    };
    
    // Initialize virtual scroll manager if not exists
    const managerInitTime = performance.now();
    if (!virtualScrollManager) {
        virtualScrollManager = new VirtualScrollManager({
            container: tableBody.parentElement, // Use parent container for scrolling
            itemHeight: vsConfig.itemHeight,
            overscan: vsConfig.overscan,
            onRender: (range) => {
                console.log('[VirtualScroll] Render triggered for range:', range);
            }
        });
        virtualScrollManager.setTotalItems(paginatedItems.length);
    } else {
        // Update total count for current page items
        virtualScrollManager.setTotalItems(paginatedItems.length);
    }
    console.log('[PAGINATION DEBUG] Virtual scroll manager initialized at:', managerInitTime, 'delta:', managerInitTime - renderStartTime);

    // Get visible range
    const rangeTime = performance.now();
    const { start, end } = virtualScrollManager.getVisibleRange();
    debugLog('[VirtualScroll] Rendering range:', start, '-', end);
    console.log('[PAGINATION DEBUG] Visible range calculated at:', rangeTime, 'delta:', rangeTime - managerInitTime);
    
    // Clear existing rows (keep up-row if exists)
    const clearTime = performance.now();
    const upRow = tableBody.querySelector('.up-row');
    // Clear existing rows without parsing HTML (preserve a previously-found up-row)
    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }
    if (upRow) {
        tableBody.appendChild(upRow);
    }
    console.log('[PAGINATION DEBUG] DOM cleared at:', clearTime, 'delta:', clearTime - rangeTime);

    // Create top spacer (use numeric height and guard against null spacer)
    const spacerTime = performance.now();
    const topSpaceHeight = start * vsConfig.itemHeight;
    const topSpacer = createSpacer(topSpaceHeight);
    if (topSpacer) tableBody.appendChild(topSpacer);
    console.log('[PAGINATION DEBUG] Top spacer created at:', spacerTime, 'delta:', spacerTime - clearTime);

    // Render visible items FROM CURRENT PAGE
    const itemRenderTime = performance.now();
    const fragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
        if (i >= paginatedItems.length) break;
        const item = paginatedItems[i];
        const row = renderItemRow(item, state, params);
        fragment.appendChild(row);
    }
    tableBody.appendChild(fragment);
    console.log('[PAGINATION DEBUG] Visible items rendered at:', itemRenderTime, 'delta:', itemRenderTime - spacerTime, 'items:', end - start);

    // Reconcile computed row height with virtual scroll configuration.
    // This helps keep config.virtualScroll.itemHeight in sync with actual CSS during migration.
    try {
        const heightReconcileTime = performance.now();
        const firstRow = tableBody.querySelector('tr:not(.up-row)');
        if (firstRow) {
            const actualHeight = Math.round(firstRow.getBoundingClientRect().height);
            if (actualHeight > 0 && actualHeight !== vsConfig.itemHeight) {
                vsConfig.itemHeight = actualHeight;
                if (virtualScrollManager) {
                    // Best-effort: update manager's itemHeight and call optional updater if available
                    virtualScrollManager.itemHeight = actualHeight;
                    if (typeof virtualScrollManager.updateItemHeight === 'function') {
                        virtualScrollManager.updateItemHeight(actualHeight);
                    }
                }
            }
        }
        console.log('[PAGINATION DEBUG] Height reconciled at:', heightReconcileTime, 'delta:', heightReconcileTime - itemRenderTime);
    } catch (e) {
        // Ignore measurement errors in older browsers/environments
        debugLog('[VirtualScroll] Failed to reconcile itemHeight', e);
    }

    // Create bottom spacer (use numeric height and guard against null spacer)
    const bottomSpacerTime = performance.now();
    const remainingItems = Math.max(0, paginatedItems.length - end);
    const bottomSpaceHeight = remainingItems * vsConfig.itemHeight;
    const bottomSpacer = createSpacer(bottomSpaceHeight);
    if (bottomSpacer) tableBody.appendChild(bottomSpacer);
    console.log('[PAGINATION DEBUG] Bottom spacer created at:', bottomSpacerTime, 'delta:', bottomSpacerTime - itemRenderTime);

    // Track performance (call trackRender if available)
    if (virtualScrollManager && typeof virtualScrollManager.trackRender === 'function') {
        virtualScrollManager.trackRender(end - start);
    }
    
    // Initialize pagination tracking (but don't track scroll in true pagination mode)
    const container = tableBody.parentElement;
    if (container && filtered.length > 0) {
        // Cleanup previous scroll tracking
        if (scrollTrackingCleanup) {
            scrollTrackingCleanup();
        }
        
        // Initialize new scroll tracking
        scrollTrackingCleanup = initScrollTracking(container, filtered.length, vsConfig.itemHeight);
        
        // Calculate and update pagination state
        const pagination = calculatePagination(filtered.length);
        updatePaginationState(pagination.currentPage, pagination.totalPages, filtered.length);
    }
    
    const renderEndTime = performance.now();
    console.log('[PAGINATION DEBUG] renderVirtualItems completed at:', renderEndTime, 'total delta:', renderEndTime - renderStartTime);
}

/**
 * Render items normally (non-virtual)
 * @param {HTMLElement} tableBody - Table body element
 * @param {Array} filtered - Filtered items array
 * @param {Object} state - Application state
 * @param {Object} params - Rendering parameters
 */
function renderNormalItems(tableBody, filtered, state, params) {
    const renderStartTime = performance.now();
    console.log('[PAGINATION DEBUG] renderNormalItems called at:', renderStartTime, 'with', filtered.length, 'items');
    
    // Get items for current page FIRST
    const paginatedItems = getItemsForPage(filtered);
    console.log('[PAGINATION DEBUG] Showing', paginatedItems.length, 'items for current page');
    
    const fragment = document.createDocumentFragment();
    
    const itemRenderTime = performance.now();
    // Render items for current page only
    paginatedItems.forEach((item, index) => {
        const row = renderItemRow(item, state, params);
        fragment.appendChild(row);
    });
    console.log('[PAGINATION DEBUG] Items rendered at:', itemRenderTime, 'delta:', itemRenderTime - renderStartTime);
    
    const domAppendTime = performance.now();
    tableBody.appendChild(fragment);
    console.log('[PAGINATION DEBUG] DOM appended at:', domAppendTime, 'total delta:', domAppendTime - renderStartTime);
    
    // Update pagination state
    const pagination = calculatePagination(filtered.length);
    updatePaginationState(pagination.currentPage, pagination.totalPages, filtered.length);
}

/**
 * Render mobile view items
 * @param {HTMLElement} mobileList - Mobile list element
 * @param {Array} items - Items to render
 * @param {Object} state - Application state
 * @param {Object} params - Rendering parameters
 */
function renderMobileItems(mobileList, items, state, params) {
    const renderStartTime = performance.now();
    console.log('[PAGINATION DEBUG] renderMobileItems called at:', renderStartTime, 'with', items.length, 'items');
    
    if (!mobileList) {
        console.log('[PAGINATION DEBUG] Mobile list not found, skipping');
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    const itemRenderTime = performance.now();
    items.forEach((item) => {
        const mobileItem = createMobileItem(item, state, params);
        fragment.appendChild(mobileItem);
    });
    console.log('[PAGINATION DEBUG] Mobile items rendered at:', itemRenderTime, 'delta:', itemRenderTime - renderStartTime);
    
    const domAppendTime = performance.now();
    mobileList.appendChild(fragment);
    console.log('[PAGINATION DEBUG] Mobile DOM appended at:', domAppendTime, 'total delta:', domAppendTime - renderStartTime);
}

/**
 * Create mobile item element
 * @param {Object} item - Item data
 * @param {Object} state - Application state
 * @param {Object} params - Rendering parameters
 * @returns {HTMLElement} - Mobile item element
 */
function createMobileItem(item, state, params) {
    const itemStartTime = performance.now();
    
    const {
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
        flashStatus,
        setError
    } = params;

    const key = item.path;
    const extension = item.type === 'file' ? getFileExtension(item.name) : '';
    const isPreviewable = item.type === 'file' && previewableExtensions.has(extension);
    const isMediaPreviewable = item.type === 'file' && mediaPreviewableExtensions.has(extension);
    
    const mobileItem = document.createElement('div');
    mobileItem.classList.add('flex', 'items-center', 'justify-between', 'p-3');
    mobileItem.dataset.itemPath = key;
    mobileItem.dataset.itemType = item.type;
    
    // Left side: checkbox + icon + name + date
    const leftSide = document.createElement('div');
    leftSide.classList.add('flex', 'items-center', 'gap-3');
    
    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('w-5', 'h-5');
    checkbox.dataset.path = key;
    checkbox.checked = state.selected.has(key);
    checkbox.setAttribute('aria-label', `Pilih ${item.name}`);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('change', (event) => toggleSelection(key, event.target.checked));
    leftSide.appendChild(checkbox);
    
    // Icon
    const iconContainer = document.createElement('div');
    iconContainer.classList.add('flex', 'items-center', 'justify-center');
    
    // Use the same icon system as desktop
    const iconInfo = getItemIcon(item);
    const icon = document.createElement('span');
    icon.classList.add('item-icon');
    if (iconInfo.className && iconInfo.className.trim()) {
        iconInfo.className.trim().split(/\s+/).forEach(c => icon.classList.add(c));
    }
    // Apply inline styles to ensure icon is visible
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.width = '32px';
    icon.style.height = '32px';
    icon.style.borderRadius = '6px';
    
    // Apply colorful icon styles based on file type
    const mobileIconColors = getIconColors(item);
    icon.style.backgroundColor = mobileIconColors.backgroundColor;
    icon.style.color = mobileIconColors.color;
    
    icon.style.flexShrink = '0';
    icon.style.marginTop = '2px';
    
    // Insert SVG safely
    if (iconInfo && iconInfo.svg) {
        try {
            if (typeof iconInfo.svg === 'object' && iconInfo.svg.nodeType === 1) {
                const svgClone = iconInfo.svg.cloneNode(true);
                // Ensure SVG has size
                svgClone.style.width = '20px';
                svgClone.style.height = '20px';
                icon.appendChild(svgClone);
            } else if (typeof iconInfo.svg === 'string') {
                icon.innerHTML = iconInfo.svg;
            }
        } catch (e) {
            console.warn('[uiRenderer] Failed to render icon for', item && item.path, e);
        }
    }
    
    iconContainer.appendChild(icon);
    leftSide.appendChild(iconContainer);
    
    // Name + date
    const nameDateContainer = document.createElement('div');
    nameDateContainer.classList.add('flex', 'flex-col');
    
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('font-medium', 'text-gray-800');
    nameSpan.textContent = item.name;
    nameDateContainer.appendChild(nameSpan);
    
    const dateSpan = document.createElement('span');
    dateSpan.classList.add('text-xs', 'text-gray-500');
    dateSpan.textContent = formatDate(item.modified);
    nameDateContainer.appendChild(dateSpan);
    
    leftSide.appendChild(nameDateContainer);
    mobileItem.appendChild(leftSide);
    
    // Right side: action menu button (three dots)
    const rightSide = document.createElement('div');
    rightSide.classList.add('flex', 'items-center', 'gap-2');
    
    // Three dots menu button
    const actionBtn = document.createElement('button');
    actionBtn.classList.add('p-2', 'rounded-full', 'text-gray-600', 'hover:bg-gray-100', 'transition-colors');
    actionBtn.innerHTML = '⋮';
    actionBtn.style.fontSize = '20px';
    actionBtn.style.lineHeight = '1';
    actionBtn.setAttribute('aria-label', `Menu aksi untuk ${item.name}`);
    actionBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (window.mobileActionsOpenMenu) {
            // Get button position for menu placement
            const rect = actionBtn.getBoundingClientRect();
            const x = rect.right - 150; // Align menu to right of button
            const y = rect.bottom + 5; // Position below button
            window.mobileActionsOpenMenu(item, x, y);
        }
    });
    rightSide.appendChild(actionBtn);
    
    mobileItem.appendChild(rightSide);
    
    // Add click handlers for the entire item
    mobileItem.addEventListener('click', (event) => {
        if (event.target.closest('button') || event.target.closest('input')) return;
        
        if (item.type === 'folder') {
            navigateTo(item.path);
        } else if (isPreviewable || isMediaPreviewable) {
            if (isPreviewable) {
                openTextPreview(item);
            } else {
                openMediaPreview(item);
            }
        } else {
            const ext = getFileExtension(item.name);
            if (isWordDocument(ext)) {
                openInWord(item);
            } else {
                const url = buildFileUrl(item.path);
                const newWindow = window.open(url, '_blank');
                if (newWindow) newWindow.opener = null;
            }
        }
    });
    
    // Context menu
    mobileItem.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        openContextMenu(event.clientX, event.clientY, item);
    });
    
    // Drag and drop
    mobileItem.draggable = true;
    mobileItem.addEventListener('dragstart', (event) => handleDragStart(event, item));
    mobileItem.addEventListener('dragend', (event) => handleDragEnd(event));
    
    if (item.type === 'folder') {
        mobileItem.addEventListener('dragover', (event) => handleDragOver(event, item));
        mobileItem.addEventListener('drop', (event) => handleDrop(event, item));
        mobileItem.addEventListener('dragleave', (event) => handleDragLeave(event));
    }
    
    const itemEndTime = performance.now();
    console.log('[PAGINATION DEBUG] createMobileItem completed for:', item.name, 'at:', itemEndTime, 'delta:', itemEndTime - itemStartTime);
    
    return mobileItem;
}

/**
 * Merender daftar item dalam tabel
 * @param {HTMLElement} tableBody - Elemen body tabel
 * @param {HTMLElement} emptyState - Elemen empty state
 * @param {Object} state - State aplikasi
 * @param {Array} items - Daftar item
 * @param {number} generatedAt - Timestamp pembuatan data
 * @param {boolean} highlightNew - Apakah menandai item baru
 * @param {Function} openTextPreview - Fungsi buka preview teks
 * @param {Function} openMediaPreview - Fungsi buka preview media
 * @param {Function} navigateTo - Fungsi navigasi
 * @param {Function} openInWord - Fungsi buka di Word
 * @param {Function} copyPathToClipboard - Fungsi salin path
 * @param {Function} openRenameOverlay - Fungsi buka rename overlay
 * @param {Function} openMoveOverlay - Fungsi buka move overlay
 * @param {Function} openConfirmOverlay - Fungsi buka confirm overlay
 * @param {Function} toggleSelection - Fungsi toggle selection
 * @param {Function} openContextMenu - Fungsi buka context menu
 * @param {Function} isWordDocument - Fungsi cek dokumen Word
 * @param {Function} buildFileUrl - Fungsi build file URL
 * @param {Function} hasUnsavedChanges - Fungsi cek perubahan belum disimpan
 * @param {Function} confirmDiscardChanges - Fungsi konfirmasi perubahan
 * @param {Function} previewableExtensions - Set ekstensi yang bisa di-preview
 * @param {Function} mediaPreviewableExtensions - Set ekstensi media yang bisa di-preview
 * @param {Function} handleDragStart - Fungsi handle drag start
 * @param {Function} handleDragEnd - Fungsi handle drag end
 * @param {Function} handleDragOver - Fungsi handle drag over
 * @param {Function} handleDrop - Fungsi handle drop
 * @param {Function} handleDragLeave - Fungsi handle drag leave
 * @param {Function} flashStatus - Fungsi flash status message
 * @param {Function} setError - Fungsi set error message
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
    flashStatus,
    setError
) {
    const renderStartTime = performance.now();
    console.log('[PAGINATION DEBUG] renderItems called at:', renderStartTime);
    
    // PERFORMANCE FIX: Only prevent concurrent renders, no debounce delay
    // Pagination already has its own protection via isRendering flag
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
    
    // PERFORMANCE FIX: Do not mutate global state.items here.
    // state.items should be the source of truth managed by the caller (appInitializer).
    // renderItems should only render what it is given.
    // state.items = items; 
    // state.itemMap = new Map(items.map((item) => [item.path, item]));
    // state.selected = synchronizeSelection(items, state.selected);
    
    const stateUpdateTime = performance.now();
    // We still need to update visibleItems for other modules to know what's shown
    // But we should be careful if items is just a page slice.
    // For now, we assume items passed here IS what should be visible (paginated slice).
    
    console.log('[RENDER DEBUG] State updated at:', stateUpdateTime, 'delta:', stateUpdateTime - cacheClearTime);
    
    const sortingTime = performance.now();
    const query = state.filter.toLowerCase();
    
    // Check cache validity
    const cacheKey = `${items.length}-${state.sortKey}-${state.sortDirection}-${query}`;
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
        console.log('[PAGINATION DEBUG] Sorting completed at:', sortStartTime, 'delta:', sortStartTime - arrayCreationTime, 'items:', sortedItems.length);
        
        const filterStartTime = performance.now();
        filtered = query
            ? sortedItems.filter((item) => item.name.toLowerCase().includes(query))
            : sortedItems;
        console.log('[PAGINATION DEBUG] Filtering completed at:', filterStartTime, 'delta:', filterStartTime - sortStartTime, 'query:', query, 'filtered:', filtered.length);
        
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
    console.log('[RENDER DEBUG] Sorting/filtering completed at:', sortingTime, 'delta:', sortingTime - stateUpdateTime, 'items:', items.length, 'filtered:', filtered.length);

    const totalFolders = items.filter((item) => item.type === 'folder').length;
    const filteredFolders = filtered.filter((item) => item.type === 'folder').length;
    const meta = {
        totalFolders,
        totalFiles: items.length - totalFolders,
        filteredFolders,
        filteredFiles: filtered.length - filteredFolders,
    };

    // PERFORMANCE FIX: Use innerHTML = '' instead of removeChild loop for faster clearing
    const clearStartTime = performance.now();
    tableBody.innerHTML = '';
    console.log('[RENDER DEBUG] Table cleared at:', clearStartTime, 'delta:', clearStartTime - sortingTime);
    
    // Clear mobile list
    const mobileList = document.getElementById('mobile-file-list');
    if (mobileList) {
        mobileList.innerHTML = '';
    }

    // Insert "Up (..)" row at the top when not at root
    if (state.parentPath !== null) {
        const upRow = document.createElement('tr');
        upRow.classList.add('up-row','cursor-pointer','hover:bg-gray-50','transition-colors');
        upRow.tabIndex = 0;
        try { upRow.setAttribute('role', 'row'); } catch (e) {}
    
        // Empty selection cell (no checkbox)
        const upSel = document.createElement('td');
        upSel.classList.add('selection-cell','w-12','px-3','text-center','align-middle');
        upRow.appendChild(upSel);
    
        // Name cell with icon + "Back" label
        const upName = document.createElement('td');
        upName.classList.add('name-cell','item-name','flex','items-center','gap-4','min-w-0','flex-1','px-3','text-sm');
        
        // Add back icon
        const backIcon = document.createElement('span');
        backIcon.style.display = 'inline-flex';
        backIcon.style.alignItems = 'center';
        backIcon.style.justifyContent = 'center';
        backIcon.style.width = '25px';
        backIcon.style.height = '25px';
        backIcon.style.borderRadius = '8px';
        backIcon.style.backgroundColor = '#dbeafe';
        backIcon.style.color = '#1e40af';
        backIcon.style.flexShrink = '0';
        backIcon.style.marginTop = '2px';
        backIcon.style.fontSize = '16px';
        backIcon.textContent = '←';
        upName.appendChild(backIcon);
        
        const upLink = document.createElement('a');
        upLink.classList.add('item-link');
        upLink.href = '#';
        upLink.textContent = 'Back';
        upLink.addEventListener('click', (event) => {
            event.preventDefault();
            navigateTo(state.parentPath || '');
        });
        upName.appendChild(upLink);
        upRow.appendChild(upName);
    
        // Modified column shows "-"
        const upModified = document.createElement('td');
        upModified.classList.add('modified-cell','text-sm','text-gray-500','w-36','text-right','whitespace-nowrap','px-3');
        upModified.textContent = '-';
        upRow.appendChild(upModified);
    
        // Size column shows "-"
        const upSize = document.createElement('td');
        upSize.classList.add('size-cell','text-sm','text-gray-500','w-[100px]','text-right','whitespace-nowrap','px-2');
        upSize.textContent = '-';
        upRow.appendChild(upSize);
    
        // Empty actions cell (no actions)
        const upActions = document.createElement('td');
        upActions.classList.add('actions-cell','w-36','pr-2','px-3','text-right');
        upRow.appendChild(upActions);

        // Keyboard and mouse interactions
        upRow.addEventListener('dblclick', () => navigateTo(state.parentPath || ''));
        upRow.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigateTo(state.parentPath || '');
            }
        });

        // Make the up-row a drop target to move item to parent directory
        upRow.addEventListener('dragover', (event) => {
            if (!state.drag.isDragging) {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            // Visual highlight for drop target
            upRow.classList.add('drop-target');
        });

        upRow.addEventListener('dragleave', (event) => {
            // Only remove when actually leaving the row, not entering children
            if (event.currentTarget === event.target) {
                upRow.classList.remove('drop-target');
            }
        });

        upRow.addEventListener('drop', (event) => {
            if (!state.drag.isDragging || !state.drag.draggedItem) {
                return;
            }
            event.preventDefault();
            // Prevent bubbling to body to avoid duplicate move requests
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }

            const targetPath = state.parentPath || '';
            debugLog('[DEBUG] Dropping', state.drag.draggedItem.name, 'onto up-row to move into parent', targetPath);

            // Perform the move operation to parent directory
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
                null, // previewTitle
                null, // previewMeta
                null, // previewOpenRaw
                null  // buildFileUrl
            );

            // Clean up highlight/state
            upRow.classList.remove('drop-target');
            state.drag.dropTarget = null;
        });

        tableBody.appendChild(upRow);
    
        // Add up-row for mobile view too
        if (mobileList) {
            const mobileUpItem = document.createElement('div');
            mobileUpItem.classList.add('flex', 'items-center', 'justify-between', 'p-3', 'cursor-pointer', 'hover:bg-gray-50', 'transition-colors', 'border-b');
            mobileUpItem.dataset.itemPath = state.parentPath || '';
            mobileUpItem.dataset.itemType = 'parent';
            
            // Left side
            const leftSide = document.createElement('div');
            leftSide.classList.add('flex', 'items-center', 'gap-3');
            
            // Icon for parent
            const iconContainer = document.createElement('div');
            iconContainer.classList.add('flex', 'items-center', 'justify-center');
            const icon = document.createElement('span');
            icon.style.display = 'inline-flex';
            icon.style.alignItems = 'center';
            icon.style.justifyContent = 'center';
            icon.style.width = '32px';
            icon.style.height = '32px';
            icon.style.borderRadius = '6px';
            icon.style.backgroundColor = '#dbeafe';
            icon.style.color = '#1e40af';
            icon.style.flexShrink = '0';
            icon.style.marginTop = '2px';
            icon.style.fontSize = '18px';
            icon.textContent = '←';
            iconContainer.appendChild(icon);
            leftSide.appendChild(iconContainer);
            
            // Name
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('font-medium', 'text-gray-800');
            nameSpan.textContent = 'Back';
            leftSide.appendChild(nameSpan);
            
            mobileUpItem.appendChild(leftSide);
            
            // Click handler
            mobileUpItem.addEventListener('click', () => {
                navigateTo(state.parentPath || '');
            });
            
            mobileList.appendChild(mobileUpItem);
        }
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
        flashStatus,
        setError,
        highlightNew,
        generatedAt
    };

    // Use virtual scrolling for large lists, normal rendering otherwise
    // Safe check for virtualScroll config
    const vsConfig = config.virtualScroll || {
        enabled: false,
        threshold: 100,
        itemHeight: 40,
        overscan: 5
    };
    
    // Show all filtered items without pagination
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
    
    // PERFORMANCE FIX: Skip mobile render on desktop for better performance
    const mobileRenderTime = performance.now();
    if (window.innerWidth < 768) {
        // Only render mobile view on mobile devices
        renderMobileItems(mobileList, filtered, state, renderParams);
        console.log('[RENDER DEBUG] Mobile items rendered at:', mobileRenderTime, 'delta:', mobileRenderTime - clearStartTime);
    } else {
        console.log('[RENDER DEBUG] Skipped mobile render on desktop');
    }
    
    // Invalidate DOM cache after rendering to force fresh queries on next drag operation
    invalidateDOMCache();

    // Update pagination state after render (for both virtual and normal renders)
    const pagination = calculatePagination(filtered.length);
    updatePaginationState(pagination.currentPage, pagination.totalPages, filtered.length);
    console.log('[PAGINATION DEBUG] Final pagination state:', pagination);

    const finalStateTime = performance.now();
    const newMap = new Map();
    items.forEach((item) => {
        newMap.set(item.path, generatedAt);
    });
    state.knownItems = newMap;
    console.log('[RENDER DEBUG] Final state updated at:', finalStateTime, 'delta:', finalStateTime - mobileRenderTime);

    const renderEndTime = performance.now();
    console.log('[RENDER DEBUG] renderItems completed at:', renderEndTime, 'total delta:', renderEndTime - renderStartTime);

        return { items, filtered, meta };
    } finally {
        isRendering = false;
    }
}

/**
 * Mengupdate UI sorting
 * @param {HTMLElement} sortHeaders - Elemen header sorting
 * @param {HTMLElement} statusSort - Elemen status sorting
 * @param {Object} state - State aplikasi
 */
export function updateSortUI(sortHeaders, statusSort, state) {
    const isDefaultSort = state.sortKey === 'name' && state.sortDirection === 'asc';

    sortHeaders.forEach((header) => {
        const key = header.dataset.sortKey;
        const indicator = header.querySelector('.sort-indicator');
        const isActive = key === state.sortKey;
        header.classList.toggle('sorted', isActive);
        header.classList.toggle('sorted-asc', isActive && state.sortDirection === 'asc');
        header.classList.toggle('sorted-desc', isActive && state.sortDirection === 'desc');
        header.setAttribute('aria-sort', isActive ? (state.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
        if (indicator) {
            indicator.textContent = isActive
                ? (state.sortDirection === 'asc' ? '\u25B2' : '\u25BC')
                : '\u2195';
        }
    });

    if (statusSort) {
        if (isDefaultSort) {
            statusSort.hidden = true;
            statusSort.textContent = '';
        } else {
            statusSort.hidden = false;
            statusSort.textContent = `Urut: ${getSortDescription(state.sortKey, state.sortDirection)}`;
        }
    }
}

/**
 * Mengupdate UI selection
 * @param {HTMLElement} btnDeleteSelected - Tombol delete selected
 * @param {HTMLElement} btnMoveSelected - Tombol move selected
 * @param {HTMLElement} selectAllCheckbox - Checkbox select all
 * @param {Object} state - State aplikasi
 */
export function updateSelectionUI(btnDeleteSelected, btnMoveSelected, selectAllCheckbox, state) {
    const selectedCount = state.selected.size;

    if (btnDeleteSelected) {
        if (state.isDeleting) {
            btnDeleteSelected.disabled = true;
            btnDeleteSelected.textContent = 'Menghapus...';
        } else {
            btnDeleteSelected.disabled = selectedCount === 0 || state.isLoading;
            btnDeleteSelected.textContent = selectedCount > 0
                ? `Hapus (${selectedCount.toLocaleString('id-ID')})`
                : 'Hapus';
        }
    }

    // Enable/disable Move Selected button
    if (btnMoveSelected) {
        btnMoveSelected.disabled = selectedCount === 0 || state.isLoading;
    }

    if (selectAllCheckbox) {
        const totalVisible = state.visibleItems.length;
        const selectedVisible = state.visibleItems.reduce((accumulator, item) => (
            state.selected.has(item.path) ? accumulator + 1 : accumulator
        ), 0);

        const disableCheckbox = state.isLoading || totalVisible === 0;
        selectAllCheckbox.disabled = disableCheckbox;

        if (disableCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = totalVisible > 0 && selectedVisible === totalVisible;
            selectAllCheckbox.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible;
        }
    }
}

/**
 * Sinkronisasi selection pada baris tabel
 * @param {HTMLElement} tableBody - Elemen body tabel
 * @param {Object} state - State aplikasi
 */
export function syncRowSelection(tableBody, state) {
    tableBody.querySelectorAll('tr').forEach((row) => {
        const path = row.dataset.itemPath;
        const isSelected = state.selected.has(path);
        row.classList.toggle('is-selected', isSelected);
        const checkbox = row.querySelector('.item-select');
        if (checkbox) {
            checkbox.checked = isSelected;
        }
    });
}

/**
 * Sinkronisasi selection pada mobile list
 * @param {HTMLElement} mobileList - Elemen mobile list
 * @param {Object} state - State aplikasi
 */
export function syncMobileSelection(mobileList, state) {
    if (!mobileList) return;
    
    // Mobile items are divs with data-item-path attribute and contain checkboxes
    mobileList.querySelectorAll('[data-item-path]').forEach((item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            const path = checkbox.dataset.path;
            if (path) {
                checkbox.checked = state.selected.has(path);
            }
        }
    });
}

/**
 * Mengupdate status informasi
 * @param {HTMLElement} statusInfo - Elemen status info
 * @param {HTMLElement} statusTime - Elemen status time
 * @param {HTMLElement} statusFilter - Elemen status filter
 * @param {number} totalCount - Total item
 * @param {number} filteredCount - Item yang difilter
 * @param {number} generatedAt - Timestamp pembuatan data
 * @param {Object} meta - Metadata tambahan
 * @param {string} filter - Filter yang diterapkan
 * @param {Object} paginationState - Pagination state (optional)
 */
export function updateStatus(statusInfo, statusTime, statusFilter, totalCount, filteredCount, generatedAt, meta = {}, filter, paginationState = null) {
    const {
        totalFolders = 0,
        totalFiles = 0,
        filteredFolders = totalFolders,
        filteredFiles = totalFiles,
    } = meta;

    const displayCount = filteredCount ?? totalCount;
    const formattedDisplay = displayCount.toLocaleString('id-ID');
    const formattedTotal = totalCount.toLocaleString('id-ID');
    const folderDisplay = (filter && filteredCount !== totalCount) ? filteredFolders : totalFolders;
    const fileDisplay = (filter && filteredCount !== totalCount) ? filteredFiles : totalFiles;

    const infoPrefix = (filter && filteredCount !== totalCount)
        ? `${formattedDisplay} dari ${formattedTotal} item ditampilkan`
        : `${formattedDisplay} item ditampilkan`;

    // Add pagination info if available
    let paginationInfo = '';
    if (paginationState && paginationState.currentPage && paginationState.totalPages > 1) {
        paginationInfo = ` • ${getSimplePaginationInfo(paginationState.currentPage, paginationState.totalPages)}`;
    }

    statusInfo.textContent = `${infoPrefix} • ${folderDisplay.toLocaleString('id-ID')} folder • ${fileDisplay.toLocaleString('id-ID')} file${paginationInfo}`;

    if (filter) {
        statusFilter.hidden = false;
        statusFilter.textContent = `Filter: "${filter}" (${filteredCount.toLocaleString('id-ID')} cocok)`;
    } else {
        statusFilter.hidden = true;
        statusFilter.textContent = '';
    }

    if (generatedAt) {
        statusTime.hidden = false;
        statusTime.textContent = `Diperbarui ${new Date(generatedAt * 1000).toLocaleTimeString('id-ID')}`;
    } else {
        statusTime.hidden = true;
        statusTime.textContent = '';
    }
}

/**
 * Mengatur status loading
 * @param {HTMLElement} loaderOverlay - Elemen loader overlay
 * @param {HTMLElement} btnRefresh - Tombol refresh
 * @param {boolean} isLoading - Status loading
 */
export function setLoading(loaderOverlay, btnRefresh, isLoading) {
    const startTime = performance.now();
    console.log('[PAGINATION DEBUG] setLoading called at:', startTime, 'with isLoading:', isLoading);
    
    // Defensive: guard against missing elements to avoid Uncaught TypeErrors
    const overlayTime = performance.now();
    if (loaderOverlay && loaderOverlay.classList) {
        loaderOverlay.classList.toggle('visible', !!isLoading);
    } else {
        // Fallback: try common selectors if passed element is null
        const overlay = document.getElementById('loader-overlay') || document.querySelector('.loader-overlay');
        if (overlay && overlay.classList) overlay.classList.toggle('visible', !!isLoading);
    }
    console.log('[PAGINATION DEBUG] Loader overlay updated at:', overlayTime, 'delta:', overlayTime - startTime);
    
    const buttonTime = performance.now();
    if (btnRefresh) {
        try {
            btnRefresh.disabled = !!isLoading;
        } catch (e) {
            // Element exists but cannot be disabled — ignore safely
        }
    }
    // Note: btn-refresh button has been removed from UI, no fallback needed
    console.log('[PAGINATION DEBUG] Refresh button updated at:', buttonTime, 'delta:', buttonTime - overlayTime);

    
    const endTime = performance.now();
    console.log('[PAGINATION DEBUG] setLoading completed at:', endTime, 'total delta:', endTime - startTime);
}

/**
 * Mengatur pesan error
 * @param {HTMLElement} errorBanner - Elemen error banner
 * @param {string} message - Pesan error
 */
export function setError(errorBanner, message) {
    if (message) {
        errorBanner.textContent = message;
        errorBanner.classList.add('visible', 'error');
    } else {
        errorBanner.textContent = '';
        errorBanner.classList.remove('visible', 'error');
    }
}
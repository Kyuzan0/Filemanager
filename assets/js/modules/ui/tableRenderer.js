/**
 * Table Renderer Module
 * Handles table/list rendering logic for the File Manager application
 */

import {
    compareItems,
    getFileExtension,
    formatBytes,
    formatDate
} from '../utils.js';
import { getItemIcon } from '../fileIcons.js';
import { config } from '../constants.js';
import { VirtualScrollManager, createSpacer, shouldUseVirtualScroll } from '../virtualScroll.js';
import { invalidateDOMCache } from '../dragDrop.js';
import { debugLog } from '../debug.js';
import {
    calculatePagination,
    updatePaginationState,
    initScrollTracking,
    getItemsForPage
} from '../pagination.js';

// Track last selected index for Shift+Click range selection
let lastSelectedIndex = -1;

// Global virtual scroll manager instance
let virtualScrollManager = null;

// Global scroll tracking cleanup function
let scrollTrackingCleanup = null;

/**
 * Get icon colors based on file type
 * Returns { backgroundColor, color } for colorful icons
 */
export function getIconColors(item) {
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
 * Render single item row (extracted for reusability)
 * @param {Object} item - Item data
 * @param {Object} state - Application state
 * @param {Object} params - Rendering parameters (callbacks, elements, etc.)
 * @returns {HTMLElement} - The created row element
 */
export function renderItemRow(item, state, params) {
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
        generatedAt,
        showMobileContextMenu
    } = params;

    const key = item.path;
    const previouslySeen = state.knownItems.has(key);
    const row = document.createElement('tr');
    row.dataset.itemPath = key;
    row.dataset.itemType = item.type;
    row.tabIndex = 0;
    try { row.setAttribute('role', 'row'); } catch (e) {}
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

    // Single-click on row toggles checkbox selection (click-to-select enhancement)
    // Supports Shift+Click for range selection and Ctrl+Click for toggle
    row.addEventListener('click', (event) => {
        // Don't toggle if clicking on interactive elements
        const target = event.target;
        const isInteractiveElement =
            target.closest('input[type="checkbox"]') ||
            target.closest('a') ||
            target.closest('button') ||
            target.closest('.action-icon-btn') ||
            target.closest('.mobile-more-btn') ||
            target.closest('.row-actions');
        
        if (isInteractiveElement) {
            return; // Let the element handle its own click
        }
        
        // Get current item index from visible items
        const allRows = Array.from(row.parentElement.querySelectorAll('tr[data-item-path]'));
        const currentIndex = allRows.indexOf(row);
        
        if (event.shiftKey && lastSelectedIndex >= 0) {
            // Shift+Click: Range selection
            const start = Math.min(lastSelectedIndex, currentIndex);
            const end = Math.max(lastSelectedIndex, currentIndex);
            
            for (let i = start; i <= end; i++) {
                const targetRow = allRows[i];
                if (targetRow) {
                    const targetPath = targetRow.dataset.itemPath;
                    const targetCheckbox = targetRow.querySelector('input[type="checkbox"]');
                    if (targetCheckbox && !targetCheckbox.checked) {
                        targetCheckbox.checked = true;
                        toggleSelection(targetPath, true);
                        targetRow.classList.add('selected');
                        targetRow.setAttribute('aria-selected', 'true');
                    }
                }
            }
            debugLog('[TableRenderer] Range selection from', start, 'to', end);
        } else if (event.ctrlKey || event.metaKey) {
            // Ctrl+Click (or Cmd+Click on Mac): Toggle single selection without clearing others
            const newState = !checkbox.checked;
            checkbox.checked = newState;
            toggleSelection(key, newState);
            
            if (newState) {
                row.classList.add('selected');
                row.setAttribute('aria-selected', 'true');
            } else {
                row.classList.remove('selected');
                row.setAttribute('aria-selected', 'false');
            }
            lastSelectedIndex = currentIndex;
            debugLog('[TableRenderer] Ctrl+Click toggle:', key, newState);
        } else {
            // Normal click: Toggle single item selection
            const newState = !checkbox.checked;
            checkbox.checked = newState;
            toggleSelection(key, newState);
            
            // Update row visual state for selection
            if (newState) {
                row.classList.add('selected');
                row.setAttribute('aria-selected', 'true');
            } else {
                row.classList.remove('selected');
                row.setAttribute('aria-selected', 'false');
            }
            lastSelectedIndex = currentIndex;
        }
    });

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
    icon.classList.add('item-icon');
    if (iconInfo.className && iconInfo.className.trim()) {
        iconInfo.className.trim().split(/\s+/).forEach(c => icon.classList.add(c));
    }
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
    if (iconInfo && iconInfo.svg) {
        try {
            if (typeof iconInfo.svg === 'object' && iconInfo.svg.nodeType === 1) {
                const svgClone = iconInfo.svg.cloneNode(true);
                svgClone.style.width = '24px';
                svgClone.style.height = '24px';
                icon.appendChild(svgClone);
            } else if (typeof iconInfo.svg === 'string') {
                icon.innerHTML = iconInfo.svg;
            }
        } catch (e) {
            console.warn('[tableRenderer] Failed to render icon for', item && item.path, e);
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
        const size = item.size || 0;
        cellSize.textContent = formatBytes(size);
    }
    row.appendChild(cellSize);

    // Actions cell
    const actionCell = document.createElement('td');
    actionCell.classList.add('actions-cell','w-auto','pr-2','text-right');
    try { actionCell.setAttribute('role', 'gridcell'); } catch (e) {}
    const actionGroup = document.createElement('div');
    actionGroup.classList.add('row-actions','inline-flex','items-center','gap-1','justify-end');

    // Desktop action buttons wrapper
    const desktopActions = document.createElement('div');
    desktopActions.classList.add('hidden', 'sm:flex', 'items-center', 'gap-1');

    // Helper function to create action button with tooltip
    const createActionBtn = (iconClass, title, colorClass, onClick) => {
        const btn = document.createElement('button');
        btn.classList.add('action-icon-btn', 'p-1.5', 'rounded', 'transition-colors', 'hover:bg-gray-100', 'dark:hover:bg-white/10', colorClass);
        btn.innerHTML = `<i class="${iconClass} text-base"></i>`;
        btn.setAttribute('title', title);
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            onClick(event);
        });
        return btn;
    };

    // 1. Open/Preview button
    const openBtn = createActionBtn('ri-folder-open-line', 'Buka', 'text-blue-600 dark:text-blue-400', () => {
        if (item.type === 'folder') {
            navigateTo(item.path);
        } else if (isPreviewable) {
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
    desktopActions.appendChild(openBtn);

    // 2. Download button (only for files)
    if (item.type === 'file') {
        const downloadBtn = createActionBtn('ri-download-line', 'Unduh', 'text-green-600 dark:text-green-400', () => {
            const url = buildFileUrl(item.path);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.name;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        desktopActions.appendChild(downloadBtn);
    }

    // 3. Rename button
    const renameBtn = createActionBtn('ri-edit-line', 'Ganti Nama', 'text-amber-600 dark:text-amber-400', () => {
        openRenameOverlay(item);
    });
    desktopActions.appendChild(renameBtn);

    // 4. Move button
    const moveBtn = createActionBtn('ri-folder-transfer-line', 'Pindahkan', 'text-purple-600 dark:text-purple-400', () => {
        openMoveOverlay([item.path]);
    });
    desktopActions.appendChild(moveBtn);

    // 5. Delete button
    const deleteBtn = createActionBtn('ri-delete-bin-line', 'Hapus', 'text-red-500 dark:text-red-400', () => {
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
    desktopActions.appendChild(deleteBtn);
    
    // Add desktop actions to action group
    actionGroup.appendChild(desktopActions);

    // Mobile more button
    const mobileMoreBtn = document.createElement('button');
    mobileMoreBtn.classList.add('mobile-more-btn', 'sm:hidden', 'p-1.5', 'rounded', 'transition-colors', 'hover:bg-gray-100', 'dark:hover:bg-white/10', 'text-gray-600', 'dark:text-gray-400');
    mobileMoreBtn.innerHTML = '<i class="ri-more-2-fill text-lg"></i>';
    mobileMoreBtn.setAttribute('title', 'Menu');
    mobileMoreBtn.dataset.path = item.path;
    mobileMoreBtn.dataset.type = item.type;
    mobileMoreBtn.dataset.name = item.name;
    mobileMoreBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (showMobileContextMenu) {
            showMobileContextMenu(event, item);
        }
    });
    actionGroup.appendChild(mobileMoreBtn);

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

    // Debug log
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
export function renderVirtualItems(tableBody, filtered, state, params) {
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
            container: tableBody.parentElement,
            itemHeight: vsConfig.itemHeight,
            overscan: vsConfig.overscan,
            onRender: (range) => {
                console.log('[VirtualScroll] Render triggered for range:', range);
            }
        });
        virtualScrollManager.setTotalItems(paginatedItems.length);
    } else {
        virtualScrollManager.setTotalItems(paginatedItems.length);
    }
    console.log('[PAGINATION DEBUG] Virtual scroll manager initialized at:', managerInitTime, 'delta:', managerInitTime - renderStartTime);

    // Get visible range
    const rangeTime = performance.now();
    const { start, end } = virtualScrollManager.getVisibleRange();
    debugLog('[VirtualScroll] Rendering range:', start, '-', end);
    console.log('[PAGINATION DEBUG] Visible range calculated at:', rangeTime, 'delta:', rangeTime - managerInitTime);
    
    // Clear existing rows
    const clearTime = performance.now();
    const upRow = tableBody.querySelector('.up-row');
    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }
    if (upRow) {
        tableBody.appendChild(upRow);
    }
    console.log('[PAGINATION DEBUG] DOM cleared at:', clearTime, 'delta:', clearTime - rangeTime);

    // Create top spacer
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

    // Reconcile computed row height with virtual scroll configuration
    try {
        const heightReconcileTime = performance.now();
        const firstRow = tableBody.querySelector('tr:not(.up-row)');
        if (firstRow) {
            const actualHeight = Math.round(firstRow.getBoundingClientRect().height);
            if (actualHeight > 0 && actualHeight !== vsConfig.itemHeight) {
                vsConfig.itemHeight = actualHeight;
                if (virtualScrollManager) {
                    virtualScrollManager.itemHeight = actualHeight;
                    if (typeof virtualScrollManager.updateItemHeight === 'function') {
                        virtualScrollManager.updateItemHeight(actualHeight);
                    }
                }
            }
        }
        console.log('[PAGINATION DEBUG] Height reconciled at:', heightReconcileTime, 'delta:', heightReconcileTime - itemRenderTime);
    } catch (e) {
        debugLog('[VirtualScroll] Failed to reconcile itemHeight', e);
    }

    // Create bottom spacer
    const bottomSpacerTime = performance.now();
    const remainingItems = Math.max(0, paginatedItems.length - end);
    const bottomSpaceHeight = remainingItems * vsConfig.itemHeight;
    const bottomSpacer = createSpacer(bottomSpaceHeight);
    if (bottomSpacer) tableBody.appendChild(bottomSpacer);
    console.log('[PAGINATION DEBUG] Bottom spacer created at:', bottomSpacerTime, 'delta:', bottomSpacerTime - itemRenderTime);

    // Track performance
    if (virtualScrollManager && typeof virtualScrollManager.trackRender === 'function') {
        virtualScrollManager.trackRender(end - start);
    }
    
    // Initialize pagination tracking
    const container = tableBody.parentElement;
    if (container && filtered.length > 0) {
        if (scrollTrackingCleanup) {
            scrollTrackingCleanup();
        }
        scrollTrackingCleanup = initScrollTracking(container, filtered.length, vsConfig.itemHeight);
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
export function renderNormalItems(tableBody, filtered, state, params) {
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
export function renderMobileItems(mobileList, items, state, params) {
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
export function createMobileItem(item, state, params) {
    const itemStartTime = performance.now();
    
    const {
        previewableExtensions,
        mediaPreviewableExtensions,
        openTextPreview,
        openMediaPreview,
        navigateTo,
        openInWord,
        toggleSelection,
        openContextMenu,
        isWordDocument,
        buildFileUrl,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop,
        handleDragLeave
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
    
    const iconInfo = getItemIcon(item);
    const icon = document.createElement('span');
    icon.classList.add('item-icon');
    if (iconInfo.className && iconInfo.className.trim()) {
        iconInfo.className.trim().split(/\s+/).forEach(c => icon.classList.add(c));
    }
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.width = '32px';
    icon.style.height = '32px';
    icon.style.borderRadius = '6px';
    
    const mobileIconColors = getIconColors(item);
    icon.style.backgroundColor = mobileIconColors.backgroundColor;
    icon.style.color = mobileIconColors.color;
    
    icon.style.flexShrink = '0';
    icon.style.marginTop = '2px';
    
    if (iconInfo && iconInfo.svg) {
        try {
            if (typeof iconInfo.svg === 'object' && iconInfo.svg.nodeType === 1) {
                const svgClone = iconInfo.svg.cloneNode(true);
                svgClone.style.width = '20px';
                svgClone.style.height = '20px';
                icon.appendChild(svgClone);
            } else if (typeof iconInfo.svg === 'string') {
                icon.innerHTML = iconInfo.svg;
            }
        } catch (e) {
            console.warn('[tableRenderer] Failed to render icon for', item && item.path, e);
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
    
    const actionBtn = document.createElement('button');
    actionBtn.classList.add('p-2', 'rounded-full', 'text-gray-600', 'hover:bg-gray-100', 'transition-colors');
    actionBtn.innerHTML = '⋮';
    actionBtn.style.fontSize = '20px';
    actionBtn.style.lineHeight = '1';
    actionBtn.setAttribute('aria-label', `Menu aksi untuk ${item.name}`);
    actionBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (window.mobileActionsOpenMenu) {
            const rect = actionBtn.getBoundingClientRect();
            const x = rect.right - 150;
            const y = rect.bottom + 5;
            window.mobileActionsOpenMenu(item, x, y);
        }
    });
    rightSide.appendChild(actionBtn);
    
    mobileItem.appendChild(rightSide);
    
    // Single-click on item toggles checkbox selection (click-to-select enhancement)
    // Double-click opens the item
    // Supports Shift+Click for range selection and Ctrl+Click for toggle
    let clickTimeout = null;
    
    mobileItem.addEventListener('click', (event) => {
        // Don't handle if clicking on interactive elements
        if (event.target.closest('button') || event.target.closest('input')) return;
        
        // Clear any pending click timeout for double-click detection
        if (clickTimeout) {
            clearTimeout(clickTimeout);
            clickTimeout = null;
            // This is a double-click - open the item
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
            return;
        }
        
        // For Shift+Click and Ctrl+Click, handle immediately without timeout
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            const mobileList = mobileItem.parentElement;
            const allItems = Array.from(mobileList.querySelectorAll('div[data-item-path]'));
            const currentIndex = allItems.indexOf(mobileItem);
            
            if (event.shiftKey && lastSelectedIndex >= 0) {
                // Shift+Click: Range selection
                const start = Math.min(lastSelectedIndex, currentIndex);
                const end = Math.max(lastSelectedIndex, currentIndex);
                
                for (let i = start; i <= end; i++) {
                    const targetItem = allItems[i];
                    if (targetItem) {
                        const targetPath = targetItem.dataset.itemPath;
                        const targetCheckbox = targetItem.querySelector('input[type="checkbox"]');
                        if (targetCheckbox && !targetCheckbox.checked) {
                            targetCheckbox.checked = true;
                            toggleSelection(targetPath, true);
                            targetItem.classList.add('selected');
                            targetItem.setAttribute('aria-selected', 'true');
                        }
                    }
                }
                debugLog('[TableRenderer] Mobile range selection from', start, 'to', end);
            } else if (event.ctrlKey || event.metaKey) {
                // Ctrl+Click: Toggle without clearing
                const newState = !checkbox.checked;
                checkbox.checked = newState;
                toggleSelection(key, newState);
                
                if (newState) {
                    mobileItem.classList.add('selected');
                    mobileItem.setAttribute('aria-selected', 'true');
                } else {
                    mobileItem.classList.remove('selected');
                    mobileItem.setAttribute('aria-selected', 'false');
                }
                lastSelectedIndex = currentIndex;
            }
            return;
        }
        
        // Set a timeout for single click (toggle selection)
        clickTimeout = setTimeout(() => {
            clickTimeout = null;
            
            // Get current index for tracking
            const mobileList = mobileItem.parentElement;
            const allItems = Array.from(mobileList.querySelectorAll('div[data-item-path]'));
            const currentIndex = allItems.indexOf(mobileItem);
            
            // Single click - toggle checkbox
            const newState = !checkbox.checked;
            checkbox.checked = newState;
            toggleSelection(key, newState);
            
            // Update visual state
            if (newState) {
                mobileItem.classList.add('selected');
                mobileItem.setAttribute('aria-selected', 'true');
            } else {
                mobileItem.classList.remove('selected');
                mobileItem.setAttribute('aria-selected', 'false');
            }
            
            lastSelectedIndex = currentIndex;
        }, 250); // 250ms delay to distinguish single vs double click
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
 * Get virtual scroll manager instance
 * @returns {VirtualScrollManager|null}
 */
export function getVirtualScrollManager() {
    return virtualScrollManager;
}

/**
 * Reset virtual scroll manager
 */
export function resetVirtualScrollManager() {
    virtualScrollManager = null;
}

/**
 * Cleanup scroll tracking
 */
export function cleanupScrollTracking() {
    if (scrollTrackingCleanup) {
        scrollTrackingCleanup();
        scrollTrackingCleanup = null;
    }
}
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
import {
    initPagination,
    updatePaginationInfo,
    getPaginatedItems,
    renderPaginationControls,
    resetPagination
} from './pagination.js';

// Global virtual scroll manager instance
let virtualScrollManager = null;

/**
 * Merender breadcrumbs navigasi
 * @param {HTMLElement} breadcrumbsEl - Elemen breadcrumbs
 * @param {Array} breadcrumbs - Data breadcrumbs
 * @param {Function} navigateTo - Fungsi navigasi
 */
export function renderBreadcrumbs(breadcrumbsEl, breadcrumbs, navigateTo) {
    breadcrumbsEl.innerHTML = '';
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
            separator.className = 'breadcrumb-separator';
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
    selectionCell.className = 'selection-cell';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-select';
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
    cellName.className = 'name-cell item-name';
    const iconInfo = getItemIcon(item);
    const icon = document.createElement('span');
    icon.className = `item-icon ${iconInfo.className}`;
    icon.innerHTML = iconInfo.svg;
    cellName.appendChild(icon);

    const link = document.createElement('a');
    link.className = 'item-link';
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
        badge.className = 'badge badge-new';
        badge.textContent = 'Baru';
        cellName.appendChild(badge);
    }

    // Modified date cell
    const cellModified = document.createElement('td');
    cellModified.className = 'modified-cell';
    cellModified.textContent = formatDate(item.modified);

    // Actions cell
    const actionCell = document.createElement('td');
    actionCell.className = 'actions-cell';
    const actionGroup = document.createElement('div');
    actionGroup.className = 'row-actions';

    if (item.type === 'folder') {
        actionGroup.appendChild(createRowActionButton(
            actionIcons.open,
            'Buka',
            () => navigateTo(item.path),
        ));
    } else if (isPreviewable || isMediaPreviewable) {
        actionGroup.appendChild(createRowActionButton(
            actionIcons.preview,
            'Pratinjau',
            () => {
                if (isPreviewable) {
                    openTextPreview(item);
                } else {
                    openMediaPreview(item);
                }
            },
        ));
    } else {
        const extForAction = getFileExtension(item.name);
        if (isWordDocument(extForAction)) {
            actionGroup.appendChild(createRowActionButton(
                actionIcons.open,
                'Buka di Word',
                () => openInWord(item),
            ));
        } else {
            actionGroup.appendChild(createRowActionButton(
                actionIcons.view,
                'Lihat File',
                () => {
                    const url = buildFileUrl(item.path);
                    const newWindow = window.open(url, '_blank');
                    if (newWindow) newWindow.opener = null;
                },
            ));
        }
    }

    actionGroup.appendChild(createRowActionButton(
        actionIcons.copy,
        'Salin Path',
        () => {
            copyPathToClipboard(item.path)
                .then(() => flashStatus(`Path "${item.name}" tersalin.`))
                .catch(() => setError('Gagal menyalin path.'));
        },
    ));

    actionGroup.appendChild(createRowActionButton(
        actionIcons.delete,
        'Hapus Item',
        () => {
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
        },
        'danger',
    ));

    actionCell.appendChild(actionGroup);
    row.appendChild(cellName);
    row.appendChild(cellModified);
    row.appendChild(actionCell);

    // Auto-remove highlight after 5s
    if (!previouslySeen && highlightNew) {
        setTimeout(() => {
            row.classList.remove('is-new');
            if (badge) badge.remove();
        }, 5000);
    }

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
    const vsConfig = config.virtualScroll || {
        enabled: true,
        threshold: 100,
        itemHeight: 40,
        overscan: 5
    };
    
    // Initialize virtual scroll manager if not exists
    if (!virtualScrollManager) {
        virtualScrollManager = new VirtualScrollManager({
            container: tableBody.parentElement, // Use parent container for scrolling
            itemHeight: vsConfig.itemHeight,
            overscan: vsConfig.overscan,
            onRender: (range) => {
                console.log('[VirtualScroll] Render triggered for range:', range);
            }
        });
        virtualScrollManager.setTotalItems(filtered.length);
    } else {
        // Update total count
        virtualScrollManager.setTotalItems(filtered.length);
    }

    // Get visible range
    const { start, end } = virtualScrollManager.getVisibleRange();
    
    // Clear existing rows (keep up-row if exists)
    const upRow = tableBody.querySelector('.up-row');
    tableBody.innerHTML = '';
    if (upRow) {
        tableBody.appendChild(upRow);
    }

    // Create top spacer
    const topSpacer = createSpacer((start * vsConfig.itemHeight) + 'px');
    tableBody.appendChild(topSpacer);

    // Render visible items
    const fragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
        if (i >= filtered.length) break;
        const item = filtered[i];
        const row = renderItemRow(item, state, params);
        fragment.appendChild(row);
    }
    tableBody.appendChild(fragment);

    // Create bottom spacer
    const remainingItems = Math.max(0, filtered.length - end);
    const bottomSpacer = createSpacer((remainingItems * vsConfig.itemHeight) + 'px');
    tableBody.appendChild(bottomSpacer);

    // Track performance
    virtualScrollManager.trackRender(end - start);
}

/**
 * Render items normally (non-virtual)
 * @param {HTMLElement} tableBody - Table body element
 * @param {Array} filtered - Filtered items array
 * @param {Object} state - Application state
 * @param {Object} params - Rendering parameters
 */
function renderNormalItems(tableBody, filtered, state, params) {
    const fragment = document.createDocumentFragment();
    
    filtered.forEach((item) => {
        const row = renderItemRow(item, state, params);
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
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
    // Initialize pagination if not exists
    initPagination();
    
    state.items = items;
    state.itemMap = new Map(items.map((item) => [item.path, item]));
    state.selected = synchronizeSelection(items, state.selected);
    const query = state.filter.toLowerCase();
    const sortedItems = [...items].sort((a, b) => compareItems(a, b, state.sortKey, state.sortDirection));
    const filtered = query
        ? sortedItems.filter((item) => item.name.toLowerCase().includes(query))
        : sortedItems;
    state.visibleItems = filtered;
    
    // Update pagination info with total filtered items
    updatePaginationInfo(filtered.length);
    
    // Get paginated items for current page
    const paginatedItems = getPaginatedItems(filtered);

    const totalFolders = items.filter((item) => item.type === 'folder').length;
    const filteredFolders = filtered.filter((item) => item.type === 'folder').length;
    const meta = {
        totalFolders,
        totalFiles: items.length - totalFolders,
        filteredFolders,
        filteredFiles: filtered.length - filteredFolders,
    };

    tableBody.innerHTML = '';

    // Insert "Up (..)" row at the top when not at root
    if (state.parentPath !== null) {
        const upRow = document.createElement('tr');
        upRow.className = 'up-row';
        upRow.tabIndex = 0;

        // Empty selection cell (no checkbox)
        const upSel = document.createElement('td');
        upSel.className = 'selection-cell';
        upRow.appendChild(upSel);

        // Name cell with "↑ .." label (no icon)
        const upName = document.createElement('td');
        upName.className = 'item-name';
        const upLink = document.createElement('a');
        upLink.className = 'item-link';
        upLink.href = '#';
        upLink.textContent = '↑ ..';
        upLink.addEventListener('click', (event) => {
            event.preventDefault();
            navigateTo(state.parentPath || '');
        });
        upName.appendChild(upLink);
        upRow.appendChild(upName);

        // Modified column shows "-"
        const upModified = document.createElement('td');
        upModified.textContent = '-';
        upRow.appendChild(upModified);

        // Empty actions cell (no actions)
        const upActions = document.createElement('td');
        upActions.className = 'actions-cell';
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
            console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'onto up-row to move into parent', targetPath);

            // Perform the move operation to parent directory
            moveItem(
                state.drag.draggedItem.path,
                targetPath,
                state,
                (isLoading) => { console.log('[DEBUG] Loading:', isLoading); },
                (error) => { console.error('[DEBUG] Move error:', error); },
                () => fetchDirectory(state.currentPath, { silent: true }),
                (message) => { console.log('[DEBUG] Status:', message); },
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
    
    // Use pagination instead of virtual scrolling when items > 10
    // Virtual scrolling is disabled when pagination is active
    const usePagination = filtered.length > state.pagination.itemsPerPage;
    const useVirtual = !usePagination && shouldUseVirtualScroll(
        paginatedItems.length,
        vsConfig.threshold,
        vsConfig.enabled
    );

    if (useVirtual) {
        console.log(`[Virtual Scroll] Rendering ${paginatedItems.length} items with virtual scrolling`);
        renderVirtualItems(tableBody, paginatedItems, state, renderParams);
    } else {
        console.log(`[Normal Render] Rendering ${paginatedItems.length} items normally (page ${state.pagination.currentPage}/${state.pagination.totalPages})`);
        renderNormalItems(tableBody, paginatedItems, state, renderParams);
    }
    
    // Render pagination controls
    renderPaginationControls();

    const newMap = new Map();
    items.forEach((item) => {
        newMap.set(item.path, generatedAt);
    });
    state.knownItems = newMap;

    return { items, filtered, meta };
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
 * Mengupdate status informasi
 * @param {HTMLElement} statusInfo - Elemen status info
 * @param {HTMLElement} statusTime - Elemen status time
 * @param {HTMLElement} statusFilter - Elemen status filter
 * @param {number} totalCount - Total item
 * @param {number} filteredCount - Item yang difilter
 * @param {number} generatedAt - Timestamp pembuatan data
 * @param {Object} meta - Metadata tambahan
 * @param {string} filter - Filter yang diterapkan
 */
export function updateStatus(statusInfo, statusTime, statusFilter, totalCount, filteredCount, generatedAt, meta = {}, filter) {
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

    statusInfo.textContent = `${infoPrefix} • ${folderDisplay.toLocaleString('id-ID')} folder • ${fileDisplay.toLocaleString('id-ID')} file`;

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
    loaderOverlay.classList.toggle('visible', isLoading);
    btnRefresh.disabled = isLoading;
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
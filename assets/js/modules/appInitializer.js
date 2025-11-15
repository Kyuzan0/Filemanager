/**
 * App Initializer Module
 * Berisi fungsi-fungsi untuk menginisialisasi aplikasi
 * @version 1.2.0 - Added log modal integration
 */

import { state, updateState } from './state.js';
import { elements, config, previewableExtensions, mediaPreviewableExtensions } from './constants.js';
import { 
    setupRefreshHandler,
    setupUpHandler,
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
    setupSplitActionHandler
} from './eventHandlers.js';
import { setupMoveOverlayHandlers } from './moveOverlay.js';
import {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleDragLeave,
    setupFileCardDropZone
} from './dragDrop.js';
import { fetchDirectory, fetchLogData, cleanupLogs } from './apiService.js';
import { renderItems as renderItemsComplex, updateSortUI } from './uiRenderer.js';
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
    formatDate
} from './utils.js';
import {
    logInfo,
    logError,
    createLogger,
    formatLogEntry,
    renderLogTable,
    exportLogsToCSV,
    exportLogsToJSON,
    applyLogFilter,
    updateActiveFiltersDisplay,
    performLogCleanup,
    setupLogAutoRefresh,
    stopLogAutoRefresh,
    toggleLogAutoRefresh
} from './logManager.js';

const logger = createLogger('INITIALIZER');

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

// Wrapper for renderItems that calls the complex renderer from uiRenderer.js
function renderItems(items, lastUpdated, highlightNew) {
    console.log('[DEBUG] renderItems wrapper called');
    
    // Call the complex renderer with all required parameters
    renderItemsComplex(
        elements.tableBody,
        elements.emptyState,
        state,
        items,
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
    renderItems(state.items, state.lastUpdated, false);
    updateSortUI(elements.sortHeaders, elements.statusSort, state);
}

function navigateTo(path) {
    console.log('[DEBUG] navigateTo called with path:', path);
    console.log('[DEBUG] Current state path before navigation:', state.currentPath);
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
            
            // Update visibleItems based on filter
            const visibleItems = state.items.filter(item => {
                if (!state.filter) return true;
                return item.name.toLowerCase().includes(state.filter.toLowerCase());
            });
            updateState({ visibleItems });
            
            // Render the items
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


function savePreviewContent() {
    // Basic implementation - can be enhanced
    if (state.preview.isSaving) return;
    
    updateState({
        preview: {
            ...state.preview,
            isSaving: true
        }
    });
    
    // Implementation would call API to save content
    setTimeout(() => {
        updateState({
            preview: {
                ...state.preview,
                isSaving: false,
                dirty: false,
                originalContent: elements.previewEditor.value
            }
        });
        updatePreviewStatus();
    }, 1000);
}

function updateSelectionUI() {
    const { btnDeleteSelected, btnMoveSelected, selectAllCheckbox } = elements;
    const selectedCount = state.selected.size;
    
    if (btnDeleteSelected) {
        btnDeleteSelected.disabled = selectedCount === 0 || state.isLoading;
        btnDeleteSelected.textContent = selectedCount > 0
            ? `Hapus (${selectedCount})`
            : 'Hapus';
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
        // Fetch file content
        const response = await fetch(`api.php?action=preview&path=${encodeURIComponent(item.path)}`);
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
function closeLogModalWrapper() {
    logger.info('Closing log modal...');
    
    // Stop auto-refresh if active
    if (state.logs.refreshInterval) {
        stopLogAutoRefresh(state);
    }
    
    closeLogModal(
        state,
        elements.logOverlay
    );
}

/**
 * Wrapper function untuk fetch log data dengan filters
 */
async function fetchLogDataWrapper(filters = null, page = 1, limit = 50) {
    try {
        // Use active filters if no filters provided
        const activeFilters = filters || state.logs.activeFilters || {};
        
        // Set loading state
        setLogLoading(state, elements.logTableBody, true);
        
        // Fetch data from API
        const data = await fetchLogData(activeFilters, page, limit);
        
        if (data && data.success) {
            // Update state with fetched data
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
            renderLogTable(
                state.logs.data,
                elements.logTableBody,
                formatDate
            );
            
            // Update pagination UI
            updateLogPagination(
                state,
                elements.logPrevPage,
                elements.logNextPage,
                elements.logPageInfo
            );
        } else {
            throw new Error(data?.error || 'Failed to fetch log data');
        }
    } catch (error) {
        logger.error('Error fetching log data', error);
        setLogLoading(state, elements.logTableBody, false);
        
        // Show error in table
        elements.logTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                    Error: ${error.message}
                </td>
            </tr>
        `;
    }
}

/**
 * Wrapper function untuk apply log filter
 */
async function applyLogFilterWrapper() {
    // Apply filter using the logManager function
    // The applyLogFilter function will read filter values from DOM elements directly
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
    updateActiveFiltersDisplay({}, elements.logActiveFilters);
    
    // Fetch data without filters
    await fetchLogDataWrapper({}, 1, 50);
}

/**
 * Wrapper function untuk export logs to CSV
 */
function exportLogsToCSVWrapper() {
    try {
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
function exportLogsToJSONWrapper() {
    try {
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
function toggleLogAutoRefreshWrapper() {
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
    
    // Export buttons
    if (elements.logExportCSV) {
        elements.logExportCSV.addEventListener('click', exportLogsToCSVWrapper);
    }
    
    if (elements.logExportJSON) {
        elements.logExportJSON.addEventListener('click', exportLogsToJSONWrapper);
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
        
        // Set initial state
        updateState({
            currentPath: elements.currentPath,
            isLoading: true,
            items: [],
            itemMap: new Map(),
            selected: new Set(),
            sortKey: 'name',
            sortDirection: 'asc',
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
        
        // Setup move overlay handlers
        try {
            setupMoveOverlayHandlers();
        } catch (error) {
            logger.error('Failed to setup move overlay handlers', error);
            // Continue with initialization even if move overlay fails
        }
        
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
    
    // Setup refresh handler
    setupRefreshHandler(
        elements.btnRefresh,
        state,
        hasUnsavedChanges,
        confirmDiscardChanges,
        fetchDirectoryWrapper
    );
    
    // Setup up handler
    setupUpHandler(
        elements.btnUp,
        state,
        navigateTo
    );
    
    // Setup filter handler
    setupFilterHandler(
        elements.filterInput,
        elements.clearSearch,
        state,
        renderItems
    );
    
    // Setup sort handlers
    setupSortHandlers(
        elements.sortHeaders,
        state,
        changeSort
    );
    
    // Setup select all handler
    setupSelectAllHandler(
        elements.selectAllCheckbox,
        state,
        setSelectionForVisible
    );
    
    // Setup delete selected handler
    setupDeleteSelectedHandler(
        elements.btnDeleteSelected,
        state,
        hasUnsavedChanges,
        confirmDiscardChanges,
        openConfirmOverlayWrapper
    );
    
    // Setup upload handler
    setupUploadHandler(
        elements.btnUpload,
        elements.uploadInput,
        state,
        hasUnsavedChanges,
        confirmDiscardChanges,
        uploadFilesWrapper
    );
    
    // Setup preview editor handler
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
    
    // Setup preview overlay handler
    setupPreviewOverlayHandler(
        elements.previewOverlay,
        elements.previewClose,
        closePreviewOverlayWrapper
    );
    
    // Setup confirm overlay handler
    setupConfirmOverlayHandler(
        elements.confirmOverlay,
        elements.confirmCancel,
        elements.confirmConfirm,
        state,
        closeConfirmOverlayWrapper,
        deleteItemsWrapper
    );
    
    // Setup create overlay handler
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
    
    // Setup rename overlay handler
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
    
    // Setup unsaved overlay handler
    setupUnsavedOverlayHandler(
        elements.unsavedOverlay,
        elements.unsavedSave,
        elements.unsavedDiscard,
        elements.unsavedCancel,
        state,
        closeUnsavedOverlay
    );
    
    // Setup keyboard handler
    setupKeyboardHandler(
        state,
        closeUnsavedOverlay,
        closeConfirmOverlayWrapper,
        closeCreateOverlayWrapper,
        closeRenameOverlayWrapper,
        closePreviewOverlayWrapper,
        hasUnsavedChanges
    );
    
    // Setup visibility handler
    setupVisibilityHandler(
        state,
        fetchDirectoryWrapper,
        startPolling
    );
    
    // Setup context menu handler
    setupContextMenuHandler(
        elements.contextMenuItems,
        elements.contextMenu,
        state,
        handleContextMenuAction,
        closeContextMenu
    );
    
    // Setup split action handler
    setupSplitActionHandler(
        elements.splitAction,
        elements.splitToggle,
        elements.splitMenu,
        elements.splitOptions,
        elements.splitMain,
        openCreateOverlayWrapper
    );
    
    // Setup log modal handlers
    setupLogModalHandlers();
    
    logger.info('Event handlers setup completed');
}

/**
 * Memuat direktori awal
 */
async function loadInitialDirectory() {
    try {
        logger.info('Loading initial directory...');
        
        const path = elements.currentPath || '';
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
    errorDiv.className = 'error-notification';
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
        installButton.className = 'install-button';
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
    themeToggle.className = 'theme-toggle';
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
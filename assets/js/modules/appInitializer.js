/**
 * App Initializer Module
 * Berisi fungsi-fungsi untuk menginisialisasi aplikasi
 * @version 1.1.0 - Added media preview wrappers
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
import { setupDragAndDrop } from './dragDrop.js';
import { fetchDirectory } from './apiService.js';
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
    openMediaPreview as openMediaPreviewModal
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
import { logInfo, logError, createLogger } from './logManager.js';

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
        null, // handleDragStart
        null, // handleDragEnd
        null, // handleDragOver
        null, // handleDrop
        null, // handleDragLeave
        isWordDocument,
        buildFileUrl,
        hasUnsavedChanges,
        confirmDiscardChanges,
        previewableExtensions,
        mediaPreviewableExtensions
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
    // Basic implementation - can be enhanced
    const { previewEditor, previewLineNumbers } = elements;
    if (previewEditor && previewLineNumbers) {
        const lines = previewEditor.value.split('\n').length;
        const lineNumbersHtml = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
        previewLineNumbers.textContent = lineNumbersHtml;
    }
}

function ensureConsistentStyling() {
    // Basic implementation - can be enhanced
    const { previewEditor, previewLineNumbers } = elements;
    if (previewEditor && previewLineNumbers) {
        const editorStyles = getComputedStyle(previewEditor);
        previewLineNumbers.style.fontFamily = editorStyles.fontFamily;
        previewLineNumbers.style.fontSize = editorStyles.fontSize;
        previewLineNumbers.style.lineHeight = editorStyles.lineHeight;
    }
}

function syncLineNumbersScroll() {
    // Basic implementation - can be enhanced
    const { previewEditor, previewLineNumbers } = elements;
    if (previewEditor && previewLineNumbers) {
        previewLineNumbers.scrollTop = previewEditor.scrollTop;
    }
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
        
        // Setup drag and drop
        setupDragAndDrop();
        
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
        uploadFiles
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
        closePreviewOverlay
    );
    
    // Setup confirm overlay handler
    setupConfirmOverlayHandler(
        elements.confirmOverlay,
        elements.confirmCancel,
        elements.confirmConfirm,
        state,
        closeConfirmOverlayWrapper,
        deleteItems
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
        createItem
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
        renameItem
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
        closePreviewOverlay,
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
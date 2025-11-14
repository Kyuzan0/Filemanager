/**
 * App Initializer Module
 * Berisi fungsi-fungsi untuk menginisialisasi aplikasi
 */

import { state, updateState } from './state.js';
import { elements, config } from './constants.js';
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
import { renderItems, updateSortUI } from './uiRenderer.js';
import { 
    openPreviewOverlay, 
    closePreviewOverlay, 
    openConfirmOverlay, 
    closeConfirmOverlay,
    openCreateOverlay,
    closeCreateOverlay,
    openRenameOverlay,
    closeRenameOverlay,
    closeUnsavedOverlay
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
    confirmDiscardChanges, 
    setSelectionForVisible, 
    changeSort,
    navigateTo,
    startPolling,
    handleContextMenuAction,
    closeContextMenu,
    updatePreviewStatus,
    updateLineNumbers,
    ensureConsistentStyling,
    syncLineNumbersScroll,
    savePreviewContent
} from './utils.js';
import { logInfo, logError, createLogger } from './logManager.js';

const logger = createLogger('INITIALIZER');

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
            sortOrder: 'asc',
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
        setupMoveOverlayHandlers();
        
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
        fetchDirectory
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
        openConfirmOverlay
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
        closeConfirmOverlay,
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
        closeCreateOverlay,
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
        closeRenameOverlay,
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
        closeConfirmOverlay,
        closeCreateOverlay,
        closeRenameOverlay,
        closePreviewOverlay,
        hasUnsavedChanges
    );
    
    // Setup visibility handler
    setupVisibilityHandler(
        state,
        fetchDirectory,
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
        openCreateOverlay
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
        await fetchDirectory(path);
        
        // Update sort UI
        updateSortUI();
        
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
            openCreateOverlay('file');
        }
        
        // Ctrl/Cmd + Shift + N for new folder
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
            event.preventDefault();
            openCreateOverlay('folder');
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
    initializeApp,
    setupEventHandlers,
    loadInitialDirectory,
    initializeAdditionalFeatures
};
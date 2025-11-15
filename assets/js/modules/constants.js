/**
 * Constants and Configuration Module
 * Berisi konstanta, referensi DOM, dan konfigurasi aplikasi
 */

// DOM Element References
export const elements = {
    // Main elements
    tableBody: document.getElementById('file-table'),
    emptyState: document.getElementById('empty-state'),
    breadcrumbsEl: document.getElementById('breadcrumbs'),
    statusInfo: document.getElementById('status-info'),
    statusTime: document.getElementById('status-time'),
    statusSort: document.getElementById('status-sort'),
    statusFilter: document.getElementById('status-filter'),
    
    // Buttons
    btnUp: document.getElementById('btn-up'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnUpload: document.getElementById('btn-upload'),
    btnDeleteSelected: document.getElementById('btn-delete-selected'),
    btnMoveSelected: document.getElementById('btn-move-selected'),
    btnLogs: document.getElementById('btn-logs'),
    
    // Split action
    splitAction: document.querySelector('.split-action'),
    splitToggle: document.querySelector('.split-toggle'),
    splitMenu: document.querySelector('.split-menu'),
    splitOptions: document.querySelectorAll('.split-menu-option'),
    splitMain: document.querySelector('.split-main'),
    
    // Upload
    uploadInput: document.getElementById('upload-input'),
    
    // Filter
    filterInput: document.getElementById('filter-input'),
    clearSearch: document.getElementById('clear-search'),
    
    // Loading and error
    loaderOverlay: document.getElementById('loader-overlay'),
    errorBanner: document.getElementById('error-banner'),
    
    // Drag and drop
    fileCard: document.querySelector('.file-card'),
    
    // Sort headers
    sortHeaders: document.querySelectorAll('th[data-sort-key]'),
    
    // Selection
    selectAllCheckbox: document.getElementById('select-all'),
    
    // Preview elements
    previewOverlay: document.getElementById('preview-overlay'),
    previewTitle: document.getElementById('preview-title'),
    previewMeta: document.getElementById('preview-meta'),
    previewEditor: document.getElementById('preview-editor'),
    previewLineNumbers: document.getElementById('preview-line-numbers'),
    previewLineNumbersInner: document.getElementById('preview-line-numbers-inner'),
    previewStatus: document.getElementById('preview-status'),
    previewLoader: document.getElementById('preview-loader'),
    previewClose: document.getElementById('preview-close'),
    previewSave: document.getElementById('preview-save'),
    previewCopy: document.getElementById('preview-copy'),
    previewOpenRaw: document.getElementById('preview-open-raw'),
    previewEditorWrapper: document.querySelector('.preview-editor-wrapper'),
    previewBody: document.querySelector('.preview-body'),
    
    // Confirm dialog
    confirmOverlay: document.getElementById('confirm-overlay'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmDescription: document.getElementById('confirm-description'),
    confirmList: document.getElementById('confirm-list'),
    confirmCancel: document.getElementById('confirm-cancel'),
    confirmConfirm: document.getElementById('confirm-confirm'),
    
    // Create dialog
    createOverlay: document.getElementById('create-overlay'),
    createForm: document.getElementById('create-form'),
    createTitle: document.getElementById('create-title'),
    createSubtitle: document.getElementById('create-subtitle'),
    createLabel: document.getElementById('create-label'),
    createName: document.getElementById('create-name'),
    createHint: document.getElementById('create-hint'),
    createCancel: document.getElementById('create-cancel'),
    createSubmit: document.getElementById('create-submit'),
    
    // Rename dialog
    renameOverlay: document.getElementById('rename-overlay'),
    renameForm: document.getElementById('rename-form'),
    renameTitle: document.getElementById('rename-title'),
    renameSubtitle: document.getElementById('rename-subtitle'),
    renameLabel: document.getElementById('rename-label'),
    renameName: document.getElementById('rename-name'),
    renameHint: document.getElementById('rename-hint'),
    renameCancel: document.getElementById('rename-cancel'),
    renameSubmit: document.getElementById('rename-submit'),
    
    // Unsaved dialog
    unsavedOverlay: document.getElementById('unsaved-overlay'),
    unsavedTitle: document.getElementById('unsaved-title'),
    unsavedMessage: document.getElementById('unsaved-message'),
    unsavedSave: document.getElementById('unsaved-save'),
    unsavedDiscard: document.getElementById('unsaved-discard'),
    unsavedCancel: document.getElementById('unsaved-cancel'),
    
    // Context menu
    contextMenu: document.getElementById('context-menu'),
    contextMenuItems: document.querySelectorAll('.context-menu-item'),
    
    // Move overlay elements
    moveOverlay: document.getElementById('move-overlay'),
    moveForm: document.getElementById('move-form'),
    movePath: document.getElementById('move-path'),
    moveHint: document.getElementById('move-hint'),
    moveSubmit: document.getElementById('move-submit'),
    moveFolderList: document.getElementById('move-list'),
    moveBreadcrumbs: document.getElementById('move-breadcrumbs'),
    moveList: document.getElementById('move-list'),
    moveError: document.getElementById('move-error'),
    moveSelectHere: document.getElementById('move-select-here'),
    moveCancel: document.getElementById('move-cancel'),
    moveConfirm: document.getElementById('move-confirm'),
    moveRootShortcut: document.getElementById('move-root-shortcut'),
    moveCurrentShortcut: document.getElementById('move-current-shortcut'),
    moveSearchInput: document.getElementById('move-search'),
    moveRecents: document.getElementById('move-recents'),
    
    // Log modal elements
    logOverlay: document.getElementById('log-overlay'),
    logTitle: document.getElementById('log-title'),
    logSubtitle: document.getElementById('log-subtitle'),
    logClose: document.getElementById('log-close'),
    
    // Log table and pagination
    logTableBody: document.getElementById('log-table-body'),
    logPrevPage: document.getElementById('log-prev-page'),
    logNextPage: document.getElementById('log-next-page'),
    logPageInfo: document.getElementById('log-page-info'),
    
    // Log filters
    logFilterAction: document.getElementById('log-filter-action'),
    logFilterStartDate: document.getElementById('log-filter-start-date'),
    logFilterEndDate: document.getElementById('log-filter-end-date'),
    logFilterType: document.getElementById('log-filter-type'),
    logFilterPath: document.getElementById('log-filter-path'),
    logFilterSort: document.getElementById('log-filter-sort'),
    logApplyFilters: document.getElementById('log-apply-filters'),
    logClearFilters: document.getElementById('log-clear-filters'),
    logActiveFilters: document.getElementById('log-active-filters'),
    
    // Log actions
    logExportCSV: document.getElementById('log-export-csv'),
    logExportJSON: document.getElementById('log-export-json'),
    logCleanupBtn: document.getElementById('log-cleanup-btn'),
    logAutoRefreshToggle: document.getElementById('log-auto-refresh-toggle'),
    
    // Other log elements
    logError: document.getElementById('log-error'),
    logRefresh: document.getElementById('log-refresh'),
};

// Get current path from URL parameters
const getCurrentPath = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('path') || '';
};

// Add currentPath to elements object
elements.currentPath = getCurrentPath();

// File type configurations
export const previewableExtensions = new Set([
    'txt',
    'md',
    'markdown',
    'yml',
    'yaml',
    'json',
    'xml',
    'html',
    'htm',
    'css',
    'scss',
    'less',
    'js',
    'jsx',
    'ts',
    'tsx',
    'ini',
    'conf',
    'cfg',
    'env',
    'log',
    'php',
    'phtml',
    'sql',
    'csv',
]);

// Media previewable extensions (displayed via modal viewer, no download)
export const mediaPreviewableExtensions = new Set([
    'png','jpg','jpeg','gif','webp','svg','bmp','ico','tiff','tif','avif','pdf',
]);

// Action icons
export const actionIcons = {
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 4h4l2 2h5v2H3V6h5zm-5 4h18v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zm10 2v8h2v-8z"/></svg>',
    preview: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2 2l9.92-9.92 1.75 1.75L6.75 19.25H5v-1.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15 4.25l3.75 3.75 1.96-1.96z"/></svg>',
    view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/><path fill="currentColor" d="M5 5v14h14v-7h2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7v2H5z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H8V7h11v12z"/></svg>',
    delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 7h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3 2v9h2V9H9zm4 0v9h2V9h-2z"/><path fill="currentColor" d="M15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
};

// Application configuration
export const config = {
    // API base URL
    apiBaseUrl: 'api.php',
    
    // Polling interval in milliseconds
    pollingInterval: 5000,
    
    // Auto-refresh interval for logs in milliseconds
    logRefreshInterval: 30000,
    
    // Maximum number of recent destinations to store
    maxRecentDestinations: 10,
    
    // Debounce time for search input in milliseconds
    searchDebounceTime: 500,
    
    // Animation duration in milliseconds
    animationDuration: 200,
    
    // Maximum number of log entries per page
    logPageSize: 50,
    
    // Maximum number of items to show in confirm dialog
    maxConfirmItems: 5,
    
    // File size formatting
    fileSizeUnits: ['B', 'KB', 'MB', 'GB', 'TB'],
    
    // Date formatting options
    dateFormatOptions: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    },
    
    // Short date format for small screens
    shortDateFormatOptions: {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    },
    
    // Virtual scrolling configuration
    virtualScroll: {
        enabled: true,           // Enable/disable virtual scrolling globally
        itemHeight: 40,          // Height of each row in pixels (must match CSS)
        overscan: 5,             // Number of extra items to render above/below viewport
        threshold: 100,          // Minimum number of items to activate virtual scrolling
        bufferMultiplier: 1.5,   // Multiplier for buffer zone calculation
    },
};

// Error messages
export const errorMessages = {
    fetchFailed: 'Gagal mengambil data',
    deleteFailed: 'Gagal menghapus item',
    moveFailed: 'Gagal memindahkan item',
    renameFailed: 'Gagal mengubah nama item',
    createFailed: 'Gagal membuat item baru',
    uploadFailed: 'Gagal mengunggah file',
    saveFailed: 'Gagal menyimpan perubahan',
    copyFailed: 'Gagal menyalin path',
    logFetchFailed: 'Gagal mengambil data log',
    logCleanupFailed: 'Gagal membersihkan log',
};

// Success messages
export const successMessages = {
    itemDeleted: 'Item berhasil dihapus',
    itemMoved: 'Item berhasil dipindahkan',
    itemRenamed: 'Item berhasil diubah namanya',
    itemCreated: 'Item berhasil dibuat',
    fileUploaded: 'File diunggah',
    changesSaved: 'Perubahan tersimpan',
    pathCopied: 'Path tersalin ke clipboard',
    logCleaned: 'Log berhasil dibersihkan',
};

// Action labels for logs
export const actionLabels = {
    'create': 'Buat',
    'delete': 'Hapus',
    'move': 'Pindah',
    'rename': 'Ubah Nama',
    'upload': 'Unggah',
    'download': 'Unduh',
    'read': 'Baca',
    'copy': 'Salin',
    'unknown': 'Tidak Diketahui'
};

// Type labels for logs
export const typeLabels = {
    'file': 'File',
    'folder': 'Folder',
    'unknown': 'Tidak Diketahui'
};
<?php
/**
 * File Manager - Main View
 * 
 * This is the main entry point for the web interface.
 * @version 2.0.0
 */

// Load bootstrap (which loads autoload.php and initializes everything)
require_once dirname(__DIR__) . '/bootstrap.php';

// Auto-migrate on every request
\App\Core\Database::migrate();

// Require authentication — redirects to login.php if not logged in
\App\Core\Auth::requireAuth();

// Get current user for template use
$currentUser = \App\Core\Auth::getCurrentUser();
?>
<!DOCTYPE html>
<html lang="id">

<head>
    <!-- Anti-flash: Set theme before anything else -->
    <script nonce="<?= $_SERVER['csp_nonce'] ?? '' ?>">
        (function () {
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            if (theme === 'dark') {
                document.documentElement.style.backgroundColor = '#2d2b38';
                document.documentElement.style.colorScheme = 'dark';
            }
        })();
    </script>
    <style>
        /* Prevent flash of white background — uses hardcoded dark bg as fallback before variables.css loads */
        html[data-theme="dark"] {
            background-color: #2d2b38;
        }

        html[data-theme="dark"] body {
            background-color: #2d2b38;
        }

        /* Safe area insets for mobile devices with notch */
        @supports (padding: env(safe-area-inset-bottom)) {
            .main {
                padding-bottom: calc(env(safe-area-inset-bottom) + 16px) !important;
            }

            nav.pagination-footer {
                padding-bottom: calc(env(safe-area-inset-bottom) + 12px) !important;
            }
        }
    </style>
    <!-- Modular CSS - Main entry point -->
    <link rel="stylesheet" href="assets/css/main.css?v=<?= @md5_file(__DIR__ . '/assets/css/main.css') ?: time() ?>">
    <!-- RemixIcon CDN -->
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
    <!-- Component-specific styles -->
    <style>
        .header-actions {
            margin-bottom: 16px;
            padding: 6px;
            background: var(--card);
            border: 1px solid var(--card-border);
            border-radius: var(--radius-sm);
            box-shadow: var(--shadow-sm);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            position: sticky;
            top: 0;
            z-index: var(--z-sticky);
        }

        .search-bar {
            display: none;
            align-items: center;
            gap: 8px;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--card-border);
            background: var(--bg-secondary);
            flex-shrink: 0;
            margin-left: auto;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .search-bar:focus-within {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--focus-ring);
        }
        .search-bar input {
            transition: width 0.2s ease;
        }
        .search-bar input:focus {
            width: 300px !important;
        }
        @media (min-width: 768px) {
            .search-bar { display: flex; }
        }

        .btn-primary {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            min-height: 32px;
            background: var(--accent);
            color: var(--btn-primary-text);
            border-radius: 6px;
            transition: background-color var(--transition);
            box-shadow: var(--shadow-sm);
            border: none;
            cursor: pointer;
        }
        .btn-primary:hover {
            background: var(--accent-hover);
        }

        .btn-secondary {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            min-height: 32px;
            background: var(--card);
            color: var(--text-secondary);
            border: 1px solid var(--card-border);
            border-radius: 6px;
            transition: background-color var(--transition);
            cursor: pointer;
            position: relative;
        }
        .btn-secondary:hover {
            background: var(--bg-secondary);
        }

        .pagination-footer {
            margin-top: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            color: var(--text-secondary);
            gap: 12px;
            padding: 12px;
            background: var(--card);
            border: 1px solid var(--card-border);
            border-radius: var(--radius-sm);
        }
        @media (min-width: 640px) {
            .pagination-footer { flex-direction: row; }
        }

        .pagination-nav-btn:hover:not(:disabled) {
            background: var(--bg-secondary) !important;
        }
        .pagination-nav-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .loader-overlay {
            position: fixed;
            top: 0; right: 0; bottom: 0; left: 0;
            display: none;
            align-items: center;
            justify-content: center;
            background: var(--surface-overlay-light);
            z-index: var(--z-modal);
            padding: 16px;
        }

        .modal-overlay {
            position: fixed;
            top: 0; right: 0; bottom: 0; left: 0;
            background: var(--surface-overlay);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: var(--z-modal);
        }

        .context-dropdown {
            display: none;
            position: fixed;
            z-index: var(--z-popover);
            background: var(--card);
            border-radius: var(--radius-sm);
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--card-border);
            padding: 4px 0;
            min-width: 160px;
        }

        .upload-context-item:hover {
            background: var(--surface-hover);
        }

        #fileDropZone:hover {
            border-color: var(--border-focus) !important;
        }

        #deleteSel:hover {
            color: var(--danger) !important;
        }
        #deleteSel:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn.btn-icon:hover {
            background: var(--surface-hover);
        }

        #pageSize:focus {
            outline: none;
            border-color: var(--accent);
        }
    </style>
    <meta charset="UTF-8">
    <meta name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="shortcut icon" type="image/svg+xml" href="favicon.svg">
    <title>File Manager — SiyNLic Pro</title>
</head>

<body class="overflow-hidden">
    <!-- Skip Links for Accessibility -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <a href="#fileTable" class="skip-link">Skip to file list</a>

    <div class="app h-screen d-flex overflow-hidden" id="app" role="application" aria-label="File Manager Application">
        <?php $activePage = 'dashboard';
        include __DIR__ . '/partials/sidebar.php'; ?>

        <main class="main flex-1 h-full overflow-y-auto pos-relative" id="main-content" role="main"
            aria-label="File Manager Main Content">
            <!-- HEADER ACTIONS -->
            <section
                class="header-actions"
                role="toolbar" aria-label="File manager actions">
                <!-- Left Group: Navigation & Search -->
                <div class="d-flex items-center gap-2 flex-1 min-w-0">
                    <!-- Mobile Menu Toggle -->
                    <button
                        class="btn btn-icon md:d-none p-1 rounded flex-shrink-0"
                        id="mobile-menu-toggle" title="Menu" aria-label="Open navigation menu" aria-expanded="false"
                        aria-controls="sidebar">
                        <i class="ri-menu-line text-base text-muted" aria-hidden="true"></i>
                    </button>

                    <!-- Mobile Search Toggle -->
                    <button
                        class="btn btn-icon md:d-none p-1 rounded flex-shrink-0"
                        id="mobile-search-btn" title="Search" aria-label="Open search"
                        onclick="document.getElementById('search-modal').classList.remove('hidden'); document.getElementById('search-modal').setAttribute('aria-hidden','false'); setTimeout(function(){document.getElementById('search-modal-input').focus()},100);">
                        <i class="ri-search-line text-base text-muted" aria-hidden="true"></i>
                    </button>

                    <!-- Breadcrumbs - Hidden on mobile, visible on desktop -->
                    <nav class="breadcrumbs d-none md:d-flex text-sm text-muted min-w-0 flex-shrink-0"
                        id="breadcrumbs" aria-label="Breadcrumb navigation">Home</nav>

                    <!-- Search - Compact version for desktop -->
                    <div class="search-bar"
                        role="search">
                        <span class="text-sm" aria-hidden="true">🔎</span>
                        <input type="search" id="search" placeholder="Find files..."
                            class="border-0 outline-none bg-transparent text-sm"
                            style="width: 200px; color: var(--text-secondary);"
                            aria-label="Search files and folders (Ctrl+F)" />
                    </div>
                </div>

                <!-- Primary Actions (Left side of right group) -->
                <div class="d-flex items-center gap-2 flex-shrink-0" role="group" aria-label="Create actions">
                    <button
                        class="btn-primary"
                        id="newBtn" aria-label="Create new file or folder (Ctrl+N)">
                        <i class="ri-add-line text-lg" aria-hidden="true"></i>
                        <span class="text-sm font-medium d-none sm:d-inline">New</span>
                    </button>
                    <button
                        class="btn-secondary"
                        id="uploadBtn" aria-label="Upload files or folder" aria-haspopup="true" aria-expanded="false">
                        <i class="ri-upload-cloud-2-line text-lg" aria-hidden="true"></i>
                        <span class="text-sm font-medium d-none sm:d-inline">Upload</span>
                        <i class="ri-arrow-down-s-line text-sm" style="margin-left: 2px;" aria-hidden="true"></i>
                    </button>
                </div>

                <!-- Right Group: Utilities -->
                <div class="d-flex items-center gap-2 flex-shrink-0" role="group" aria-label="Utility actions">
                    <div class="items-center gap-2 px-2 py-1-5 rounded-md border d-none sm:d-flex"
                        style="background: var(--bg-secondary); border-color: var(--border-light);"
                        role="status" aria-live="polite">
                        <span class="text-xs font-medium text-muted" id="selectedCount"
                            aria-label="Selection count">0 selected</span>
                        <div class="h-4 w-px mx-1" style="background: var(--border);" aria-hidden="true"></div>
                        <button
                            class="transition-colors"
                            style="color: var(--text-secondary);"
                            id="deleteSel" title="Hapus" aria-label="Delete selected items (Delete key)">
                            <i class="ri-delete-bin-line text-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                    
                    <!-- View Toggle -->
                    <div class="view-toggle d-flex items-center gap-1 flex-shrink-0" role="group" aria-label="View mode">
                        <button class="view-toggle-btn active" id="listViewBtn" title="List View" aria-label="Switch to list view" aria-pressed="true">
                            <i class="ri-list-check text-base" aria-hidden="true"></i>
                        </button>
                        <button class="view-toggle-btn" id="gridViewBtn" title="Grid View" aria-label="Switch to grid view" aria-pressed="false">
                            <i class="ri-grid-fill text-base" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </section>

            <!-- TABLE CARD -->
            <div class="card" role="region" aria-label="File list container">
                <?php include __DIR__ . '/partials/table.php'; ?>
            </div>
            
            <!-- GRID VIEW -->
            <div class="grid-view-container" id="grid-view-container" role="grid" aria-label="File grid view"></div>

            <!-- PAGINATION FOOTER -->
            <nav class="pagination-footer"
                role="navigation" aria-label="Pagination">
                <div id="showing" class="text-center sm:text-left" role="status" aria-live="polite">Menampilkan 0 dari 0
                    item</div>
                <div class="d-flex flex-wrap items-center justify-center gap-2">
                    <div class="d-flex items-center gap-2">
                        <label for="pageSize" class="d-none sm:d-inline">Item per halaman:</label>
                        <select id="pageSize"
                            class="px-2 py-1-5 border rounded-md text-sm"
                            style="border-color: var(--card-border); background: var(--card); color: var(--text);"
                            aria-label="Items per page">
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                    <div class="d-flex items-center gap-1" id="pagination-buttons" role="group"
                        aria-label="Page navigation">
                        <button id="prevPage"
                            class="pagination-nav-btn px-2 py-1-5 rounded-md text-sm border transition-colors"
                            style="border-color: var(--card-border); background: var(--card); color: var(--text);"
                            aria-label="Go to previous page">‹ Prev</button>
                        <div id="page-numbers" class="d-flex items-center gap-1" role="list" aria-label="Page numbers">
                            <!-- Page numbers will be rendered by JavaScript -->
                        </div>
                        <button id="nextPage"
                            class="pagination-nav-btn px-2 py-1-5 rounded-md text-sm border transition-colors"
                            style="border-color: var(--card-border); background: var(--card); color: var(--text);"
                            aria-label="Go to next page">Next ›</button>
                    </div>
                </div>
            </nav>

            <!-- LOADER -->
            <div class="loader-overlay"
                id="loader-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Loading">
                <div class="loader-inner px-4 py-3 rounded-md shadow d-flex items-center gap-3 max-w-xs w-full"
                    role="status" aria-live="polite">
                    <svg class="w-5 h-5 animate-spin flex-shrink-0" style="color: var(--accent)" viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path
                            d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            fill="none" />
                    </svg>
                    <span class="text-sm">Memuat data...</span>
                </div>
            </div>
        </main>
    </div>

    <!-- MODAL UPLOAD -->
    <div class="modal-backdrop" id="modalBackdrop"
        role="dialog" aria-modal="true" aria-labelledby="uploadModalTitle" aria-describedby="uploadModalDesc">
        <div class="modal" id="uploadModal">
            <h3 class="text-lg font-semibold mb-2" id="uploadModalTitle">Upload File</h3>
            <p class="text-sm mb-4" id="uploadModalDesc">Pilih satu atau beberapa file untuk diunggah ke direktori saat
                ini.</p>
            <div class="mb-4 d-flex items-center justify-center border rounded-lg p-6 cursor-pointer transition-colors"
                style="border: 2px dashed var(--border); border-radius: var(--radius-sm);"
                id="fileDropZone" role="button" tabindex="0"
                aria-label="Click to select files or drag and drop files here">
                <div class="text-center">
                    <i class="ri-upload-cloud-line text-3xl text-muted mb-2 d-block"
                        id="uploadIcon" aria-hidden="true"></i>
                    <p class="text-sm text-muted" id="uploadDropText">Klik untuk memilih file
                        atau drag & drop di sini</p>
                </div>
            </div>
            <input type="file" id="fileInput" multiple class="d-none" aria-label="Select files to upload">
            <input type="file" id="folderInput" webkitdirectory directory multiple class="d-none"
                aria-label="Select folder to upload">
            <div class="mb-4 text-sm max-h-48 overflow-y-auto" style="color: var(--text-secondary);" id="fileList" role="list"
                aria-label="Selected files"></div>
            <div class="d-flex gap-2 justify-end" role="group" aria-label="Upload actions">
                <button class="btn px-4 py-2 rounded-lg" id="cancelUpload" aria-label="Cancel upload">Batal</button>
                <button class="btn btn-primary px-4 py-2 rounded-lg" id="doUpload"
                    aria-label="Start upload">Unggah</button>
            </div>
        </div>
    </div>

    <!-- CONTEXT MENU -->
    <div class="context-menu hidden" id="contextMenu" role="menu" aria-hidden="true" aria-label="File actions">
        <button data-action="open" class="context-menu-item" role="menuitem" aria-label="Open file or folder">
            <i class="ri-folder-open-line context-menu-icon" aria-hidden="true"></i>
            <span>Buka</span>
        </button>
        <button data-action="download" class="context-menu-item" role="menuitem" aria-label="Download file">
            <i class="ri-download-2-line context-menu-icon" aria-hidden="true"></i>
            <span>Unduh</span>
        </button>
        <div class="context-menu-divider" role="separator" aria-hidden="true"></div>
        <button data-action="rename" class="context-menu-item" role="menuitem" aria-label="Rename file or folder (F2)">
            <i class="ri-edit-line context-menu-icon" aria-hidden="true"></i>
            <span>Ganti Nama</span>
        </button>
        <button data-action="move" class="context-menu-item" role="menuitem" aria-label="Move file or folder">
            <i class="ri-folder-transfer-line context-menu-icon" aria-hidden="true"></i>
            <span>Pindahkan</span>
        </button>
        <div class="context-menu-divider" role="separator" aria-hidden="true"></div>
        <button data-action="details" class="context-menu-item" role="menuitem" aria-label="View file details">
            <i class="ri-information-line context-menu-icon" aria-hidden="true"></i>
            <span>Detail</span>
        </button>
        <div class="context-menu-divider" role="separator" aria-hidden="true"></div>
        <button data-action="delete" class="context-menu-item context-menu-item-danger" role="menuitem"
            aria-label="Delete file or folder (Delete key)">
            <i class="ri-delete-bin-line context-menu-icon" aria-hidden="true"></i>
            <span>Hapus</span>
        </button>
    </div>

    <!-- UPLOAD CONTEXT MENU -->
    <div class="context-dropdown"
        id="uploadContextMenu" role="menu" aria-hidden="true" aria-label="Upload options">
        <button
            class="upload-context-item w-full d-flex items-center gap-3 px-4 py-2-5 text-left transition-colors"
            id="uploadFilesOption" role="menuitem" aria-label="Upload files">
            <i class="ri-upload-cloud-2-line text-lg" style="color: var(--accent);"></i>
            <span class="text-sm" style="color: var(--text);">Upload Files</span>
        </button>
        <button
            class="upload-context-item w-full d-flex items-center gap-3 px-4 py-2-5 text-left transition-colors"
            id="uploadFolderOption" role="menuitem" aria-label="Upload folder">
            <i class="ri-folder-upload-line text-lg" style="color: var(--warning);"></i>
            <span class="text-sm" style="color: var(--text);">Upload Folder</span>
        </button>
    </div>

    <?php include __DIR__ . '/partials/overlays.php'; ?>
    <?php include __DIR__ . '/partials/trash-overlay.php'; ?>

    <!-- Auth: pass current user data to JS -->
    <script nonce="<?= $_SERVER['csp_nonce'] ?? '' ?>">
        window.__currentUser = <?php echo json_encode([
            'id' => $currentUser['id'],
            'username' => $currentUser['username'],
            'email' => $currentUser['email'] ?? '',
            'display_name' => $currentUser['display_name'] ?? $currentUser['username'],
            'role' => $currentUser['role'],
        ], JSON_UNESCAPED_UNICODE); ?>;
    </script>

    <script src="assets/js/modules/toast.js"></script>
    <!-- CodeMirror 6 Local Bundle (pre-built for instant loading) -->
    <script src="assets/js/vendor/codemirror.min.js"></script>
    <!-- CodeMirror Editor Integration -->
    <script src="assets/js/modules/codemirror-editor.js"></script>
    <script src="assets/js/enhanced-ui.js?v=<?= @md5_file(__DIR__ . '/assets/js/enhanced-ui.js') ?: time() ?>"></script>
    <script src="assets/js/modals-handler.js?v=<?= @md5_file(__DIR__ . '/assets/js/modals-handler.js') ?: time() ?>"></script>
    <script src="assets/js/log-handler.js?v=<?= @md5_file(__DIR__ . '/assets/js/log-handler.js') ?: time() ?>"></script>
    <!-- Word Wrap Toggle Module -->
    <script type="module" src="assets/js/modules/wordWrapToggle.js"></script>
    <!-- SPA Router -->
    <script src="assets/js/modules/router.js?v=<?= @md5_file(__DIR__ . '/assets/js/modules/router.js') ?: time() ?>"></script>
    <!-- Favorites & Recent Files Manager -->
    <script src="assets/js/modules/favorites-manager.js"></script>
    <!-- System Requirements Handler -->
    <script src="assets/js/modules/systemRequirements.js"></script>
    <!-- Bootstrap upload config from server -->
    <script>
    (function() {
        fetch('api.php?action=settings').then(r => r.json()).then(d => {
            if (d.success && d.settings && d.settings.upload) {
                var u = d.settings.upload;
                window.uploadConfig = {
                    maxSizeMB: u.maxSizeMB || 100,
                    imageMaxMB: u.imageMaxMB || 100,
                    videoMaxMB: u.videoMaxMB || 2048,
                    audioMaxMB: u.audioMaxMB || 100,
                    documentMaxMB: u.documentMaxMB || 100,
                    archiveMaxMB: u.archiveMaxMB || 100,
                    codeMaxMB: u.codeMaxMB || 100
                };
            }
        }).catch(function(){});
    })();
    </script>
</body>

</html>
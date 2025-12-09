<!DOCTYPE html>
<html lang="id">

<head>
    <!-- Anti-flash: Set theme before anything else -->
    <script>
        (function () {
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            if (theme === 'dark') {
                document.documentElement.style.backgroundColor = '#0f1419';
                document.documentElement.style.colorScheme = 'dark';
            }
        })();
    </script>
    <style>
        /* Prevent flash of white background */
        html[data-theme="dark"] {
            background-color: #0f1419;
        }

        html[data-theme="dark"] body {
            background-color: #0f1419;
        }

        /* Safe area insets for mobile devices with notch */
        @supports (padding: env(safe-area-inset-bottom)) {
            .main {
                padding-bottom: calc(env(safe-area-inset-bottom) + 16px) !important;
            }

            nav.footer {
                padding-bottom: calc(env(safe-area-inset-bottom) + 12px) !important;
            }
        }
    </style>
    <!-- Using Tailwind CDN (reverted to CDN-based workflow) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        // Configure Tailwind to use data-theme attribute for dark mode
        tailwind.config = {
            darkMode: ['class', '[data-theme="dark"]'],
        }
    </script>
    <!-- Modular CSS - Main entry point (Phase 8 complete) -->
    <link rel="stylesheet" href="assets/css/main.css">
    <!-- RemixIcon CDN -->
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
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

<body class="bg-slate-50 text-slate-900 dark:bg-[#0f1419] dark:text-slate-300 overflow-hidden">
    <!-- Skip Links for Accessibility -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <a href="#fileTable" class="skip-link">Skip to file list</a>

    <div class="app h-screen flex overflow-hidden" id="app" role="application" aria-label="File Manager Application">
        <?php $activePage = 'dashboard';
        include 'partials/sidebar.php'; ?>

        <main class="main flex-1 h-full overflow-y-auto relative" id="main-content" role="main"
            aria-label="File Manager Main Content">
            <!-- HEADER ACTIONS -->
            <section
                class="header-actions mb-4 p-1.5 bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-white/10 rounded-lg shadow-sm flex items-center justify-between gap-2 sticky top-0 z-20"
                role="toolbar" aria-label="File manager actions">
                <!-- Left Group: Navigation & Search -->
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <!-- Mobile Menu Toggle -->
                    <button
                        class="btn btn-icon md:hidden p-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex-shrink-0"
                        id="mobile-menu-toggle" title="Menu" aria-label="Open navigation menu" aria-expanded="false"
                        aria-controls="sidebar">
                        <i class="ri-menu-line text-base text-slate-600 dark:text-gray-400" aria-hidden="true"></i>
                    </button>

                    <!-- Breadcrumbs - Hidden on mobile, visible on desktop -->
                    <nav class="breadcrumbs hidden md:flex text-sm text-slate-600 dark:text-gray-400 min-w-0 flex-shrink"
                        id="breadcrumbs" aria-label="Breadcrumb navigation">Home</nav>

                    <!-- Search - Compact version for desktop -->
                    <div class="search hidden md:flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex-shrink-0 ml-auto"
                        role="search">
                        <span class="text-sm" aria-hidden="true">🔎</span>
                        <input type="search" id="search" placeholder="Find files..."
                            class="border-0 outline-none bg-transparent text-sm w-32 placeholder-gray-400 dark:placeholder-gray-500"
                            aria-label="Search files and folders (Ctrl+F)" />
                    </div>
                </div>

                <!-- Primary Actions (Left side of right group) -->
                <div class="flex items-center gap-2 flex-shrink-0" role="group" aria-label="Create actions">
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm"
                        id="newBtn" aria-label="Create new file or folder (Ctrl+N)">
                        <i class="ri-add-line text-lg" aria-hidden="true"></i>
                        <span class="text-sm font-medium hidden sm:inline">New</span>
                    </button>
                    <button
                        class="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-md transition-colors relative"
                        id="uploadBtn" aria-label="Upload files or folder" aria-haspopup="true" aria-expanded="false">
                        <i class="ri-upload-cloud-2-line text-lg" aria-hidden="true"></i>
                        <span class="text-sm font-medium hidden sm:inline">Upload</span>
                        <i class="ri-arrow-down-s-line text-sm ml-0.5" aria-hidden="true"></i>
                    </button>
                </div>

                <!-- Word Wrap Toggle (Mobile Only) -->
                <div class="flex items-center gap-2 flex-shrink-0 md:hidden">
                    <button class="btn-word-wrap" id="wordWrapToggle" title="Toggle Word Wrap"
                        aria-label="Toggle word wrap" aria-pressed="false">
                        <i class="ri-text-wrap" aria-hidden="true"></i>
                        <span class="hidden sm:inline text-xs">Wrap</span>
                    </button>
                </div>

                <!-- Right Group: Utilities -->
                <div class="flex items-center gap-2 flex-shrink-0" role="group" aria-label="Utility actions">
                    <!-- Selection Info & Actions -->
                    <div class="items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-white/5 rounded-md border border-gray-100 dark:border-white/5 hidden sm:flex"
                        role="status" aria-live="polite">
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400" id="selectedCount"
                            aria-label="Selection count">0 selected</span>
                        <div class="h-4 w-px bg-gray-300 dark:bg-white/10 mx-1" aria-hidden="true"></div>
                        <button
                            class="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            id="deleteSel" title="Hapus" aria-label="Delete selected items (Delete key)">
                            <i class="ri-delete-bin-line text-lg" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </section>

            <!-- TABLE CARD -->
            <div class="card" role="region" aria-label="File list container">
                <?php include 'partials/table.php'; ?>
            </div>

            <!-- PAGINATION FOOTER -->
            <nav class="footer mt-3 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-600 dark:text-slate-400 gap-3 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-lg"
                role="navigation" aria-label="Pagination">
                <div id="showing" class="text-center sm:text-left" role="status" aria-live="polite">Menampilkan 0 dari 0
                    item</div>
                <div class="flex flex-wrap items-center justify-center gap-2">
                    <div class="flex items-center gap-2">
                        <label for="pageSize" class="hidden sm:inline">Item per halaman:</label>
                        <select id="pageSize"
                            class="px-2 py-1.5 border border-slate-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                            aria-label="Items per page">
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-1" id="pagination-buttons" role="group"
                        aria-label="Page navigation">
                        <button id="prevPage"
                            class="pagination-nav-btn px-2 py-1.5 rounded-md text-sm border border-slate-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Go to previous page">‹ Prev</button>
                        <div id="page-numbers" class="flex items-center gap-1" role="list" aria-label="Page numbers">
                            <!-- Page numbers will be rendered by JavaScript -->
                        </div>
                        <button id="nextPage"
                            class="pagination-nav-btn px-2 py-1.5 rounded-md text-sm border border-slate-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Go to next page">Next ›</button>
                    </div>
                </div>
            </nav>

            <!-- LOADER -->
            <div class="loader-overlay fixed inset-0 hidden items-center justify-center bg-black/30 z-50 p-4"
                id="loader-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Loading">
                <div class="loader-inner px-4 py-3 rounded-md shadow flex items-center gap-3 max-w-xs w-full"
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
    <div class="modal-backdrop fixed inset-0 bg-black/45 hidden items-center justify-center z-50" id="modalBackdrop"
        role="dialog" aria-modal="true" aria-labelledby="uploadModalTitle" aria-describedby="uploadModalDesc">
        <div class="modal" id="uploadModal">
            <h3 class="text-lg font-semibold mb-2" id="uploadModalTitle">Upload File</h3>
            <p class="text-sm mb-4" id="uploadModalDesc">Pilih satu atau beberapa file untuk diunggah ke direktori saat
                ini.</p>
            <div class="mb-4 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                id="fileDropZone" role="button" tabindex="0"
                aria-label="Click to select files or drag and drop files here">
                <div class="text-center">
                    <i class="ri-upload-cloud-line text-3xl text-slate-400 dark:text-slate-500 mb-2 block"
                        id="uploadIcon" aria-hidden="true"></i>
                    <p class="text-sm text-slate-600 dark:text-slate-400" id="uploadDropText">Klik untuk memilih file
                        atau drag & drop di sini</p>
                </div>
            </div>
            <input type="file" id="fileInput" multiple class="hidden" aria-label="Select files to upload">
            <input type="file" id="folderInput" webkitdirectory directory multiple class="hidden"
                aria-label="Select folder to upload">
            <div class="mb-4 text-sm text-slate-600 max-h-48 overflow-y-auto" id="fileList" role="list"
                aria-label="Selected files"></div>
            <div class="flex gap-2 justify-end" role="group" aria-label="Upload actions">
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
    <div class="upload-context-menu hidden fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
        id="uploadContextMenu" role="menu" aria-hidden="true" aria-label="Upload options">
        <button
            class="upload-context-item w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            id="uploadFilesOption" role="menuitem" aria-label="Upload files">
            <i class="ri-upload-cloud-2-line text-blue-600 dark:text-blue-400 text-lg"></i>
            <span class="text-sm text-gray-700 dark:text-gray-200">Upload Files</span>
        </button>
        <button
            class="upload-context-item w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            id="uploadFolderOption" role="menuitem" aria-label="Upload folder">
            <i class="ri-folder-upload-line text-amber-600 dark:text-amber-400 text-lg"></i>
            <span class="text-sm text-gray-700 dark:text-gray-200">Upload Folder</span>
        </button>
    </div>

    <?php include 'partials/overlays.php'; ?>

    <script src="assets/js/modules/toast.js"></script>
    <!-- CodeMirror 6 Local Bundle (pre-built for instant loading) -->
    <script src="assets/js/vendor/codemirror.min.js"></script>
    <!-- CodeMirror Editor Integration -->
    <script src="assets/js/modules/codemirror-editor.js"></script>
    <script src="assets/js/enhanced-ui.js"></script>
    <script src="assets/js/modals-handler.js"></script>
    <script src="assets/js/log-handler.js"></script>
    <!-- Word Wrap Toggle Module -->
    <script type="module" src="assets/js/modules/wordWrapToggle.js"></script>
    <!-- SPA Router -->
    <script src="assets/js/modules/router.js"></script>
    <!-- Favorites & Recent Files Manager -->
    <script src="assets/js/modules/favorites-manager.js"></script>
    <!-- System Requirements Handler -->
    <script src="assets/js/modules/systemRequirements.js"></script>
</body>

</html>
<!DOCTYPE html>
<html lang="id">
<head>
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="shortcut icon" type="image/svg+xml" href="favicon.svg">
    <title>File Manager — SiyNLic Pro</title>
</head>
<body class="bg-slate-50 text-slate-900 dark:bg-[#0f1419] dark:text-slate-300 overflow-hidden">
    <!-- Sidebar Overlay for Mobile -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    
    <div class="app h-screen flex overflow-hidden" id="app">
        <!-- SIDEBAR -->
        <aside class="sidebar w-56 px-5 py-5 bg-white border-r border-slate-200 hidden md:block h-full overflow-y-auto" id="sidebar">
            <div class="sidebar-header flex items-center justify-between mb-4">
                <div class="logo text-lg font-bold text-blue-600">Filemanager</div>
                <button class="sidebar-close md:hidden p-2 hover:bg-slate-100 rounded-lg" id="sidebar-close">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>
            <ul class="side-list space-y-2">
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2">
                    <i class="ri-folder-line"></i> My Files
                </li>
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2">
                    <i class="ri-upload-cloud-line"></i> Uploads
                </li>
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2" id="sidebar-log-activity">
                    <i class="ri-file-list-3-line"></i> Log Activity
                </li>
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2">
                    <i class="ri-delete-bin-line"></i> Trash
                </li>
            </ul>
        </aside>

        <main class="main flex-1 h-full overflow-y-auto relative">
            <!-- TOPBAR -->
            <section class="topbar">
                <div class="topbar-left">
                    <!-- Mobile Menu Toggle -->
                    <button class="mobile-menu-toggle md:hidden p-2 hover:bg-slate-100 rounded-lg" id="mobile-menu-toggle" title="Menu">
                        <i class="ri-menu-line text-xl text-slate-600"></i>
                    </button>
                    <div class="breadcrumbs text-sm text-slate-600" id="breadcrumbs">Home</div>
                </div>
                <div class="controls flex items-center gap-2">
                    <div class="search hidden md:flex items-center gap-2 px-2 py-1.5 rounded-2xl border">
                        <span>🔎</span>
                        <input type="search" id="search" placeholder="Find files..." class="border-0 outline-none bg-transparent text-sm" />
                    </div>
                </div>
            </section>

            <!-- HEADER ACTIONS -->
            <section class="header-actions mb-3 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <button class="btn btn-primary px-3 py-2 rounded-xl font-medium text-sm flex items-center gap-2" id="newBtn">
                        <i class="ri-add-line text-lg"></i>
                        <span class="hidden sm:inline">New</span>
                    </button>
                    <button class="btn px-3 py-2 rounded-xl text-sm flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" id="uploadBtn">
                        <i class="ri-upload-cloud-2-line text-lg"></i>
                        <span class="hidden sm:inline">Upload</span>
                    </button>
                </div>

                <button class="btn px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" id="toggleTheme">
                    <i class="ri-moon-line text-xl"></i>
                </button>

                <div class="flex items-center gap-2">
                    <div class="badge px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" id="selectedCount">0 selected</div>
                    <button class="btn px-3 py-2 rounded-xl text-sm flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" id="deleteSel">
                        <i class="ri-delete-bin-line text-lg"></i>
                        <span class="hidden sm:inline">Hapus</span>
                    </button>
                </div>
            </section>

            <!-- TABLE CARD -->
            <div class="card">
                <?php include 'partials/table.php'; ?>
            </div>

            <!-- PAGINATION FOOTER -->
            <div class="footer mt-3 flex items-center justify-between text-sm text-slate-600 flex-wrap gap-2">
                <div id="showing">Menampilkan 0 dari 0 item</div>
                <div class="flex items-center gap-2">
                    <span>Item per halaman:</span>
                    <select id="pageSize" class="px-2 py-1 border border-slate-200 rounded-md text-sm">
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <button class="btn px-2 py-1 rounded-md text-sm">‹ Prev</button>
                    <button class="btn px-2 py-1 rounded-md text-sm">Next ›</button>
                </div>
            </div>

            <!-- LOADER -->
            <div class="loader-overlay fixed inset-0 hidden items-center justify-center bg-black/30 z-50 p-4" id="loader-overlay" aria-hidden="true">
                <div class="loader-inner px-4 py-3 rounded-md shadow flex items-center gap-3 max-w-xs w-full">
                    <svg class="w-5 h-5 animate-spin flex-shrink-0" style="color: var(--accent)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                    <span class="text-sm">Memuat data...</span>
                </div>
            </div>
        </main>
    </div>

    <!-- MODAL UPLOAD -->
    <div class="modal-backdrop fixed inset-0 bg-black/45 hidden items-center justify-center z-50" id="modalBackdrop" role="dialog" aria-modal="true">
        <div class="modal" id="uploadModal" role="dialog" aria-modal="true">
            <h3 class="text-lg font-semibold mb-2">Upload File</h3>
            <p class="text-sm mb-4">Pilih satu atau beberapa file untuk diunggah ke direktori saat ini.</p>
            <div class="mb-4 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-slate-400 transition-colors" id="fileDropZone">
                <div class="text-center">
                    <i class="ri-upload-cloud-line text-3xl text-slate-400 mb-2 block"></i>
                    <p class="text-sm text-slate-600">Klik untuk memilih file atau drag & drop di sini</p>
                </div>
            </div>
            <input type="file" id="fileInput" multiple class="hidden">
            <div class="mb-4 text-sm text-slate-600" id="fileList"></div>
            <div class="flex gap-2 justify-end">
                <button class="btn px-4 py-2 rounded-lg" id="cancelUpload">Batal</button>
                <button class="btn btn-primary px-4 py-2 rounded-lg" id="doUpload">Unggah</button>
            </div>
        </div>
    </div>

    <!-- CONTEXT MENU -->
    <div class="context-menu hidden" id="contextMenu" role="menu" aria-hidden="true">
        <button data-action="open" class="context-menu-item" role="menuitem">
            <i class="ri-folder-open-line context-menu-icon"></i>
            <span>Buka</span>
        </button>
        <button data-action="download" class="context-menu-item" role="menuitem">
            <i class="ri-download-2-line context-menu-icon"></i>
            <span>Unduh</span>
        </button>
        <div class="context-menu-divider"></div>
        <button data-action="rename" class="context-menu-item" role="menuitem">
            <i class="ri-edit-line context-menu-icon"></i>
            <span>Ganti Nama</span>
        </button>
        <button data-action="move" class="context-menu-item" role="menuitem">
            <i class="ri-folder-transfer-line context-menu-icon"></i>
            <span>Pindahkan</span>
        </button>
        <div class="context-menu-divider"></div>
        <button data-action="delete" class="context-menu-item context-menu-item-danger" role="menuitem">
            <i class="ri-delete-bin-line context-menu-icon"></i>
            <span>Hapus</span>
        </button>
    </div>

    <?php include 'partials/overlays.php'; ?>

    <script src="assets/js/modules/toast.js"></script>
    <script src="assets/js/enhanced-ui.js"></script>
    <script src="assets/js/modals-handler.js"></script>
    <script src="assets/js/log-handler.js"></script>
    
    <!-- Mobile Sidebar Toggle Script -->
    <script>
    (function() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        function openSidebar() {
            if (sidebar) {
                sidebar.classList.add('active');
                sidebar.style.display = 'block';
            }
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('active');
            }
            document.body.style.overflow = 'hidden';
        }
        
        function closeSidebar() {
            if (sidebar) {
                sidebar.classList.remove('active');
                // Only hide on mobile
                if (window.innerWidth < 768) {
                    setTimeout(() => {
                        if (!sidebar.classList.contains('active')) {
                            sidebar.style.display = '';
                        }
                    }, 300);
                }
            }
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('active');
            }
            document.body.style.overflow = '';
        }
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', openSidebar);
        }
        
        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }
        
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }
        
        // Close sidebar on window resize to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 768) {
                closeSidebar();
                if (sidebar) {
                    sidebar.style.display = '';
                }
            }
        });
        
        // Close sidebar on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
                closeSidebar();
            }
        });

        // Log Activity button handler
        const logActivityBtn = document.getElementById('sidebar-log-activity');
        if (logActivityBtn) {
            logActivityBtn.addEventListener('click', function() {
                // Close sidebar on mobile
                if (window.innerWidth < 768) {
                    closeSidebar();
                }
                // Open log modal
                if (typeof openLogModal === 'function') {
                    openLogModal();
                }
            });
        }
    })();
    </script>
</body>
</html>


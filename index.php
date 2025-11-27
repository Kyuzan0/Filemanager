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
<body class="bg-slate-50 text-slate-900">
    <!-- Sidebar Overlay for Mobile -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    
    <div class="app min-h-screen flex" id="app" data-theme="light">
        <!-- SIDEBAR -->
        <aside class="sidebar w-56 px-5 py-5 bg-white border-r border-slate-200 hidden md:block sticky top-0 h-screen overflow-y-auto" id="sidebar">
            <div class="sidebar-header flex items-center justify-between mb-4">
                <div class="logo text-lg font-bold text-blue-600">SiyNLic Pro</div>
                <button class="sidebar-close md:hidden p-2 hover:bg-slate-100 rounded-lg" id="sidebar-close">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>
            <ul class="side-list space-y-2">
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">My Files</li>
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">Uploads</li>
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">Shared</li>
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">Favorites</li>
                <li class="px-2 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">Trash</li>
            </ul>
        </aside>

        <main class="main flex-1">
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
                    <button class="btn px-3 py-2 rounded-2xl" id="toggleTheme">🌙</button>
                </div>
            </section>

            <!-- HEADER ACTIONS -->
            <section class="header-actions mb-3 flex items-center gap-2.5 flex-wrap">
                <button class="btn btn-primary px-4 py-2 rounded-2xl font-medium text-sm" id="newBtn">+ New</button>
                <button class="btn px-3 py-2 rounded-2xl text-sm" id="uploadBtn">Upload File</button>
                <div class="ml-auto flex items-center gap-2">
                    <div class="badge px-2 py-1 rounded-full text-xs" id="selectedCount">0 selected</div>
                    <button class="btn px-3 py-2 rounded-2xl text-sm" id="deleteSel">Hapus Terpilih</button>
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
                        <option>5</option>
                        <option>10</option>
                        <option>20</option>
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
    <div class="context fixed border rounded-lg shadow-lg p-1.5 hidden z-50" id="contextMenu">
        <button data-action="open" class="block w-full text-left px-3 py-2 text-sm hover:rounded">Open</button>
        <button data-action="download" class="block w-full text-left px-3 py-2 text-sm hover:rounded">Download</button>
        <button data-action="rename" class="block w-full text-left px-3 py-2 text-sm hover:rounded">Rename</button>
        <button data-action="delete" class="block w-full text-left px-3 py-2 text-sm hover:rounded">Delete</button>
    </div>

    <?php include 'partials/overlays.php'; ?>

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
    })();
    </script>
</body>
</html>


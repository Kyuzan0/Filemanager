<!-- Trash Toolbar -->
<div class="log-toolbar">
    <!-- Left Group: Mobile Toggle, Title -->
    <div class="toolbar-left">
        <!-- Mobile Menu Toggle -->
        <button class="btn btn-icon md:hidden p-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex-shrink-0" id="mobile-menu-toggle" title="Menu">
            <i class="ri-menu-line text-base text-slate-600 dark:text-gray-400"></i>
        </button>
        <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-200">
            <i class="ri-delete-bin-line"></i> Trash
        </h2>
    </div>
    
    <!-- Right Group: Action Buttons -->
    <div class="toolbar-right">
        <button class="btn btn-icon" id="btn-refresh" title="Refresh">
            <i class="ri-refresh-line"></i>
        </button>
        <button class="btn btn-warning" id="btn-cleanup" title="Hapus item lama (>30 hari)">
            <i class="ri-time-line"></i>
            <span class="btn-text">Cleanup Old</span>
        </button>
        <button class="btn btn-danger" id="btn-empty" title="Kosongkan semua trash">
            <i class="ri-delete-bin-2-line"></i>
            <span class="btn-text">Empty Trash</span>
        </button>
        <button class="btn btn-icon" id="theme-toggle" title="Toggle tema">
            <i class="ri-moon-line"></i>
        </button>
    </div>
</div>

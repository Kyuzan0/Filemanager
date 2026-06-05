<!-- Trash Toolbar -->
<div class="log-toolbar">
    <!-- Left Group: Mobile Toggle, Title -->
    <div class="toolbar-left">
        <!-- Mobile Menu Toggle -->
        <button class="btn btn-icon md:d-none toolbar-menu-toggle" id="mobile-menu-toggle" title="Menu">
            <i class="ri-menu-line text-base text-muted"></i>
        </button>
        <h2 class="text-lg font-semibold">
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
    </div>
</div>

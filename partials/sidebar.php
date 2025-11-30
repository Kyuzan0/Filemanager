<?php
/**
 * Sidebar Partial
 * Reusable sidebar component for all pages
 * 
 * Usage: <?php $activePage = 'dashboard'; include 'partials/sidebar.php'; ?>
 * 
 * Available $activePage values: 'dashboard', 'logs', 'trash'
 */

$activePage = $activePage ?? 'dashboard';
?>
<!-- Sidebar Overlay for Mobile -->
<div class="sidebar-overlay" id="sidebar-overlay"></div>

<!-- SIDEBAR -->
<aside class="sidebar w-56 px-5 py-5 bg-white border-r border-slate-200 h-full overflow-y-auto dark:bg-[#1a2332] dark:border-white/10" id="sidebar">
    <div class="sidebar-header flex items-center justify-between mb-4">
        <a href="index.php" class="logo text-lg font-bold text-blue-600 cursor-pointer no-underline">Filemanager</a>
        <button class="sidebar-close md:hidden p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg" id="sidebar-close">
            <i class="ri-close-line text-xl"></i>
        </button>
    </div>
    <ul class="side-list space-y-2">
        <li data-nav="dashboard" class="px-2 py-2.5 rounded-lg <?php echo $activePage === 'dashboard' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'; ?> cursor-pointer transition-colors flex items-center gap-2">
            <i class="ri-dashboard-line"></i> Dashboard
        </li>
        <li data-nav="logs" class="px-2 py-2.5 rounded-lg <?php echo $activePage === 'logs' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'; ?> cursor-pointer transition-colors flex items-center gap-2">
            <i class="ri-file-list-3-line"></i> Log Activity
        </li>
        <li data-nav="trash" class="px-2 py-2.5 rounded-lg <?php echo $activePage === 'trash' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'; ?> cursor-pointer transition-colors flex items-center gap-2">
            <i class="ri-delete-bin-line"></i> Trash
        </li>
    </ul>
</aside>

<!-- Sidebar Navigation Script -->
<script src="assets/js/sidebar.js"></script>

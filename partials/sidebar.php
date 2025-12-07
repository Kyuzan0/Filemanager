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
<aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <a href="index.php" class="sidebar-logo">Filemanager</a>
        <div class="sidebar-header-actions">
            <button type="button"
                    class="theme-switch"
                    id="toggleTheme"
                    title="Toggle Tema"
                    aria-label="Toggle dark/light theme"
                    aria-pressed="false">
                <span class="theme-switch__indicator" aria-hidden="true"></span>
                <span class="theme-switch__icon theme-switch__icon--sun" aria-hidden="true">
                    <i class="ri-sun-line"></i>
                </span>
                <span class="theme-switch__icon theme-switch__icon--moon" aria-hidden="true">
                    <i class="ri-moon-line"></i>
                </span>
            </button>
            <button class="sidebar-close" id="sidebar-close" type="button" aria-label="Close sidebar">
                <i class="ri-close-line"></i>
            </button>
        </div>
    </div>

    <nav class="sidebar-nav" aria-label="Navigasi utama">
        <ul class="sidebar-menu">
            <li>
                <button type="button"
                        data-nav="dashboard"
                        class="sidebar-link <?php echo $activePage === 'dashboard' ? 'sidebar-link--active' : ''; ?>"
                        <?php echo $activePage === 'dashboard' ? 'aria-current="page"' : ''; ?>>
                    <i class="ri-dashboard-line" aria-hidden="true"></i>
                    <span>Dashboard</span>
                </button>
            </li>
            <li>
                <button type="button"
                        data-nav="logs"
                        class="sidebar-link <?php echo $activePage === 'logs' ? 'sidebar-link--active' : ''; ?>"
                        <?php echo $activePage === 'logs' ? 'aria-current="page"' : ''; ?>>
                    <i class="ri-file-list-3-line" aria-hidden="true"></i>
                    <span>Log Activity</span>
                </button>
            </li>
            <li>
                <button type="button"
                        data-nav="trash"
                        class="sidebar-link <?php echo $activePage === 'trash' ? 'sidebar-link--active' : ''; ?>"
                        <?php echo $activePage === 'trash' ? 'aria-current="page"' : ''; ?>>
                    <i class="ri-delete-bin-line" aria-hidden="true"></i>
                    <span>Trash</span>
                </button>
            </li>
            <li>
                <button type="button"
                        class="sidebar-link sidebar-link--disabled"
                        data-action="settings"
                        id="sidebar-settings"
                        disabled
                        title="Coming Soon">
                    <i class="ri-settings-3-line" aria-hidden="true"></i>
                    <span>Coming Soon</span>
                </button>
            </li>
        </ul>
    </nav>
</aside>

<!-- Sidebar Navigation Script -->
<script src="assets/js/sidebar.js"></script>

/**
 * Sidebar Navigation Script
 * =========================
 * Reusable sidebar functionality for all pages
 * Handles mobile toggle, navigation, and page transitions
 */

(function () {
    'use strict';

    // Initialize sidebar functionality
    function initSidebar() {
        initMobileToggle();
        initNavigation();
        initSettingsLink();
    }

    // Mobile sidebar toggle
    function initMobileToggle() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        function openSidebar() {
            if (sidebar) {
                sidebar.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('active');
            }
        }

        function closeSidebar() {
            if (sidebar) {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('active');
            }
        }

        // Expose functions globally
        window.openSidebar = openSidebar;
        window.closeSidebar = closeSidebar;

        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                openSidebar();
            });
        }

        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        // Close on resize to desktop
        window.addEventListener('resize', function () {
            if (window.innerWidth >= 768) {
                closeSidebar();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
                closeSidebar();
            }
        });
    }

    // Navigation click handlers
    function initNavigation() {
        const sideItems = document.querySelectorAll('[data-nav]');

        sideItems.forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const navTarget = this.getAttribute('data-nav');

                // Close mobile sidebar first
                if (window.closeSidebar) {
                    window.closeSidebar();
                }

                // Handle navigation based on target
                setTimeout(() => {
                    switch (navTarget) {
                        case 'dashboard':
                            // Return to main file manager view
                            // Close any open overlays
                            closeAllOverlays();
                            // Reload file list if available
                            if (typeof window.loadPath === 'function') {
                                window.loadPath('');
                            } else if (typeof window.loadFiles === 'function') {
                                window.loadFiles();
                            }
                            break;

                        case 'logs':
                            // Open logs modal/overlay
                            openLogsOverlay();
                            break;

                        case 'trash':
                            // Open trash modal/overlay
                            openTrashOverlay();
                            break;

                        default:
                            console.warn('Unknown nav target:', navTarget);
                    }

                    // Update active state
                    updateActiveNavItem(navTarget);
                }, 100);
            });
        });
    }

    // Close all overlays
    function closeAllOverlays() {
        const overlays = document.querySelectorAll('[id$="-overlay"]');
        overlays.forEach(overlay => {
            if (overlay && !overlay.classList.contains('hidden')) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                overlay.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // Open logs overlay
    function openLogsOverlay() {
        const logsOverlay = document.getElementById('log-overlay');
        if (logsOverlay) {
            logsOverlay.classList.remove('hidden');
            logsOverlay.style.display = 'flex';
            logsOverlay.setAttribute('aria-hidden', 'false');

            // Load logs if function exists
            if (typeof window.loadLogs === 'function') {
                window.loadLogs();
            } else if (typeof window.LogHandler !== 'undefined' && typeof window.LogHandler.load === 'function') {
                window.LogHandler.load();
            }
        } else {
            console.warn('Log overlay not found');
        }
    }

    // Open trash overlay
    function openTrashOverlay() {
        const trashOverlay = document.getElementById('trash-overlay');
        if (trashOverlay) {
            trashOverlay.classList.remove('hidden');
            trashOverlay.style.display = 'flex';
            trashOverlay.setAttribute('aria-hidden', 'false');

            // Load trash items if function exists
            if (typeof window.loadTrash === 'function') {
                window.loadTrash();
            } else if (typeof window.TrashManager !== 'undefined' && typeof window.TrashManager.load === 'function') {
                window.TrashManager.load();
            }
        } else {
            console.warn('Trash overlay not found');
        }
    }

    // Update active navigation item
    function updateActiveNavItem(activeNav) {
        const allNavItems = document.querySelectorAll('[data-nav]');
        allNavItems.forEach(item => {
            const isActive = item.getAttribute('data-nav') === activeNav;
            item.classList.toggle('sidebar-link--active', isActive);
            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }


    function initSettingsLink() {
        const settingsBtn = document.getElementById('sidebar-settings');
        if (!settingsBtn) return;

        settingsBtn.addEventListener('click', () => {
            // Close mobile sidebar first
            if (typeof window.closeSidebar === 'function') {
                window.closeSidebar();
            }

            // Open settings modal
            setTimeout(() => {
                // Try different methods to open settings
                if (typeof window.openSettingsModal === 'function') {
                    window.openSettingsModal();
                } else if (typeof window.openSettings === 'function') {
                    window.openSettings();
                } else {
                    // Direct DOM manipulation fallback
                    const overlay = document.getElementById('settings-overlay');
                    if (overlay) {
                        overlay.classList.remove('hidden');
                        overlay.style.display = 'flex';
                        overlay.setAttribute('aria-hidden', 'false');

                        // Load debug toggle state
                        const debugToggle = document.getElementById('toggle-debug');
                        if (debugToggle) {
                            debugToggle.checked = localStorage.getItem('fm-debug') === 'true';
                        }
                    }
                }
            }, 100);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
})();

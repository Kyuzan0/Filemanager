/**
 * Sidebar Navigation Script
 * =========================
 * Reusable sidebar functionality for all pages
 * Handles mobile toggle, navigation, and page transitions
 */

(function () {
    'use strict';

    // Navigation mapping
    const NAV_PAGES = {
        'dashboard': 'index.php',
        'logs': 'logs.php',
        'trash': 'trash.php'
    };

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

                if (navTarget && NAV_PAGES[navTarget]) {
                    // Close mobile sidebar first
                    if (window.closeSidebar) {
                        window.closeSidebar();
                    }

                    // Navigate to page
                    window.location.href = NAV_PAGES[navTarget];
                }
            });
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

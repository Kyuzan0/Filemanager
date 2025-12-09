/**
 * SPA-Style Page Navigation
 * Handles sidebar navigation by opening modals/overlays instead of page navigation
 */

(function () {
    'use strict';

    const SmoothNav = {
        // Initialize
        init() {
            this.bindNavigation();
            this.initPageTransition();
        },

        // Bind navigation click events
        bindNavigation() {
            document.addEventListener('click', (e) => {
                const navItem = e.target.closest('[data-nav]');
                if (navItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    const page = navItem.dataset.nav;
                    this.navigateTo(page);
                }
            });
        },

        // Navigate to page (SPA-style with overlays)
        navigateTo(page) {
            // Close mobile sidebar first
            if (typeof window.closeSidebar === 'function') {
                window.closeSidebar();
            }

            // Handle navigation based on target
            setTimeout(() => {
                switch (page) {
                    case 'dashboard':
                        // Close all overlays and return to file manager
                        this.closeAllOverlays();
                        // Reload file list if available
                        if (typeof window.loadPath === 'function') {
                            window.loadPath('');
                        } else if (typeof window.loadFiles === 'function') {
                            window.loadFiles();
                        }
                        break;

                    case 'logs':
                        // Open logs modal (openLogModal handles both opening and loading)
                        if (typeof window.openLogModal === 'function') {
                            window.openLogModal();
                        } else {
                            // Fallback: manually open overlay
                            this.openOverlay('log-overlay');
                        }
                        break;

                    case 'trash':
                        // Open trash overlay
                        this.openOverlay('trash-overlay');
                        // Load trash if function exists
                        if (typeof window.loadTrash === 'function') {
                            window.loadTrash();
                        }
                        break;

                    default:
                        console.warn('Unknown nav target:', page);
                }

                // Update active menu item
                this.updateActiveMenu(page);
            }, 100);
        },

        // Open an overlay by ID
        openOverlay(overlayId) {
            // Close other overlays first
            this.closeAllOverlays();

            const overlay = document.getElementById(overlayId);
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
                overlay.setAttribute('aria-hidden', 'false');
            } else {
                console.warn('Overlay not found:', overlayId);
            }
        },

        // Close all overlays
        closeAllOverlays() {
            const overlays = document.querySelectorAll('[id$="-overlay"]');
            overlays.forEach(overlay => {
                if (overlay && !overlay.classList.contains('hidden')) {
                    overlay.classList.add('hidden');
                    overlay.style.display = 'none';
                    overlay.setAttribute('aria-hidden', 'true');
                }
            });
        },

        // Initialize page transition on load
        initPageTransition() {
            // Fade in on page load
            document.body.classList.add('page-loaded');

            // Update active menu based on current page
            this.updateActiveMenu('dashboard');
        },

        // Update active menu item
        updateActiveMenu(currentPage) {
            const menuItems = document.querySelectorAll('.sidebar-link[data-nav]');
            menuItems.forEach(item => {
                const itemPage = item.dataset.nav;
                const isActive = itemPage === currentPage;

                item.classList.toggle('sidebar-link--active', isActive);

                if (isActive) {
                    item.setAttribute('aria-current', 'page');
                } else {
                    item.removeAttribute('aria-current');
                }
            });
        }
    };

    // CSS for transitions - with dark mode support to prevent flash
    const style = document.createElement('style');
    style.textContent = `
        /* Base transition setup */
        body {
            opacity: 0;
            transition: opacity 0.15s ease-in-out;
        }
        body.page-loaded {
            opacity: 1;
        }
        body.page-transitioning {
            opacity: 0;
            pointer-events: none;
        }
        
        /* Dark mode background preservation during transition */
        html[data-theme="dark"] body.page-transitioning {
            background-color: var(--bg, #0f1419);
        }
        
        /* Ensure smooth color transition */
        html, body {
            transition: opacity 0.15s ease-in-out, background-color 0s;
        }
    `;
    document.head.appendChild(style);

    // Export to window
    window.SmoothNav = SmoothNav;

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SmoothNav.init());
    } else {
        SmoothNav.init();
    }
})();

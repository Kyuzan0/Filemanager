/**
 * Smooth Page Navigation
 * Provides smooth transitions between pages without full SPA complexity
 */

(function() {
    'use strict';
    
    const SmoothNav = {
        // Prefetch cache
        prefetchCache: new Set(),
        
        // Initialize
        init() {
            this.bindNavigation();
            this.prefetchPages();
            this.initPageTransition();
        },
        
        // Bind navigation click events
        bindNavigation() {
            document.addEventListener('click', (e) => {
                const navItem = e.target.closest('[data-nav]');
                if (navItem) {
                    e.preventDefault();
                    const page = navItem.dataset.nav;
                    this.navigateTo(page);
                }
            });
        },
        
        // Navigate to page with smooth transition
        navigateTo(page) {
            const path = this.getPathFromPage(page);
            
            // Add fade-out effect
            document.body.classList.add('page-transitioning');
            
            // Navigate after short delay for animation
            setTimeout(() => {
                window.location.href = path;
            }, 150);
        },
        
        // Get path from page name
        getPathFromPage(page) {
            switch(page) {
                case 'logs': return 'logs.php';
                case 'trash': return 'trash.php';
                default: return 'index.php';
            }
        },
        
        // Prefetch linked pages for faster navigation
        prefetchPages() {
            const pages = ['index.php', 'logs.php'];
            
            pages.forEach(page => {
                if (!this.prefetchCache.has(page) && !window.location.pathname.includes(page)) {
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = page;
                    document.head.appendChild(link);
                    this.prefetchCache.add(page);
                }
            });
        },
        
        // Initialize page transition on load
        initPageTransition() {
            // Fade in on page load
            document.body.classList.add('page-loaded');
            
            // Update active menu based on current page
            this.updateActiveMenu();
        },
        
        // Update active menu item
        updateActiveMenu() {
            const currentPath = window.location.pathname;
            let currentPage = 'dashboard';
            
            if (currentPath.includes('logs.php')) currentPage = 'logs';
            else if (currentPath.includes('trash.php')) currentPage = 'trash';
            
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


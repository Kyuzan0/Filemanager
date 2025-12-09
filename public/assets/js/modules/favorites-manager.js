/**
 * Recent Files & Favorites Manager
 * Manages recent files history and user favorites with localStorage persistence
 */

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        STORAGE_KEY_RECENT: 'filemanager_recent_files',
        STORAGE_KEY_FAVORITES: 'filemanager_favorites',
        MAX_RECENT_FILES: 10,
        MAX_FAVORITES: 20
    };

    // State
    let recentFiles = [];
    let favorites = [];

    // ============= Storage Functions =============

    /**
     * Load data from localStorage
     */
    function loadFromStorage() {
        try {
            const recentData = localStorage.getItem(CONFIG.STORAGE_KEY_RECENT);
            const favoritesData = localStorage.getItem(CONFIG.STORAGE_KEY_FAVORITES);

            recentFiles = recentData ? JSON.parse(recentData) : [];
            favorites = favoritesData ? JSON.parse(favoritesData) : [];

            // Validate data structure
            recentFiles = recentFiles.filter(item => item && item.path && item.name);
            favorites = favorites.filter(item => item && item.path && item.name);
        } catch (error) {
            console.error('[favorites-manager] Error loading from storage:', error);
            recentFiles = [];
            favorites = [];
        }
    }

    /**
     * Save recent files to localStorage
     */
    function saveRecentFiles() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY_RECENT, JSON.stringify(recentFiles));
        } catch (error) {
            console.error('[favorites-manager] Error saving recent files:', error);
        }
    }

    /**
     * Save favorites to localStorage
     */
    function saveFavorites() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
        } catch (error) {
            console.error('[favorites-manager] Error saving favorites:', error);
        }
    }

    // ============= Recent Files Functions =============

    /**
     * Add a file to recent files
     * @param {string} path - File path
     * @param {string} name - File name
     * @param {string} type - File type (file or directory)
     */
    function addToRecent(path, name, type = 'file') {
        if (!path || !name) return;

        // Remove if already exists
        recentFiles = recentFiles.filter(item => item.path !== path);

        // Add to beginning
        recentFiles.unshift({
            path: path,
            name: name,
            type: type,
            accessedAt: Date.now()
        });

        // Limit to max
        if (recentFiles.length > CONFIG.MAX_RECENT_FILES) {
            recentFiles = recentFiles.slice(0, CONFIG.MAX_RECENT_FILES);
        }

        saveRecentFiles();
        renderRecentFiles();
    }

    /**
     * Remove a file from recent files
     * @param {string} path - File path
     */
    function removeFromRecent(path) {
        recentFiles = recentFiles.filter(item => item.path !== path);
        saveRecentFiles();
        renderRecentFiles();
    }

    /**
     * Clear all recent files
     */
    function clearRecentFiles() {
        recentFiles = [];
        saveRecentFiles();
        renderRecentFiles();
    }

    /**
     * Get all recent files
     * @returns {Array}
     */
    function getRecentFiles() {
        return [...recentFiles];
    }

    // ============= Favorites Functions =============

    /**
     * Add a file to favorites
     * @param {string} path - File path
     * @param {string} name - File name
     * @param {string} type - File type (file or directory)
     */
    function addToFavorites(path, name, type = 'file') {
        if (!path || !name) return;

        // Check if already in favorites
        if (favorites.some(item => item.path === path)) {
            console.log('[favorites-manager] Already in favorites:', path);
            return false;
        }

        // Check limit
        if (favorites.length >= CONFIG.MAX_FAVORITES) {
            console.warn('[favorites-manager] Favorites limit reached');
            if (window.showError) {
                window.showError(`Maximum ${CONFIG.MAX_FAVORITES} favorites allowed`);
            }
            return false;
        }

        favorites.push({
            path: path,
            name: name,
            type: type,
            addedAt: Date.now()
        });

        saveFavorites();
        renderFavorites();

        if (window.showSuccess) {
            window.showSuccess(`"${name}" added to favorites`);
        }

        return true;
    }

    /**
     * Remove a file from favorites
     * @param {string} path - File path
     */
    function removeFromFavorites(path) {
        const item = favorites.find(f => f.path === path);
        favorites = favorites.filter(f => f.path !== path);
        saveFavorites();
        renderFavorites();

        if (item && window.showSuccess) {
            window.showSuccess(`"${item.name}" removed from favorites`);
        }
    }

    /**
     * Toggle favorite status
     * @param {string} path - File path
     * @param {string} name - File name
     * @param {string} type - File type
     * @returns {boolean} - True if now favorited, false if removed
     */
    function toggleFavorite(path, name, type = 'file') {
        if (isFavorite(path)) {
            removeFromFavorites(path);
            return false;
        } else {
            return addToFavorites(path, name, type);
        }
    }

    /**
     * Check if a file is in favorites
     * @param {string} path - File path
     * @returns {boolean}
     */
    function isFavorite(path) {
        return favorites.some(item => item.path === path);
    }

    /**
     * Get all favorites
     * @returns {Array}
     */
    function getFavorites() {
        return [...favorites];
    }

    // ============= Render Functions =============

    /**
     * Get file icon based on type/extension
     * @param {string} name - File name
     * @param {string} type - File type
     * @returns {string} - Icon class
     */
    function getFileIcon(name, type) {
        if (type === 'directory') {
            return 'ri-folder-line';
        }

        const ext = name.split('.').pop()?.toLowerCase() || '';
        const iconMap = {
            'pdf': 'ri-file-pdf-line',
            'doc': 'ri-file-word-line',
            'docx': 'ri-file-word-line',
            'xls': 'ri-file-excel-line',
            'xlsx': 'ri-file-excel-line',
            'ppt': 'ri-file-ppt-line',
            'pptx': 'ri-file-ppt-line',
            'zip': 'ri-file-zip-line',
            '7z': 'ri-file-zip-line',
            'rar': 'ri-file-zip-line',
            'jpg': 'ri-image-line',
            'jpeg': 'ri-image-line',
            'png': 'ri-image-line',
            'gif': 'ri-image-line',
            'svg': 'ri-image-line',
            'webp': 'ri-image-line',
            'mp3': 'ri-music-line',
            'wav': 'ri-music-line',
            'mp4': 'ri-video-line',
            'mkv': 'ri-video-line',
            'avi': 'ri-video-line',
            'js': 'ri-javascript-line',
            'ts': 'ri-code-line',
            'html': 'ri-html5-line',
            'css': 'ri-css3-line',
            'php': 'ri-code-s-slash-line',
            'json': 'ri-braces-line',
            'md': 'ri-markdown-line',
            'txt': 'ri-file-text-line'
        };

        return iconMap[ext] || 'ri-file-line';
    }

    /**
     * Render recent files list
     */
    function renderRecentFiles() {
        const listEl = document.getElementById('recent-list');
        const emptyEl = document.getElementById('recent-empty');

        if (!listEl) return;

        // Clear existing items (except empty message)
        const existingItems = listEl.querySelectorAll('.sidebar-section-item');
        existingItems.forEach(item => item.remove());

        if (recentFiles.length === 0) {
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        recentFiles.forEach(file => {
            const li = document.createElement('li');
            li.className = 'sidebar-section-item';
            li.dataset.path = file.path;

            const icon = getFileIcon(file.name, file.type);

            li.innerHTML = `
                <button type="button" class="sidebar-section-item-btn" data-action="open" title="${file.path}">
                    <i class="${icon}" aria-hidden="true"></i>
                    <span class="sidebar-section-item-name">${escapeHtml(file.name)}</span>
                </button>
                <button type="button" class="sidebar-section-item-remove" data-action="remove" title="Remove from recent">
                    <i class="ri-close-line" aria-hidden="true"></i>
                </button>
            `;

            listEl.insertBefore(li, emptyEl);
        });
    }

    /**
     * Render favorites list
     */
    function renderFavorites() {
        const listEl = document.getElementById('favorites-list');
        const emptyEl = document.getElementById('favorites-empty');

        if (!listEl) return;

        // Clear existing items (except empty message)
        const existingItems = listEl.querySelectorAll('.sidebar-section-item');
        existingItems.forEach(item => item.remove());

        if (favorites.length === 0) {
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        favorites.forEach(file => {
            const li = document.createElement('li');
            li.className = 'sidebar-section-item';
            li.dataset.path = file.path;

            const icon = getFileIcon(file.name, file.type);

            li.innerHTML = `
                <button type="button" class="sidebar-section-item-btn" data-action="open" title="${file.path}">
                    <i class="${icon}" aria-hidden="true"></i>
                    <span class="sidebar-section-item-name">${escapeHtml(file.name)}</span>
                </button>
                <button type="button" class="sidebar-section-item-remove" data-action="unfavorite" title="Remove from favorites">
                    <i class="ri-star-fill" aria-hidden="true"></i>
                </button>
            `;

            listEl.insertBefore(li, emptyEl);
        });
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============= Event Handlers =============

    /**
     * Initialize event handlers
     */
    function initEventHandlers() {
        // Toggle sections
        const favoritesToggle = document.getElementById('favorites-toggle');
        const recentToggle = document.getElementById('recent-toggle');
        const favoritesList = document.getElementById('favorites-list');
        const recentList = document.getElementById('recent-list');

        if (favoritesToggle && favoritesList) {
            favoritesToggle.addEventListener('click', () => {
                const isExpanded = favoritesToggle.getAttribute('aria-expanded') === 'true';
                favoritesToggle.setAttribute('aria-expanded', !isExpanded);
                favoritesList.style.display = isExpanded ? 'none' : '';
                favoritesToggle.querySelector('.sidebar-section-arrow')?.classList.toggle('rotated', isExpanded);
            });
        }

        if (recentToggle && recentList) {
            recentToggle.addEventListener('click', () => {
                const isExpanded = recentToggle.getAttribute('aria-expanded') === 'true';
                recentToggle.setAttribute('aria-expanded', !isExpanded);
                recentList.style.display = isExpanded ? 'none' : '';
                document.getElementById('clear-recent')?.style.setProperty('display', isExpanded ? 'none' : '');
                recentToggle.querySelector('.sidebar-section-arrow')?.classList.toggle('rotated', isExpanded);
            });
        }

        // Clear recent files
        const clearRecentBtn = document.getElementById('clear-recent');
        if (clearRecentBtn) {
            clearRecentBtn.addEventListener('click', () => {
                if (confirm('Clear all recent files?')) {
                    clearRecentFiles();
                }
            });
        }

        // Click handlers for items
        document.addEventListener('click', (e) => {
            const itemBtn = e.target.closest('.sidebar-section-item-btn');
            const removeBtn = e.target.closest('.sidebar-section-item-remove');

            if (itemBtn) {
                const item = itemBtn.closest('.sidebar-section-item');
                const path = item?.dataset.path;
                if (path) {
                    navigateToFile(path);
                }
            }

            if (removeBtn) {
                const item = removeBtn.closest('.sidebar-section-item');
                const path = item?.dataset.path;
                const action = removeBtn.dataset.action;

                if (path) {
                    if (action === 'unfavorite') {
                        removeFromFavorites(path);
                    } else if (action === 'remove') {
                        removeFromRecent(path);
                    }
                }
            }
        });
    }

    /**
     * Navigate to a file/folder
     * @param {string} path - File path
     */
    function navigateToFile(path) {
        // Get file info from recent or favorites
        const file = [...recentFiles, ...favorites].find(f => f.path === path);

        if (file && file.type === 'directory') {
            // Navigate to directory
            if (typeof window.loadFiles === 'function') {
                window.loadFiles(path);
            }
        } else {
            // Open file preview or navigate to parent directory
            const parentPath = path.substring(0, path.lastIndexOf('/')) || '';
            if (typeof window.loadFiles === 'function') {
                window.loadFiles(parentPath);
            }
            // Then open preview
            setTimeout(() => {
                if (typeof window.openPreviewModal === 'function') {
                    window.openPreviewModal(path, file?.name);
                }
            }, 500);
        }
    }

    // ============= Public API =============

    /**
     * Initialize the module
     */
    function init() {
        loadFromStorage();
        renderRecentFiles();
        renderFavorites();
        initEventHandlers();
        console.log('[favorites-manager] Initialized with', recentFiles.length, 'recent files and', favorites.length, 'favorites');
    }

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export to window for global access
    window.FavoritesManager = {
        addToRecent,
        removeFromRecent,
        clearRecentFiles,
        getRecentFiles,
        addToFavorites,
        removeFromFavorites,
        toggleFavorite,
        isFavorite,
        getFavorites,
        renderRecentFiles,
        renderFavorites
    };

})();

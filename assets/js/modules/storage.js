/**
 * Storage Module - LocalStorage Helper
 * Provides utilities for persisting application state to localStorage
 * @version 1.0.0
 */

/**
 * Storage keys used by the application
 */
const STORAGE_KEYS = {
    SORT_KEY: 'filemanager_sort_key',
    SORT_DIRECTION: 'filemanager_sort_direction',
    LAST_PATH: 'filemanager_last_path',
    VIEW_MODE: 'filemanager_view_mode',
    EDITOR_PREFS: 'filemanager_editor_prefs',
    MOVE_RECENTS: 'filemanager_move_recents',
    PAGE_SIZE: 'filemanager_page_size'
};

/**
 * Check if localStorage is available
 * @returns {boolean} True if localStorage is available
 */
function isLocalStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Save a value to localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export function saveToStorage(key, value) {
    if (!isLocalStorageAvailable()) {
        console.warn('[Storage] localStorage not available');
        return false;
    }
    
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        console.error('[Storage] Error saving to localStorage:', error);
        return false;
    }
}

/**
 * Load a value from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Stored value or default value
 */
export function loadFromStorage(key, defaultValue = null) {
    if (!isLocalStorageAvailable()) {
        return defaultValue;
    }
    
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue;
        }
        return JSON.parse(item);
    } catch (error) {
        console.error('[Storage] Error loading from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Remove a value from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export function removeFromStorage(key) {
    if (!isLocalStorageAvailable()) {
        return false;
    }
    
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('[Storage] Error removing from localStorage:', error);
        return false;
    }
}

/**
 * Clear all application data from localStorage
 * @returns {boolean} Success status
 */
export function clearAllStorage() {
    if (!isLocalStorageAvailable()) {
        return false;
    }
    
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        return true;
    } catch (error) {
        console.error('[Storage] Error clearing localStorage:', error);
        return false;
    }
}

/**
 * Save sort preferences
 * @param {string} sortKey - Sort key (e.g., 'name', 'modified', 'size')
 * @param {string} sortDirection - Sort direction ('asc' or 'desc')
 * @returns {boolean} Success status
 */
export function saveSortPreferences(sortKey, sortDirection) {
    const success1 = saveToStorage(STORAGE_KEYS.SORT_KEY, sortKey);
    const success2 = saveToStorage(STORAGE_KEYS.SORT_DIRECTION, sortDirection);
    return success1 && success2;
}

/**
 * Load sort preferences
 * @returns {{sortKey: string, sortDirection: string}} Sort preferences
 */
export function loadSortPreferences() {
    return {
        sortKey: loadFromStorage(STORAGE_KEYS.SORT_KEY, 'name'),
        sortDirection: loadFromStorage(STORAGE_KEYS.SORT_DIRECTION, 'asc')
    };
}

/**
 * Save last visited path
 * @param {string} path - Directory path
 * @returns {boolean} Success status
 */
export function saveLastPath(path) {
    return saveToStorage(STORAGE_KEYS.LAST_PATH, path);
}

/**
 * Load last visited path
 * @returns {string|null} Last path or null
 */
export function loadLastPath() {
    return loadFromStorage(STORAGE_KEYS.LAST_PATH, null);
}

/**
 * Save pagination items-per-page preference
 * @param {number} pageSize - Items per page value
 * @returns {boolean} Success status
 */
export function savePaginationPageSize(pageSize) {
    return saveToStorage(STORAGE_KEYS.PAGE_SIZE, pageSize);
}

/**
 * Load pagination items-per-page preference
 * @param {number} [defaultValue=50] - Default items per page
 * @returns {number} Stored page size or default value
 */
export function loadPaginationPageSize(defaultValue = 50) {
    const storedValue = loadFromStorage(STORAGE_KEYS.PAGE_SIZE, defaultValue);

    if (typeof storedValue === 'number' && !Number.isNaN(storedValue)) {
        return storedValue;
    }

    if (typeof storedValue === 'string') {
        const parsed = Number(storedValue);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }

    return defaultValue;
}

/**
 * Save view mode preference
 * @param {string} mode - View mode (e.g., 'list', 'grid')
 * @returns {boolean} Success status
 */
export function saveViewMode(mode) {
    return saveToStorage(STORAGE_KEYS.VIEW_MODE, mode);
}

/**
 * Load view mode preference
 * @returns {string} View mode
 */
export function loadViewMode() {
    return loadFromStorage(STORAGE_KEYS.VIEW_MODE, 'list');
}

/**
 * Save editor preferences
 * @param {Object} prefs - Editor preferences object
 * @param {number} prefs.fontSize - Font size
 * @param {string} prefs.theme - Editor theme
 * @param {boolean} prefs.wordWrap - Word wrap enabled
 * @param {boolean} prefs.lineNumbers - Line numbers visible
 * @returns {boolean} Success status
 */
export function saveEditorPreferences(prefs) {
    return saveToStorage(STORAGE_KEYS.EDITOR_PREFS, prefs);
}

/**
 * Load editor preferences
 * @returns {Object} Editor preferences
 */
export function loadEditorPreferences() {
    return loadFromStorage(STORAGE_KEYS.EDITOR_PREFS, {
        fontSize: 14,
        theme: 'default',
        wordWrap: false,
        lineNumbers: true
    });
}

/**
 * Get storage usage information
 * @returns {Object} Storage usage info
 */
export function getStorageInfo() {
    if (!isLocalStorageAvailable()) {
        return {
            available: false,
            used: 0,
            keys: []
        };
    }
    
    try {
        let used = 0;
        const keys = [];
        
        Object.values(STORAGE_KEYS).forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                used += item.length;
                keys.push(key);
            }
        });
        
        return {
            available: true,
            used: used,
            usedKB: (used / 1024).toFixed(2),
            keys: keys,
            keysCount: keys.length
        };
    } catch (error) {
        console.error('[Storage] Error getting storage info:', error);
        return {
            available: false,
            used: 0,
            keys: []
        };
    }
}

/**
 * Export all storage keys for external access
 */
export { STORAGE_KEYS };

/**
 * Export availability check
 */
export { isLocalStorageAvailable };
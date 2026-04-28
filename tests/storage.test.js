/**
 * Storage Module Tests
 * Tests for public/assets/js/modules/storage.js
 */

import {
    saveToStorage,
    loadFromStorage,
    removeFromStorage,
    clearAllStorage,
    saveSortPreferences,
    loadSortPreferences,
    saveLastPath,
    loadLastPath,
    savePaginationPageSize,
    loadPaginationPageSize,
    saveViewMode,
    loadViewMode,
    saveEditorPreferences,
    loadEditorPreferences,
    getStorageInfo,
    isLocalStorageAvailable,
    STORAGE_KEYS
} from '../public/assets/js/modules/storage.js';

describe('Storage Module', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('STORAGE_KEYS', () => {
        test('has all expected keys', () => {
            expect(STORAGE_KEYS.SORT_KEY).toBe('filemanager_sort_key');
            expect(STORAGE_KEYS.SORT_DIRECTION).toBe('filemanager_sort_direction');
            expect(STORAGE_KEYS.LAST_PATH).toBe('filemanager_last_path');
            expect(STORAGE_KEYS.VIEW_MODE).toBe('filemanager_view_mode');
            expect(STORAGE_KEYS.EDITOR_PREFS).toBe('filemanager_editor_prefs');
            expect(STORAGE_KEYS.MOVE_RECENTS).toBe('filemanager_move_recents');
            expect(STORAGE_KEYS.PAGE_SIZE).toBe('filemanager_page_size');
            expect(STORAGE_KEYS.LANGUAGE).toBe('filemanager_language');
        });
    });

    describe('isLocalStorageAvailable()', () => {
        test('returns true in jsdom environment', () => {
            expect(isLocalStorageAvailable()).toBe(true);
        });
    });

    describe('saveToStorage()', () => {
        test('saves string value', () => {
            const result = saveToStorage('test_key', 'hello');
            expect(result).toBe(true);
            expect(localStorage.getItem('test_key')).toBe('"hello"');
        });

        test('saves object value as JSON', () => {
            saveToStorage('test_obj', { a: 1, b: 'two' });
            const stored = JSON.parse(localStorage.getItem('test_obj'));
            expect(stored).toEqual({ a: 1, b: 'two' });
        });

        test('saves number value', () => {
            saveToStorage('test_num', 42);
            expect(JSON.parse(localStorage.getItem('test_num'))).toBe(42);
        });

        test('saves boolean value', () => {
            saveToStorage('test_bool', true);
            expect(JSON.parse(localStorage.getItem('test_bool'))).toBe(true);
        });

        test('saves array value', () => {
            saveToStorage('test_arr', [1, 2, 3]);
            expect(JSON.parse(localStorage.getItem('test_arr'))).toEqual([1, 2, 3]);
        });

        test('saves null value', () => {
            saveToStorage('test_null', null);
            expect(JSON.parse(localStorage.getItem('test_null'))).toBeNull();
        });
    });

    describe('loadFromStorage()', () => {
        test('loads stored value', () => {
            localStorage.setItem('test_key', '"stored_value"');
            expect(loadFromStorage('test_key')).toBe('stored_value');
        });

        test('returns default for missing key', () => {
            expect(loadFromStorage('nonexistent', 'default')).toBe('default');
        });

        test('returns null as default when no default specified', () => {
            expect(loadFromStorage('nonexistent')).toBeNull();
        });

        test('loads complex object', () => {
            localStorage.setItem('test_obj', '{"x":1,"y":[2,3]}');
            const result = loadFromStorage('test_obj');
            expect(result).toEqual({ x: 1, y: [2, 3] });
        });

        test('returns default for invalid JSON', () => {
            localStorage.setItem('bad_json', '{invalid}');
            expect(loadFromStorage('bad_json', 'fallback')).toBe('fallback');
        });
    });

    describe('removeFromStorage()', () => {
        test('removes existing key', () => {
            localStorage.setItem('to_remove', '"value"');
            const result = removeFromStorage('to_remove');
            expect(result).toBe(true);
            expect(localStorage.getItem('to_remove')).toBeNull();
        });

        test('returns true even for non-existent key', () => {
            expect(removeFromStorage('nonexistent')).toBe(true);
        });
    });

    describe('clearAllStorage()', () => {
        test('removes all application keys', () => {
            saveToStorage(STORAGE_KEYS.SORT_KEY, 'name');
            saveToStorage(STORAGE_KEYS.VIEW_MODE, 'grid');
            saveToStorage(STORAGE_KEYS.LAST_PATH, '/test');

            const result = clearAllStorage();
            expect(result).toBe(true);

            expect(loadFromStorage(STORAGE_KEYS.SORT_KEY)).toBeNull();
            expect(loadFromStorage(STORAGE_KEYS.VIEW_MODE)).toBeNull();
            expect(loadFromStorage(STORAGE_KEYS.LAST_PATH)).toBeNull();
        });

        test('does not remove non-application keys', () => {
            localStorage.setItem('other_app_key', 'value');
            clearAllStorage();
            expect(localStorage.getItem('other_app_key')).toBe('value');
        });
    });

    describe('Sort Preferences', () => {
        test('saves and loads sort preferences', () => {
            saveSortPreferences('modified', 'desc');
            const prefs = loadSortPreferences();
            expect(prefs.sortKey).toBe('modified');
            expect(prefs.sortDirection).toBe('desc');
        });

        test('returns defaults when not saved', () => {
            const prefs = loadSortPreferences();
            expect(prefs.sortKey).toBe('name');
            expect(prefs.sortDirection).toBe('asc');
        });
    });

    describe('Last Path', () => {
        test('saves and loads last path', () => {
            saveLastPath('/documents/work');
            expect(loadLastPath()).toBe('/documents/work');
        });

        test('returns null when not saved', () => {
            expect(loadLastPath()).toBeNull();
        });
    });

    describe('Pagination Page Size', () => {
        test('saves and loads page size', () => {
            savePaginationPageSize(25);
            expect(loadPaginationPageSize()).toBe(25);
        });

        test('returns default when not saved', () => {
            expect(loadPaginationPageSize(50)).toBe(50);
        });

        test('returns default of 10 when no default specified', () => {
            expect(loadPaginationPageSize()).toBe(10);
        });

        test('parses string values', () => {
            localStorage.setItem(STORAGE_KEYS.PAGE_SIZE, '"25"');
            expect(loadPaginationPageSize()).toBe(25);
        });

        test('returns default for non-numeric string', () => {
            localStorage.setItem(STORAGE_KEYS.PAGE_SIZE, '"abc"');
            expect(loadPaginationPageSize(10)).toBe(10);
        });
    });

    describe('View Mode', () => {
        test('saves and loads view mode', () => {
            saveViewMode('grid');
            expect(loadViewMode()).toBe('grid');
        });

        test('returns "list" as default', () => {
            expect(loadViewMode()).toBe('list');
        });
    });

    describe('Editor Preferences', () => {
        test('saves and loads editor preferences', () => {
            const prefs = { fontSize: 16, theme: 'dark', wordWrap: true, lineNumbers: false };
            saveEditorPreferences(prefs);
            expect(loadEditorPreferences()).toEqual(prefs);
        });

        test('returns defaults when not saved', () => {
            const defaults = loadEditorPreferences();
            expect(defaults.fontSize).toBe(14);
            expect(defaults.theme).toBe('default');
            expect(defaults.wordWrap).toBe(false);
            expect(defaults.lineNumbers).toBe(true);
        });
    });

    describe('getStorageInfo()', () => {
        test('returns info with available=true', () => {
            const info = getStorageInfo();
            expect(info.available).toBe(true);
            expect(typeof info.used).toBe('number');
            expect(Array.isArray(info.keys)).toBe(true);
        });

        test('counts stored keys', () => {
            saveToStorage(STORAGE_KEYS.SORT_KEY, 'name');
            saveToStorage(STORAGE_KEYS.VIEW_MODE, 'list');
            const info = getStorageInfo();
            expect(info.keysCount).toBe(2);
            expect(info.keys).toContain(STORAGE_KEYS.SORT_KEY);
            expect(info.keys).toContain(STORAGE_KEYS.VIEW_MODE);
        });

        test('calculates used bytes', () => {
            saveToStorage(STORAGE_KEYS.SORT_KEY, 'name');
            const info = getStorageInfo();
            expect(info.used).toBeGreaterThan(0);
            expect(info.usedKB).toBeDefined();
        });
    });
});

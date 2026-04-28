/**
 * Utils Module Tests
 * Tests for public/assets/js/modules/utils.js
 */

jest.mock('../public/assets/js/modules/constants.js', () => ({
    config: {
        fileSizeUnits: ['B', 'KB', 'MB', 'GB', 'TB'],
        dateFormatOptions: {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        },
        shortDateFormatOptions: {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        },
        apiBaseUrl: 'api.php'
    }
}));

import {
    formatBytes,
    formatDate,
    buildFileUrl,
    buildAbsoluteFileUrl,
    buildUncFileUrl,
    buildUncSharePath,
    encodePathSegments,
    getFileExtension,
    isWordDocument,
    getParentPath,
    isSubPath,
    debounce,
    throttle,
    compareItems,
    synchronizeSelection,
    FileManagerError,
    ErrorCodes,
    handleError,
    performanceTracker,
    getSortDescription,
    hasUnsavedChanges,
    saveToLocalStorage,
    getFromLocalStorage,
    removeFromLocalStorage
} from '../public/assets/js/modules/utils.js';

describe('Utils Module', () => {

    describe('formatBytes()', () => {
        test('returns "-" for null', () => {
            expect(formatBytes(null)).toBe('-');
        });

        test('returns "-" for undefined', () => {
            expect(formatBytes(undefined)).toBe('-');
        });

        test('formats 0 bytes', () => {
            expect(formatBytes(0)).toBe('0 B');
        });

        test('formats bytes under 1KB', () => {
            expect(formatBytes(512)).toBe('512 B');
        });

        test('formats 1 KB', () => {
            expect(formatBytes(1024)).toBe('1.0 KB');
        });

        test('formats 1 MB', () => {
            expect(formatBytes(1048576)).toBe('1.0 MB');
        });

        test('formats 1 GB', () => {
            expect(formatBytes(1073741824)).toBe('1.0 GB');
        });

        test('formats large KB values without decimal', () => {
            // 10240 bytes = exactly 10 KB → "10 KB" (>= 10 rounds to 0 decimals)
            expect(formatBytes(10240)).toBe('10 KB');
        });

        test('formats small KB values with 1 decimal', () => {
            // 1.5 KB
            expect(formatBytes(1536)).toBe('1.5 KB');
        });
    });

    describe('formatDate()', () => {
        test('returns "-" for null/undefined/0', () => {
            expect(formatDate(null)).toBe('-');
            expect(formatDate(undefined)).toBe('-');
            expect(formatDate(0)).toBe('-');
        });

        test('formats valid timestamp', () => {
            const ts = 1700000000; // 2023-11-14
            const result = formatDate(ts);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        test('uses short format when options.short is true', () => {
            const ts = 1700000000;
            const result = formatDate(ts, { short: true });
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('buildFileUrl()', () => {
        test('returns "#" for empty/null path', () => {
            expect(buildFileUrl(null)).toBe('#');
            expect(buildFileUrl('')).toBe('#');
        });

        test('builds URL for simple path', () => {
            expect(buildFileUrl('test.txt')).toBe('file/test.txt');
        });

        test('builds URL for nested path', () => {
            expect(buildFileUrl('folder/sub/file.txt')).toBe('file/folder/sub/file.txt');
        });

        test('encodes special characters in path segments', () => {
            const result = buildFileUrl('folder/my file.txt');
            expect(result).toBe('file/folder/my%20file.txt');
        });
    });

    describe('buildAbsoluteFileUrl()', () => {
        test('returns absolute URL', () => {
            const result = buildAbsoluteFileUrl('test.txt');
            expect(result).toContain('file/test.txt');
            expect(result).toMatch(/^https?:\/\//);
        });
    });

    describe('buildUncFileUrl()', () => {
        test('builds UNC file URL', () => {
            const result = buildUncFileUrl('folder/file.txt');
            expect(result).toContain('file:');
            expect(result).toContain('folder/file.txt');
        });

        test('handles empty path', () => {
            const result = buildUncFileUrl('');
            expect(result).toContain('file:');
        });
    });

    describe('buildUncSharePath()', () => {
        test('converts forward slashes to backslashes', () => {
            const result = buildUncSharePath('folder/sub/file.txt');
            expect(result).toContain('folder\\sub\\file.txt');
            expect(result).toMatch(/^\\\\/);
        });

        test('handles empty path', () => {
            const result = buildUncSharePath('');
            expect(result).toMatch(/^\\\\/);
        });
    });

    describe('encodePathSegments()', () => {
        test('returns empty string for null/empty', () => {
            expect(encodePathSegments(null)).toBe('');
            expect(encodePathSegments('')).toBe('');
        });

        test('encodes path segments', () => {
            expect(encodePathSegments('folder/file.txt')).toBe('folder/file.txt');
        });

        test('encodes special characters', () => {
            const result = encodePathSegments('my folder/my file.txt');
            expect(result).toBe('my%20folder/my%20file.txt');
        });
    });

    describe('getFileExtension()', () => {
        test('returns empty string for no extension', () => {
            expect(getFileExtension('Makefile')).toBe('');
        });

        test('returns lowercase extension', () => {
            expect(getFileExtension('file.TXT')).toBe('txt');
            expect(getFileExtension('image.PNG')).toBe('png');
        });

        test('returns last extension for multiple dots', () => {
            expect(getFileExtension('archive.tar.gz')).toBe('gz');
        });

        test('handles dotfiles', () => {
            expect(getFileExtension('.gitignore')).toBe('gitignore');
        });
    });

    describe('isWordDocument()', () => {
        test('returns true for .doc', () => {
            expect(isWordDocument('file.doc')).toBe(true);
            expect(isWordDocument('doc')).toBe(true);
        });

        test('returns true for .docx', () => {
            expect(isWordDocument('file.docx')).toBe(true);
            expect(isWordDocument('docx')).toBe(true);
        });

        test('returns false for other extensions', () => {
            expect(isWordDocument('file.pdf')).toBe(false);
            expect(isWordDocument('file.txt')).toBe(false);
            expect(isWordDocument('pdf')).toBe(false);
        });

        test('returns false for non-string', () => {
            expect(isWordDocument(123)).toBe(false);
            expect(isWordDocument(null)).toBe(false);
        });
    });

    describe('getParentPath()', () => {
        test('returns empty string for null/empty', () => {
            expect(getParentPath(null)).toBe('');
            expect(getParentPath('')).toBe('');
        });

        test('returns empty string for root-level file', () => {
            expect(getParentPath('file.txt')).toBe('');
        });

        test('returns parent for nested path', () => {
            expect(getParentPath('folder/sub/file.txt')).toBe('folder/sub');
        });

        test('returns parent for one-level deep', () => {
            expect(getParentPath('folder/file.txt')).toBe('folder');
        });
    });

    describe('isSubPath()', () => {
        test('returns false for empty parent', () => {
            expect(isSubPath('', 'child')).toBe(false);
            expect(isSubPath(null, 'child')).toBe(false);
        });

        test('returns true for exact match', () => {
            expect(isSubPath('folder', 'folder')).toBe(true);
        });

        test('returns true for child path', () => {
            expect(isSubPath('folder', 'folder/sub')).toBe(true);
            expect(isSubPath('folder', 'folder/sub/deep')).toBe(true);
        });

        test('returns false for non-child path', () => {
            expect(isSubPath('folder', 'other')).toBe(false);
            expect(isSubPath('folder', 'folder2/sub')).toBe(false);
        });
    });

    describe('debounce()', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('delays function execution', () => {
            const fn = jest.fn();
            const debounced = debounce(fn, 100);

            debounced();
            expect(fn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        test('resets timer on subsequent calls', () => {
            const fn = jest.fn();
            const debounced = debounce(fn, 100);

            debounced();
            jest.advanceTimersByTime(50);
            debounced(); // reset timer
            jest.advanceTimersByTime(50);
            expect(fn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(50);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        test('passes arguments to function', () => {
            const fn = jest.fn();
            const debounced = debounce(fn, 100);

            debounced('arg1', 'arg2');
            jest.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
        });
    });

    describe('throttle()', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('calls function immediately on first call', () => {
            const fn = jest.fn();
            const throttled = throttle(fn, 100);

            throttled();
            expect(fn).toHaveBeenCalledTimes(1);
        });

        test('blocks subsequent calls during limit period', () => {
            const fn = jest.fn();
            const throttled = throttle(fn, 100);

            throttled();
            throttled();
            throttled();
            expect(fn).toHaveBeenCalledTimes(1);
        });

        test('allows call after limit period', () => {
            const fn = jest.fn();
            const throttled = throttle(fn, 100);

            throttled();
            jest.advanceTimersByTime(100);
            throttled();
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    describe('compareItems()', () => {
        const fileA = { name: 'alpha.txt', type: 'file', path: 'alpha.txt', modified: 1000 };
        const fileB = { name: 'beta.txt', type: 'file', path: 'beta.txt', modified: 2000 };
        const folderA = { name: 'docs', type: 'folder', path: 'docs', modified: 500 };

        test('sorts folders before files by name', () => {
            const result = compareItems(folderA, fileA, 'name', 'asc');
            expect(result).toBeLessThan(0);
        });

        test('sorts files after folders by name', () => {
            const result = compareItems(fileA, folderA, 'name', 'asc');
            expect(result).toBeGreaterThan(0);
        });

        test('sorts same-type items alphabetically ascending', () => {
            const result = compareItems(fileA, fileB, 'name', 'asc');
            expect(result).toBeLessThan(0);
        });

        test('sorts same-type items alphabetically descending', () => {
            const result = compareItems(fileA, fileB, 'name', 'desc');
            expect(result).toBeGreaterThan(0);
        });

        test('sorts by modified date ascending', () => {
            const result = compareItems(fileA, fileB, 'modified', 'asc');
            expect(result).toBeLessThan(0);
        });

        test('sorts by modified date descending', () => {
            const result = compareItems(fileA, fileB, 'modified', 'desc');
            expect(result).toBeGreaterThan(0);
        });

        test('sorts by type', () => {
            const result = compareItems(folderA, fileA, 'type', 'asc');
            expect(result).toBeLessThan(0);
        });
    });

    describe('synchronizeSelection()', () => {
        test('keeps valid selections', () => {
            const items = [{ path: 'a.txt' }, { path: 'b.txt' }];
            const selected = new Set(['a.txt', 'b.txt']);
            const result = synchronizeSelection(items, selected);
            expect(result.size).toBe(2);
        });

        test('removes invalid selections', () => {
            const items = [{ path: 'a.txt' }];
            const selected = new Set(['a.txt', 'deleted.txt']);
            const result = synchronizeSelection(items, selected);
            expect(result.size).toBe(1);
            expect(result.has('a.txt')).toBe(true);
            expect(result.has('deleted.txt')).toBe(false);
        });

        test('returns empty set for empty items', () => {
            const result = synchronizeSelection([], new Set(['a.txt']));
            expect(result.size).toBe(0);
        });
    });

    describe('FileManagerError', () => {
        test('creates error with message, code, details', () => {
            const err = new FileManagerError('test error', 'TEST_CODE', { key: 'val' });
            expect(err.message).toBe('test error');
            expect(err.code).toBe('TEST_CODE');
            expect(err.details).toEqual({ key: 'val' });
            expect(err.name).toBe('FileManagerError');
            expect(err.timestamp).toBeDefined();
        });

        test('is instance of Error', () => {
            const err = new FileManagerError('test', 'CODE');
            expect(err).toBeInstanceOf(Error);
        });

        test('defaults details to empty object', () => {
            const err = new FileManagerError('test', 'CODE');
            expect(err.details).toEqual({});
        });
    });

    describe('ErrorCodes', () => {
        test('has all expected error codes', () => {
            expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
            expect(ErrorCodes.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
            expect(ErrorCodes.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
            expect(ErrorCodes.INVALID_PATH).toBe('INVALID_PATH');
            expect(ErrorCodes.OPERATION_FAILED).toBe('OPERATION_FAILED');
            expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
            expect(ErrorCodes.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
        });
    });

    describe('handleError()', () => {
        beforeEach(() => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        test('returns user-friendly message for FileManagerError', () => {
            const err = new FileManagerError('Custom message', 'CODE');
            const msg = handleError(err, 'test');
            expect(msg).toBe('Custom message');
        });

        test('returns network message for network errors', () => {
            const err = new Error('network failure');
            const msg = handleError(err, 'test');
            expect(msg).toContain('jaringan');
        });

        test('returns permission message for permission errors', () => {
            const err = new Error('permission denied');
            const msg = handleError(err, 'test');
            expect(msg).toContain('izin');
        });

        test('returns not found message', () => {
            const err = new Error('file not found');
            const msg = handleError(err, 'test');
            expect(msg).toContain('tidak ditemukan');
        });

        test('returns timeout message', () => {
            const err = new Error('request timeout');
            const msg = handleError(err, 'test');
            expect(msg).toContain('terlalu lama');
        });

        test('returns generic message for unknown errors', () => {
            const err = new Error('something weird');
            const msg = handleError(err, 'test');
            expect(msg).toContain('kesalahan');
        });
    });

    describe('getSortDescription()', () => {
        test('returns name ascending description', () => {
            expect(getSortDescription('name', 'asc')).toContain('A-Z');
        });

        test('returns name descending description', () => {
            expect(getSortDescription('name', 'desc')).toContain('Z-A');
        });

        test('returns modified ascending description', () => {
            expect(getSortDescription('modified', 'asc')).toContain('Lama');
        });

        test('returns type description', () => {
            expect(getSortDescription('type', 'asc')).toContain('Folder');
        });
    });

    describe('hasUnsavedChanges()', () => {
        test('returns true when open, dirty, not saving', () => {
            expect(hasUnsavedChanges({ isOpen: true, dirty: true, isSaving: false })).toBe(true);
        });

        test('returns false when not open', () => {
            expect(hasUnsavedChanges({ isOpen: false, dirty: true, isSaving: false })).toBe(false);
        });

        test('returns false when not dirty', () => {
            expect(hasUnsavedChanges({ isOpen: true, dirty: false, isSaving: false })).toBe(false);
        });

        test('returns false when saving', () => {
            expect(hasUnsavedChanges({ isOpen: true, dirty: true, isSaving: true })).toBe(false);
        });
    });

    describe('localStorage helpers', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        test('saveToLocalStorage and getFromLocalStorage round-trip', () => {
            saveToLocalStorage('test_key', { a: 1 });
            expect(getFromLocalStorage('test_key')).toEqual({ a: 1 });
        });

        test('getFromLocalStorage returns default for missing key', () => {
            expect(getFromLocalStorage('missing', 'default')).toBe('default');
        });

        test('removeFromLocalStorage removes item', () => {
            saveToLocalStorage('test_key', 'value');
            removeFromLocalStorage('test_key');
            expect(getFromLocalStorage('test_key')).toBeNull();
        });
    });

    describe('performanceTracker', () => {
        beforeEach(() => {
            performanceTracker.clearMetrics();
            // Mock Performance API methods not available in jsdom
            if (!performance.mark) {
                performance.mark = jest.fn();
            }
            if (!performance.measure) {
                performance.measure = jest.fn();
            }
            if (!performance.getEntriesByName) {
                performance.getEntriesByName = jest.fn(() => [{ duration: 5.0 }]);
            }
            if (!performance.clearMarks) {
                performance.clearMarks = jest.fn();
            }
            if (!performance.clearMeasures) {
                performance.clearMeasures = jest.fn();
            }
        });

        test('records and retrieves metrics', () => {
            performanceTracker.startMeasure('test-op');
            const duration = performanceTracker.endMeasure('test-op');
            expect(typeof duration).toBe('number');
            expect(performanceTracker.getMetrics().length).toBe(1);
        });

        test('getMetricsByName filters correctly', () => {
            performanceTracker.startMeasure('op-a');
            performanceTracker.endMeasure('op-a');
            performanceTracker.startMeasure('op-b');
            performanceTracker.endMeasure('op-b');

            expect(performanceTracker.getMetricsByName('op-a').length).toBe(1);
            expect(performanceTracker.getMetricsByName('op-b').length).toBe(1);
        });

        test('getAverageDuration returns 0 for unknown metric', () => {
            expect(performanceTracker.getAverageDuration('unknown')).toBe(0);
        });

        test('clearMetrics empties array', () => {
            performanceTracker.startMeasure('x');
            performanceTracker.endMeasure('x');
            performanceTracker.clearMetrics();
            expect(performanceTracker.getMetrics().length).toBe(0);
        });

        test('exportMetrics returns valid JSON', () => {
            performanceTracker.startMeasure('y');
            performanceTracker.endMeasure('y');
            const json = performanceTracker.exportMetrics();
            const parsed = JSON.parse(json);
            expect(parsed.summary.totalMeasurements).toBe(1);
        });
    });
});

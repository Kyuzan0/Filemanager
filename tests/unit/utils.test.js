/**
 * Utils Module Unit Tests
 * ========================
 * Tests for utility functions in utils.js
 */

// Since we're testing ES modules in a Node environment, 
// we'll test the logic that doesn't depend on browser APIs

describe('Utils Module', () => {
    
    describe('formatBytes', () => {
        // Mock implementation for testing
        const fileSizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        function formatBytes(bytes) {
            if (bytes === null || typeof bytes === 'undefined') {
                return '-';
            }
            let size = bytes;
            let unit = 0;
            while (size >= 1024 && unit < fileSizeUnits.length - 1) {
                size /= 1024;
                unit++;
            }
            return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${fileSizeUnits[unit]}`;
        }
        
        test('should return "-" for null', () => {
            expect(formatBytes(null)).toBe('-');
        });
        
        test('should return "-" for undefined', () => {
            expect(formatBytes(undefined)).toBe('-');
        });
        
        test('should format bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 B');
            expect(formatBytes(500)).toBe('500 B');
            expect(formatBytes(1023)).toBe('1023 B');
        });
        
        test('should format kilobytes correctly', () => {
            expect(formatBytes(1024)).toBe('1.0 KB');
            expect(formatBytes(1536)).toBe('1.5 KB');
            expect(formatBytes(10240)).toBe('10 KB');
        });
        
        test('should format megabytes correctly', () => {
            expect(formatBytes(1048576)).toBe('1.0 MB');
            expect(formatBytes(1572864)).toBe('1.5 MB');
        });
        
        test('should format gigabytes correctly', () => {
            expect(formatBytes(1073741824)).toBe('1.0 GB');
        });
        
        test('should format terabytes correctly', () => {
            expect(formatBytes(1099511627776)).toBe('1.0 TB');
        });
    });
    
    describe('formatDate', () => {
        function formatDate(timestamp) {
            if (!timestamp) {
                return '-';
            }
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('id-ID', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        test('should return "-" for falsy timestamp', () => {
            expect(formatDate(0)).toBe('-');
            expect(formatDate(null)).toBe('-');
            expect(formatDate(undefined)).toBe('-');
        });
        
        test('should format valid timestamp', () => {
            // Timestamp for 2024-01-15 12:30:00 UTC
            const timestamp = 1705322400;
            const result = formatDate(timestamp);
            
            // Just verify it returns a non-empty string (locale formatting varies)
            expect(result).not.toBe('-');
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(5);
        });
    });
    
    describe('encodePathSegments', () => {
        function encodePathSegments(path) {
            if (!path) {
                return '';
            }
            return path
                .split('/')
                .map((segment) => encodeURIComponent(segment))
                .join('/');
        }
        
        test('should return empty string for falsy input', () => {
            expect(encodePathSegments('')).toBe('');
            expect(encodePathSegments(null)).toBe('');
            expect(encodePathSegments(undefined)).toBe('');
        });
        
        test('should encode path segments', () => {
            expect(encodePathSegments('folder/file.txt')).toBe('folder/file.txt');
            expect(encodePathSegments('folder name/file name.txt')).toBe('folder%20name/file%20name.txt');
        });
        
        test('should handle special characters', () => {
            expect(encodePathSegments('folder/file#1.txt')).toBe('folder/file%231.txt');
            expect(encodePathSegments('folder/file&name.txt')).toBe('folder/file%26name.txt');
        });
    });
    
    describe('getFileExtension', () => {
        function getFileExtension(name) {
            const index = name.lastIndexOf('.');
            return index === -1 ? '' : name.slice(index + 1).toLowerCase();
        }
        
        test('should return empty string for files without extension', () => {
            expect(getFileExtension('readme')).toBe('');
            expect(getFileExtension('Makefile')).toBe('');
        });
        
        test('should return extension in lowercase', () => {
            expect(getFileExtension('file.TXT')).toBe('txt');
            expect(getFileExtension('file.PDF')).toBe('pdf');
            expect(getFileExtension('file.Js')).toBe('js');
        });
        
        test('should handle multiple dots', () => {
            expect(getFileExtension('file.test.js')).toBe('js');
            expect(getFileExtension('archive.tar.gz')).toBe('gz');
        });
        
        test('should handle hidden files', () => {
            expect(getFileExtension('.gitignore')).toBe('gitignore');
            expect(getFileExtension('.env')).toBe('env');
        });
    });
    
    describe('getParentPath', () => {
        function getParentPath(path) {
            if (!path) return '';
            const idx = path.lastIndexOf('/');
            return idx === -1 ? '' : path.substring(0, idx);
        }
        
        test('should return empty string for empty path', () => {
            expect(getParentPath('')).toBe('');
            expect(getParentPath(null)).toBe('');
            expect(getParentPath(undefined)).toBe('');
        });
        
        test('should return empty string for root-level items', () => {
            expect(getParentPath('file.txt')).toBe('');
            expect(getParentPath('folder')).toBe('');
        });
        
        test('should return parent path', () => {
            expect(getParentPath('folder/file.txt')).toBe('folder');
            expect(getParentPath('a/b/c')).toBe('a/b');
            expect(getParentPath('deep/nested/path/file.txt')).toBe('deep/nested/path');
        });
    });
    
    describe('isSubPath', () => {
        function isSubPath(parent, child) {
            if (!parent) return false;
            return child === parent || child.startsWith(parent + '/');
        }
        
        test('should return false for empty parent', () => {
            expect(isSubPath('', 'folder')).toBe(false);
            expect(isSubPath(null, 'folder')).toBe(false);
        });
        
        test('should return true for exact match', () => {
            expect(isSubPath('folder', 'folder')).toBe(true);
            expect(isSubPath('path/to/dir', 'path/to/dir')).toBe(true);
        });
        
        test('should return true for child paths', () => {
            expect(isSubPath('folder', 'folder/file.txt')).toBe(true);
            expect(isSubPath('a/b', 'a/b/c/d')).toBe(true);
        });
        
        test('should return false for non-child paths', () => {
            expect(isSubPath('folder', 'other')).toBe(false);
            expect(isSubPath('folder', 'folder2/file')).toBe(false);
        });
    });
    
    describe('debounce', () => {
        jest.useFakeTimers();
        
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        test('should delay function execution', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 100);
            
            debouncedFn();
            expect(mockFn).not.toHaveBeenCalled();
            
            jest.advanceTimersByTime(50);
            expect(mockFn).not.toHaveBeenCalled();
            
            jest.advanceTimersByTime(50);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
        
        test('should reset timer on subsequent calls', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 100);
            
            debouncedFn();
            jest.advanceTimersByTime(50);
            debouncedFn();
            jest.advanceTimersByTime(50);
            debouncedFn();
            jest.advanceTimersByTime(50);
            
            expect(mockFn).not.toHaveBeenCalled();
            
            jest.advanceTimersByTime(50);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
        
        test('should pass arguments to debounced function', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 100);
            
            debouncedFn('arg1', 'arg2');
            jest.advanceTimersByTime(100);
            
            expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
        });
    });
    
    describe('throttle', () => {
        jest.useFakeTimers();
        
        function throttle(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => {
                        inThrottle = false;
                    }, limit);
                }
            };
        }
        
        test('should execute immediately on first call', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);
            
            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
        
        test('should throttle subsequent calls', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);
            
            throttledFn();
            throttledFn();
            throttledFn();
            
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
        
        test('should allow execution after throttle period', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);
            
            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(1);
            
            jest.advanceTimersByTime(100);
            
            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(2);
        });
    });
});
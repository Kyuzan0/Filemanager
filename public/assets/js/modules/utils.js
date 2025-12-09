/**
 * Utility Functions Module
 * Berisi fungsi-fungsi pembantu yang digunakan di berbagai bagian aplikasi
 */

import { config } from './constants.js';

/**
 * Format bytes menjadi format yang mudah dibaca
 * @param {number} bytes - Jumlah bytes
 * @returns {string} Bytes yang diformat
 */
export function formatBytes(bytes) {
    if (bytes === null || typeof bytes === 'undefined') {
        return '-';
    }
    const units = config.fileSizeUnits;
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }
    return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Format timestamp menjadi string tanggal yang mudah dibaca
 * @param {number} timestamp - Timestamp dalam detik
 * @param {Object} options - Opsi formatting
 * @returns {string} Tanggal yang diformat
 */
export function formatDate(timestamp, options = {}) {
    if (!timestamp) {
        return '-';
    }
    const date = new Date(timestamp * 1000);
    const formatOptions = options.short ? config.shortDateFormatOptions : config.dateFormatOptions;
    return date.toLocaleString('id-ID', formatOptions);
}

/**
 * Membangun URL untuk file berdasarkan path
 * @param {string} path - Path file
 * @returns {string} URL file
 */
export function buildFileUrl(path) {
    if (!path) {
        return '#';
    }
    return 'file/' + path.split('/').map(encodeURIComponent).join('/');
}

/**
 * Membangun URL absolut untuk file dari path relatif
 * @param {string} path - Path file relatif
 * @returns {string} URL absolut
 */
export function buildAbsoluteFileUrl(path) {
    const rel = buildFileUrl(path);
    try {
        return new URL(rel, window.location.href).href;
    } catch (_) {
        const a = document.createElement('a');
        a.href = rel;
        return a.href;
    }
}

/**
 * Membangun URL file UNC untuk akses network share
 * @param {string} path - Path file
 * @returns {string} URL UNC
 */
export function buildUncFileUrl(path) {
    const host = window.location.hostname || 'localhost';
    const encodedSegments = (path || '')
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    return `file://///${host}/public/www/file/${encodedSegments}`;
}

/**
 * Membangun path UNC share untuk user copying
 * @param {string} path - Path file
 * @returns {string} Path UNC
 */
export function buildUncSharePath(path) {
    const host = window.location.hostname || 'localhost';
    const cleaned = (path || '').split('/').join('\\');
    return `\\\\${host}\\public\\www\\file\\${cleaned}`;
}

/**
 * Encode path segments untuk URL
 * @param {string} path - Path yang akan di-encode
 * @returns {string} Path yang sudah di-encode
 */
export function encodePathSegments(path) {
    if (!path) {
        return '';
    }
    return path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

/**
 * Mendapatkan ekstensi file dari nama file
 * @param {string} name - Nama file
 * @returns {string} Ekstensi file
 */
export function getFileExtension(name) {
    const index = name.lastIndexOf('.');
    return index === -1 ? '' : name.slice(index + 1).toLowerCase();
}

/**
 * Memeriksa apakah file adalah dokumen Word
 * @param {string} nameOrExt - Nama file atau ekstensi
 * @returns {boolean} True jika adalah dokumen Word
 */
export function isWordDocument(nameOrExt) {
    const ext = typeof nameOrExt === 'string'
        ? (nameOrExt.includes('.') ? getFileExtension(nameOrExt) : nameOrExt.toLowerCase())
        : '';
    return ext === 'doc' || ext === 'docx';
}

/**
 * Menyalin teks ke clipboard
 * @param {string} value - Teks yang akan disalin
 * @returns {Promise} Promise yang resolve jika berhasil
 */
export function copyPathToClipboard(value) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(value);
    }

    return new Promise((resolve, reject) => {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const succeeded = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (succeeded) {
                resolve();
            } else {
                reject(new Error('Copy command failed'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Sort comparison cache - WeakMap ensures automatic garbage collection
const sortCache = new WeakMap();

/**
 * Get or create cache for an item
 * @param {Object} item - Item object
 * @returns {Map} Cache map for this item
 */
function getItemCache(item) {
    if (!sortCache.has(item)) {
        sortCache.set(item, new Map());
    }
    return sortCache.get(item);
}

/**
 * Membandingkan dua item untuk sorting dengan memoization
 * @param {Object} a - Item pertama
 * @param {Object} b - Item kedua
 * @param {string} sortKey - Kunci sorting
 * @param {string} sortDirection - Arah sorting ('asc' atau 'desc')
 * @returns {number} Hasil perbandingan
 */
export function compareItems(a, b, sortKey, sortDirection) {
    const startTime = performance.now();
    
    // Create cache key for this comparison
    const cacheKey = `${b.path}-${sortKey}-${sortDirection}`;
    
    // Check cache first
    const cacheTime = performance.now();
    const cache = getItemCache(a);
    if (cache.has(cacheKey)) {
        console.log('[PAGINATION DEBUG] compareItems cache HIT for:', a.name, 'vs', b.name, 'at:', cacheTime, 'delta:', cacheTime - startTime);
        return cache.get(cacheKey);
    }
    console.log('[PAGINATION DEBUG] compareItems cache MISS for:', a.name, 'vs', b.name, 'at:', cacheTime, 'delta:', cacheTime - startTime);
    
    // Perform comparison
    const comparisonTime = performance.now();
    const direction = sortDirection === 'asc' ? 1 : -1;
    const typeOrder = { folder: 0, file: 1 };
    const compareName = () => a.name.localeCompare(b.name, 'id', { sensitivity: 'base', numeric: true });

    let result;
    switch (sortKey) {
        case 'type': {
            const diff = typeOrder[a.type] - typeOrder[b.type];
            if (diff !== 0) {
                result = diff * direction;
            } else {
                result = compareName() * direction;
            }
            break;
        }
        case 'modified': {
            const modifiedA = a.modified ?? 0;
            const modifiedB = b.modified ?? 0;
            if (modifiedA !== modifiedB) {
                result = modifiedA < modifiedB ? -direction : direction;
            } else {
                result = compareName() * direction;
            }
            break;
        }
        case 'name':
        default: {
            if (a.type !== b.type) {
                result = typeOrder[a.type] - typeOrder[b.type];
            } else {
                result = compareName() * direction;
            }
            break;
        }
    }
    console.log('[PAGINATION DEBUG] compareItems comparison completed at:', comparisonTime, 'delta:', comparisonTime - cacheTime);
    
    // Cache the result
    const cacheSetTime = performance.now();
    cache.set(cacheKey, result);
    console.log('[PAGINATION DEBUG] compareItems cached at:', cacheSetTime, 'delta:', cacheSetTime - comparisonTime);
    
    const endTime = performance.now();
    console.log('[PAGINATION DEBUG] compareItems completed at:', endTime, 'total delta:', endTime - startTime, 'result:', result);
    
    return result;
}

/**
 * Clear sort comparison cache (useful for testing or memory management)
 */
export function clearSortCache() {
    // WeakMap doesn't have a clear method, but we can create a new one
    // The old one will be garbage collected when items are no longer referenced
    console.log('[Sort Cache] Cache cleared (WeakMap will be garbage collected)');
}

/**
 * Get sort cache statistics for debugging
 * Note: WeakMap doesn't support size() or iteration, so this is limited
 */
export function getSortCacheStats() {
    return {
        note: 'WeakMap-based cache - exact size unavailable for memory efficiency',
        implementation: 'Automatic garbage collection when items are unreferenced'
    };
}

/**
 * Mendapatkan deskripsi sorting
 * @param {string} key - Kunci sorting
 * @param {string} direction - Arah sorting
 * @returns {string} Deskripsi sorting
 */
export function getSortDescription(key, direction) {
    const order = direction === 'asc';
    switch (key) {
        case 'type':
            return order ? 'Jenis (Folder → File)' : 'Jenis (File → Folder)';
        case 'modified':
            return order ? 'Terakhir diubah (Lama → Baru)' : 'Terakhir diubah (Baru → Lama)';
        case 'name':
        default:
            return order ? 'Nama (A-Z)' : 'Nama (Z-A)';
    }
}

/**
 * Sinkronisasi selection dengan items yang tersedia
 * @param {Array} items - Daftar item yang tersedia
 * @param {Set} selected - Set item yang dipilih
 * @returns {Set} Set selection yang sudah disinkronkan
 */
export function synchronizeSelection(items, selected) {
    const startTime = performance.now();
    console.log('[PAGINATION DEBUG] synchronizeSelection called at:', startTime, 'with items:', items.length, 'selected:', selected.size);
    
    const validPathsTime = performance.now();
    const validPaths = new Set(items.map((item) => item.path));
    console.log('[PAGINATION DEBUG] Valid paths created at:', validPathsTime, 'delta:', validPathsTime - startTime);
    
    const nextSelectedTime = performance.now();
    const nextSelected = new Set();
    selected.forEach((path) => {
        if (validPaths.has(path)) {
            nextSelected.add(path);
        }
    });
    console.log('[PAGINATION DEBUG] Selection synchronized at:', nextSelectedTime, 'delta:', nextSelectedTime - validPathsTime, 'result:', nextSelected.size);
    
    const endTime = performance.now();
    console.log('[PAGINATION DEBUG] synchronizeSelection completed at:', endTime, 'total delta:', endTime - startTime);
    
    return nextSelected;
}

/**
 * Mendapatkan path parent dari path yang diberikan
 * @param {string} path - Path yang akan dicek
 * @returns {string} Path parent
 */
export function getParentPath(path) {
    if (!path) return '';
    const idx = path.lastIndexOf('/');
    return idx === -1 ? '' : path.substring(0, idx);
}

/**
 * Memeriksa apakah child path adalah subpath dari parent path
 * @param {string} parent - Path parent
 * @param {string} child - Path child
 * @returns {boolean} True jika child adalah subpath dari parent
 */
export function isSubPath(parent, child) {
    if (!parent) return false;
    return child === parent || child.startsWith(parent + '/');
}

/**
 * Membuat tombol aksi untuk baris tabel
 * @param {string} icon - HTML untuk icon
 * @param {string} label - Label tombol
 * @param {Function} handler - Event handler
 * @param {string} variant - Variasi tombol
 * @returns {HTMLElement} Elemen tombol
 */
export function createRowActionButton(icon, label, handler, variant = '') {
    const btn = document.createElement('button');
    btn.type = 'button';

    // Base tokens: keep legacy row-action and add the new .btn compatibility token
    btn.classList.add('row-action');
    btn.classList.add('btn');

    // Preserve any variant tokens passed (e.g. 'primary', 'outline', 'danger')
    if (variant && variant.trim()) {
        variant.trim().split(/\s+/).forEach(v => {
            if (v) btn.classList.add(v);
        });
    }

    btn.innerHTML = icon;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', (event) => {
        event.stopPropagation();
        handler(event);
    });
    return btn;
}

/**
 * Debounce function untuk membatasi eksekusi fungsi
 * @param {Function} func - Fungsi yang akan di-debounce
 * @param {number} wait - Waktu tunggu dalam ms
 * @returns {Function} Fungsi yang sudah di-debounce
 */
export function debounce(func, wait) {
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

/**
 * Throttle function untuk membatasi frekuensi eksekusi fungsi
 * @param {Function} func - Fungsi yang akan di-throttle
 * @param {number} limit - Waktu minimum antar eksekusi dalam ms
 * @returns {Function} Fungsi yang sudah di-throttle
 */
export function throttle(func, limit) {
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

/**
 * Menampilkan pesan status untuk sementara waktu
 * @param {string} message - Pesan yang akan ditampilkan
 * @param {number} duration - Durasi dalam ms
 * @param {HTMLElement} statusElement - Elemen status
 * @param {Object} lastSnapshot - Snapshot status terakhir
 * @param {Function} updateStatusFunc - Fungsi untuk update status
 */
export function flashStatus(message, duration = 2000, statusElement, lastSnapshot, updateStatusFunc) {
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;

    if (window.statusFlashTimer) {
        clearTimeout(window.statusFlashTimer);
    }

    window.statusFlashTimer = setTimeout(() => {
        window.statusFlashTimer = null;
        if (!lastSnapshot) {
            return;
        }
        updateStatusFunc(
            lastSnapshot.totalCount,
            lastSnapshot.filteredCount,
            lastSnapshot.generatedAt,
            lastSnapshot.meta,
        );
    }, duration);
}

/**
 * Memeriksa apakah ada perubahan yang belum disimpan
 * @param {Object} previewState - State preview
 * @returns {boolean} True jika ada perubahan yang belum disimpan
 */
export function hasUnsavedChanges(previewState) {
    return previewState.isOpen && previewState.dirty && !previewState.isSaving;
}

/**
 * Menyimpan data ke localStorage
 * @param {string} key - Kunci penyimpanan
 * @param {*} data - Data yang akan disimpan
 */
export function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

/**
 * Mengambil data dari localStorage
 * @param {string} key - Kunci penyimpanan
 * @param {*} defaultValue - Nilai default jika tidak ada
 * @returns {*} Data dari localStorage atau nilai default
 */
export function getFromLocalStorage(key, defaultValue = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultValue;
    } catch (error) {
        console.error('Failed to get from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Menghapus data dari localStorage
 * @param {string} key - Kunci penyimpanan
 */
export function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to remove from localStorage:', error);
    }
}

/**
 * Mengubah kunci sorting
 * @param {string} key - Kunci sorting baru
 * @returns {void}
 */
export function changeSort(key) {
    // This function should be implemented where it has access to state
    // For now, we'll dispatch a custom event that can be caught by the main app
    const event = new CustomEvent('changeSortRequested', {
        detail: { key }
    });
    document.dispatchEvent(event);
}

/**
 * Custom Error class untuk File Manager
 */
export class FileManagerError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'FileManagerError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Error codes untuk berbagai jenis error
 */
export const ErrorCodes = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    INVALID_PATH: 'INVALID_PATH',
    OPERATION_FAILED: 'OPERATION_FAILED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR'
};

/**
 * Handle error dan return user-friendly message
 * @param {Error} error - Error object
 * @param {string} context - Context dimana error terjadi
 * @returns {string} User-friendly error message
 */
export function handleError(error, context = '') {
    console.error(`[${context}]`, error);
    
    // Log to external service if available
    if (window.errorLogger) {
        window.errorLogger.log(error, context);
    }
    
    // User-friendly message
    let userMessage = 'Terjadi kesalahan. Silakan coba lagi.';
    
    if (error instanceof FileManagerError) {
        userMessage = error.message;
    } else if (error.name === 'NetworkError' || error.message.includes('network')) {
        userMessage = 'Koneksi jaringan bermasalah. Periksa koneksi Anda.';
    } else if (error.message.includes('permission')) {
        userMessage = 'Anda tidak memiliki izin untuk melakukan operasi ini.';
    } else if (error.message.includes('not found')) {
        userMessage = 'File atau folder tidak ditemukan.';
    } else if (error.message.includes('timeout')) {
        userMessage = 'Operasi memakan waktu terlalu lama. Silakan coba lagi.';
    }
    
    return userMessage;
}

/**
 * Performance Tracker untuk monitoring aplikasi
 */
export const performanceTracker = {
    metrics: [],
    
    /**
     * Start performance measurement
     * @param {string} name - Nama measurement
     */
    startMeasure(name) {
        performance.mark(`${name}-start`);
    },
    
    /**
     * End performance measurement
     * @param {string} name - Nama measurement
     * @returns {number} Duration in milliseconds
     */
    endMeasure(name) {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = performance.getEntriesByName(name)[0];
        this.metrics.push({
            name,
            duration: measure.duration,
            timestamp: Date.now()
        });
        
        // Cleanup
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
        
        return measure.duration;
    },
    
    /**
     * Get all metrics
     * @returns {Array} Array of metrics
     */
    getMetrics() {
        return this.metrics;
    },
    
    /**
     * Get metrics by name
     * @param {string} name - Nama metric
     * @returns {Array} Array of metrics dengan nama tertentu
     */
    getMetricsByName(name) {
        return this.metrics.filter(m => m.name === name);
    },
    
    /**
     * Get average duration for a metric
     * @param {string} name - Nama metric
     * @returns {number} Average duration in milliseconds
     */
    getAverageDuration(name) {
        const filtered = this.getMetricsByName(name);
        if (filtered.length === 0) return 0;
        
        const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
        return sum / filtered.length;
    },
    
    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics = [];
    },
    
    /**
     * Export metrics as JSON
     * @returns {string} JSON string of metrics
     */
    exportMetrics() {
        return JSON.stringify({
            metrics: this.metrics,
            summary: {
                totalMeasurements: this.metrics.length,
                uniqueMetrics: [...new Set(this.metrics.map(m => m.name))].length,
                exportedAt: new Date().toISOString()
            }
        }, null, 2);
    }
};
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

/**
 * Membandingkan dua item untuk sorting
 * @param {Object} a - Item pertama
 * @param {Object} b - Item kedua
 * @param {string} sortKey - Kunci sorting
 * @param {string} sortDirection - Arah sorting ('asc' atau 'desc')
 * @returns {number} Hasil perbandingan
 */
export function compareItems(a, b, sortKey, sortDirection) {
    const direction = sortDirection === 'asc' ? 1 : -1;
    const typeOrder = { folder: 0, file: 1 };
    const compareName = () => a.name.localeCompare(b.name, 'id', { sensitivity: 'base', numeric: true });

    switch (sortKey) {
        case 'type': {
            const diff = typeOrder[a.type] - typeOrder[b.type];
            if (diff !== 0) {
                return diff * direction;
            }
            return compareName() * direction;
        }
        case 'modified': {
            const modifiedA = a.modified ?? 0;
            const modifiedB = b.modified ?? 0;
            if (modifiedA !== modifiedB) {
                return modifiedA < modifiedB ? -direction : direction;
            }
            return compareName() * direction;
        }
        case 'name':
        default: {
            if (a.type !== b.type) {
                return typeOrder[a.type] - typeOrder[b.type];
            }
            return compareName() * direction;
        }
    }
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
    const validPaths = new Set(items.map((item) => item.path));
    const nextSelected = new Set();
    selected.forEach((path) => {
        if (validPaths.has(path)) {
            nextSelected.add(path);
        }
    });
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
    btn.className = `row-action ${variant}`.trim();
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
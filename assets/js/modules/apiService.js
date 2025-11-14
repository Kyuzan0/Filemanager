/**
 * API Service Module
 * Berisi fungsi-fungsi untuk komunikasi dengan API
 */

import { encodePathSegments } from './utils.js';
import { errorMessages } from './constants.js';

/**
 * Mengambil data direktori dari server
 * @param {string} path - Path direktori
 * @param {Object} options - Opsi tambahan
 * @returns {Promise<Object>} Promise yang resolve dengan data direktori
 */
export async function fetchDirectory(path = '', options = {}) {
    const { silent = false } = options;
    
    try {
        const encodedPath = encodePathSegments(path);
        const response = await fetch(`api.php?path=${encodedPath}`);
        
        if (!response.ok) {
            throw new Error(errorMessages.fetchFailed);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || errorMessages.fetchFailed);
        }

        return data;
    } catch (error) {
        console.error('Error fetching directory:', error);
        throw error;
    }
}

/**
 * Menghapus item dari server
 * @param {Array} paths - Array path item yang akan dihapus
 * @returns {Promise<Object>} Promise yang resolve dengan hasil penghapusan
 */
export async function deleteItems(paths) {
    try {
        const response = await fetch('api.php?action=delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paths }),
        });

        let data = null;
        try {
            data = await response.json();
        } catch (parseError) {
            data = null;
        }

        if (!response.ok) {
            const errMessage = data && data.error
                ? data.error
                : `${errorMessages.deleteFailed} (HTTP ${response.status}).`;
            throw new Error(errMessage);
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Respons penghapusan tidak valid.');
        }

        return data;
    } catch (error) {
        console.error('Error deleting items:', error);
        throw error;
    }
}

/**
 * Memindahkan item ke lokasi baru
 * @param {string} sourcePath - Path sumber
 * @param {string} targetPath - Path target
 * @returns {Promise<Object>} Promise yang resolve dengan hasil pemindahan
 */
export async function moveItem(sourcePath, targetPath) {
    try {
        const response = await fetch('api.php?action=move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sourcePath: sourcePath,
                targetPath: targetPath,
            }),
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            const errorMessage = data && data.error ? data.error : errorMessages.moveFailed;
            throw new Error(errorMessage);
        }
        
        return data;
    } catch (error) {
        console.error('Error moving item:', error);
        throw error;
    }
}

/**
 * Mengubah nama item
 * @param {string} oldPath - Path lama
 * @param {string} newName - Nama baru
 * @param {string} newPath - Path baru
 * @returns {Promise<Object>} Promise yang resolve dengan hasil perubahan nama
 */
export async function renameItem(oldPath, newName, newPath) {
    try {
        const response = await fetch(`api.php?action=rename&path=${encodePathSegments(oldPath)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                newName: newName,
                newPath: newPath,
            }),
        });
        
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.success) {
            const errorMessage = data && data.error ? data.error : errorMessages.renameFailed;
            throw new Error(errorMessage);
        }
        
        return data;
    } catch (error) {
        console.error('Error renaming item:', error);
        throw error;
    }
}

/**
 * Membuat item baru (file atau folder)
 * @param {string} path - Path tempat item akan dibuat
 * @param {string} type - Tipe item ('file' atau 'folder')
 * @param {string} name - Nama item
 * @returns {Promise<Object>} Promise yang resolve dengan hasil pembuatan
 */
export async function createItem(path, type, name) {
    try {
        const response = await fetch(`api.php?action=create&path=${encodePathSegments(path)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: type,
                name: name,
            }),
        });
        
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.success) {
            const errorMessage = data && data.error ? data.error : errorMessages.createFailed;
            throw new Error(errorMessage);
        }
        
        return data;
    } catch (error) {
        console.error('Error creating item:', error);
        throw error;
    }
}

/**
 * Mengunggah file ke server
 * @param {FormData} formData - FormData berisi file dan path
 * @returns {Promise<Object>} Promise yang resolve dengan hasil upload
 */
export async function uploadFiles(formData) {
    try {
        const response = await fetch('api.php?action=upload', {
            method: 'POST',
            body: formData,
        });

        let data = null;
        try {
            data = await response.json();
        } catch (parseError) {
            data = null;
        }

        if (!response.ok || !data || !data.success) {
            const errMessage = data && data.error
                ? data.error
                : errorMessages.uploadFailed;
            throw new Error(errMessage);
        }

        return data;
    } catch (error) {
        console.error('Error uploading files:', error);
        throw error;
    }
}

/**
 * Mengambil konten file untuk preview
 * @param {string} path - Path file
 * @returns {Promise<Object>} Promise yang resolve dengan konten file
 */
export async function fetchFileContent(path) {
    try {
        const response = await fetch(`api.php?action=content&path=${encodePathSegments(path)}`);
        if (!response.ok) {
            throw new Error('Gagal memuat file.');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Gagal memuat file.');
        }

        return data;
    } catch (error) {
        console.error('Error fetching file content:', error);
        throw error;
    }
}

/**
 * Menyimpan konten file
 * @param {string} path - Path file
 * @param {string} content - Konten yang akan disimpan
 * @returns {Promise<Object>} Promise yang resolve dengan hasil penyimpanan
 */
export async function saveFileContent(path, content) {
    try {
        const response = await fetch(`api.php?action=save&path=${encodePathSegments(path)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
            }),
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            data = null;
        }

        if (!response.ok) {
            const errMessage = data && data.error
                ? data.error
                : `Gagal menyimpan perubahan (HTTP ${response.status}).`;
            throw new Error(errMessage);
        }

        if (!data || !data.success) {
            const errMessage = data && data.error
                ? data.error
                : 'Gagal menyimpan perubahan.';
            throw new Error(errMessage);
        }

        return data;
    } catch (error) {
        console.error('Error saving file content:', error);
        throw error;
    }
}

/**
 * Mengambil data log dengan filter
 * @param {Object} filters - Filter untuk log
 * @param {number} page - Halaman yang akan diambil
 * @param {number} limit - Jumlah item per halaman
 * @returns {Promise<Object>} Promise yang resolve dengan data log
 */
export async function fetchLogData(filters = {}, page = 1, limit = 50) {
    try {
        const params = new URLSearchParams();
        params.append('action', 'logs');
        params.append('limit', String(limit));
        params.append('offset', String((page - 1) * limit));

        // Add filters to params
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });

        const url = `api.php?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Gagal mengambil data log.');
        }

        return data;
    } catch (error) {
        console.error('Error fetching log data:', error);
        throw error;
    }
}

/**
 * Membersihkan log lama
 * @param {number} days - Jumlah hari log yang akan disimpan
 * @returns {Promise<Object>} Promise yang resolve dengan hasil pembersihan
 */
export async function cleanupLogs(days) {
    try {
        const response = await fetch(`api.php?action=cleanup_logs&days=${days}`);
        if (!response.ok) {
            throw new Error(errorMessages.logCleanupFailed);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || errorMessages.logCleanupFailed);
        }

        return data;
    } catch (error) {
        console.error('Error cleaning up logs:', error);
        throw error;
    }
}
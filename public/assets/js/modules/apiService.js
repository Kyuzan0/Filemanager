/**
 * API Service Module
 * Berisi fungsi-fungsi untuk komunikasi dengan API
 * Enhanced with centralized error handling, retry logic, and timeout support
 */

import { encodePathSegments } from './utils.js';
import { errorMessages } from './constants.js';
import {
    handleError,
    createErrorHandler,
    withRetry,
    withTimeout,
    FileManagerError,
    ErrorCategory,
    ErrorSeverity,
    isNetworkError,
    isRetryableError
} from './errorHandler.js';

// Create context-specific error handler
const apiErrorHandler = createErrorHandler('API');

// Global AbortController for request cancellation
let currentAbortController = null;

// Default configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    delay: 1000,
    backoffMultiplier: 2
};

/**
 * Cancel any pending API request
 */
export function cancelPendingRequests() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        console.log('[API] Previous request cancelled');
    }
}

/**
 * Enhanced fetch wrapper with timeout support
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: options.signal || controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Parse response with error handling
 * @param {Response} response - Fetch response
 * @param {string} context - Context for error messages
 * @returns {Promise<Object>}
 */
async function parseResponse(response, context = '') {
    let data = null;
    
    try {
        data = await response.json();
    } catch (parseError) {
        // If JSON parsing fails, throw a client error
        throw new FileManagerError(
            'Respons server tidak valid',
            ErrorCategory.CLIENT,
            {
                context,
                originalError: parseError,
                details: { status: response.status }
            }
        );
    }
    
    return data;
}

/**
 * Validate API response
 * @param {Response} response - Fetch response
 * @param {Object} data - Parsed response data
 * @param {string} defaultErrorMessage - Default error message
 * @param {string} context - Context for error messages
 */
function validateResponse(response, data, defaultErrorMessage, context = '') {
    if (!response.ok) {
        const errorMessage = data?.error || `${defaultErrorMessage} (HTTP ${response.status})`;
        const category = response.status >= 500 ? ErrorCategory.SERVER :
                        response.status === 404 ? ErrorCategory.NOT_FOUND :
                        response.status === 403 || response.status === 401 ? ErrorCategory.PERMISSION :
                        ErrorCategory.FILE_OPERATION;
        
        throw new FileManagerError(errorMessage, category, {
            context,
            details: { status: response.status, data }
        });
    }
    
    if (!data || typeof data !== 'object') {
        throw new FileManagerError(
            'Respons tidak valid',
            ErrorCategory.CLIENT,
            { context, details: { data } }
        );
    }
    
    if (!data.success && data.error) {
        throw new FileManagerError(
            data.error,
            ErrorCategory.FILE_OPERATION,
            { context, details: { data } }
        );
    }
}

/**
 * Mengambil data direktori dari server
 * @param {string} path - Path direktori
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @param {boolean} options.retry - Enable retry on failure (default: true)
 * @returns {Promise<Object>} Promise yang resolve dengan data direktori
 */
export async function fetchDirectory(path = '', options = {}) {
    const {
        silent = false,
        timeout = DEFAULT_TIMEOUT,
        retry = true
    } = options;
    
    // Cancel any pending request before starting a new one
    cancelPendingRequests();
    
    // Create new AbortController for this request
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;
    
    const fetchOperation = async () => {
        const encodedPath = encodePathSegments(path);
        // Add timestamp to prevent caching on mobile devices
        const response = await fetchWithTimeout(
            `api.php?path=${encodedPath}&_=${Date.now()}`,
            { signal },
            timeout
        );
        
        const data = await parseResponse(response, 'fetchDirectory');
        validateResponse(response, data, errorMessages.fetchFailed, 'fetchDirectory');

        return data;
    };
    
    try {
        // Apply retry logic if enabled
        const operation = retry
            ? withRetry(fetchOperation, {
                ...DEFAULT_RETRY_OPTIONS,
                context: 'fetchDirectory',
                shouldRetry: (error) => {
                    // Don't retry if aborted
                    if (error.name === 'AbortError') return false;
                    return isRetryableError(error);
                }
            })
            : fetchOperation;
        
        return await operation();
    } catch (error) {
        // Don't log or throw if request was cancelled
        if (error.name === 'AbortError') {
            console.log('[API] Request aborted for path:', path);
            return null;
        }
        
        // Handle error with optional notification
        if (!silent) {
            apiErrorHandler(error, { silent });
        } else {
            console.error('[API] Error fetching directory:', error);
        }
        throw error;
    } finally {
        // Clear controller if this was the current one
        if (currentAbortController && currentAbortController.signal === signal) {
            currentAbortController = null;
        }
    }
}

/**
 * Menghapus item dari server
 * @param {Array} paths - Array path item yang akan dihapus
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @returns {Promise<Object>} Promise yang resolve dengan hasil penghapusan
 */
export async function deleteItems(paths, options = {}) {
    const { silent = false, timeout = DEFAULT_TIMEOUT } = options;
    
    try {
        const response = await fetchWithTimeout(
            'api.php?action=delete',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paths }),
            },
            timeout
        );

        const data = await parseResponse(response, 'deleteItems');
        validateResponse(response, data, errorMessages.deleteFailed, 'deleteItems');

        return data;
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'deleteItems' });
        }
        throw error;
    }
}

/**
 * Memindahkan item ke lokasi baru
 * @param {string} sourcePath - Path sumber
 * @param {string} targetPath - Path target
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @returns {Promise<Object>} Promise yang resolve dengan hasil pemindahan
 */
export async function moveItem(sourcePath, targetPath, options = {}) {
    const { silent = false, timeout = DEFAULT_TIMEOUT } = options;
    
    console.log('[API] moveItem called with:', {
        sourcePath,
        targetPath
    });
    
    try {
        const response = await fetchWithTimeout(
            'api.php?action=move',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourcePath: sourcePath,
                    targetPath: targetPath,
                }),
            },
            timeout
        );
        
        const data = await parseResponse(response, 'moveItem');
        validateResponse(response, data, errorMessages.moveFailed, 'moveItem');
        
        return data;
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'moveItem' });
        }
        throw error;
    }
}

/**
 * Mengubah nama item
 * @param {string} oldPath - Path lama
 * @param {string} newName - Nama baru
 * @param {string} newPath - Path baru
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @returns {Promise<Object>} Promise yang resolve dengan hasil perubahan nama
 */
export async function renameItem(oldPath, newName, newPath, options = {}) {
    const { silent = false, timeout = DEFAULT_TIMEOUT } = options;
    
    try {
        const response = await fetchWithTimeout(
            `api.php?action=rename&path=${encodePathSegments(oldPath)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newName: newName,
                    newPath: newPath,
                }),
            },
            timeout
        );
        
        const data = await parseResponse(response, 'renameItem');
        validateResponse(response, data, errorMessages.renameFailed, 'renameItem');
        
        return data;
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'renameItem' });
        }
        throw error;
    }
}

/**
 * Membuat item baru (file atau folder)
 * @param {string} path - Path tempat item akan dibuat
 * @param {string} type - Tipe item ('file' atau 'folder')
 * @param {string} name - Nama item
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @returns {Promise<Object>} Promise yang resolve dengan hasil pembuatan
 */
export async function createItem(path, type, name, options = {}) {
    const { silent = false, timeout = DEFAULT_TIMEOUT } = options;
    
    try {
        const response = await fetchWithTimeout(
            `api.php?action=create&path=${encodePathSegments(path)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: type,
                    name: name,
                }),
            },
            timeout
        );
        
        const data = await parseResponse(response, 'createItem');
        validateResponse(response, data, errorMessages.createFailed, 'createItem');
        
        return data;
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'createItem' });
        }
        throw error;
    }
}

/**
 * Mengunggah file ke server
 * @param {FormData} formData - FormData berisi file dan path
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms (default: 5 minutes for uploads)
 * @param {Function} options.onProgress - Progress callback (if supported)
 * @returns {Promise<Object>} Promise yang resolve dengan hasil upload
 */
export async function uploadFiles(formData, options = {}) {
    const {
        silent = false,
        timeout = 300000, // 5 minutes for uploads
        onProgress = null
    } = options;
    
    try {
        // For upload, we use regular fetch but with timeout
        const response = await fetchWithTimeout(
            'api.php?action=upload',
            {
                method: 'POST',
                body: formData,
            },
            timeout
        );

        const data = await parseResponse(response, 'uploadFiles');
        validateResponse(response, data, errorMessages.uploadFailed, 'uploadFiles');

        return data;
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'uploadFiles' });
        }
        throw error;
    }
}

/**
 * Mengambil konten file untuk preview
 * @param {string} path - Path file
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @param {boolean} options.retry - Enable retry on failure (default: true)
 * @returns {Promise<Object>} Promise yang resolve dengan konten file
 */
export async function fetchFileContent(path, options = {}) {
    const {
        silent = false,
        timeout = DEFAULT_TIMEOUT,
        retry = true
    } = options;
    
    const fetchOperation = async () => {
        const response = await fetchWithTimeout(
            `api.php?action=content&path=${encodePathSegments(path)}&_=${Date.now()}`,
            {},
            timeout
        );
        
        const data = await parseResponse(response, 'fetchFileContent');
        validateResponse(response, data, 'Gagal memuat file', 'fetchFileContent');

        return data;
    };
    
    try {
        // Apply retry logic if enabled
        const operation = retry
            ? withRetry(fetchOperation, {
                ...DEFAULT_RETRY_OPTIONS,
                maxRetries: 2, // Fewer retries for file content
                context: 'fetchFileContent'
            })
            : fetchOperation;
        
        return await operation();
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'fetchFileContent' });
        }
        throw error;
    }
}

/**
 * Menyimpan konten file
 * @param {string} path - Path file
 * @param {string} content - Konten yang akan disimpan
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @returns {Promise<Object>} Promise yang resolve dengan hasil penyimpanan
 */
export async function saveFileContent(path, content, options = {}) {
    const { silent = false, timeout = DEFAULT_TIMEOUT } = options;
    
    try {
        const response = await fetchWithTimeout(
            `api.php?action=save&path=${encodePathSegments(path)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: content,
                }),
            },
            timeout
        );

        const data = await parseResponse(response, 'saveFileContent');
        validateResponse(response, data, 'Gagal menyimpan perubahan', 'saveFileContent');

        return data;
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'saveFileContent' });
        }
        throw error;
    }
}

/**
 * Re-export error handling utilities for use by other modules
 */
export {
    FileManagerError,
    ErrorCategory,
    ErrorSeverity,
    handleError as handleApiError,
    isNetworkError,
    isRetryableError
};


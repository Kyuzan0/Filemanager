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

// AbortController for directory fetch cancellation
// Only used by fetchDirectory() to cancel previous navigation requests
let directoryAbortController = null;

// Default configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    delay: 1000,
    backoffMultiplier: 2
};

// CSRF token cache (populated from response headers)
let csrfToken = '';

/**
 * Get the current CSRF token
 * @returns {string} CSRF token
 */
export function getCsrfToken() {
    return csrfToken;
}

/**
 * Set CSRF token (typically from response header)
 * @param {string} token - CSRF token value
 */
export function setCsrfToken(token) {
    if (token) {
        csrfToken = token;
    }
}

/**
 * Cancel any pending directory fetch request.
 * Only affects fetchDirectory() — other API calls use independent controllers.
 */
export function cancelPendingRequests() {
    if (directoryAbortController) {
        directoryAbortController.abort();
        directoryAbortController = null;
    }
}

/**
 * Enhanced fetch wrapper with timeout and CSRF token support
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Add CSRF token header for state-changing requests
    const method = (options.method || 'GET').toUpperCase();
    const headers = { ...(options.headers || {}) };
    if (method !== 'GET' && csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: options.signal || controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Parse response with error handling
 * Extracts CSRF token from response headers for subsequent requests
 * @param {Response} response - Fetch response
 * @param {string} context - Context for error messages
 * @returns {Promise<Object>}
 */
async function parseResponse(response, context = '') {
    // Extract CSRF token from response header
    const newToken = response.headers.get('X-CSRF-Token');
    if (newToken) {
        csrfToken = newToken;
    }

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

    // Cancel any pending directory fetch before starting a new one
    cancelPendingRequests();

    // Create new AbortController for this directory fetch
    directoryAbortController = new AbortController();
    const signal = directoryAbortController.signal;

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
                    if (error.name === 'AbortError') {
                        return false;
                    }
                    return isRetryableError(error);
                }
            })
            : fetchOperation;

        return await operation();
    } catch (error) {
        // Don't log or throw if request was cancelled
        if (error.name === 'AbortError') {
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
        if (directoryAbortController && directoryAbortController.signal === signal) {
            directoryAbortController = null;
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
 * Menyalin item ke direktori tujuan
 * @param {Array<string>} sourcePaths - Array path sumber
 * @param {string} targetPath - Path direktori tujuan
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @returns {Promise<Object>} Promise yang resolve dengan hasil penyalinan
 */
export async function copyItems(sourcePaths, targetPath, options = {}) {
    const { silent = false, timeout = DEFAULT_TIMEOUT } = options;

    try {
        const response = await fetchWithTimeout(
            'api.php?action=copy',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourcePaths: sourcePaths,
                    targetPath: targetPath,
                }),
            },
            timeout
        );

        const data = await parseResponse(response, 'copyItems');

        // Allow 207 Multi-Status for partial success
        if (!response.ok && response.status !== 207) {
            throw new FileManagerError(
                data?.error || 'Gagal menyalin item',
                ErrorCategory.OPERATION,
                ErrorSeverity.ERROR,
                { context: 'copyItems', response }
            );
        }

        return data;
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'copyItems' });
        }
        throw error;
    }
}

/**
 * Bulk rename multiple items
 * @param {Array<{oldPath: string, newName: string}>} renames - Array of rename pairs
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.silent - If true, suppress error notifications
 * @param {number} options.timeout - Custom timeout in ms
 * @returns {Promise<Object>} Promise yang resolve dengan hasil bulk rename
 */
export async function bulkRenameItems(renames, options = {}) {
    const { silent = false, timeout = DEFAULT_TIMEOUT } = options;

    try {
        const response = await fetchWithTimeout(
            'api.php?action=bulk-rename',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    renames: renames,
                }),
            },
            timeout
        );

        const data = await parseResponse(response, 'bulkRenameItems');

        // Allow 207 Multi-Status for partial success
        if (!response.ok && response.status !== 207) {
            throw new FileManagerError(
                data?.error || 'Gagal bulk rename',
                ErrorCategory.OPERATION,
                ErrorSeverity.ERROR,
                { context: 'bulkRenameItems', response }
            );
        }

        return data;
    } catch (error) {
        if (!silent) {
            apiErrorHandler(error, { context: 'bulkRenameItems' });
        }
        throw error;
    }
}

/**
 * Search file contents recursively (grep-like)
 * @param {string} query - Search query (plain text or regex)
 * @param {Object} options - Search options
 * @param {string} options.path - Starting directory path
 * @param {boolean} options.regex - Treat query as regex
 * @param {boolean} options.caseSensitive - Case-sensitive matching
 * @param {string} options.extensions - Comma-separated extension filter (e.g. 'js,php,css')
 * @param {number} options.maxResults - Maximum results (default 100, max 500)
 * @param {number} options.timeout - Custom timeout in ms
 * @param {AbortSignal} options.signal - AbortController signal
 * @returns {Promise<Object>} Search results
 */
export async function searchFiles(query, options = {}) {
    const {
        path = '',
        regex = false,
        caseSensitive = false,
        extensions = '',
        maxResults = 100,
        timeout = 60000,
        signal = null,
    } = options;

    const params = new URLSearchParams({
        action: 'search',
        q: query,
        path: path,
        regex: regex ? '1' : '0',
        case: caseSensitive ? '1' : '0',
        maxResults: String(maxResults),
    });

    if (extensions) {
        params.set('ext', extensions);
    }

    try {
        const fetchOptions = { signal };
        const response = await fetchWithTimeout(
            `api.php?${params.toString()}`,
            fetchOptions,
            timeout
        );

        const data = await parseResponse(response, 'searchFiles');

        if (!response.ok) {
            throw new FileManagerError(
                data?.error || 'Gagal melakukan pencarian',
                ErrorCategory.OPERATION,
                ErrorSeverity.ERROR,
                { context: 'searchFiles', response }
            );
        }

        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw error; // Don't wrap abort errors
        }
        apiErrorHandler(error, { context: 'searchFiles' });
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


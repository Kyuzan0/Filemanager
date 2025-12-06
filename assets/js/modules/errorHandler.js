/**
 * Error Handler Module
 * ====================
 * Centralized error handling for the File Manager application.
 * Provides consistent error categorization, logging, and user-friendly messages.
 */

// Import toast notification system for user feedback
// Toast is available on window object

/**
 * Error Categories for classification
 */
export const ErrorCategory = {
    NETWORK: 'NETWORK',
    VALIDATION: 'VALIDATION',
    FILE_OPERATION: 'FILE_OPERATION',
    PERMISSION: 'PERMISSION',
    NOT_FOUND: 'NOT_FOUND',
    TIMEOUT: 'TIMEOUT',
    SERVER: 'SERVER',
    CLIENT: 'CLIENT',
    UNKNOWN: 'UNKNOWN'
};

/**
 * Error Severity Levels
 */
export const ErrorSeverity = {
    LOW: 'low',         // Minor issues, can be ignored
    MEDIUM: 'medium',   // Issues that affect functionality but not critical
    HIGH: 'high',       // Critical issues that need immediate attention
    CRITICAL: 'critical' // System-breaking issues
};

/**
 * User-friendly error messages by category (Indonesian)
 */
const userFriendlyMessages = {
    [ErrorCategory.NETWORK]: 'Koneksi jaringan bermasalah. Periksa koneksi internet Anda.',
    [ErrorCategory.VALIDATION]: 'Data yang dimasukkan tidak valid.',
    [ErrorCategory.FILE_OPERATION]: 'Operasi file gagal. Silakan coba lagi.',
    [ErrorCategory.PERMISSION]: 'Anda tidak memiliki izin untuk melakukan operasi ini.',
    [ErrorCategory.NOT_FOUND]: 'File atau folder tidak ditemukan.',
    [ErrorCategory.TIMEOUT]: 'Operasi memakan waktu terlalu lama. Silakan coba lagi.',
    [ErrorCategory.SERVER]: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    [ErrorCategory.CLIENT]: 'Terjadi kesalahan pada aplikasi.',
    [ErrorCategory.UNKNOWN]: 'Terjadi kesalahan. Silakan coba lagi.'
};

/**
 * Error log storage for debugging
 */
const errorLog = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Custom Error class for File Manager
 */
export class FileManagerError extends Error {
    /**
     * Create a FileManagerError
     * @param {string} message - Error message
     * @param {string} category - Error category from ErrorCategory
     * @param {Object} options - Additional options
     * @param {string} options.code - Error code
     * @param {string} options.context - Context where error occurred
     * @param {Object} options.details - Additional error details
     * @param {string} options.severity - Error severity from ErrorSeverity
     * @param {Error} options.originalError - Original error if wrapping
     * @param {boolean} options.retry - Whether the operation can be retried
     */
    constructor(message, category = ErrorCategory.UNKNOWN, options = {}) {
        super(message);
        this.name = 'FileManagerError';
        this.category = category;
        this.code = options.code || `ERR_${category}`;
        this.context = options.context || '';
        this.details = options.details || {};
        this.severity = options.severity || ErrorSeverity.MEDIUM;
        this.originalError = options.originalError || null;
        this.retryable = options.retry !== undefined ? options.retry : this._isRetryable();
        this.timestamp = new Date().toISOString();
        this.id = this._generateErrorId();
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FileManagerError);
        }
    }
    
    /**
     * Determine if error is retryable based on category
     * @returns {boolean}
     */
    _isRetryable() {
        const retryableCategories = [
            ErrorCategory.NETWORK,
            ErrorCategory.TIMEOUT,
            ErrorCategory.SERVER
        ];
        return retryableCategories.includes(this.category);
    }
    
    /**
     * Generate unique error ID
     * @returns {string}
     */
    _generateErrorId() {
        return `${this.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get user-friendly message for this error
     * @returns {string}
     */
    getUserMessage() {
        return userFriendlyMessages[this.category] || this.message;
    }
    
    /**
     * Convert error to JSON for logging
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            message: this.message,
            category: this.category,
            code: this.code,
            context: this.context,
            details: this.details,
            severity: this.severity,
            retryable: this.retryable,
            timestamp: this.timestamp,
            stack: this.stack,
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message,
                stack: this.originalError.stack
            } : null
        };
    }
}

/**
 * Categorize an error based on its characteristics
 * @param {Error} error - The error to categorize
 * @returns {string} Error category
 */
export function categorizeError(error) {
    if (!error) return ErrorCategory.UNKNOWN;
    
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    
    // Network errors
    if (
        name === 'typeerror' && message.includes('failed to fetch') ||
        name === 'networkerror' ||
        message.includes('network') ||
        message.includes('fetch') && message.includes('failed') ||
        message.includes('connection') ||
        message.includes('offline') ||
        message.includes('cors') ||
        error.name === 'AbortError'
    ) {
        return ErrorCategory.NETWORK;
    }
    
    // Timeout errors
    if (
        message.includes('timeout') ||
        message.includes('timed out') ||
        name === 'timeouterror'
    ) {
        return ErrorCategory.TIMEOUT;
    }
    
    // Permission errors
    if (
        message.includes('permission') ||
        message.includes('izin') ||
        message.includes('forbidden') ||
        message.includes('unauthorized') ||
        message.includes('403') ||
        message.includes('401')
    ) {
        return ErrorCategory.PERMISSION;
    }
    
    // Not found errors
    if (
        message.includes('not found') ||
        message.includes('tidak ditemukan') ||
        message.includes('404') ||
        message.includes('no such file')
    ) {
        return ErrorCategory.NOT_FOUND;
    }
    
    // Server errors
    if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('server error') ||
        message.includes('internal error')
    ) {
        return ErrorCategory.SERVER;
    }
    
    // Validation errors
    if (
        message.includes('valid') ||
        message.includes('invalid') ||
        message.includes('required') ||
        message.includes('format') ||
        name === 'validationerror'
    ) {
        return ErrorCategory.VALIDATION;
    }
    
    // File operation errors
    if (
        message.includes('file') ||
        message.includes('folder') ||
        message.includes('directory') ||
        message.includes('read') ||
        message.includes('write') ||
        message.includes('delete') ||
        message.includes('move') ||
        message.includes('copy') ||
        message.includes('rename')
    ) {
        return ErrorCategory.FILE_OPERATION;
    }
    
    return ErrorCategory.UNKNOWN;
}

/**
 * Log an error to the error log
 * @param {Error|FileManagerError} error - The error to log
 * @param {string} context - Context where error occurred
 */
export function logError(error, context = '') {
    const errorEntry = error instanceof FileManagerError 
        ? error.toJSON()
        : {
            name: error.name || 'Error',
            message: error.message || String(error),
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            category: categorizeError(error)
        };
    
    // Add to error log
    errorLog.unshift(errorEntry);
    
    // Trim log if too large
    if (errorLog.length > MAX_ERROR_LOG_SIZE) {
        errorLog.length = MAX_ERROR_LOG_SIZE;
    }
    
    // Console logging based on severity
    const severity = errorEntry.severity || ErrorSeverity.MEDIUM;
    const logPrefix = `[ErrorHandler${context ? ` - ${context}` : ''}]`;
    
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
        console.error(logPrefix, errorEntry);
    } else if (severity === ErrorSeverity.MEDIUM) {
        console.warn(logPrefix, errorEntry);
    } else {
        console.log(logPrefix, errorEntry);
    }
    
    // Trigger global error event for external monitoring
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('filemanager:error', { 
            detail: errorEntry 
        }));
    }
    
    return errorEntry;
}

/**
 * Handle an error with user notification
 * @param {Error|FileManagerError} error - The error to handle
 * @param {Object} options - Handling options
 * @param {string} options.context - Context where error occurred
 * @param {boolean} options.silent - If true, don't show toast notification
 * @param {string} options.customMessage - Custom message to show instead of default
 * @param {Function} options.onRetry - Callback for retry action
 * @returns {FileManagerError} The processed error
 */
export function handleError(error, options = {}) {
    const { context = '', silent = false, customMessage = null, onRetry = null } = options;
    
    // Convert to FileManagerError if not already
    let processedError;
    if (error instanceof FileManagerError) {
        processedError = error;
    } else {
        const category = categorizeError(error);
        processedError = new FileManagerError(
            error.message || 'An error occurred',
            category,
            {
                context,
                originalError: error,
                details: { originalName: error.name }
            }
        );
    }
    
    // Log the error
    logError(processedError, context);
    
    // Show user notification unless silent
    if (!silent && typeof window !== 'undefined' && typeof window.showError === 'function') {
        const userMessage = customMessage || processedError.getUserMessage();
        window.showError(userMessage);
        
        // If retryable and onRetry provided, could add retry button in future
    }
    
    return processedError;
}

/**
 * Create an error handler for specific context
 * @param {string} context - The context name
 * @returns {Function} Error handler function
 */
export function createErrorHandler(context) {
    return function contextualErrorHandler(error, options = {}) {
        return handleError(error, { ...options, context });
    };
}

/**
 * Wrap an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, options = {}) {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            handleError(error, options);
            throw error; // Re-throw for caller to handle if needed
        }
    };
}

/**
 * Wrap an async function with error handling that doesn't re-throw
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Error handling options
 * @param {*} options.fallback - Fallback value on error
 * @returns {Function} Wrapped function
 */
export function withErrorBoundary(fn, options = {}) {
    const { fallback = null, ...errorOptions } = options;
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            handleError(error, errorOptions);
            return typeof fallback === 'function' ? fallback(error) : fallback;
        }
    };
}

/**
 * Create a retry wrapper for async functions
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.delay - Initial delay between retries in ms (default: 1000)
 * @param {number} options.backoffMultiplier - Multiplier for exponential backoff (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if should retry (default: checks retryable)
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Function} Wrapped function with retry logic
 */
export function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        delay = 1000,
        backoffMultiplier = 2,
        shouldRetry = (error) => {
            if (error instanceof FileManagerError) {
                return error.retryable;
            }
            const category = categorizeError(error);
            return [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT, ErrorCategory.SERVER]
                .includes(category);
        },
        onRetry = null,
        context = ''
    } = options;
    
    return async function(...args) {
        let lastError;
        let currentDelay = delay;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                lastError = error;
                
                const canRetry = attempt < maxRetries && shouldRetry(error);
                
                if (!canRetry) {
                    throw error;
                }
                
                // Log retry attempt
                console.log(
                    `[ErrorHandler${context ? ` - ${context}` : ''}] ` +
                    `Retry attempt ${attempt + 1}/${maxRetries} after ${currentDelay}ms`
                );
                
                // Call onRetry callback if provided
                if (onRetry) {
                    onRetry(error, attempt + 1, maxRetries);
                }
                
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay *= backoffMultiplier;
            }
        }
        
        throw lastError;
    };
}

/**
 * Create a timeout wrapper for async functions
 * @param {Function} fn - Async function to wrap
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} context - Context for error message
 * @returns {Function} Wrapped function with timeout
 */
export function withTimeout(fn, timeout, context = '') {
    return async function(...args) {
        return Promise.race([
            fn.apply(this, args),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new FileManagerError(
                        `Operation timed out after ${timeout}ms`,
                        ErrorCategory.TIMEOUT,
                        { context, details: { timeout } }
                    ));
                }, timeout);
            })
        ]);
    };
}

/**
 * Get all logged errors
 * @returns {Array} Array of error entries
 */
export function getErrorLog() {
    return [...errorLog];
}

/**
 * Clear the error log
 */
export function clearErrorLog() {
    errorLog.length = 0;
}

/**
 * Get errors by category
 * @param {string} category - Error category
 * @returns {Array} Filtered errors
 */
export function getErrorsByCategory(category) {
    return errorLog.filter(e => e.category === category);
}

/**
 * Get error statistics
 * @returns {Object} Error statistics
 */
export function getErrorStats() {
    const stats = {
        total: errorLog.length,
        byCategory: {},
        bySeverity: {},
        retryable: 0,
        lastError: errorLog[0] || null
    };
    
    errorLog.forEach(error => {
        // Count by category
        const category = error.category || ErrorCategory.UNKNOWN;
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        
        // Count by severity
        const severity = error.severity || ErrorSeverity.MEDIUM;
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        
        // Count retryable
        if (error.retryable) {
            stats.retryable++;
        }
    });
    
    return stats;
}

/**
 * Check if error is of specific category
 * @param {Error} error - Error to check
 * @param {string} category - Expected category
 * @returns {boolean}
 */
export function isErrorCategory(error, category) {
    if (error instanceof FileManagerError) {
        return error.category === category;
    }
    return categorizeError(error) === category;
}

/**
 * Check if error is a network error
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
export function isNetworkError(error) {
    return isErrorCategory(error, ErrorCategory.NETWORK);
}

/**
 * Check if error is a timeout error
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
export function isTimeoutError(error) {
    return isErrorCategory(error, ErrorCategory.TIMEOUT);
}

/**
 * Check if error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
export function isRetryableError(error) {
    if (error instanceof FileManagerError) {
        return error.retryable;
    }
    const category = categorizeError(error);
    return [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT, ErrorCategory.SERVER]
        .includes(category);
}

// Export default error handler instance for convenience
export default {
    ErrorCategory,
    ErrorSeverity,
    FileManagerError,
    handleError,
    logError,
    categorizeError,
    createErrorHandler,
    withErrorHandling,
    withErrorBoundary,
    withRetry,
    withTimeout,
    getErrorLog,
    clearErrorLog,
    getErrorsByCategory,
    getErrorStats,
    isErrorCategory,
    isNetworkError,
    isTimeoutError,
    isRetryableError
};
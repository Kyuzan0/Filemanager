/**
 * Log Manager Module
 * Berisi fungsi-fungsi untuk mengelola log aplikasi
 */

import { config } from './constants.js';

/**
 * Menampilkan log error ke konsol
 * @param {string} message - Pesan error
 * @param {Error|Object} error - Objek error
 */
export function logError(message, error) {
    console.error(`[ERROR] ${message}`, error);
}

/**
 * Menampilkan log warning ke konsol
 * @param {string} message - Pesan warning
 * @param {Object} data - Data tambahan (opsional)
 */
export function logWarning(message, data) {
    console.warn(`[WARNING] ${message}`, data);
}

/**
 * Menampilkan log info ke konsol
 * @param {string} message - Pesan info
 * @param {Object} data - Data tambahan (opsional)
 */
export function logInfo(message, data) {
    console.info(`[INFO] ${message}`, data);
}

/**
 * Menampilkan log debug ke konsol (hanya jika mode debug aktif)
 * @param {string} message - Pesan debug
 * @param {Object} data - Data tambahan (opsional)
 */
export function logDebug(message, data) {
    if (config.debug) {
        console.debug(`[DEBUG] ${message}`, data);
    }
}

/**
 * Menampilkan log dengan timestamp
 * @param {string} level - Level log (ERROR, WARNING, INFO, DEBUG)
 * @param {string} message - Pesan log
 * @param {Object} data - Data tambahan (opsional)
 */
export function logWithTimestamp(level, message, data) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    switch (level) {
        case 'ERROR':
            console.error(logMessage, data);
            break;
        case 'WARNING':
            console.warn(logMessage, data);
            break;
        case 'INFO':
            console.info(logMessage, data);
            break;
        case 'DEBUG':
            if (config.debug) {
                console.debug(logMessage, data);
            }
            break;
        default:
            console.log(logMessage, data);
    }
}

/**
 * Membuat objek logger dengan namespace
 * @param {string} namespace - Namespace untuk logger
 * @returns {Object} Objek logger dengan namespace
 */
export function createLogger(namespace) {
    return {
        error: (message, data) => logError(`[${namespace}] ${message}`, data),
        warning: (message, data) => logWarning(`[${namespace}] ${message}`, data),
        info: (message, data) => logInfo(`[${namespace}] ${message}`, data),
        debug: (message, data) => logDebug(`[${namespace}] ${message}`, data),
        log: (level, message, data) => logWithTimestamp(level, `[${namespace}] ${message}`, data)
    };
}

/**
 * Logger untuk operasi API
 */
export const apiLogger = createLogger('API');

/**
 * Logger untuk operasi UI
 */
export const uiLogger = createLogger('UI');

/**
 * Logger untuk operasi file
 */
export const fileLogger = createLogger('FILE');

/**
 * Logger untuk operasi drag & drop
 */
export const dragDropLogger = createLogger('DRAG_DROP');

/**
 * Logger untuk operasi modal
 */
export const modalLogger = createLogger('MODAL');

/**
 * Logger untuk operasi state
 */
export const stateLogger = createLogger('STATE');

/**
 * Logger untuk operasi event
 */
export const eventLogger = createLogger('EVENT');

/**
 * Fungsi untuk mengukur performa operasi
 * @param {string} operationName - Nama operasi yang diukur
 * @param {Function} operation - Fungsi operasi yang akan diukur
 * @param {Object} logger - Logger yang digunakan (opsional)
 * @returns {Promise} Hasil operasi
 */
export async function measurePerformance(operationName, operation, logger = logInfo) {
    const startTime = performance.now();
    logger(`Starting ${operationName}`);
    
    try {
        const result = await operation();
        const endTime = performance.now();
        const duration = endTime - startTime;
        logger(`${operationName} completed in ${duration.toFixed(2)}ms`);
        return result;
    } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        logError(`${operationName} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
    }
}

/**
 * Fungsi untuk membuat log error yang lebih detail
 * @param {Error} error - Objek error
 * @param {string} context - Konteks error
 * @param {Object} additionalData - Data tambahan (opsional)
 */
export function logDetailedError(error, context, additionalData = {}) {
    const errorDetails = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    
    logError(`Detailed error in ${context}`, errorDetails);
}

/**
 * Fungsi untuk log operasi jaringan
 * @param {string} url - URL yang diakses
 * @param {Object} options - Opsi request
 * @param {Response} response - Response dari server
 * @param {number} duration - Durasi request dalam ms
 */
export function logNetworkOperation(url, options, response, duration) {
    const logData = {
        url,
        method: options.method || 'GET',
        status: response.status,
        statusText: response.statusText,
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
    };
    
    if (response.ok) {
        apiLogger.info('Network request successful', logData);
    } else {
        apiLogger.warning('Network request failed', logData);
    }
}

/**
 * Fungsi untuk log operasi file
 * @param {string} operation - Jenis operasi (create, read, update, delete)
 * @param {string} path - Path file
 * @param {boolean} success - Status operasi
 * @param {Object} additionalData - Data tambahan (opsional)
 */
export function logFileOperation(operation, path, success, additionalData = {}) {
    const logData = {
        operation,
        path,
        success,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    
    if (success) {
        fileLogger.info(`File ${operation} successful`, logData);
    } else {
        fileLogger.error(`File ${operation} failed`, logData);
    }
}

/**
 * Fungsi untuk log operasi UI
 * @param {string} component - Nama komponen
 * @param {string} action - Aksi yang dilakukan
 * @param {Object} additionalData - Data tambahan (opsional)
 */
export function logUIOperation(component, action, additionalData = {}) {
    const logData = {
        component,
        action,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    
    uiLogger.info(`UI operation: ${component}.${action}`, logData);
}

/**
 * Fungsi untuk log operasi state
 * @param {string} action - Aksi state (get, set, update)
 * @param {string} key - Key state
 * @param {*} value - Nilai state (opsional)
 * @param {Object} additionalData - Data tambahan (opsional)
 */
export function logStateOperation(action, key, value = null, additionalData = {}) {
    const logData = {
        action,
        key,
        value,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    
    stateLogger.debug(`State operation: ${action}.${key}`, logData);
}

/**
 * Fungsi untuk log operasi event
 * @param {string} eventType - Tipe event
 * @param {string} target - Target event
 * @param {Object} additionalData - Data tambahan (opsional)
 */
export function logEventOperation(eventType, target, additionalData = {}) {
    const logData = {
        eventType,
        target,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    
    eventLogger.debug(`Event: ${eventType} on ${target}`, logData);
}

/**
 * Fungsi untuk log operasi modal
 * @param {string} modalType - Tipe modal
 * @param {string} action - Aksi modal (open, close)
 * @param {Object} additionalData - Data tambahan (opsional)
 */
export function logModalOperation(modalType, action, additionalData = {}) {
    const logData = {
        modalType,
        action,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    
    modalLogger.info(`Modal operation: ${action} ${modalType}`, logData);
}

/**
 * Fungsi untuk log operasi drag & drop
 * @param {string} operation - Jenis operasi (drag, drop)
 * @param {string} source - Sumber drag/drop
 * @param {string} target - Target drag/drop (opsional)
 * @param {Object} additionalData - Data tambahan (opsional)
 */
export function logDragDropOperation(operation, source, target = null, additionalData = {}) {
    const logData = {
        operation,
        source,
        target,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    
    dragDropLogger.info(`Drag & drop operation: ${operation}`, logData);
}

/**
 * Fungsi untuk membuat log audit trail
 * @param {string} action - Aksi yang dilakukan
 * @param {string} user - User yang melakukan aksi (opsional)
 * @param {Object} details - Detail aksi
 */
export function logAuditTrail(action, user = null, details = {}) {
    const auditData = {
        action,
        user: user || 'anonymous',
        timestamp: new Date().toISOString(),
        details
    };
    
    logInfo(`Audit trail: ${action}`, auditData);
}

/**
 * Fungsi untuk export log ke file (jika diperlukan)
 * @param {Array} logs - Array log yang akan diexport
 * @param {string} filename - Nama file output
 */
export function exportLogsToFile(logs, filename = 'logs.json') {
    try {
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        logInfo(`Logs exported to ${filename}`);
    } catch (error) {
        logError('Failed to export logs', error);
    }
}

/**
 * Fungsi untuk membersihkan log lama (jika diperlukan)
 * @param {number} maxAge - Maksimal umur log dalam hari
 */
export function cleanupOldLogs(maxAge = 30) {
    // Implementasi untuk membersihkan log lama
    // Ini bisa disesuaikan dengan kebutuhan aplikasi
    logInfo(`Cleaning up logs older than ${maxAge} days`);
}
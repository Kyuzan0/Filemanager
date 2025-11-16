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

/**
 * Format log entry untuk ditampilkan di tabel
 * @param {Object} log - Log entry
 * @returns {Object} Formatted log entry
 */
export function formatLogEntry(log) {
    const date = new Date(log.timestamp);
    const formattedDate = date.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const actionLabels = {
        'create': 'Buat',
        'delete': 'Hapus',
        'move': 'Pindah',
        'rename': 'Ubah Nama',
        'upload': 'Unggah',
        'download': 'Unduh',
        'read': 'Baca',
        'copy': 'Salin',
        'unknown': 'Tidak Diketahui'
    };
    
    const typeLabels = {
        'file': 'File',
        'folder': 'Folder',
        'unknown': 'Tidak Diketahui'
    };
    
    return {
        ...log,
        formattedDate: formattedDate,
        actionLabel: actionLabels[log.action] || actionLabels['unknown'],
        typeLabel: typeLabels[log.target_type] || typeLabels['unknown']
    };
}

/**
 * Render log table dengan data yang diberikan
 * @param {Array} logs - Array log entries
 * @param {HTMLElement} logTableBody - Table body element
 * @param {HTMLElement} logEmpty - Empty state element
 */
export function renderLogTable(logs, logTableBody, logEmpty) {
    console.log('[DEBUG] renderLogTable called with logs:', logs);
    
    if (!logTableBody) {
        console.error('[DEBUG] logTableBody element not found');
        return;
    }
    
    if (!logs || logs.length === 0) {
        logTableBody.innerHTML = '';
        if (logEmpty) {
            logEmpty.hidden = false;
        }
        return;
    }
    
    if (logEmpty) {
        logEmpty.hidden = true;
    }
    
    logTableBody.innerHTML = '';
    
    logs.forEach(log => {
        const formattedLog = formatLogEntry(log);
        const row = document.createElement('tr');
        
        // Timestamp cell
        const timeCell = document.createElement('td');
        timeCell.textContent = formattedLog.formattedDate;
        timeCell.setAttribute('data-label', 'Waktu');
        row.appendChild(timeCell);
        
        // Action cell
        const actionCell = document.createElement('td');
        actionCell.textContent = formattedLog.actionLabel;
        actionCell.setAttribute('data-label', 'Aksi');
        actionCell.classList.add('log-action', `log-action-${log.action}`);
        row.appendChild(actionCell);
        
        // Type cell
        const typeCell = document.createElement('td');
        typeCell.textContent = formattedLog.typeLabel;
        typeCell.setAttribute('data-label', 'Tipe');
        row.appendChild(typeCell);
        
        // Path cell
        const pathCell = document.createElement('td');
        pathCell.textContent = log.target_path || '-';
        pathCell.setAttribute('data-label', 'Path');
        pathCell.classList.add('log-path');
        row.appendChild(pathCell);
        
        // Details cell
        const detailsCell = document.createElement('td');
        detailsCell.textContent = log.details || '-';
        detailsCell.setAttribute('data-label', 'Detail');
        detailsCell.classList.add('log-details');
        row.appendChild(detailsCell);
        
        logTableBody.appendChild(row);
    });
    
    console.log('[DEBUG] Rendered', logs.length, 'log entries');
}

/**
 * Export logs to CSV format
 * @param {Array} logs - Array log entries
 * @returns {string} CSV content
 */
export function exportLogsToCSV(logs) {
    if (!logs || logs.length === 0) {
        return '';
    }
    
    // CSV header
    const headers = ['Waktu', 'Aksi', 'Tipe', 'Path', 'Detail'];
    let csv = headers.join(',') + '\n';
    
    // CSV rows
    logs.forEach(log => {
        const formattedLog = formatLogEntry(log);
        const row = [
            `"${formattedLog.formattedDate}"`,
            `"${formattedLog.actionLabel}"`,
            `"${formattedLog.typeLabel}"`,
            `"${log.target_path || '-'}"`,
            `"${log.details || '-'}"`
        ];
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

/**
 * Export logs to JSON format
 * @param {Array} logs - Array log entries
 * @returns {string} JSON content
 */
export function exportLogsToJSON(logs) {
    return JSON.stringify(logs, null, 2);
}

/**
 * Download exported logs
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
export function downloadLogFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    logInfo(`Logs exported to ${filename}`);
}

/**
 * Apply log filters and fetch filtered data
 * @param {Object} state - Application state
 * @param {Function} fetchLogDataCallback - Callback to fetch log data
 */
export function applyLogFilter(state, fetchLogDataCallback) {
    const filterSelect = document.getElementById('log-filter');
    const startDateInput = document.getElementById('log-start-date');
    const endDateInput = document.getElementById('log-end-date');
    const targetTypeSelect = document.getElementById('log-target-type');
    const pathSearchInput = document.getElementById('log-path-search');
    const sortBySelect = document.getElementById('log-sort-by');
    const sortOrderSelect = document.getElementById('log-sort-order');
    
    // Build filter object
    const filters = {};
    
    if (filterSelect && filterSelect.value) {
        filters.log_action = filterSelect.value;
    }
    
    if (startDateInput && startDateInput.value) {
        filters.start_date = startDateInput.value;
    }
    
    if (endDateInput && endDateInput.value) {
        filters.end_date = endDateInput.value;
    }
    
    if (targetTypeSelect && targetTypeSelect.value) {
        filters.target_type = targetTypeSelect.value;
    }
    
    if (pathSearchInput && pathSearchInput.value) {
        filters.path_search = pathSearchInput.value;
    }
    
    if (sortBySelect && sortBySelect.value) {
        filters.sort_by = sortBySelect.value;
    }
    
    if (sortOrderSelect && sortOrderSelect.value) {
        filters.sort_order = sortOrderSelect.value;
    }
    
    // Reset to first page when applying new filters
    state.logs.currentPage = 1;
    state.logs.activeFilters = filters;
    
    // Add visual feedback for active filters
    updateActiveFiltersDisplay(filters);
    
    // Fetch data with new filters
    if (fetchLogDataCallback) {
        fetchLogDataCallback(filters);
    }
}

/**
 * Update active filters display
 * @param {Object} filters - Active filters
 */
export function updateActiveFiltersDisplay(filters) {
    const activeFiltersContainer = document.getElementById('active-filters-display');
    if (!activeFiltersContainer) return;
    
    // Clear existing badges
    activeFiltersContainer.innerHTML = '';
    
    // If no filters, hide the container
    if (Object.keys(filters).length === 0) {
        activeFiltersContainer.style.display = 'none';
        return;
    }
    
    // Show container and add badges for active filters
    activeFiltersContainer.style.display = 'flex';
    
    // Create badge for each active filter
    Object.entries(filters).forEach(([key, value]) => {
        if (!value) return;
        
        const badge = document.createElement('div');
        badge.classList.add('active-filter-badge');
        
        // Get readable label for the filter
        let label = '';
        switch(key) {
            case 'log_action':
                label = `Action: ${value}`;
                break;
            case 'start_date':
                label = `From: ${value}`;
                break;
            case 'end_date':
                label = `To: ${value}`;
                break;
            case 'target_type':
                label = `Type: ${value}`;
                break;
            case 'path_search':
                label = `Path: ${value}`;
                break;
            case 'sort_by':
                label = `Sort: ${value}`;
                break;
            case 'sort_order':
                label = `Order: ${value}`;
                break;
            default:
                label = `${key}: ${value}`;
        }
        
        badge.textContent = label;
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-filter');
        removeBtn.type = 'button';
        removeBtn.classList.add('btn');
        removeBtn.innerHTML = '&times;';
        removeBtn.setAttribute('aria-label', `Remove ${label} filter`);
        removeBtn.addEventListener('click', () => {
            // Remove this specific filter
            const inputElement = document.getElementById(`log-${key.replace('_', '-')}`);
            if (inputElement) {
                if (inputElement.tagName === 'SELECT') {
                    inputElement.selectedIndex = 0;
                } else {
                    inputElement.value = '';
                }
            }
            
            // Rebuild and re-apply filters
            const updatedFilters = { ...filters };
            delete updatedFilters[key];
            updateActiveFiltersDisplay(updatedFilters);
        });
        
        badge.appendChild(removeBtn);
        activeFiltersContainer.appendChild(badge);
    });
}


/**
 * Cleanup old logs with confirmation
 * @param {number} days - Number of days to keep logs
 * @param {Function} cleanupLogsCallback - API callback to cleanup logs
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export async function performLogCleanup(days, cleanupLogsCallback, onSuccess, onError) {
    try {
        logInfo(`Starting log cleanup for logs older than ${days} days`);
        const result = await cleanupLogsCallback(days);
        
        if (result.success) {
            const message = `Berhasil membersihkan ${result.deleted || 0} log entry`;
            logInfo(message);
            if (onSuccess) {
                onSuccess(message, result.deleted);
            }
        } else {
            throw new Error(result.error || 'Gagal membersihkan log');
        }
    } catch (error) {
        logError('Failed to cleanup logs', error);
        if (onError) {
            onError(error.message || 'Gagal membersihkan log');
        }
    }
}

/**
 * Setup auto-refresh for log data
 * @param {Object} state - Application state
 * @param {Function} fetchCallback - Callback to fetch log data
 * @param {number} interval - Refresh interval in milliseconds (default: 30000 = 30 seconds)
 */
export function setupLogAutoRefresh(state, fetchCallback, interval = 30000) {
    // Clear existing interval if any
    if (state.logs.refreshInterval) {
        clearInterval(state.logs.refreshInterval);
        state.logs.refreshInterval = null;
    }
    
    // Setup new interval
    state.logs.refreshInterval = setInterval(() => {
        if (state.logs.isOpen && !state.logs.isLoading) {
            logDebug('Auto-refreshing log data');
            fetchCallback();
        }
    }, interval);
    
    logInfo(`Auto-refresh enabled with ${interval}ms interval`);
}

/**
 * Stop auto-refresh for log data
 * @param {Object} state - Application state
 */
export function stopLogAutoRefresh(state) {
    if (state.logs.refreshInterval) {
        clearInterval(state.logs.refreshInterval);
        state.logs.refreshInterval = null;
        logInfo('Auto-refresh disabled');
    }
}

/**
 * Toggle auto-refresh on/off
 * @param {Object} state - Application state
 * @param {Function} fetchCallback - Callback to fetch log data
 * @param {number} interval - Refresh interval in milliseconds
 * @returns {boolean} New state of auto-refresh (true if enabled, false if disabled)
 */
export function toggleLogAutoRefresh(state, fetchCallback, interval = 30000) {
    if (state.logs.refreshInterval) {
        stopLogAutoRefresh(state);
        return false;
    } else {
        setupLogAutoRefresh(state, fetchCallback, interval);
        return true;
    }
}
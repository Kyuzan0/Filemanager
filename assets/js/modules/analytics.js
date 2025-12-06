/**
 * Analytics Module
 * Privacy-respecting analytics for file operations tracking.
 * All data is stored locally - no external services.
 * 
 * @module analytics
 */

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'filemanager_analytics';
const SESSION_KEY = 'filemanager_session';
const MAX_EVENTS = 1000; // Maximum events to store
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Event categories for organization
 */
export const EventCategory = {
    FILE_OPERATION: 'file_operation',
    NAVIGATION: 'navigation',
    ERROR: 'error',
    PERFORMANCE: 'performance',
    UI_INTERACTION: 'ui_interaction'
};

/**
 * Event types for file operations
 */
export const EventType = {
    // File operations
    FILE_CREATE: 'file_create',
    FILE_DELETE: 'file_delete',
    FILE_RENAME: 'file_rename',
    FILE_MOVE: 'file_move',
    FILE_UPLOAD: 'file_upload',
    FILE_DOWNLOAD: 'file_download',
    FILE_SAVE: 'file_save',
    FILE_PREVIEW: 'file_preview',
    
    // Folder operations
    FOLDER_CREATE: 'folder_create',
    FOLDER_DELETE: 'folder_delete',
    FOLDER_RENAME: 'folder_rename',
    FOLDER_MOVE: 'folder_move',
    
    // Navigation
    DIRECTORY_CHANGE: 'directory_change',
    SEARCH_QUERY: 'search_query',
    BREADCRUMB_CLICK: 'breadcrumb_click',
    
    // Errors
    API_ERROR: 'api_error',
    UPLOAD_ERROR: 'upload_error',
    VALIDATION_ERROR: 'validation_error',
    
    // Performance
    PAGE_LOAD: 'page_load',
    API_RESPONSE: 'api_response',
    RENDER_TIME: 'render_time',
    
    // UI
    THEME_CHANGE: 'theme_change',
    VIEW_MODE_CHANGE: 'view_mode_change',
    KEYBOARD_SHORTCUT: 'keyboard_shortcut'
};

// ============================================================================
// State
// ============================================================================

let analyticsEnabled = true;
let sessionId = null;
let sessionStart = null;
let pageLoadTime = null;

// ============================================================================
// Session Management
// ============================================================================

/**
 * Generate a unique session ID
 * @returns {string} Unique session identifier
 */
const generateSessionId = () => {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * Initialize or restore session
 * @returns {Object} Session data
 */
const initSession = () => {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            const session = JSON.parse(stored);
            const elapsed = Date.now() - session.lastActivity;
            
            if (elapsed < SESSION_TIMEOUT) {
                sessionId = session.id;
                sessionStart = session.start;
                updateSessionActivity();
                return session;
            }
        }
    } catch (e) {
        console.warn('Failed to restore session:', e);
    }
    
    // Create new session
    sessionId = generateSessionId();
    sessionStart = Date.now();
    
    const session = {
        id: sessionId,
        start: sessionStart,
        lastActivity: Date.now()
    };
    
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
        console.warn('Failed to save session:', e);
    }
    
    return session;
};

/**
 * Update session last activity time
 */
const updateSessionActivity = () => {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            const session = JSON.parse(stored);
            session.lastActivity = Date.now();
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    } catch (e) {
        // Ignore session update errors
    }
};

/**
 * Get current session duration in seconds
 * @returns {number} Duration in seconds
 */
export const getSessionDuration = () => {
    if (!sessionStart) return 0;
    return Math.round((Date.now() - sessionStart) / 1000);
};

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Load analytics data from localStorage
 * @returns {Object} Analytics data
 */
const loadAnalyticsData = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load analytics data:', e);
    }
    
    return {
        events: [],
        stats: {
            totalEvents: 0,
            sessionCount: 0,
            firstSeen: Date.now(),
            lastSeen: Date.now()
        }
    };
};

/**
 * Save analytics data to localStorage
 * @param {Object} data - Analytics data to save
 */
const saveAnalyticsData = (data) => {
    try {
        // Trim events if exceeding max
        if (data.events.length > MAX_EVENTS) {
            data.events = data.events.slice(-MAX_EVENTS);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save analytics data:', e);
        
        // Try to clear old events and retry
        try {
            data.events = data.events.slice(-100);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e2) {
            // Storage is really full, give up
        }
    }
};

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track an analytics event
 * @param {string} type - Event type from EventType
 * @param {string} category - Event category from EventCategory
 * @param {Object} data - Additional event data
 */
export const trackEvent = (type, category, data = {}) => {
    if (!analyticsEnabled) return;
    
    updateSessionActivity();
    
    const event = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        type,
        category,
        timestamp: Date.now(),
        sessionId,
        data: sanitizeEventData(data)
    };
    
    const analytics = loadAnalyticsData();
    analytics.events.push(event);
    analytics.stats.totalEvents++;
    analytics.stats.lastSeen = Date.now();
    
    saveAnalyticsData(analytics);
    
    // Debug logging in development
    if (window.DEBUG_ANALYTICS) {
        console.log('[Analytics]', type, category, data);
    }
};

/**
 * Sanitize event data to remove sensitive information
 * @param {Object} data - Raw event data
 * @returns {Object} Sanitized data
 */
const sanitizeEventData = (data) => {
    const sanitized = { ...data };
    
    // Remove potentially sensitive fields
    delete sanitized.content;
    delete sanitized.password;
    delete sanitized.token;
    
    // Truncate long strings
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
            sanitized[key] = sanitized[key].substring(0, 200) + '...';
        }
    });
    
    return sanitized;
};

// ============================================================================
// File Operation Tracking
// ============================================================================

/**
 * Track file creation
 * @param {string} name - File/folder name
 * @param {string} type - 'file' or 'folder'
 * @param {string} path - Parent path
 */
export const trackFileCreate = (name, type, path) => {
    const eventType = type === 'folder' ? EventType.FOLDER_CREATE : EventType.FILE_CREATE;
    trackEvent(eventType, EventCategory.FILE_OPERATION, {
        name,
        type,
        path,
        extension: type === 'file' ? getExtension(name) : null
    });
};

/**
 * Track file deletion
 * @param {string} name - File/folder name
 * @param {string} type - 'file' or 'folder'
 * @param {string} path - File path
 */
export const trackFileDelete = (name, type, path) => {
    const eventType = type === 'folder' ? EventType.FOLDER_DELETE : EventType.FILE_DELETE;
    trackEvent(eventType, EventCategory.FILE_OPERATION, {
        name,
        type,
        path
    });
};

/**
 * Track file rename
 * @param {string} oldName - Original name
 * @param {string} newName - New name
 * @param {string} type - 'file' or 'folder'
 */
export const trackFileRename = (oldName, newName, type) => {
    const eventType = type === 'folder' ? EventType.FOLDER_RENAME : EventType.FILE_RENAME;
    trackEvent(eventType, EventCategory.FILE_OPERATION, {
        oldName,
        newName,
        type
    });
};

/**
 * Track file move
 * @param {string} name - File/folder name
 * @param {string} fromPath - Source path
 * @param {string} toPath - Destination path
 * @param {string} type - 'file' or 'folder'
 */
export const trackFileMove = (name, fromPath, toPath, type) => {
    const eventType = type === 'folder' ? EventType.FOLDER_MOVE : EventType.FILE_MOVE;
    trackEvent(eventType, EventCategory.FILE_OPERATION, {
        name,
        fromPath,
        toPath,
        type
    });
};

/**
 * Track file upload
 * @param {string} name - File name
 * @param {number} size - File size in bytes
 * @param {string} path - Upload path
 */
export const trackFileUpload = (name, size, path) => {
    trackEvent(EventType.FILE_UPLOAD, EventCategory.FILE_OPERATION, {
        name,
        size,
        path,
        extension: getExtension(name)
    });
};

/**
 * Track bulk upload
 * @param {number} count - Number of files uploaded
 * @param {number} totalSize - Total size in bytes
 * @param {string} path - Upload path
 */
export const trackBulkUpload = (count, totalSize, path) => {
    trackEvent(EventType.FILE_UPLOAD, EventCategory.FILE_OPERATION, {
        count,
        totalSize,
        path,
        bulk: true
    });
};

/**
 * Track file download
 * @param {string} name - File name
 * @param {number} size - File size in bytes
 */
export const trackFileDownload = (name, size) => {
    trackEvent(EventType.FILE_DOWNLOAD, EventCategory.FILE_OPERATION, {
        name,
        size,
        extension: getExtension(name)
    });
};

/**
 * Track file save (edit)
 * @param {string} name - File name
 * @param {number} size - New file size in bytes
 */
export const trackFileSave = (name, size) => {
    trackEvent(EventType.FILE_SAVE, EventCategory.FILE_OPERATION, {
        name,
        size,
        extension: getExtension(name)
    });
};

/**
 * Track file preview
 * @param {string} name - File name
 * @param {string} type - Preview type (image, video, code, etc.)
 */
export const trackFilePreview = (name, type) => {
    trackEvent(EventType.FILE_PREVIEW, EventCategory.FILE_OPERATION, {
        name,
        previewType: type,
        extension: getExtension(name)
    });
};

// ============================================================================
// Navigation Tracking
// ============================================================================

/**
 * Track directory change
 * @param {string} path - New directory path
 * @param {string} method - Navigation method (click, breadcrumb, back, url)
 */
export const trackDirectoryChange = (path, method = 'click') => {
    trackEvent(EventType.DIRECTORY_CHANGE, EventCategory.NAVIGATION, {
        path,
        method,
        depth: path ? path.split('/').length : 0
    });
};

/**
 * Track search query
 * @param {string} query - Search query
 * @param {number} resultCount - Number of results
 */
export const trackSearch = (query, resultCount) => {
    trackEvent(EventType.SEARCH_QUERY, EventCategory.NAVIGATION, {
        queryLength: query.length,
        resultCount,
        hasResults: resultCount > 0
    });
};

/**
 * Track breadcrumb navigation
 * @param {string} path - Target path
 * @param {number} index - Breadcrumb index clicked
 */
export const trackBreadcrumbClick = (path, index) => {
    trackEvent(EventType.BREADCRUMB_CLICK, EventCategory.NAVIGATION, {
        path,
        index
    });
};

// ============================================================================
// Error Tracking
// ============================================================================

/**
 * Track API error
 * @param {string} action - API action that failed
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
export const trackApiError = (action, message, statusCode) => {
    trackEvent(EventType.API_ERROR, EventCategory.ERROR, {
        action,
        message: message.substring(0, 200),
        statusCode
    });
};

/**
 * Track upload error
 * @param {string} filename - File that failed to upload
 * @param {string} reason - Error reason
 */
export const trackUploadError = (filename, reason) => {
    trackEvent(EventType.UPLOAD_ERROR, EventCategory.ERROR, {
        filename,
        reason,
        extension: getExtension(filename)
    });
};

/**
 * Track validation error
 * @param {string} field - Field that failed validation
 * @param {string} reason - Validation error reason
 */
export const trackValidationError = (field, reason) => {
    trackEvent(EventType.VALIDATION_ERROR, EventCategory.ERROR, {
        field,
        reason
    });
};

// ============================================================================
// Performance Tracking
// ============================================================================

/**
 * Track page load performance
 */
export const trackPageLoad = () => {
    if (pageLoadTime) return; // Already tracked
    
    pageLoadTime = Date.now();
    
    // Use Performance API if available
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        
        if (loadTime > 0) {
            trackEvent(EventType.PAGE_LOAD, EventCategory.PERFORMANCE, {
                loadTime,
                domReady,
                redirectTime: timing.redirectEnd - timing.redirectStart,
                dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
                tcpTime: timing.connectEnd - timing.connectStart,
                responseTime: timing.responseEnd - timing.requestStart
            });
        }
    }
};

/**
 * Track API response time
 * @param {string} action - API action
 * @param {number} duration - Response time in ms
 * @param {boolean} success - Whether request succeeded
 */
export const trackApiResponse = (action, duration, success) => {
    trackEvent(EventType.API_RESPONSE, EventCategory.PERFORMANCE, {
        action,
        duration,
        success
    });
};

/**
 * Track render time
 * @param {string} component - Component that was rendered
 * @param {number} duration - Render time in ms
 * @param {number} itemCount - Number of items rendered
 */
export const trackRenderTime = (component, duration, itemCount) => {
    trackEvent(EventType.RENDER_TIME, EventCategory.PERFORMANCE, {
        component,
        duration,
        itemCount
    });
};

/**
 * Create a performance timer
 * @returns {Function} Function to call when operation completes
 */
export const startTimer = () => {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
};

// ============================================================================
// UI Tracking
// ============================================================================

/**
 * Track theme change
 * @param {string} theme - New theme (light, dark, system)
 */
export const trackThemeChange = (theme) => {
    trackEvent(EventType.THEME_CHANGE, EventCategory.UI_INTERACTION, {
        theme
    });
};

/**
 * Track view mode change
 * @param {string} mode - New view mode (list, grid)
 */
export const trackViewModeChange = (mode) => {
    trackEvent(EventType.VIEW_MODE_CHANGE, EventCategory.UI_INTERACTION, {
        mode
    });
};

/**
 * Track keyboard shortcut usage
 * @param {string} shortcut - Shortcut used (e.g., 'ctrl+n')
 * @param {string} action - Action performed
 */
export const trackKeyboardShortcut = (shortcut, action) => {
    trackEvent(EventType.KEYBOARD_SHORTCUT, EventCategory.UI_INTERACTION, {
        shortcut,
        action
    });
};

// ============================================================================
// Statistics & Aggregation
// ============================================================================

/**
 * Get usage statistics
 * @returns {Object} Aggregated statistics
 */
export const getStatistics = () => {
    const analytics = loadAnalyticsData();
    const events = analytics.events;
    
    // Count events by type
    const eventCounts = {};
    events.forEach(event => {
        eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });
    
    // Count events by category
    const categoryCounts = {};
    events.forEach(event => {
        categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
    });
    
    // Get recent errors
    const recentErrors = events
        .filter(e => e.category === EventCategory.ERROR)
        .slice(-10);
    
    // Calculate average API response time
    const apiResponses = events
        .filter(e => e.type === EventType.API_RESPONSE && e.data.duration)
        .map(e => e.data.duration);
    const avgApiTime = apiResponses.length > 0
        ? Math.round(apiResponses.reduce((a, b) => a + b, 0) / apiResponses.length)
        : 0;
    
    // Get file type distribution
    const fileTypes = {};
    events
        .filter(e => e.category === EventCategory.FILE_OPERATION && e.data.extension)
        .forEach(e => {
            const ext = e.data.extension.toLowerCase();
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        });
    
    // Calculate date range
    const timestamps = events.map(e => e.timestamp);
    const firstEvent = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const lastEvent = timestamps.length > 0 ? Math.max(...timestamps) : null;
    
    return {
        totalEvents: events.length,
        eventCounts,
        categoryCounts,
        recentErrors,
        performance: {
            avgApiResponseTime: avgApiTime,
            pageLoadTime: pageLoadTime
        },
        fileTypes,
        dateRange: {
            first: firstEvent,
            last: lastEvent
        },
        sessionDuration: getSessionDuration(),
        stats: analytics.stats
    };
};

/**
 * Get events filtered by criteria
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered events
 */
export const getEvents = (filters = {}) => {
    const analytics = loadAnalyticsData();
    let events = analytics.events;
    
    if (filters.type) {
        events = events.filter(e => e.type === filters.type);
    }
    
    if (filters.category) {
        events = events.filter(e => e.category === filters.category);
    }
    
    if (filters.since) {
        events = events.filter(e => e.timestamp >= filters.since);
    }
    
    if (filters.until) {
        events = events.filter(e => e.timestamp <= filters.until);
    }
    
    if (filters.limit) {
        events = events.slice(-filters.limit);
    }
    
    return events;
};

// ============================================================================
// Export & Management
// ============================================================================

/**
 * Export analytics data as JSON
 * @returns {string} JSON string of analytics data
 */
export const exportData = () => {
    const analytics = loadAnalyticsData();
    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        stats: getStatistics(),
        events: analytics.events
    }, null, 2);
};

/**
 * Clear all analytics data
 */
export const clearData = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
        console.warn('Failed to clear analytics data:', e);
    }
    
    // Reinitialize session
    initSession();
};

/**
 * Enable analytics tracking
 */
export const enable = () => {
    analyticsEnabled = true;
};

/**
 * Disable analytics tracking
 */
export const disable = () => {
    analyticsEnabled = false;
};

/**
 * Check if analytics is enabled
 * @returns {boolean} Whether analytics is enabled
 */
export const isEnabled = () => analyticsEnabled;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string|null} File extension or null
 */
const getExtension = (filename) => {
    if (!filename) return null;
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : null;
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize analytics module
 */
export const init = () => {
    initSession();
    
    // Track page load after window loads
    if (document.readyState === 'complete') {
        setTimeout(trackPageLoad, 0);
    } else {
        window.addEventListener('load', () => {
            setTimeout(trackPageLoad, 100);
        });
    }
    
    // Increment session count on first load
    const analytics = loadAnalyticsData();
    if (!sessionStorage.getItem('session_counted')) {
        analytics.stats.sessionCount++;
        saveAnalyticsData(analytics);
        sessionStorage.setItem('session_counted', 'true');
    }
};

// Auto-initialize
init();

// ============================================================================
// Default Export
// ============================================================================

export default {
    // Event tracking
    trackEvent,
    trackFileCreate,
    trackFileDelete,
    trackFileRename,
    trackFileMove,
    trackFileUpload,
    trackBulkUpload,
    trackFileDownload,
    trackFileSave,
    trackFilePreview,
    
    // Navigation
    trackDirectoryChange,
    trackSearch,
    trackBreadcrumbClick,
    
    // Errors
    trackApiError,
    trackUploadError,
    trackValidationError,
    
    // Performance
    trackPageLoad,
    trackApiResponse,
    trackRenderTime,
    startTimer,
    
    // UI
    trackThemeChange,
    trackViewModeChange,
    trackKeyboardShortcut,
    
    // Statistics
    getStatistics,
    getEvents,
    getSessionDuration,
    
    // Management
    exportData,
    clearData,
    enable,
    disable,
    isEnabled,
    
    // Constants
    EventCategory,
    EventType
};
/**
 * Security Module
 * Client-side security utilities for input validation, XSS prevention, and audit logging.
 * 
 * @module security
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Characters not allowed in file names
 */
const FORBIDDEN_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/**
 * Patterns that indicate directory traversal attempts
 */
const TRAVERSAL_PATTERNS = [
    /\.\./,           // Parent directory
    /^\/+/,           // Leading slashes
    /^[a-zA-Z]:/,     // Windows drive letters
    /%2e%2e/i,        // URL encoded ..
    /%252e%252e/i,    // Double URL encoded ..
    /\.\.%2f/i,       // Mixed encoding
    /\.\.%5c/i        // Mixed encoding (backslash)
];

/**
 * Allowed file extensions for uploads (lowercase)
 */
const ALLOWED_EXTENSIONS = new Set([
    // Documents
    'txt', 'md', 'doc', 'docx', 'pdf', 'rtf', 'odt',
    'xls', 'xlsx', 'csv', 'ods',
    'ppt', 'pptx', 'odp',
    
    // Code
    'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx',
    'php', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp',
    'go', 'rs', 'swift', 'kt', 'scala',
    'json', 'xml', 'yaml', 'yml', 'toml',
    'sql', 'sh', 'bash', 'ps1', 'bat', 'cmd',
    
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico',
    'tiff', 'tif', 'psd', 'ai', 'eps',
    
    // Audio
    'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma',
    
    // Video
    'mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv',
    
    // Archives
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    
    // Fonts
    'ttf', 'otf', 'woff', 'woff2', 'eot',
    
    // Other
    'log', 'ini', 'cfg', 'conf', 'env'
]);

/**
 * Dangerous file extensions that should never be allowed
 */
const DANGEROUS_EXTENSIONS = new Set([
    'exe', 'msi', 'dll', 'com', 'scr', 'pif',
    'vbs', 'vbe', 'js', 'jse', 'ws', 'wsf', 'wsc', 'wsh',
    'ps1', 'ps1xml', 'ps2', 'ps2xml', 'psc1', 'psc2',
    'lnk', 'inf', 'reg', 'hta', 'cpl', 'msc',
    'jar', 'jnlp'
]);

/**
 * Maximum file sizes by type (in bytes)
 */
const MAX_FILE_SIZES = {
    image: 10 * 1024 * 1024,      // 10MB
    video: 500 * 1024 * 1024,     // 500MB
    audio: 50 * 1024 * 1024,      // 50MB
    document: 50 * 1024 * 1024,   // 50MB
    archive: 100 * 1024 * 1024,   // 100MB
    code: 5 * 1024 * 1024,        // 5MB
    default: 25 * 1024 * 1024     // 25MB
};

/**
 * Audit log storage key
 */
const AUDIT_LOG_KEY = 'filemanager_security_audit';
const MAX_AUDIT_ENTRIES = 500;

// ============================================================================
// File Name Validation
// ============================================================================

/**
 * Validate a file name
 * @param {string} name - File name to validate
 * @returns {Object} Validation result { valid: boolean, error?: string, sanitized?: string }
 */
export const validateFileName = (name) => {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'File name is required' };
    }
    
    const trimmed = name.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, error: 'File name cannot be empty' };
    }
    
    if (trimmed.length > 255) {
        return { valid: false, error: 'File name is too long (max 255 characters)' };
    }
    
    // Check for forbidden characters
    if (FORBIDDEN_FILENAME_CHARS.test(trimmed)) {
        return { 
            valid: false, 
            error: 'File name contains invalid characters: < > : " / \\ | ? *',
            sanitized: sanitizeFileName(trimmed)
        };
    }
    
    // Check for reserved names (Windows)
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
    if (reservedNames.test(trimmed)) {
        return { valid: false, error: 'This file name is reserved by the system' };
    }
    
    // Check for names starting/ending with spaces or dots
    if (trimmed !== name || trimmed.startsWith('.') && trimmed.length === 1) {
        return { 
            valid: false, 
            error: 'File name cannot start or end with spaces',
            sanitized: trimmed
        };
    }
    
    // Check for hidden file pattern (single dot)
    if (trimmed === '.') {
        return { valid: false, error: 'Invalid file name' };
    }
    
    return { valid: true };
};

/**
 * Sanitize a file name by removing/replacing invalid characters
 * @param {string} name - File name to sanitize
 * @returns {string} Sanitized file name
 */
export const sanitizeFileName = (name) => {
    if (!name || typeof name !== 'string') return '';
    
    let sanitized = name.trim();
    
    // Replace forbidden characters with underscore
    sanitized = sanitized.replace(FORBIDDEN_FILENAME_CHARS, '_');
    
    // Replace multiple consecutive underscores with single
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove leading/trailing underscores and dots
    sanitized = sanitized.replace(/^[_.]+|[_.]+$/g, '');
    
    // Handle reserved names
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (reservedNames.test(sanitized)) {
        sanitized = '_' + sanitized;
    }
    
    // Ensure we have something left
    if (!sanitized) {
        sanitized = 'unnamed';
    }
    
    // Truncate if too long
    if (sanitized.length > 255) {
        const ext = getExtension(sanitized);
        const nameWithoutExt = ext ? sanitized.slice(0, -(ext.length + 1)) : sanitized;
        const maxNameLength = ext ? 255 - ext.length - 1 : 255;
        sanitized = nameWithoutExt.slice(0, maxNameLength) + (ext ? '.' + ext : '');
    }
    
    return sanitized;
};

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Validate a file path for directory traversal attempts
 * @param {string} path - Path to validate
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
export const validatePath = (path) => {
    if (path === null || path === undefined) {
        return { valid: false, error: 'Path is required' };
    }
    
    if (typeof path !== 'string') {
        return { valid: false, error: 'Path must be a string' };
    }
    
    // Empty path is valid (root directory)
    if (path === '') {
        return { valid: true };
    }
    
    // Check for traversal patterns
    for (const pattern of TRAVERSAL_PATTERNS) {
        if (pattern.test(path)) {
            logSecurityEvent('path_traversal_attempt', { path });
            return { valid: false, error: 'Invalid path: directory traversal detected' };
        }
    }
    
    // Check each segment
    const segments = path.split('/').filter(s => s);
    for (const segment of segments) {
        const result = validateFileName(segment);
        if (!result.valid) {
            return { valid: false, error: `Invalid path segment: ${result.error}` };
        }
    }
    
    // Check total path length
    if (path.length > 4096) {
        return { valid: false, error: 'Path is too long' };
    }
    
    return { valid: true };
};

/**
 * Sanitize a path by removing dangerous elements
 * @param {string} path - Path to sanitize
 * @returns {string} Sanitized path
 */
export const sanitizePath = (path) => {
    if (!path || typeof path !== 'string') return '';
    
    // Remove any traversal attempts
    let sanitized = path
        .replace(/\.\./g, '')
        .replace(/^\/+/, '')
        .replace(/\/+/g, '/');
    
    // Sanitize each segment
    const segments = sanitized.split('/').filter(s => s);
    const sanitizedSegments = segments.map(sanitizeFileName).filter(s => s);
    
    return sanitizedSegments.join('/');
};

/**
 * Check if a path is within allowed directory
 * @param {string} path - Path to check
 * @param {string} basePath - Base directory path
 * @returns {boolean} Whether path is within base directory
 */
export const isPathWithinBase = (path, basePath = '') => {
    const normalizedPath = normalizePath(path);
    const normalizedBase = normalizePath(basePath);
    
    // Path should start with base or be empty (root)
    if (!normalizedBase) return true;
    return normalizedPath.startsWith(normalizedBase + '/') || normalizedPath === normalizedBase;
};

/**
 * Normalize a path (remove redundant slashes, etc.)
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
const normalizePath = (path) => {
    if (!path) return '';
    return path.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
};

// ============================================================================
// File Type Validation
// ============================================================================

/**
 * Validate file extension
 * @param {string} filename - File name to check
 * @param {Set} allowedExtensions - Set of allowed extensions (optional)
 * @returns {Object} Validation result { valid: boolean, error?: string, extension?: string }
 */
export const validateFileExtension = (filename, allowedExtensions = ALLOWED_EXTENSIONS) => {
    const ext = getExtension(filename);
    
    if (!ext) {
        // Files without extensions are allowed
        return { valid: true, extension: null };
    }
    
    const lowerExt = ext.toLowerCase();
    
    // Check for dangerous extensions
    if (DANGEROUS_EXTENSIONS.has(lowerExt)) {
        logSecurityEvent('dangerous_extension_blocked', { filename, extension: lowerExt });
        return { 
            valid: false, 
            error: `File type .${ext} is not allowed for security reasons`,
            extension: lowerExt
        };
    }
    
    // Check against allowed list if provided
    if (allowedExtensions && allowedExtensions.size > 0) {
        if (!allowedExtensions.has(lowerExt)) {
            return {
                valid: false,
                error: `File type .${ext} is not allowed`,
                extension: lowerExt
            };
        }
    }
    
    return { valid: true, extension: lowerExt };
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {string} filename - File name (for type detection)
 * @returns {Object} Validation result { valid: boolean, error?: string, limit?: number }
 */
export const validateFileSize = (size, filename) => {
    if (typeof size !== 'number' || size < 0) {
        return { valid: false, error: 'Invalid file size' };
    }
    
    const ext = getExtension(filename)?.toLowerCase();
    const type = getFileType(ext);
    const limit = MAX_FILE_SIZES[type] || MAX_FILE_SIZES.default;
    
    if (size > limit) {
        const limitMB = Math.round(limit / 1024 / 1024);
        const sizeMB = Math.round(size / 1024 / 1024 * 10) / 10;
        return {
            valid: false,
            error: `File size (${sizeMB}MB) exceeds limit (${limitMB}MB)`,
            limit
        };
    }
    
    return { valid: true, limit };
};

/**
 * Get file type category from extension
 * @param {string} ext - File extension
 * @returns {string} File type category
 */
const getFileType = (ext) => {
    if (!ext) return 'default';
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'];
    const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
    const codeExts = ['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'rb', 'java', 'c', 'cpp', 'go', 'rs'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (archiveExts.includes(ext)) return 'archive';
    if (codeExts.includes(ext)) return 'code';
    
    return 'document';
};

// ============================================================================
// XSS Prevention
// ============================================================================

/**
 * HTML entity map for encoding
 */
const HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export const escapeHtml = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char]);
};

/**
 * Sanitize HTML content (strip all tags)
 * @param {string} html - HTML content to sanitize
 * @returns {string} Plain text content
 */
export const stripHtml = (html) => {
    if (!html || typeof html !== 'string') return '';
    
    // Create a temporary element and get text content
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
};

/**
 * Sanitize HTML for safe display (allow safe tags)
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
export const sanitizeHtml = (html) => {
    if (!html || typeof html !== 'string') return '';
    
    // Safe tags whitelist
    const safeTags = ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'div', 'pre', 'code'];
    
    // Remove all event handlers
    let sanitized = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    
    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove style tags and their content
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove all tags except safe ones
    sanitized = sanitized.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
        return safeTags.includes(tag.toLowerCase()) ? match.replace(/\s+\w+\s*=\s*["'][^"']*["']/g, '') : '';
    });
    
    return sanitized;
};

// ============================================================================
// URL Safety
// ============================================================================

/**
 * Validate and sanitize a URL
 * @param {string} url - URL to validate
 * @returns {Object} Validation result { valid: boolean, error?: string, sanitized?: string }
 */
export const validateUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL is required' };
    }
    
    const trimmed = url.trim();
    
    // Check for javascript: protocol
    if (/^\s*javascript\s*:/i.test(trimmed)) {
        logSecurityEvent('malicious_url_blocked', { url: trimmed.substring(0, 100) });
        return { valid: false, error: 'JavaScript URLs are not allowed' };
    }
    
    // Check for data: protocol (except images)
    if (/^\s*data\s*:/i.test(trimmed) && !/^\s*data\s*:\s*image\//i.test(trimmed)) {
        return { valid: false, error: 'Data URLs are not allowed' };
    }
    
    // Try to parse as URL
    try {
        const parsed = new URL(trimmed, window.location.origin);
        
        // Only allow http, https, and relative URLs
        if (!['http:', 'https:', ''].includes(parsed.protocol) && 
            !trimmed.startsWith('/') && !trimmed.startsWith('./')) {
            return { valid: false, error: 'Only HTTP(S) URLs are allowed' };
        }
        
        return { valid: true, sanitized: parsed.href };
    } catch (e) {
        // If it's a relative path, it's okay
        if (trimmed.startsWith('/') || trimmed.startsWith('./') || !trimmed.includes(':')) {
            return { valid: true, sanitized: trimmed };
        }
        return { valid: false, error: 'Invalid URL format' };
    }
};

/**
 * Create a safe URL for file preview/download
 * @param {string} path - File path
 * @returns {string} Safe URL
 */
export const createSafeFileUrl = (path) => {
    const sanitized = sanitizePath(path);
    return `/api.php?action=raw&path=${encodeURIComponent(sanitized)}`;
};

// ============================================================================
// Security Audit Logging
// ============================================================================

/**
 * Log a security event
 * @param {string} eventType - Type of security event
 * @param {Object} details - Event details
 */
export const logSecurityEvent = (eventType, details = {}) => {
    const event = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        type: eventType,
        timestamp: Date.now(),
        details: sanitizeLogDetails(details),
        url: window.location.pathname,
        userAgent: navigator.userAgent.substring(0, 200)
    };
    
    try {
        const logs = getSecurityLogs();
        logs.push(event);
        
        // Keep only recent entries
        const trimmed = logs.slice(-MAX_AUDIT_ENTRIES);
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('Failed to log security event:', e);
    }
    
    // Also log to console in development
    if (window.DEBUG_SECURITY) {
        console.warn('[Security]', eventType, details);
    }
};

/**
 * Get security audit logs
 * @returns {Array} Security events
 */
export const getSecurityLogs = () => {
    try {
        const stored = localStorage.getItem(AUDIT_LOG_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

/**
 * Clear security audit logs
 */
export const clearSecurityLogs = () => {
    try {
        localStorage.removeItem(AUDIT_LOG_KEY);
    } catch (e) {
        console.warn('Failed to clear security logs:', e);
    }
};

/**
 * Sanitize log details to remove sensitive data
 * @param {Object} details - Raw details
 * @returns {Object} Sanitized details
 */
const sanitizeLogDetails = (details) => {
    const sanitized = { ...details };
    
    // Truncate long values
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
            sanitized[key] = sanitized[key].substring(0, 500) + '...';
        }
    });
    
    return sanitized;
};

// ============================================================================
// Session Security
// ============================================================================

/**
 * Track failed operations for rate limiting
 */
const failedOperations = new Map();

/**
 * Check if operation should be rate limited
 * @param {string} operation - Operation type
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} Whether operation is rate limited
 */
export const isRateLimited = (operation, maxAttempts = 10, windowMs = 60000) => {
    const now = Date.now();
    const key = operation;
    
    if (!failedOperations.has(key)) {
        failedOperations.set(key, []);
    }
    
    const attempts = failedOperations.get(key);
    
    // Remove old attempts outside the window
    const recent = attempts.filter(time => now - time < windowMs);
    failedOperations.set(key, recent);
    
    return recent.length >= maxAttempts;
};

/**
 * Record a failed operation attempt
 * @param {string} operation - Operation type
 */
export const recordFailedAttempt = (operation) => {
    const key = operation;
    
    if (!failedOperations.has(key)) {
        failedOperations.set(key, []);
    }
    
    failedOperations.get(key).push(Date.now());
    
    // Log if approaching limit
    const attempts = failedOperations.get(key);
    if (attempts.length >= 5) {
        logSecurityEvent('rate_limit_warning', { operation, attempts: attempts.length });
    }
};

/**
 * Clear failed attempts for an operation
 * @param {string} operation - Operation type
 */
export const clearFailedAttempts = (operation) => {
    failedOperations.delete(operation);
};

// ============================================================================
// Content Security
// ============================================================================

/**
 * Check if file content is safe to display
 * @param {string} content - File content
 * @param {string} type - Content type
 * @returns {Object} Safety check result { safe: boolean, warnings: string[] }
 */
export const checkContentSafety = (content, type = 'text') => {
    const warnings = [];
    
    if (!content || typeof content !== 'string') {
        return { safe: true, warnings };
    }
    
    // Check for potential script injection in HTML
    if (type === 'html' || type === 'text') {
        if (/<script\b/i.test(content)) {
            warnings.push('Content contains script tags');
        }
        if (/\bon\w+\s*=/i.test(content)) {
            warnings.push('Content contains event handlers');
        }
        if (/javascript\s*:/i.test(content)) {
            warnings.push('Content contains JavaScript URLs');
        }
    }
    
    // Check for embedded objects
    if (/<(object|embed|iframe)\b/i.test(content)) {
        warnings.push('Content contains embedded objects');
    }
    
    return {
        safe: warnings.length === 0,
        warnings
    };
};

/**
 * Safely render code for preview (escape and highlight)
 * @param {string} code - Code to render
 * @param {string} language - Programming language
 * @returns {string} Safe HTML for rendering
 */
export const renderCodeSafely = (code, language = 'text') => {
    // Escape HTML entities
    const escaped = escapeHtml(code);
    
    // Wrap in pre/code tags
    return `<pre class="language-${escapeHtml(language)}"><code>${escaped}</code></pre>`;
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string|null} File extension or null
 */
const getExtension = (filename) => {
    if (!filename || typeof filename !== 'string') return null;
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : null;
};

/**
 * Generate a secure random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
export const generateSecureToken = (length = 32) => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate all aspects of a file for upload
 * @param {File} file - File object to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export const validateFile = (file) => {
    const errors = [];
    
    // Validate name
    const nameResult = validateFileName(file.name);
    if (!nameResult.valid) {
        errors.push(nameResult.error);
    }
    
    // Validate extension
    const extResult = validateFileExtension(file.name);
    if (!extResult.valid) {
        errors.push(extResult.error);
    }
    
    // Validate size
    const sizeResult = validateFileSize(file.size, file.name);
    if (!sizeResult.valid) {
        errors.push(sizeResult.error);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Validate multiple files for batch upload
 * @param {FileList|File[]} files - Files to validate
 * @returns {Object} Validation result { valid: File[], invalid: { file: File, errors: string[] }[] }
 */
export const validateFiles = (files) => {
    const valid = [];
    const invalid = [];
    
    for (const file of files) {
        const result = validateFile(file);
        if (result.valid) {
            valid.push(file);
        } else {
            invalid.push({ file, errors: result.errors });
        }
    }
    
    return { valid, invalid };
};

// ============================================================================
// Default Export
// ============================================================================

export default {
    // File name validation
    validateFileName,
    sanitizeFileName,
    
    // Path validation
    validatePath,
    sanitizePath,
    isPathWithinBase,
    
    // File type validation
    validateFileExtension,
    validateFileSize,
    validateFile,
    validateFiles,
    
    // XSS prevention
    escapeHtml,
    stripHtml,
    sanitizeHtml,
    
    // URL safety
    validateUrl,
    createSafeFileUrl,
    
    // Content security
    checkContentSafety,
    renderCodeSafely,
    
    // Audit logging
    logSecurityEvent,
    getSecurityLogs,
    clearSecurityLogs,
    
    // Rate limiting
    isRateLimited,
    recordFailedAttempt,
    clearFailedAttempts,
    
    // Utilities
    generateSecureToken,
    
    // Constants
    ALLOWED_EXTENSIONS,
    DANGEROUS_EXTENSIONS,
    MAX_FILE_SIZES
};
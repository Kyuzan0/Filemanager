/**
 * Error Boundary Module
 * =====================
 * Global error UI for unhandled errors and network failures.
 * Shows a user-friendly error panel with details, retry, and dismiss.
 */

import { getErrorLog, clearErrorLog } from '../errorHandler.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let panelEl = null;
let errorQueue = [];
let dismissTimer = null;
let isOffline = false;
const MAX_VISIBLE_ERRORS = 5;
const AUTO_DISMISS_MS = 15000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the error boundary.
 * Hooks into window error events and online/offline detection.
 */
export function initErrorBoundary() {
    // Global unhandled errors
    window.addEventListener('error', (event) => {
        // Ignore script loading errors for external resources
        if (event.filename && !event.filename.includes(window.location.host)) {
            return;
        }
        showError({
            title: 'Terjadi Kesalahan',
            message: event.message || 'Kesalahan tidak diketahui.',
            details: formatStack(event.error),
            retryable: false
        });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        if (!reason) return;

        // Skip AbortError (intentional cancellations)
        if (reason.name === 'AbortError') return;

        // Skip auth redirects
        if (reason.code === 'AUTH_REQUIRED') return;

        showError({
            title: 'Operasi Gagal',
            message: reason.message || 'Terjadi kesalahan async.',
            details: formatStack(reason),
            retryable: isRetryable(reason)
        });
    });

    // Network status
    window.addEventListener('offline', () => {
        isOffline = true;
        showOfflineBanner();
    });

    window.addEventListener('online', () => {
        isOffline = false;
        hideOfflineBanner();
    });

    // Listen for custom error events from errorHandler.js
    window.addEventListener('filemanager:error', (event) => {
        const entry = event.detail;
        if (!entry) return;
        // Only show UI for HIGH/CRITICAL severity
        if (entry.severity === 'high' || entry.severity === 'critical') {
            showError({
                title: getCategoryTitle(entry.category),
                message: entry.message,
                details: entry.stack || '',
                retryable: entry.retryable || false
            });
        }
    });

    // Check initial online status
    if (!navigator.onLine) {
        isOffline = true;
        showOfflineBanner();
    }
}

/**
 * Show an error in the error boundary panel.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.details]
 * @param {boolean} [opts.retryable]
 * @param {Function} [opts.onRetry]
 */
export function showError(opts) {
    const { title, message, details = '', retryable = false, onRetry = null } = opts;

    // Deduplicate: skip if same message already queued
    if (errorQueue.some(e => e.message === message)) return;

    errorQueue.push({ title, message, details, retryable, onRetry, timestamp: Date.now() });

    // Trim queue
    if (errorQueue.length > MAX_VISIBLE_ERRORS) {
        errorQueue = errorQueue.slice(-MAX_VISIBLE_ERRORS);
    }

    renderPanel();
    scheduleAutoDismiss();
}

/**
 * Dismiss the error panel.
 */
export function dismissErrors() {
    if (!panelEl) return;
    panelEl.classList.add('error-boundary--leaving');
    clearTimeout(dismissTimer);
    setTimeout(() => {
        if (panelEl && panelEl.parentNode) {
            panelEl.parentNode.removeChild(panelEl);
        }
        panelEl = null;
        errorQueue = [];
    }, 250);
}

/**
 * Check if error boundary is currently visible.
 * @returns {boolean}
 */
export function isErrorBoundaryVisible() {
    return panelEl !== null;
}

// ---------------------------------------------------------------------------
// Offline Banner
// ---------------------------------------------------------------------------

function showOfflineBanner() {
    showError({
        title: 'Koneksi Terputus',
        message: 'Anda sedang offline. Beberapa fitur mungkin tidak tersedia.',
        retryable: true,
        onRetry: () => {
            // Force check
            if (navigator.onLine) {
                isOffline = false;
                hideOfflineBanner();
                if (typeof window.showSuccess === 'function') {
                    window.showSuccess('Koneksi kembali tersedia.');
                }
            } else {
                if (typeof window.showWarning === 'function') {
                    window.showWarning('Masih offline.');
                }
            }
        }
    });

    if (panelEl) {
        panelEl.classList.add('error-boundary--offline');
    }
}

function hideOfflineBanner() {
    // Remove offline errors from queue
    errorQueue = errorQueue.filter(e => e.title !== 'Koneksi Terputus');
    if (errorQueue.length === 0) {
        dismissErrors();
    } else {
        renderPanel();
    }
    if (typeof window.showSuccess === 'function') {
        window.showSuccess('Koneksi kembali tersedia.');
    }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderPanel() {
    // Remove existing panel
    if (panelEl && panelEl.parentNode) {
        panelEl.parentNode.removeChild(panelEl);
        panelEl = null;
    }

    if (errorQueue.length === 0) return;

    const latest = errorQueue[errorQueue.length - 1];

    panelEl = document.createElement('div');
    panelEl.className = 'error-boundary';
    panelEl.setAttribute('role', 'alert');
    panelEl.setAttribute('aria-live', 'assertive');

    const detailsId = 'error-boundary-details-' + Date.now();

    panelEl.innerHTML = `
        <div class="error-boundary__card">
            <div class="error-boundary__header">
                <div class="error-boundary__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h4 class="error-boundary__title">${escapeHtml(latest.title)}</h4>
                ${errorQueue.length > 1 ? `<span class="error-boundary__badge">${errorQueue.length}</span>` : ''}
                <button class="error-boundary__close" aria-label="Tutup" type="button">&times;</button>
            </div>
            <div class="error-boundary__body">
                <p class="error-boundary__message">${escapeHtml(latest.message)}</p>
                ${latest.details ? `
                    <button class="error-boundary__details-toggle" aria-expanded="false" aria-controls="${detailsId}" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                        Detail teknis
                    </button>
                    <div class="error-boundary__details" id="${detailsId}">${escapeHtml(latest.details)}</div>
                ` : ''}
            </div>
            <div class="error-boundary__footer">
                ${latest.retryable ? '<button class="error-boundary__btn error-boundary__btn--primary" data-action="retry" type="button">Coba Lagi</button>' : ''}
                <button class="error-boundary__btn" data-action="dismiss" type="button">Tutup</button>
            </div>
        </div>
    `;

    // Wire events
    const closeBtn = panelEl.querySelector('.error-boundary__close');
    if (closeBtn) {
        closeBtn.addEventListener('click', dismissErrors);
    }

    const dismissBtn = panelEl.querySelector('[data-action="dismiss"]');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', dismissErrors);
    }

    const retryBtn = panelEl.querySelector('[data-action="retry"]');
    if (retryBtn && latest.onRetry) {
        retryBtn.addEventListener('click', () => {
            dismissErrors();
            latest.onRetry();
        });
    } else if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            dismissErrors();
            window.location.reload();
        });
    }

    const detailsToggle = panelEl.querySelector('.error-boundary__details-toggle');
    const detailsEl = panelEl.querySelector('.error-boundary__details');
    if (detailsToggle && detailsEl) {
        detailsToggle.addEventListener('click', () => {
            const expanded = detailsToggle.getAttribute('aria-expanded') === 'true';
            detailsToggle.setAttribute('aria-expanded', String(!expanded));
            detailsEl.classList.toggle('visible');
        });
    }

    // Pause auto-dismiss on hover
    panelEl.addEventListener('mouseenter', () => clearTimeout(dismissTimer));
    panelEl.addEventListener('mouseleave', () => scheduleAutoDismiss());

    // Escape to dismiss
    const escHandler = (e) => {
        if (e.key === 'Escape' && panelEl) {
            dismissErrors();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(panelEl);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scheduleAutoDismiss() {
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
        // Don't auto-dismiss offline banner
        if (isOffline) return;
        dismissErrors();
    }, AUTO_DISMISS_MS);
}

function formatStack(error) {
    if (!error) return '';
    if (error.stack) {
        // Clean up stack trace — keep first 5 lines
        const lines = error.stack.split('\n').slice(0, 6);
        return lines.join('\n');
    }
    return error.message || String(error);
}

function isRetryable(error) {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('timeout') ||
        msg.includes('connection') ||
        msg.includes('offline') ||
        error.name === 'TypeError' && msg.includes('failed to fetch')
    );
}

function getCategoryTitle(category) {
    const titles = {
        'NETWORK': 'Kesalahan Jaringan',
        'TIMEOUT': 'Waktu Habis',
        'PERMISSION': 'Akses Ditolak',
        'NOT_FOUND': 'Tidak Ditemukan',
        'SERVER': 'Kesalahan Server',
        'VALIDATION': 'Data Tidak Valid',
        'FILE_OPERATION': 'Operasi File Gagal',
        'CLIENT': 'Kesalahan Aplikasi'
    };
    return titles[category] || 'Terjadi Kesalahan';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

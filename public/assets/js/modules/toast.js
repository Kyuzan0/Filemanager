/**
 * Toast Notification System
 * =========================
 * Floating notifications that appear at top-right and auto-dismiss
 * Supports: success, error, warning, info
 */

// Toast container will be created on first use
let toastContainer = null;

// Icons SVG untuk setiap tipe notifikasi
const toastIcons = {
  success: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`
};

// Tipe notifikasi dan durasi
const toastConfig = {
  success: { duration: 3000, title: 'Berhasil' },
  error: { duration: 3000, title: 'Error' },
  warning: { duration: 3000, title: 'Peringatan' },
  info: { duration: 3000, title: 'Informasi' }
};

/**
 * Ensure toast container exists
 */
function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show a toast notification
 * @param {string} type - 'success', 'error', 'warning', or 'info'
 * @param {string} message - Message to display
 * @param {string} title - Optional title (defaults based on type)
 * @param {number} duration - Optional duration in ms (defaults based on type)
 */
function showToast(type, message, title = null, duration = null) {
  console.log('[showToast] Displaying:', { type, message, title });
  const container = ensureToastContainer();
  const config = toastConfig[type] || toastConfig.info;
  
  const toastTitle = title || config.title;
  const toastDuration = duration || config.duration;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  
  // Build HTML
  toast.innerHTML = `
    <div class="toast-icon" aria-hidden="true">
      ${toastIcons[type] || toastIcons.info}
    </div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(toastTitle)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="Tutup notifikasi" type="button">
      ${toastIcons.close}
    </button>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Close button handler
  const closeBtn = toast.querySelector('.toast-close');
  const removeToast = () => {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };
  
  closeBtn?.addEventListener('click', removeToast);
  
  // Auto-dismiss
  const dismissTimer = setTimeout(removeToast, toastDuration);
  
  // Cancel auto-dismiss on hover
  toast.addEventListener('mouseenter', () => clearTimeout(dismissTimer));
  toast.addEventListener('mouseleave', () => {
    const remainingTime = toastDuration;
    setTimeout(removeToast, remainingTime);
  });
  
  return toast;
}

/**
 * Show success notification
 */
function showSuccess(message, title = null) {
  return showToast('success', message, title || 'Berhasil');
}

/**
 * Show error notification
 */
function showError(message, title = null) {
  return showToast('error', message, title || 'Error');
}

/**
 * Show warning notification
 */
function showWarning(message, title = null) {
  return showToast('warning', message, title || 'Peringatan');
}

/**
 * Show info notification
 */
function showInfo(message, title = null) {
  return showToast('info', message, title || 'Informasi');
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export functions to window
window.showToast = showToast;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;

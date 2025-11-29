/**
 * Log Activity Handler
 * Menangani modal log aktivitas dengan filtering dan pagination
 * Menggunakan API nyata untuk membaca dan mengelola log
 */

(function() {
  'use strict';
  
  const LOG_API_BASE = 'api.php';
  
  let logState = {
    logs: [],
    currentPage: 1,
    itemsPerPage: 20,
    totalPages: 1,
    totalLogs: 0,
    filteredCount: 0,
    filters: {
      search: '',
      action: '',
      filename: ''
    },
    autoRefreshInterval: null,
    isLoading: false
  };

// ============= Log Modal Functions =============

function openLogModal() {
  const overlay = document.getElementById('log-overlay');
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  
  // Reset state
  logState.currentPage = 1;
  logState.filters = { search: '', action: '', targetType: '' };
  
  // Reset filter UI
  const searchInput = document.getElementById('log-path-search');
  const actionFilter = document.getElementById('log-filter');
  const typeFilter = document.getElementById('log-target-type');
  
  if (searchInput) searchInput.value = '';
  if (actionFilter) actionFilter.value = '';
  if (typeFilter) typeFilter.value = '';
  
  loadLogs();
}

function closeLogModal() {
  const overlay = document.getElementById('log-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  
  stopAutoRefresh();
}

async function loadLogs() {
  if (logState.isLoading) return;
  
  logState.isLoading = true;
  const tbody = document.getElementById('log-table-body');
  const error = document.getElementById('log-error');
  
  tbody.innerHTML = '<tr><td colspan="5" class="log-loading px-3 py-4 text-center text-gray-500 dark:text-slate-400">Memuat data log...</td></tr>';
  error.hidden = true;
  
  try {
    // Build API URL with filters
    const params = new URLSearchParams({
      action: 'logs',
      page: logState.currentPage,
      limit: logState.itemsPerPage
    });
    
    if (logState.filters.search) {
      params.append('search', logState.filters.search);
    }
    if (logState.filters.action) {
      params.append('filterAction', logState.filters.action);
    }
    if (logState.filters.filename) {
      params.append('filterFilename', logState.filters.filename);
    }
    
    const response = await fetch(`${LOG_API_BASE}?${params.toString()}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Gagal memuat log');
    }
    
    logState.logs = data.logs || [];
    logState.totalPages = data.pagination?.totalPages || 1;
    logState.totalLogs = data.pagination?.total || 0;
    logState.filteredCount = data.pagination?.filtered || 0;
    
    renderLogs();
  } catch (err) {
    console.error('Error loading logs:', err);
    error.textContent = 'Gagal memuat log: ' + err.message;
    error.hidden = false;
    tbody.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-red-500 dark:text-red-400">Gagal memuat data log</td></tr>';
  } finally {
    logState.isLoading = false;
  }
}

function renderLogs() {
  const tbody = document.getElementById('log-table-body');
  const pageInfo = document.getElementById('log-page-info');
  const prevBtn = document.getElementById('log-prev');
  const nextBtn = document.getElementById('log-next');
  const pageNumbersContainer = document.getElementById('log-page-numbers');
  
  if (logState.logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-gray-500 dark:text-slate-400">Tidak ada log yang ditemukan</td></tr>';
  } else {
    tbody.innerHTML = logState.logs.map(log => {
      const fileName = log.filename || log.target || '-';
      const displayName = truncateLogFileName(fileName);
      return `
      <tr class="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
        <td class="px-3 py-2 text-xs text-gray-900 dark:text-slate-200">${formatLogTime(log.timestamp)}</td>
        <td class="px-3 py-2 text-xs text-gray-900 dark:text-slate-200" title="${escapeHtml(fileName)}">${displayName}</td>
        <td class="px-3 py-2">
          <span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}">
            ${translateAction(log.action)}
          </span>
        </td>
        <td class="px-3 py-2 text-xs hidden sm:table-cell text-gray-600 dark:text-slate-400">${log.ip || '-'}</td>
        <td class="px-3 py-2 text-xs hidden md:table-cell text-gray-500 dark:text-slate-500 truncate max-w-[200px]" title="${escapeHtml(log.userAgent || '-')}">${truncateUserAgent(log.userAgent)}</td>
      </tr>
    `}).join('');
  }
  
  // Update page info text
  pageInfo.textContent = `(${logState.filteredCount || logState.totalLogs} log)`;
  
  // Update prev/next buttons
  prevBtn.disabled = logState.currentPage <= 1;
  nextBtn.disabled = logState.currentPage >= logState.totalPages;
  
  // Render page numbers
  renderPageNumbers(pageNumbersContainer);
  
  updateActiveFilters();
}

/**
 * Generate page numbers with ellipsis for pagination
 * Shows: 1 ... (current-1) current (current+1) ... lastPage
 */
function generatePageNumbers(currentPage, totalPages) {
  const pages = [];
  const delta = 1; // Number of pages to show around current page
  
  if (totalPages <= 7) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);
    
    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);
    
    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pages.push('...');
    }
    
    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      pages.push('...');
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
  }
  
  return pages;
}

/**
 * Render page number buttons
 */
function renderPageNumbers(container) {
  if (!container) return;
  
  const totalPages = logState.totalPages || 1;
  const currentPage = logState.currentPage;
  
  if (totalPages <= 1) {
    container.innerHTML = '<span class="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 bg-blue-100 dark:bg-blue-900/40 rounded-md">1</span>';
    return;
  }
  
  const pages = generatePageNumbers(currentPage, totalPages);
  
  container.innerHTML = pages.map(page => {
    if (page === '...') {
      return '<span class="px-2 py-1 text-xs text-gray-400 dark:text-slate-500">...</span>';
    }
    
    const isActive = page === currentPage;
    const baseClasses = 'log-page-btn min-w-[32px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none';
    const activeClasses = 'bg-blue-600 text-white';
    const inactiveClasses = 'bg-white dark:bg-white/5 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10';
    
    return `<button type="button" class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}" data-page="${page}" ${isActive ? 'aria-current="page"' : ''}>${page}</button>`;
  }).join('');
  
  // Add click handlers
  container.querySelectorAll('.log-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page, 10);
      if (page !== currentPage && !isNaN(page)) {
        logState.currentPage = page;
        loadLogs();
      }
    });
  });
}

function formatLogTime(timestamp) {
  if (!timestamp) return '-';
  
  // Handle both Unix timestamp (seconds) and milliseconds
  const ts = timestamp > 9999999999 ? timestamp : timestamp * 1000;
  const date = new Date(ts);
  
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Truncate long filenames: start...last5chars.ext
function truncateLogFileName(name, maxLength = 30) {
  if (!name || name === '-') return '-';
  if (name.length <= maxLength) return name;
  
  const lastDot = name.lastIndexOf('.');
  const hasExtension = lastDot > 0 && lastDot > name.length - 10;
  
  if (hasExtension) {
    const ext = name.substring(lastDot);
    const baseName = name.substring(0, lastDot);
    const tailLength = 5;
    
    if (baseName.length <= maxLength - ext.length - 3 - tailLength) return name;
    
    const availableForStart = maxLength - ext.length - 3 - tailLength;
    const start = baseName.substring(0, Math.max(availableForStart, 8));
    const end = baseName.substring(baseName.length - tailLength);
    
    return `${start}...${end}${ext}`;
  } else {
    const tailLength = 5;
    const start = name.substring(0, maxLength - 3 - tailLength);
    const end = name.substring(name.length - tailLength);
    return `${start}...${end}`;
  }
}

function truncateUserAgent(userAgent) {
  if (!userAgent || userAgent === 'unknown') return '-';
  // Extract browser name from user agent
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  if (ua.includes('msie') || ua.includes('trident')) return 'IE';
  // If can't detect, truncate
  return userAgent.length > 30 ? userAgent.substring(0, 30) + '...' : userAgent;
}

function translateAction(action) {
  const translations = {
    'create': 'create',
    'delete': 'delete',
    'move': 'move',
    'rename': 'rename',
    'upload': 'upload',
    'download': 'download',
    'save': 'save',
    'cleanup': 'cleanup'
  };
  return translations[action] || action;
}

function getActionColor(action) {
  const colors = {
    'create': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'delete': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'move': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'rename': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'upload': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'download': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'save': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'cleanup': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  };
  return colors[action] || 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-slate-300';
}

function updateActiveFilters() {
  const display = document.getElementById('active-filters-display');
  const tags = document.getElementById('active-filters-tags');
  
  const activeFilters = [];
  
  if (logState.filters.search) {
    activeFilters.push({ type: 'search', label: `Pencarian: "${logState.filters.search}"` });
  }
  if (logState.filters.action) {
    activeFilters.push({ type: 'action', label: `Aksi: ${translateAction(logState.filters.action)}` });
  }
  if (logState.filters.targetType) {
    activeFilters.push({ type: 'targetType', label: `Tipe: ${logState.filters.targetType}` });
  }
  
  if (activeFilters.length > 0) {
    display.style.display = 'block';
    tags.innerHTML = activeFilters.map(filter => `
      <button class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" data-filter="${filter.type}">
        ${filter.label}
        <span class="ml-1">×</span>
      </button>
    `).join('');
    
    // Wire remove filter events
    tags.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterType = btn.dataset.filter;
        if (filterType === 'search') {
          logState.filters.search = '';
          document.getElementById('log-path-search').value = '';
        }
        if (filterType === 'action') {
          logState.filters.action = '';
          document.getElementById('log-filter').value = '';
        }
        if (filterType === 'targetType') {
          logState.filters.targetType = '';
          document.getElementById('log-target-type').value = '';
        }
        
        logState.currentPage = 1;
        loadLogs();
      });
    });
  } else {
    display.style.display = 'none';
  }
}

function startAutoRefresh() {
  if (logState.autoRefreshInterval) return;
  
  logState.autoRefreshInterval = setInterval(() => {
    loadLogs();
  }, 30000); // 30 seconds
}

function stopAutoRefresh() {
  if (logState.autoRefreshInterval) {
    clearInterval(logState.autoRefreshInterval);
    logState.autoRefreshInterval = null;
  }
}

async function exportLogs(format) {
  try {
    // Build export URL with current filters
    const params = new URLSearchParams({
      action: 'logs-export',
      format: format
    });
    
    if (logState.filters.search) {
      params.append('search', logState.filters.search);
    }
    if (logState.filters.action) {
      params.append('filterAction', logState.filters.action);
    }
    if (logState.filters.targetType) {
      params.append('filterType', logState.filters.targetType);
    }
    
    // Open download in new window/tab
    window.open(`${LOG_API_BASE}?${params.toString()}`, '_blank');
  } catch (err) {
    console.error('Error exporting logs:', err);
    if (window.showError) {
      window.showError('Gagal mengekspor log: ' + err.message);
    }
  }
}

async function cleanupLogs(days) {
  // Validasi input
  days = parseInt(days, 10);
  if (isNaN(days) || days < 0) {
    if (window.showError) {
      window.showError('Pilihan hari tidak valid');
    }
    return;
  }
  
  // Pesan konfirmasi berdasarkan pilihan
  let confirmMessage;
  if (days === 0) {
    confirmMessage = 'Hapus SEMUA log aktivitas? Tindakan ini tidak dapat dibatalkan.';
  } else {
    confirmMessage = `Hapus log lebih dari ${days} hari? Tindakan ini tidak dapat dibatalkan.`;
  }
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // Show loading state
  const cleanupBtn = document.getElementById('log-cleanup');
  const originalContent = cleanupBtn?.innerHTML;
  if (cleanupBtn) {
    cleanupBtn.disabled = true;
    cleanupBtn.innerHTML = '<svg class="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Menghapus...</span>';
  }
  
  try {
    const response = await fetch(`${LOG_API_BASE}?action=logs-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ days: days })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Gagal menghapus log');
    }
    
    // Reload logs
    logState.currentPage = 1;
    await loadLogs();
    
    // Show success message
    if (data.deleted > 0) {
      if (window.showSuccess) {
        if (days === 0) {
          window.showSuccess(`${data.deleted} log telah dihapus`);
        } else {
          window.showSuccess(`${data.deleted} log lebih dari ${days} hari telah dihapus`);
        }
      }
    } else {
      if (window.showInfo) {
        window.showInfo('Tidak ada log yang perlu dihapus');
      } else if (window.showSuccess) {
        window.showSuccess('Tidak ada log yang perlu dihapus');
      }
    }
  } catch (err) {
    console.error('Error cleaning up logs:', err);
    if (window.showError) {
      window.showError('Gagal menghapus log: ' + err.message);
    }
  } finally {
    // Restore button state
    if (cleanupBtn && originalContent) {
      cleanupBtn.disabled = false;
      cleanupBtn.innerHTML = originalContent;
    }
  }
}

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============= Event Listeners =============

document.addEventListener('DOMContentLoaded', () => {
  // Log modal close buttons
  document.getElementById('log-close')?.addEventListener('click', closeLogModal);
  document.getElementById('log-close-top')?.addEventListener('click', closeLogModal);
  
  // Close on overlay click
  document.getElementById('log-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'log-overlay') {
      closeLogModal();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('log-overlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        closeLogModal();
      }
    }
  });
  
  // Search filter with debounce
  const searchInput = document.getElementById('log-path-search');
  if (searchInput) {
    const debouncedSearch = debounce(() => {
      logState.filters.search = searchInput.value;
      logState.currentPage = 1;
      loadLogs();
    }, 300);
    
    searchInput.addEventListener('input', debouncedSearch);
  }
  
  // Action filter
  document.getElementById('log-filter')?.addEventListener('change', (e) => {
    logState.filters.action = e.target.value;
    logState.currentPage = 1;
    loadLogs();
  });
  
  // Type filter
  document.getElementById('log-target-type')?.addEventListener('change', (e) => {
    logState.filters.targetType = e.target.value;
    logState.currentPage = 1;
    loadLogs();
  });
  
  // Pagination
  document.getElementById('log-prev')?.addEventListener('click', () => {
    if (logState.currentPage > 1) {
      logState.currentPage--;
      loadLogs();
    }
  });
  
  document.getElementById('log-next')?.addEventListener('click', () => {
    if (logState.currentPage < logState.totalPages) {
      logState.currentPage++;
      loadLogs();
    }
  });
  
  // Auto-refresh toggle
  document.getElementById('log-auto-refresh')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
  
  // Refresh button
  document.getElementById('log-refresh')?.addEventListener('click', () => {
    loadLogs();
  });
  
  // Export menu
  const exportToggle = document.getElementById('log-export-toggle');
  const exportMenu = document.getElementById('log-export-menu');
  
  exportToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = exportMenu.hidden;
    exportMenu.hidden = !isHidden;
    exportToggle.setAttribute('aria-expanded', !isHidden);
  });
  
  document.getElementById('log-export-csv')?.addEventListener('click', () => {
    exportLogs('csv');
    exportMenu.hidden = true;
    exportToggle?.setAttribute('aria-expanded', 'false');
  });
  
  document.getElementById('log-export-json')?.addEventListener('click', () => {
    exportLogs('json');
    exportMenu.hidden = true;
    exportToggle?.setAttribute('aria-expanded', 'false');
  });
  
  // Cleanup
  document.getElementById('log-cleanup')?.addEventListener('click', () => {
    const days = parseInt(document.getElementById('log-cleanup-days')?.value || '30', 10);
    cleanupLogs(days);
  });
  
  // Close export menu when clicking outside
  document.addEventListener('click', (e) => {
    if (exportMenu && !exportMenu.hidden) {
      if (!exportToggle?.contains(e.target) && !exportMenu.contains(e.target)) {
        exportMenu.hidden = true;
        exportToggle?.setAttribute('aria-expanded', 'false');
      }
    }
  });
});

// Export function for use in other scripts
window.openLogModal = openLogModal;
window.closeLogModal = closeLogModal;

})(); // End IIFE

/**
 * Log Activity Handler
 * Menangani modal log aktivitas dengan filtering dan pagination
 */

let logState = {
  logs: [],
  filteredLogs: [],
  currentPage: 1,
  itemsPerPage: 20,
  filters: {
    search: '',
    action: '',
    targetType: ''
  },
  autoRefreshInterval: null
};

// ============= Log Modal Functions =============

function openLogModal() {
  const overlay = document.getElementById('log-overlay');
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  
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
  const tbody = document.getElementById('log-table-body');
  const error = document.getElementById('log-error');
  
  tbody.innerHTML = '<tr><td colspan="5" class="log-loading px-3 py-4 text-center text-gray-500">Memuat data log...</td></tr>';
  error.hidden = true;
  
  try {
    // Simulate log data - In production, fetch from API
    // const response = await fetch('api.php?action=logs');
    // const data = await response.json();
    
    // For now, use sample data
    logState.logs = generateSampleLogs();
    applyFilters();
    renderLogs();
  } catch (err) {
    error.textContent = 'Gagal memuat log: ' + err.message;
    error.hidden = false;
    tbody.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-red-500">Gagal memuat data log</td></tr>';
  }
}

function generateSampleLogs() {
  const actions = ['create', 'delete', 'move', 'rename', 'upload', 'download'];
  const targets = ['document.pdf', 'image.jpg', 'folder', 'video.mp4', 'data.xlsx'];
  const types = ['file', 'folder'];
  const ips = ['192.168.1.100', '192.168.1.101', '192.168.1.102'];
  
  const logs = [];
  const now = Date.now();
  
  for (let i = 0; i < 100; i++) {
    logs.push({
      id: i + 1,
      timestamp: now - (i * 3600000), // 1 hour apart
      action: actions[Math.floor(Math.random() * actions.length)],
      target: targets[Math.floor(Math.random() * targets.length)],
      type: types[Math.floor(Math.random() * types.length)],
      ip: ips[Math.floor(Math.random() * ips.length)],
      user: 'User'
    });
  }
  
  return logs;
}

function applyFilters() {
  logState.filteredLogs = logState.logs.filter(log => {
    // Search filter
    if (logState.filters.search) {
      const search = logState.filters.search.toLowerCase();
      if (!log.target.toLowerCase().includes(search) && 
          !log.action.toLowerCase().includes(search)) {
        return false;
      }
    }
    
    // Action filter
    if (logState.filters.action && log.action !== logState.filters.action) {
      return false;
    }
    
    // Type filter
    if (logState.filters.targetType && log.type !== logState.filters.targetType) {
      return false;
    }
    
    return true;
  });
  
  logState.currentPage = 1;
}

function renderLogs() {
  const tbody = document.getElementById('log-table-body');
  const pageInfo = document.getElementById('log-page-info');
  const prevBtn = document.getElementById('log-prev');
  const nextBtn = document.getElementById('log-next');
  
  const total = logState.filteredLogs.length;
  const totalPages = Math.ceil(total / logState.itemsPerPage);
  const start = (logState.currentPage - 1) * logState.itemsPerPage;
  const end = Math.min(start + logState.itemsPerPage, total);
  const pageItems = logState.filteredLogs.slice(start, end);
  
  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-gray-500">Tidak ada log yang sesuai</td></tr>';
  } else {
    tbody.innerHTML = pageItems.map(log => `
      <tr class="border-b hover:bg-gray-50">
        <td class="px-3 py-2 text-xs">${formatLogTime(log.timestamp)}</td>
        <td class="px-3 py-2">
          <span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}">
            ${log.action}
          </span>
        </td>
        <td class="px-3 py-2 text-xs hidden sm:table-cell">${log.target}</td>
        <td class="px-3 py-2 text-xs hidden sm:table-cell">
          <span class="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">
            ${log.type}
          </span>
        </td>
        <td class="px-3 py-2 text-xs hidden md:table-cell">${log.ip}</td>
      </tr>
    `).join('');
  }
  
  pageInfo.textContent = `Halaman ${logState.currentPage} dari ${totalPages || 1}`;
  prevBtn.disabled = logState.currentPage <= 1;
  nextBtn.disabled = logState.currentPage >= totalPages;
  
  updateActiveFilters();
}

function formatLogTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getActionColor(action) {
  const colors = {
    'create': 'bg-green-100 text-green-700',
    'delete': 'bg-red-100 text-red-700',
    'move': 'bg-blue-100 text-blue-700',
    'rename': 'bg-yellow-100 text-yellow-700',
    'upload': 'bg-purple-100 text-purple-700',
    'download': 'bg-indigo-100 text-indigo-700'
  };
  return colors[action] || 'bg-gray-100 text-gray-700';
}

function updateActiveFilters() {
  const display = document.getElementById('active-filters-display');
  const tags = document.getElementById('active-filters-tags');
  
  const activeFilters = [];
  
  if (logState.filters.search) {
    activeFilters.push({ type: 'search', label: `Pencarian: "${logState.filters.search}"` });
  }
  if (logState.filters.action) {
    activeFilters.push({ type: 'action', label: `Aksi: ${logState.filters.action}` });
  }
  if (logState.filters.targetType) {
    activeFilters.push({ type: 'targetType', label: `Tipe: ${logState.filters.targetType}` });
  }
  
  if (activeFilters.length > 0) {
    display.style.display = 'block';
    tags.innerHTML = activeFilters.map(filter => `
      <button class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs" data-filter="${filter.type}">
        ${filter.label}
        <span class="ml-1">×</span>
      </button>
    `).join('');
    
    // Wire remove filter events
    tags.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterType = btn.dataset.filter;
        if (filterType === 'search') logState.filters.search = '';
        if (filterType === 'action') logState.filters.action = '';
        if (filterType === 'targetType') logState.filters.targetType = '';
        
        // Reset UI elements
        if (filterType === 'search') document.getElementById('log-path-search').value = '';
        if (filterType === 'action') document.getElementById('log-filter').value = '';
        if (filterType === 'targetType') document.getElementById('log-target-type').value = '';
        
        applyFilters();
        renderLogs();
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
  const logs = logState.filteredLogs;
  
  if (format === 'csv') {
    const csv = ['Waktu,Aksi,Target,Tipe,IP Address']
      .concat(logs.map(log => 
        `"${formatLogTime(log.timestamp)}","${log.action}","${log.target}","${log.type}","${log.ip}"`
      ))
      .join('\n');
    
    downloadFile('logs.csv', csv, 'text/csv');
  } else if (format === 'json') {
    const json = JSON.stringify(logs, null, 2);
    downloadFile('logs.json', json, 'application/json');
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function cleanupLogs(days) {
  if (!confirm(`Hapus log lebih dari ${days} hari?`)) return;
  
  // In production, call API to cleanup
  // await fetch(`api.php?action=cleanup-logs&days=${days}`, { method: 'POST' });
  
  const cutoff = Date.now() - (days * 24 * 3600000);
  logState.logs = logState.logs.filter(log => log.timestamp > cutoff);
  
  applyFilters();
  renderLogs();
  
  if (window.showSuccess) {
    window.showSuccess(`Log lebih dari ${days} hari telah dihapus`);
  }
}

// ============= Event Listeners =============

document.addEventListener('DOMContentLoaded', () => {
  // Log modal close buttons
  document.getElementById('log-close')?.addEventListener('click', closeLogModal);
  document.getElementById('log-close-top')?.addEventListener('click', closeLogModal);
  
  // Filters
  document.getElementById('log-path-search')?.addEventListener('input', (e) => {
    logState.filters.search = e.target.value;
    applyFilters();
    renderLogs();
  });
  
  document.getElementById('log-filter')?.addEventListener('change', (e) => {
    logState.filters.action = e.target.value;
    applyFilters();
    renderLogs();
  });
  
  document.getElementById('log-target-type')?.addEventListener('change', (e) => {
    logState.filters.targetType = e.target.value;
    applyFilters();
    renderLogs();
  });
  
  // Pagination
  document.getElementById('log-prev')?.addEventListener('click', () => {
    if (logState.currentPage > 1) {
      logState.currentPage--;
      renderLogs();
    }
  });
  
  document.getElementById('log-next')?.addEventListener('click', () => {
    const totalPages = Math.ceil(logState.filteredLogs.length / logState.itemsPerPage);
    if (logState.currentPage < totalPages) {
      logState.currentPage++;
      renderLogs();
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
  document.getElementById('log-refresh')?.addEventListener('click', loadLogs);
  
  // Export menu
  const exportToggle = document.getElementById('log-export-toggle');
  const exportMenu = document.getElementById('log-export-menu');
  
  exportToggle?.addEventListener('click', () => {
    const isHidden = exportMenu.hidden;
    exportMenu.hidden = !isHidden;
    exportToggle.setAttribute('aria-expanded', !isHidden);
  });
  
  document.getElementById('log-export-csv')?.addEventListener('click', () => {
    exportLogs('csv');
    exportMenu.hidden = true;
  });
  
  document.getElementById('log-export-json')?.addEventListener('click', () => {
    exportLogs('json');
    exportMenu.hidden = true;
  });
  
  // Cleanup
  document.getElementById('log-cleanup')?.addEventListener('click', () => {
    const days = parseInt(document.getElementById('log-cleanup-days')?.value || 30);
    cleanupLogs(days);
  });
  
  // Close export menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!exportToggle?.contains(e.target) && !exportMenu?.contains(e.target)) {
      exportMenu.hidden = true;
      exportToggle?.setAttribute('aria-expanded', 'false');
    }
  });
});

// Export function for use in other scripts
window.openLogModal = openLogModal;
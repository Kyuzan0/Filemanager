/**
 * Enhanced File Manager Integration
 * Menggabungkan new UI dengan semua fitur dari modules existing
 * Features: Drag-drop, file operations, modals, virtualization
 */

// ============= Global State =============

let files = [];
let currentPath = '';
let page = 1;
let pageSize = 5;
const selected = new Set();
let isDragging = false;
const draggedItems = new Set();
let currentContextId = null;
let contextFileData = null;

// DOM Elements
let tbody;
let showing;
let selectedCount;
let loaderOverlay;
let ctxMenu;
let app;

// ============= API Service =============

const API_BASE = 'api.php';

async function apiCall(action, payload = {}) {
  try {
    let url = `${API_BASE}?action=${action}`;
    if (payload.path) url += `&path=${encodeURIComponent(payload.path)}`;
    
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (Object.keys(payload).length > 0) {
      options.body = JSON.stringify(payload);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!data.success) throw new Error(data.error || 'API Error');
    return data;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
}

// ============= File Operations =============

async function deleteItems(paths) {
  showLoader(true);
  try {
    const result = await apiCall('delete', { paths });
    await loadFiles(currentPath);
    selected.clear();
    showSuccess(`${result.deleted?.length || 0} item(s) deleted`);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoader(false);
  }
}

async function renameItem(oldPath, newName) {
  showLoader(true);
  try {
    const pathSegments = oldPath.split('/');
    pathSegments.pop(); // Remove old name
    const parentPath = pathSegments.join('/');
    const finalPath = parentPath ? `${parentPath}/${newName}` : newName;
    
    const url = `${API_BASE}?action=rename&path=${encodeURIComponent(oldPath)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newName: newName,
        newPath: finalPath
      })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Rename failed');
    
    await loadFiles(currentPath);
    showSuccess(`Renamed to: ${newName}`);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoader(false);
  }
}

async function createFolder(folderName) {
  showLoader(true);
  try {
    const path = currentPath ? `${currentPath}/${folderName}` : folderName;
    await apiCall('create', { 
      type: 'folder',
      name: folderName,
      path: currentPath
    });
    
    await loadFiles(currentPath);
    showSuccess(`Folder created: ${folderName}`);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoader(false);
  }
}

async function moveItems(sourcePaths, destPath) {
  showLoader(true);
  try {
    for (const srcPath of sourcePaths) {
      const url = `${API_BASE}?action=move`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: srcPath,
          targetPath: destPath
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Move failed');
    }
    
    await loadFiles(currentPath);
    selected.clear();
    showSuccess(`${sourcePaths.length} item(s) moved`);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoader(false);
  }
}

// ============= UI Utilities =============

function showLoader(show) {
  if (loaderOverlay) {
    loaderOverlay.style.display = show ? 'flex' : 'none';
  }
}

function showError(msg) {
  console.error(msg);
  alert(`Error: ${msg}`);
}

function showSuccess(msg) {
  console.log(msg);
}

function updateBreadcrumbs(path) {
  const breadcrumbEl = document.getElementById('breadcrumbs');
  if (!breadcrumbEl) return;
  
  if (!path) {
    breadcrumbEl.textContent = 'Home';
    return;
  }
  
  const parts = path.split('/');
  breadcrumbEl.innerHTML = '<span>Home</span>';
  
  let currentSegment = '';
  for (const part of parts) {
    currentSegment = currentSegment ? `${currentSegment}/${part}` : part;
    const link = document.createElement('span');
    link.textContent = ` / ${part}`;
    link.style.cursor = 'pointer';
    link.addEventListener('click', () => loadFiles(currentSegment));
    breadcrumbEl.appendChild(link);
  }
}

// ============= Data Loading & Rendering =============

async function loadFiles(path = '') {
  showLoader(true);
  try {
    const url = `${API_BASE}?action=list&path=${encodeURIComponent(path)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) throw new Error(data.error);
    
    currentPath = path;
    files = (data.items || []).map((item, idx) => ({
      id: item.path || idx,
      name: item.name,
      type: item.type === 'folder' ? 'folder' : (item.name.split('.').pop().toLowerCase() || 'file'),
      date: formatDate(item.modified),
      size: item.type === 'folder' ? '-' : formatSize(item.size),
      path: item.path,
      modified: item.modified,
      rawSize: item.size
    }));
    
    selected.clear();
    page = 1;
    updateBreadcrumbs(path);
    render();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoader(false);
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('id-ID');
}

function formatSize(bytes) {
  if (!bytes || bytes === '-') return '-';
  if (typeof bytes === 'string') return bytes;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getParentPath(path) {
  if (!path) return '';
  const segments = path.split('/').filter(Boolean);
  segments.pop();
  return segments.join('/');
}

function getFileIcon(type) {
  const icons = {
    'folder': '📁',
    'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️',
    'pdf': '📄', 'txt': '📝', 'doc': '📘', 'docx': '📘',
    'xls': '📊', 'xlsx': '📊', 'zip': '📦', 'rar': '📦',
    'mp3': '🎵', 'mp4': '🎬'
  };
  return icons[type] || '🗎';
}

function render() {
  if (!tbody) {
    console.error('[render] tbody not initialized');
    return;
  }

  pageSize = parseInt(document.getElementById('pageSize')?.value || 5);
  const filter = document.getElementById('search')?.value.toLowerCase() || '';
  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(filter) || f.type.toLowerCase().includes(filter)
  );

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (page > pages) page = pages;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filtered.slice(start, end);

  tbody.innerHTML = '';

  const showingUpRow = !!currentPath;
  if (showingUpRow) {
    const parentPath = getParentPath(currentPath);
    const upRow = document.createElement('tr');
    upRow.classList.add('up-row');
    upRow.tabIndex = 0;
    upRow.dataset.parentPath = parentPath;
    upRow.dataset.path = parentPath;
    upRow.dataset.itemType = 'parent-shortcut';
    upRow.innerHTML = `
      <td class="px-3 py-3"></td>
      <td class="px-3 py-3">
        <span class="file-name flex items-center gap-2 text-sm font-medium">
          <span class="up-icon small" aria-hidden="true">←</span>
          <span class="text-dark">Back</span>
        </span>
      </td>
      <td class="px-3 py-3 text-sm text-slate-400 italic">Parent folder</td>
      <td class="px-3 py-3 text-sm">-</td>
      <td class="px-3 py-3 text-right text-sm">-</td>
      <td class="px-3 py-3 text-sm"></td>
    `;

    const goUp = () => loadFiles(parentPath);
    upRow.addEventListener('click', (event) => {
      event.preventDefault();
      goUp();
    });
    upRow.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goUp();
      }
    });

    // Enable drag-drop to move items back to parent folder
    upRow.addEventListener('dragover', handleDragOver);
    upRow.addEventListener('drop', handleDrop);

    tbody.appendChild(upRow);
  }
  
  const emptyState = document.getElementById('empty-state');
  if (pageItems.length === 0) {
    emptyState?.classList.remove('hidden');
  } else {
    emptyState?.classList.add('hidden');
  }

  console.log(`[render] Rendering ${pageItems.length} items (total: ${total})`);

  for (const f of pageItems) {
    const tr = document.createElement('tr');
    tr.dataset.id = f.id;
    tr.dataset.path = f.path;
    tr.dataset.itemType = f.type;
    tr.draggable = true;

    const checked = selected.has(f.path);
    const icon = f.type === 'folder' ? '📁' : getFileIcon(f.type);

    tr.innerHTML = `
      <td class="px-3 py-3"><input type="checkbox" class="sel" data-path="${f.path}" ${checked ? 'checked' : ''}></td>
      <td class="px-3 py-3"><span class="file-name"><span>${icon}</span><span class="text-dark">${f.name}</span></span></td>
      <td class="px-3 py-3 text-sm">${f.type}</td>
      <td class="px-3 py-3 text-sm">${f.date}</td>
      <td class="px-3 py-3 text-right text-sm">${f.size}</td>
      <td class="px-3 py-3 text-sm">
        <button class="btn" data-action="preview" data-path="${f.path}">Preview</button>
        <button class="btn" data-action="share" data-path="${f.path}">Share</button>
      </td>
    `;
    
    // Drag-drop handlers
    tr.addEventListener('dragstart', handleDragStart);
    tr.addEventListener('dragend', handleDragEnd);
    tr.addEventListener('dragover', handleDragOver);
    tr.addEventListener('drop', handleDrop);
    tr.addEventListener('contextmenu', handleContextMenu);
    
    tbody.appendChild(tr);
  }

  if (showing) showing.textContent = `Menampilkan ${start + 1}–${Math.min(end, total)} dari ${total} item`;
  if (selectedCount) selectedCount.textContent = `${selected.size} selected`;

  // Wire checkbox events
  document.querySelectorAll('.sel').forEach(el =>
    el.addEventListener('change', e => {
      const path = e.target.dataset.path;
      if (e.target.checked) selected.add(path);
      else selected.delete(path);
      if (selectedCount) selectedCount.textContent = `${selected.size} selected`;
    })
  );
}

// ============= Drag & Drop =============

function isValidDropTarget(row) {
  if (!row) return false;
  if (row.classList && row.classList.contains('up-row')) return true;
  const type = row.dataset ? row.dataset.itemType : null;
  if (type) return type === 'folder';

  const iconSpan = row.querySelector('.file-name span');
  return !!(iconSpan && iconSpan.textContent.includes('📁'));
}

function handleDragStart(e) {
  const path = e.currentTarget.dataset.path;
  isDragging = true;
  draggedItems.clear();
  draggedItems.add(path);
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', path);
  e.currentTarget.classList.add('dragging');
  
  if (tbody) tbody.classList.add('drag-active');
}

function handleDragEnd(e) {
  isDragging = false;
  draggedItems.clear();
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('tr.drop-active').forEach(el => el.classList.remove('drop-active'));
  if (tbody) tbody.classList.remove('drag-active');
}

function handleDragOver(e) {
  if (!isDragging) return;
  e.preventDefault();
  const row = e.currentTarget;
  if (isValidDropTarget(row)) {
    e.dataTransfer.dropEffect = 'move';
    row.classList.add('drop-active');
  } else {
    e.dataTransfer.dropEffect = 'none';
    row.classList.remove('drop-active');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  const row = e.currentTarget;
  if (!isValidDropTarget(row)) {
    showError('Can only drop into folders');
    return;
  }

  const targetPath = row.dataset.path ?? '';
  
  const sourcePaths = Array.from(draggedItems);
  row.classList.remove('drop-active');
  
  await moveItems(sourcePaths, targetPath);
}

// ============= Context Menu =============

function handleContextMenu(e) {
  e.preventDefault();
  const path = e.currentTarget.dataset.path;
  const fileData = files.find(f => f.path === path);
  
  currentContextId = path;
  contextFileData = fileData;
  
  ctxMenu.classList.add('visible');
  ctxMenu.style.display = 'block';
  ctxMenu.style.left = e.pageX + 'px';
  ctxMenu.style.top = e.pageY + 'px';
}

// ============= Event Handlers =============

function initializeEventHandlers() {
  // Close context menu
  document.addEventListener('click', () => {
    ctxMenu.classList.remove('visible');
    ctxMenu.style.display = 'none';
  });

  // Context menu actions
  ctxMenu?.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    
    const path = currentContextId;
    const fileData = contextFileData;
    
    if (action === 'open' && fileData?.type === 'folder') {
      await loadFiles(path);
    } else if (action === 'open') {
      // Open file in preview/editor modal
      if (window.openPreviewModal) {
        window.openPreviewModal(path, fileData?.name);
      }
    } else if (action === 'download') {
      window.open(`api.php?action=content&path=${encodeURIComponent(path)}`);
    } else if (action === 'rename') {
      const newName = prompt('Nama baru:', fileData?.name);
      if (newName) await renameItem(path, newName);
    } else if (action === 'delete') {
      if (confirm(`Hapus "${fileData?.name}"?`)) {
        await deleteItems([path]);
      }
    }
    
    ctxMenu.style.display = 'none';
  });

  // Search
  let searchTimeout;
  document.getElementById('search')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      page = 1;
      render();
    }, 250);
  });

  // Pagination
  document.getElementById('pageSize')?.addEventListener('change', () => {
    page = 1;
    render();
  });

  document.querySelectorAll('.footer button').forEach(btn => {
    if (btn.textContent.includes('Prev')) {
      btn.addEventListener('click', () => {
        if (page > 1) page--;
        render();
      });
    } else if (btn.textContent.includes('Next')) {
      btn.addEventListener('click', () => {
        page++;
        render();
      });
    }
  });

  // Select all
  document.getElementById('selectAll')?.addEventListener('change', function() {
    const checked = this.checked;
    document.querySelectorAll('.sel').forEach(el => {
      el.checked = checked;
      const path = el.dataset.path;
      if (checked) selected.add(path);
      else selected.delete(path);
    });
    selectedCount.textContent = `${selected.size} selected`;
  });

  // Delete selected
  document.getElementById('deleteSel')?.addEventListener('click', async () => {
    if (selected.size === 0) return showError('Tidak ada item yang dipilih');
    
    if (confirm(`Hapus ${selected.size} item terpilih?`)) {
      const selectedPaths = Array.from(selected);
      await deleteItems(selectedPaths);
    }
  });

  // New folder
  document.getElementById('newFolderBtn')?.addEventListener('click', async () => {
    const folderName = prompt('Nama folder baru:');
    if (folderName) await createFolder(folderName);
  });

  // Upload
  const modal = document.getElementById('modalBackdrop');
  const fileInput = document.getElementById('fileInput');

  document.getElementById('uploadBtn')?.addEventListener('click', () => {
    modal?.classList.add('visible');
    modal.style.display = 'flex';
  });

  document.getElementById('cancelUpload')?.addEventListener('click', () => {
    modal?.classList.remove('visible');
    modal.style.display = 'none';
    fileInput.value = '';
  });

  document.getElementById('doUpload')?.addEventListener('click', async () => {
    const files = fileInput.files;
    if (files.length === 0) return showError('Pilih file terlebih dahulu');
    
    showLoader(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      // Upload files one by one to ensure proper handling
      for (const file of files) {
        const formData = new FormData();
        formData.append('files[]', file);
        
        try {
          const response = await fetch(`${API_BASE}?action=upload&path=${encodeURIComponent(currentPath)}`, {
            method: 'POST',
            body: formData
          });
          const data = await response.json();
          
          if (data.success && data.uploaded?.length > 0) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Upload failed for ${file.name}:`, data.error);
          }
        } catch (error) {
          errorCount++;
          console.error(`Upload error for ${file.name}:`, error);
        }
      }
      
      await loadFiles(currentPath);
      modal?.classList.remove('visible');
      modal.style.display = 'none';
      fileInput.value = '';
      
      if (successCount > 0) {
        showSuccess(`${successCount} file berhasil diunggah${errorCount > 0 ? `, ${errorCount} gagal` : ''}`);
      } else {
        showError('Semua file gagal diunggah');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      showLoader(false);
    }
  });

  // New button - Open create modal
  document.getElementById('newBtn')?.addEventListener('click', () => {
    if (window.openCreateModal) {
      window.openCreateModal();
    }
  });

  // Theme toggle
  document.getElementById('toggleTheme')?.addEventListener('click', () => {
    const cur = app.getAttribute('data-theme');
    const newTheme = cur === 'light' ? 'dark' : 'light';
    // Set theme consistently on root and app to ensure CSS variables apply
    document.documentElement.setAttribute('data-theme', newTheme);
    app.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.getElementById('toggleTheme').textContent = newTheme === 'light' ? '🌙' : '☀️';
  });

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  app.setAttribute('data-theme', savedTheme);
  document.getElementById('toggleTheme').textContent = savedTheme === 'light' ? '🌙' : '☀️';

  // Keyboard shortcut: Delete
  document.addEventListener('keydown', e => {
    if (e.key === 'Delete') document.getElementById('deleteSel')?.click();
  });

  // Preview/Share buttons
  tbody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const path = btn.dataset.path;
    const file = files.find(f => f.path === path);
    
    if (action === 'preview') {
      if (file?.type === 'folder') {
        await loadFiles(path);
      } else {
        // Open in preview modal
        if (window.openPreviewModal) {
          window.openPreviewModal(path, file?.name);
        }
      }
    } else if (action === 'share') {
      const url = `${window.location.origin}${window.location.pathname}?preview=${encodeURIComponent(path)}`;
      navigator.clipboard?.writeText(url);
      showSuccess('Link disalin ke clipboard!');
    }
  });

  // Folder double-click
  tbody?.addEventListener('dblclick', async (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    
    const path = row.dataset.path;
    const file = files.find(f => f.path === path);
    
    if (file?.type === 'folder') {
      await loadFiles(path);
    }
  });
}

// ============= Initialization =============

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DOM references
  tbody = document.getElementById('tbody');
  showing = document.getElementById('showing');
  selectedCount = document.getElementById('selectedCount');
  loaderOverlay = document.getElementById('loader-overlay');
  ctxMenu = document.getElementById('contextMenu');
  app = document.getElementById('app');
  
  // Validate all required elements exist
  if (!tbody || !showing || !selectedCount || !ctxMenu || !app) {
    console.error('[enhanced-ui] Missing required DOM elements:', {
      tbody: !!tbody,
      showing: !!showing,
      selectedCount: !!selectedCount,
      ctxMenu: !!ctxMenu,
      app: !!app
    });
    return;
  }
  
  console.log('[enhanced-ui] DOM elements initialized successfully');
  
  // Initialize event handlers
  initializeEventHandlers();
  
  // Wait a bit before loading files to ensure all handlers are ready
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Load files
  await loadFiles('');
});

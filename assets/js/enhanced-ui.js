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

function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function getLanguageBadge(ext) {
  const badgeMap = {
    'html': { label: 'HTML', color: '#fff', bg: '#3498db' },
    'htm': { label: 'HTML', color: '#fff', bg: '#3498db' },
    'css': { label: 'CSS', color: '#fff', bg: '#27ae60' },
    'scss': { label: 'SCSS', color: '#fff', bg: '#c6538c' },
    'less': { label: 'LESS', color: '#fff', bg: '#1d365d' },
    'js': { label: 'JS', color: '#fff', bg: '#e74c3c' },
    'jsx': { label: 'JSX', color: '#000', bg: '#61dafb' },
    'ts': { label: 'TS', color: '#fff', bg: '#3178c6' },
    'tsx': { label: 'TSX', color: '#000', bg: '#61dafb' },
    'php': { label: 'PHP', color: '#fff', bg: '#777bb4' },
    'py': { label: 'PY', color: '#fff', bg: '#3776ab' },
    'java': { label: 'JAVA', color: '#fff', bg: '#f89820' },
    'json': { label: 'JSON', color: '#333', bg: '#ffd700' },
    'xml': { label: 'XML', color: '#fff', bg: '#ff6b35' },
    'yaml': { label: 'YAML', color: '#fff', bg: '#cb171e' },
    'yml': { label: 'YAML', color: '#fff', bg: '#cb171e' },
    'conf': { label: 'CONF', color: '#333', bg: '#9e9e9e' },
    'ini': { label: 'INI', color: '#333', bg: '#9e9e9e' },
    'env': { label: 'ENV', color: '#333', bg: '#ffc107' },
  };
  return badgeMap[ext] || null;
}

function getFileIcon(filename, type) {
  const ext = getFileExtension(filename);
  const badge = getLanguageBadge(ext);
  
  const svgIcons = {
    folder: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 4l2 2h7a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h5zm11 6v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8h18z"></path></svg>`,
    file: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5"></path></svg>`,
    image: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2zM8.5 11.5A2.5 2.5 0 1 0 8.5 6a2.5 2.5 0 0 0 0 5.5zM5 19l5.5-7 4 5 3-4L19 19H5z"></path></svg>`,
    pdf: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 18H6V4h8v16zm-2-3h-2v-2h2v2zm0-4h-2V9h2v4zm4 4h-2v-2h2v2zm0-4h-2V9h2v4z"></path></svg>`,
    archive: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-6-10h-2V9h2v4z"></path></svg>`,
    text: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-2 16H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V8h8v2z"></path></svg>`,
    sheet: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 9h2v2H7V9zm4 0h2v2h-2V9zm4 0h2v2h-2V9zM7 13h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"></path></svg>`,
    doc: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V8h8v2z"></path></svg>`,
    ppt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 9h-2V9h2v3zm4 0h-2V9h2v3zM9 9v3H7V9h2z"></path></svg>`,
    audio: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v10.55c-.5-.3-1-.5-1.5-.5-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"></path></svg>`,
    video: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg>`,
    markdown: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-2v2h-2v-2h-2v-2h2V9h2v2h2v2zm-8-2h2v6H9v-6z"></path></svg>`,
  };
  
  const iconMap = {
    // Folders
    'folder': 'folder',
    
    // Images
    'png': 'image', 'jpg': 'image', 'jpeg': 'image', 
    'gif': 'image', 'webp': 'image', 'svg': 'image',
    'bmp': 'image', 'ico': 'image',
    
    // Documents
    'pdf': 'pdf',
    'doc': 'doc', 'docx': 'doc',
    'xls': 'sheet', 'xlsx': 'sheet', 'csv': 'sheet', 'ods': 'sheet',
    'ppt': 'ppt', 'pptx': 'ppt', 'odp': 'ppt',
    
    // Text/Code
    'txt': 'text',
    'md': 'markdown', 'markdown': 'markdown',
    'html': 'code', 'htm': 'code',
    'css': 'code', 'scss': 'code', 'less': 'code',
    'js': 'code', 'jsx': 'code', 'ts': 'code', 'tsx': 'code',
    'php': 'code', 'py': 'code', 'java': 'code', 'c': 'code', 'cpp': 'code',
    'json': 'code', 'xml': 'code', 'yaml': 'code',
    'yml': 'code', 'conf': 'code', 'ini': 'code', 'env': 'code',
    
    // Archives
    'zip': 'archive', 'rar': 'archive', '7z': 'archive',
    'tar': 'archive', 'gz': 'archive', 'bz2': 'archive', 'tgz': 'archive',
    
    // Media
    'mp3': 'audio', 'wav': 'audio', 'flac': 'audio',
    'ogg': 'audio', 'm4a': 'audio', 'aac': 'audio',
    'mp4': 'video', 'webm': 'video', 'mkv': 'video',
    'mov': 'video', 'avi': 'video', 'm4v': 'video', 'flv': 'video',
  };
  
  const iconKey = iconMap[ext] || iconMap[type] || 'file';
  const baseSvg = svgIcons[iconKey] || svgIcons.file;
  
  // Return icon with badge if available
  if (badge && iconKey === 'code') {
    return `<span class="icon-with-badge" style="--badge-color: ${badge.bg}; --badge-text: ${badge.color};" data-badge="${badge.label}">${baseSvg}</span>`;
  }
  
  return baseSvg;
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
    const icon = f.type === 'folder' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 4l2 2h7a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h5zm11 6v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8h18z"></path></svg>' : getFileIcon(f.name, f.type);

    tr.innerHTML = `
      <td class="px-3 py-3"><input type="checkbox" class="sel" data-path="${f.path}" ${checked ? 'checked' : ''}></td>
      <td class="px-3 py-3"><span class="file-name file-icon-cell"><span class="file-icon">${icon}</span><span class="text-dark">${f.name}</span></span></td>
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

  const iconSvg = row.querySelector('.file-icon svg path');
  // Check if the path starts with the folder path pattern
  return !!(iconSvg && iconSvg.getAttribute('d').includes('10 4l2 2h7'));
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
  const fileDropZone = document.getElementById('fileDropZone');
  const fileList = document.getElementById('fileList');

  function displaySelectedFiles() {
    if (fileInput.files.length === 0) {
      fileList.innerHTML = '';
      return;
    }
    
    const files = Array.from(fileInput.files);
    const total = files.reduce((sum, f) => sum + f.size, 0);
    const totalMB = (total / 1024 / 1024).toFixed(2);
    
    fileList.innerHTML = `
      <div class="bg-blue-50 p-3 rounded-lg">
        <p class="font-medium text-blue-900">${files.length} file dipilih</p>
        <p class="text-sm text-blue-700">Total: ${totalMB} MB</p>
        <ul class="text-xs text-blue-700 mt-2 space-y-1">
          ${files.slice(0, 3).map(f => `<li>• ${f.name}</li>`).join('')}
          ${files.length > 3 ? `<li>• ... dan ${files.length - 3} file lainnya</li>` : ''}
        </ul>
      </div>
    `;
  }

  // Show modal first when upload button clicked
  document.getElementById('uploadBtn')?.addEventListener('click', () => {
    modal?.classList.add('visible');
    modal.style.display = 'flex';
  });

  // Handle file selection from input
  fileInput?.addEventListener('change', () => {
    displaySelectedFiles();
  });

  // Drag and drop support
  fileDropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('border-blue-400', 'bg-blue-50');
  });

  fileDropZone?.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('border-blue-400', 'bg-blue-50');
  });

  fileDropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('border-blue-400', 'bg-blue-50');
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
    }
  });

  // Click on drop zone to open file picker
  fileDropZone?.addEventListener('click', () => {
    fileInput.click();
  });

  document.getElementById('cancelUpload')?.addEventListener('click', () => {
    modal?.classList.remove('visible');
    modal.style.display = 'none';
    fileInput.value = '';
    fileList.innerHTML = '';
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
      fileList.innerHTML = '';
      
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

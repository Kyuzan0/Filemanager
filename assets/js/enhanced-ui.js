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
    console.log('[renameItem] URL:', url);
    console.log('[renameItem] Body:', { newName, newPath: finalPath });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newName: newName,
        newPath: finalPath
      })
    });
    
    console.log('[renameItem] Response status:', response.status);
    const data = await response.json();
    console.log('[renameItem] Response data:', data);
    
    if (!data.success) throw new Error(data.error || 'Rename failed');
    
    await loadFiles(currentPath);
    showSuccess(`Renamed to: ${newName}`);
  } catch (error) {
    console.error('[renameItem] Error:', error);
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
  if (typeof window.showToast === 'function') {
    window.showToast('error', msg);
  } else {
    console.error(msg);
    alert(`Error: ${msg}`);
  }
}

function showSuccess(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast('success', msg);
  } else {
    console.log(msg);
  }
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
  
  // Icon dengan warna dan background berbeda untuk setiap tipe
  const iconConfig = {
    // Folders
    folder: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#f59e0b" d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
      bg: '#fef3c7'
    },
    // Default file
    file: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#64748b" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/></svg>`,
      bg: '#f1f5f9'
    },
    // Code files dengan warna berbeda
    php: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#777bb4" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#ede9fe'
    },
    js: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#f7df1e" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#fef9c3'
    },
    jsx: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#61dafb" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#cffafe'
    },
    ts: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#3178c6" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#dbeafe'
    },
    tsx: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#3178c6" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#dbeafe'
    },
    html: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#e34c26" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#fee2e2'
    },
    htm: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#e34c26" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#fee2e2'
    },
    css: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#264de4" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#dbeafe'
    },
    scss: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#c6538c" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#fce7f3'
    },
    less: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#1d365d" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#e0e7ff'
    },
    py: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#3776ab" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#dbeafe'
    },
    java: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#f89820" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#ffedd5'
    },
    json: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#fbbf24" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#fef3c7'
    },
    xml: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#ff6b35" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#ffedd5'
    },
    yaml: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#cb171e" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#fee2e2'
    },
    yml: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#cb171e" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#fee2e2'
    },
    conf: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#6b7280" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#f3f4f6'
    },
    ini: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#6b7280" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#f3f4f6'
    },
    env: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#16a34a" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#dcfce7'
    },
    c: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#a8b9cc" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#f1f5f9'
    },
    cpp: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#00599c" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#dbeafe'
    },
    vue: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#42b883" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
      bg: '#d1fae5'
    },
    // Images
    image: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#ef4444" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
      bg: '#fee2e2'
    },
    // PDF
    pdf: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#ef4444" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/></svg>`,
      bg: '#fee2e2'
    },
    // Archives
    archive: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#8b5cf6" d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 6h-2v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2v-2h-2V8h2v2h2v2z"/></svg>`,
      bg: '#ede9fe'
    },
    // Text
    text: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#64748b" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6zm2-6h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>`,
      bg: '#f1f5f9'
    },
    // Markdown
    md: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#8b5cf6" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/></svg>`,
      bg: '#ede9fe'
    },
    markdown: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#8b5cf6" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/></svg>`,
      bg: '#ede9fe'
    },
    // Sheets
    sheet: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#22c55e" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6zm2-8h2v2H8v-2zm4 0h2v2h-2v-2zm-4 4h2v2H8v-2zm4 0h2v2h-2v-2z"/></svg>`,
      bg: '#dcfce7'
    },
    // Documents
    doc: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#2563eb" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6zm2-8h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>`,
      bg: '#dbeafe'
    },
    // PPT
    ppt: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#f97316" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8 17H6v-4h2v4zm0-6H6V9h2v2zm4 6h-2v-4h2v4zm0-6h-2V9h2v2zm4 6h-2v-4h2v4zm0-6h-2V9h2v2z"/></svg>`,
      bg: '#ffedd5'
    },
    // Audio
    audio: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#ec4899" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
      bg: '#fce7f3'
    },
    // Video
    video: { 
      icon: `<svg viewBox="0 0 24 24"><path fill="#a855f7" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
      bg: '#f3e8ff'
    },
  };
  
  // Map extension ke icon config
  const extToType = {
    // Images
    'png': 'image', 'jpg': 'image', 'jpeg': 'image', 
    'gif': 'image', 'webp': 'image', 'svg': 'image',
    'bmp': 'image', 'ico': 'image',
    // Documents
    'pdf': 'pdf',
    'doc': 'doc', 'docx': 'doc',
    'xls': 'sheet', 'xlsx': 'sheet', 'csv': 'sheet', 'ods': 'sheet',
    'ppt': 'ppt', 'pptx': 'ppt', 'odp': 'ppt',
    // Text
    'txt': 'text', 'log': 'text',
    // Archives
    'zip': 'archive', 'rar': 'archive', '7z': 'archive',
    'tar': 'archive', 'gz': 'archive', 'bz2': 'archive', 'tgz': 'archive',
    // Media
    'mp3': 'audio', 'wav': 'audio', 'flac': 'audio',
    'ogg': 'audio', 'm4a': 'audio', 'aac': 'audio',
    'mp4': 'video', 'webm': 'video', 'mkv': 'video',
    'mov': 'video', 'avi': 'video', 'm4v': 'video', 'flv': 'video',
  };
  
  // Cek apakah extension punya config langsung
  let config = iconConfig[ext];
  
  // Jika tidak, cek mapping
  if (!config) {
    const mappedType = extToType[ext];
    config = mappedType ? iconConfig[mappedType] : iconConfig.file;
  }
  
  // Return object dengan icon dan background
  return {
    html: config.icon,
    type: ext || 'file',
    bg: config.bg
  };
}

/**
 * Generate page numbers with ellipsis for pagination
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @returns {Array} Array of page numbers and ellipsis
 */
function getPageRange(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  const pages = [1];
  
  if (currentPage > 3) {
    pages.push('...');
  }
  
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  if (currentPage < totalPages - 2) {
    pages.push('...');
  }
  
  if (totalPages > 1) {
    pages.push(totalPages);
  }
  
  return pages;
}

/**
 * Render pagination page numbers
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 */
function renderPageNumbers(currentPage, totalPages) {
  const container = document.getElementById('page-numbers');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (totalPages <= 1) {
    // Single page - show "1" button
    const btn = document.createElement('button');
    btn.className = 'page-num-btn px-2.5 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white';
    btn.textContent = '1';
    btn.disabled = true;
    container.appendChild(btn);
    return;
  }
  
  const pageRange = getPageRange(currentPage, totalPages);
  
  pageRange.forEach(p => {
    if (p === '...') {
      const dots = document.createElement('span');
      dots.className = 'px-1.5 text-gray-400 dark:text-gray-500';
      dots.textContent = '...';
      container.appendChild(dots);
    } else {
      const btn = document.createElement('button');
      const isActive = p === currentPage;
      btn.className = isActive
        ? 'page-num-btn px-2.5 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white'
        : 'page-num-btn px-2.5 py-1.5 rounded-md text-sm font-medium border border-slate-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors';
      btn.textContent = p;
      btn.disabled = isActive;
      
      if (!isActive) {
        btn.addEventListener('click', () => {
          page = p;
          render();
        });
      }
      
      container.appendChild(btn);
    }
  });
}

function render() {
  if (!tbody) {
    console.error('[render] tbody not initialized');
    return;
  }

  pageSize = parseInt(document.getElementById('pageSize')?.value || 10);
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

  // Function to truncate long filenames
  function truncateFileName(name, maxLength = 35) {
    if (name.length <= maxLength) return name;
    
    const lastDot = name.lastIndexOf('.');
    const hasExtension = lastDot > 0 && lastDot > name.length - 10;
    
    if (hasExtension) {
      const ext = name.substring(lastDot);
      const baseName = name.substring(0, lastDot);
      const tailLength = 5;
      
      if (baseName.length <= maxLength - ext.length - 3 - tailLength) return name;
      
      const availableForStart = maxLength - ext.length - 3 - tailLength;
      const start = baseName.substring(0, Math.max(availableForStart, 10));
      const end = baseName.substring(baseName.length - tailLength);
      
      return `${start}...${end}${ext}`;
    } else {
      const tailLength = 5;
      const start = name.substring(0, maxLength - 3 - tailLength);
      const end = name.substring(name.length - tailLength);
      return `${start}...${end}`;
    }
  }

  console.log(`[render] Rendering ${pageItems.length} items (total: ${total})`);

  for (const f of pageItems) {
    const tr = document.createElement('tr');
    tr.dataset.id = f.id;
    tr.dataset.path = f.path;
    tr.dataset.itemType = f.type;
    tr.draggable = true;

    const checked = selected.has(f.path);
    const iconData = f.type === 'folder' 
      ? { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#f59e0b" d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>', type: 'folder', bg: '#fef3c7' }
      : getFileIcon(f.name, f.type);

    tr.innerHTML = `
      <td class="px-3 py-3"><input type="checkbox" class="sel" data-path="${f.path}" ${checked ? 'checked' : ''}></td>
      <td class="px-3 py-3"><span class="file-name file-icon-cell" title="${f.name}"><span class="file-icon ${iconData.type}" style="background-color: ${iconData.bg}; padding: 6px; border-radius: 6px;">${iconData.html}</span><span class="text-dark">${truncateFileName(f.name)}</span></span></td>
      <td class="px-3 py-3 text-sm">${f.type}</td>
      <td class="px-3 py-3 text-sm">${f.date}</td>
      <td class="px-3 py-3 text-right text-sm">${f.size}</td>
      <td class="px-3 py-3 text-sm">
        <div class="row-actions inline-flex items-center gap-1 justify-end">
          <!-- Desktop: Show all action buttons -->
          <div class="hidden sm:flex items-center gap-1">
            <button class="action-icon-btn p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-blue-600 dark:text-blue-400" data-action="preview" data-path="${f.path}" title="Buka">
              <i class="ri-folder-open-line text-base"></i>
            </button>
            ${f.type === 'file' ? `
            <button class="action-icon-btn p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-green-600 dark:text-green-400" data-action="download" data-path="${f.path}" title="Unduh">
              <i class="ri-download-line text-base"></i>
            </button>
            ` : ''}
            <button class="action-icon-btn p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-amber-600 dark:text-amber-400" data-action="rename" data-path="${f.path}" title="Ganti Nama">
              <i class="ri-edit-line text-base"></i>
            </button>
            <button class="action-icon-btn p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-purple-600 dark:text-purple-400" data-action="move" data-path="${f.path}" title="Pindahkan">
              <i class="ri-folder-transfer-line text-base"></i>
            </button>
            <button class="action-icon-btn p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-red-500 dark:text-red-400" data-action="delete" data-path="${f.path}" title="Hapus">
              <i class="ri-delete-bin-line text-base"></i>
            </button>
          </div>
          <!-- Mobile: Show more button -->
          <button class="mobile-more-btn sm:hidden p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400" data-path="${f.path}" data-type="${f.type}" data-name="${f.name}" title="Menu">
            <i class="ri-more-2-fill text-lg"></i>
          </button>
        </div>
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
  
  // Render page numbers
  renderPageNumbers(page, pages);
  
  // Update prev/next button states
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= pages;

  // Wire checkbox events
  document.querySelectorAll('.sel').forEach(el =>
    el.addEventListener('change', e => {
      const path = e.target.dataset.path;
      if (e.target.checked) selected.add(path);
      else selected.delete(path);
      if (selectedCount) selectedCount.textContent = `${selected.size} selected`;
    })
  );

  // Wire action button events
  document.querySelectorAll('.action-icon-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const path = btn.dataset.path;
      const fileData = files.find(f => f.path === path);
      
      if (action === 'preview') {
        if (fileData?.type === 'folder') {
          await loadFiles(path);
        } else if (window.openPreviewModal) {
          window.openPreviewModal(path, fileData?.name);
        }
      } else if (action === 'download') {
        // Show download modal first
        if (window.openDownloadOverlay) {
          window.openDownloadOverlay(
            { ...fileData, path },
            async (file) => {
              const downloadUrl = `api.php?action=raw&path=${encodeURIComponent(file.path)}`;
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = file.name || 'download';
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          );
        } else {
          // Fallback: Direct download
          const a = document.createElement('a');
          a.href = `api.php?action=raw&path=${encodeURIComponent(path)}`;
          a.download = fileData?.name || 'download';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else if (action === 'rename') {
        if (window.openRenameModal) {
          window.openRenameModal(path, fileData?.name);
        } else if (window.openRenameOverlay) {
          window.openRenameOverlay({ ...fileData, path });
        } else {
          const newName = prompt('Nama baru:', fileData?.name);
          if (newName) await renameItem(path, newName);
        }
      } else if (action === 'move') {
        if (window.openMoveModal) {
          window.openMoveModal([path]);
        } else if (window.openMoveOverlay) {
          window.openMoveOverlay([path]);
        }
      } else if (action === 'delete') {
        if (window.openDeleteOverlay) {
          window.openDeleteOverlay(
            [{ ...fileData, path }],
            async (items) => {
              const paths = items.map(item => item.path);
              await deleteItems(paths);
            }
          );
        } else if (confirm(`Hapus "${fileData?.name}"?`)) {
          await deleteItems([path]);
        }
      }
    });
  });

  // Wire mobile more button events
  document.querySelectorAll('.mobile-more-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const path = btn.dataset.path;
      const type = btn.dataset.type;
      const name = btn.dataset.name;
      showMobileContextMenu(e, { path, type, name });
    });
  });
}

// ============= Mobile Context Menu =============

function showMobileContextMenu(event, fileData) {
  // Remove existing mobile context menu
  const existingMenu = document.getElementById('mobile-context-menu');
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'mobile-context-menu';
  menu.className = 'mobile-context-menu fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]';
  
  const menuItems = [
    { action: 'preview', icon: 'ri-folder-open-line', label: 'Buka', color: 'text-blue-600 dark:text-blue-400' },
    ...(fileData.type === 'file' ? [{ action: 'download', icon: 'ri-download-line', label: 'Unduh', color: 'text-green-600 dark:text-green-400' }] : []),
    { action: 'rename', icon: 'ri-edit-line', label: 'Ganti Nama', color: 'text-amber-600 dark:text-amber-400' },
    { action: 'move', icon: 'ri-folder-transfer-line', label: 'Pindahkan', color: 'text-purple-600 dark:text-purple-400' },
    { divider: true },
    { action: 'details', icon: 'ri-information-line', label: 'Detail', color: 'text-blue-500 dark:text-blue-400' },
    { divider: true },
    { action: 'delete', icon: 'ri-delete-bin-line', label: 'Hapus', color: 'text-red-500 dark:text-red-400' }
  ];

  menu.innerHTML = menuItems.map(item => {
    if (item.divider) {
      return '<div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>';
    }
    return `
      <button class="mobile-context-item w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-action="${item.action}">
        <i class="${item.icon} ${item.color} text-lg"></i>
        <span class="text-sm text-gray-700 dark:text-gray-200">${item.label}</span>
      </button>
    `;
  }).join('');

  document.body.appendChild(menu);

  // Position the menu
  const rect = event.target.closest('button').getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  
  let top = rect.bottom + 4;
  let left = rect.left;

  // Adjust if menu goes off screen
  if (left + menuRect.width > window.innerWidth) {
    left = window.innerWidth - menuRect.width - 8;
  }
  if (top + menuRect.height > window.innerHeight) {
    top = rect.top - menuRect.height - 4;
  }

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  // Handle menu item clicks
  menu.querySelectorAll('.mobile-context-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      closeMobileContextMenu();
      await handleMobileAction(action, fileData);
    });
  });

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeMobileContextMenu, { once: true });
  }, 0);
}

function closeMobileContextMenu() {
  const menu = document.getElementById('mobile-context-menu');
  if (menu) menu.remove();
}

async function handleMobileAction(action, fileData) {
  const { path, type, name } = fileData;
  
  if (action === 'preview') {
    if (type === 'folder') {
      await loadFiles(path);
    } else if (window.openPreviewModal) {
      window.openPreviewModal(path, name);
    }
  } else if (action === 'download') {
    // Show download modal first
    if (window.openDownloadOverlay) {
      window.openDownloadOverlay(
        { name, type, path, ...fileData },
        async (file) => {
          const downloadUrl = `api.php?action=raw&path=${encodeURIComponent(file.path)}`;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = file.name || 'download';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      );
    } else {
      // Fallback: Direct download
      const a = document.createElement('a');
      a.href = `api.php?action=raw&path=${encodeURIComponent(path)}`;
      a.download = name || 'download';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } else if (action === 'rename') {
    if (window.openRenameModal) {
      window.openRenameModal(path, name);
    } else if (window.openRenameOverlay) {
      window.openRenameOverlay({ name, type, path });
    } else {
      const newName = prompt('Nama baru:', name);
      if (newName) await renameItem(path, newName);
    }
  } else if (action === 'move') {
    if (window.openMoveModal) {
      window.openMoveModal([path]);
    } else if (window.openMoveOverlay) {
      window.openMoveOverlay([path]);
    }
  } else if (action === 'delete') {
    if (window.openDeleteOverlay) {
      window.openDeleteOverlay(
        [{ name, type, path }],
        async (items) => {
          const paths = items.map(item => item.path);
          await deleteItems(paths);
        }
      );
    } else if (confirm(`Hapus "${name}"?`)) {
      await deleteItems([path]);
    }
  } else if (action === 'details') {
    if (window.openDetailsOverlay) {
      window.openDetailsOverlay({ name, type, path, ...fileData });
    }
  }
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
  // Check if this is an internal drag (file move) or external drag (file upload from computer)
  const isExternalDrag = e.dataTransfer.types.includes('Files') && !isDragging;
  
  if (isExternalDrag) {
    // Allow external file drops - will be handled by card drop handler
    return;
  }
  
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
  // Check if this is an external file drop (from computer)
  const hasFiles = e.dataTransfer.types.includes('Files');
  const isExternalDrop = hasFiles && !isDragging && e.dataTransfer.files.length > 0;
  
  if (isExternalDrop) {
    // Don't handle here - let it bubble up to card drop handler
    return;
  }
  
  // This is an internal drag (moving files between folders)
  if (!isDragging) return;
  
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
  
  // Show context menu
  ctxMenu.classList.remove('hidden');
  ctxMenu.classList.add('visible');
  ctxMenu.style.display = 'block';
  ctxMenu.setAttribute('aria-hidden', 'false');
  
  // Position the menu
  const menuWidth = ctxMenu.offsetWidth || 180;
  const menuHeight = ctxMenu.offsetHeight || 200;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let posX = e.pageX;
  let posY = e.pageY;
  
  // Adjust if menu would overflow right edge
  if (posX + menuWidth > viewportWidth - 10) {
    posX = viewportWidth - menuWidth - 10;
  }
  
  // Adjust if menu would overflow bottom edge
  if (posY + menuHeight > viewportHeight - 10) {
    posY = viewportHeight - menuHeight - 10;
  }
  
  ctxMenu.style.left = posX + 'px';
  ctxMenu.style.top = posY + 'px';
}

// ============= Event Handlers =============

let eventHandlersInitialized = false;

function initializeEventHandlers() {
  // Prevent duplicate initialization
  if (eventHandlersInitialized) {
    console.log('[enhanced-ui] Event handlers already initialized, skipping');
    return;
  }
  eventHandlersInitialized = true;
  
  console.log('[enhanced-ui] Initializing event handlers');
  
  // Close context menu
  document.addEventListener('click', (e) => {
    // Don't close if clicking inside context menu
    if (ctxMenu && !ctxMenu.contains(e.target)) {
      ctxMenu.classList.add('hidden');
      ctxMenu.classList.remove('visible');
      ctxMenu.style.display = 'none';
      ctxMenu.setAttribute('aria-hidden', 'true');
    }
  });

  // Context menu actions
  ctxMenu?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    
    const path = currentContextId;
    const fileData = contextFileData;
    
    // Close context menu immediately for better UX
    ctxMenu.classList.add('hidden');
    ctxMenu.classList.remove('visible');
    ctxMenu.style.display = 'none';
    ctxMenu.setAttribute('aria-hidden', 'true');
    
    if (action === 'open' && fileData?.type === 'folder') {
      await loadFiles(path);
    } else if (action === 'open') {
      // Open file in preview/editor modal
      if (window.openPreviewModal) {
        window.openPreviewModal(path, fileData?.name);
      }
    } else if (action === 'download') {
      // Show download modal first, then download on confirm
      if (window.openDownloadOverlay) {
        window.openDownloadOverlay(
          { ...fileData, path },
          async (file) => {
            // Direct download using raw action
            const downloadUrl = `api.php?action=raw&path=${encodeURIComponent(file.path)}`;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = file.name || 'download';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        );
      } else {
        // Fallback: Direct download if modal not available
        const downloadUrl = `api.php?action=raw&path=${encodeURIComponent(path)}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileData?.name || 'download';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } else if (action === 'rename') {
      // Use rename modal
      if (window.openRenameModal) {
        window.openRenameModal(path, fileData?.name);
      } else if (window.openRenameOverlay) {
        window.openRenameOverlay({ ...fileData, path });
      } else {
        // Fallback to prompt
        const newName = prompt('Nama baru:', fileData?.name);
        if (newName) await renameItem(path, newName);
      }
    } else if (action === 'delete') {
      // Use delete modal
      if (window.openDeleteOverlay) {
        window.openDeleteOverlay(
          [{ ...fileData, path }],
          async (items) => {
            const paths = items.map(item => item.path);
            await deleteItems(paths);
          }
        );
      } else {
        // Fallback to confirm
        if (confirm(`Hapus "${fileData?.name}"?`)) {
          await deleteItems([path]);
        }
      }
    } else if (action === 'move') {
      // Open move overlay if available
      if (window.openMoveModal) {
        window.openMoveModal([path]);
      } else if (window.openMoveOverlay) {
        window.openMoveOverlay([path]);
      }
    } else if (action === 'details') {
      // Open details overlay
      console.log('[enhanced-ui] details action triggered, fileData:', fileData);
      console.log('[enhanced-ui] window.openDetailsOverlay:', typeof window.openDetailsOverlay);
      if (window.openDetailsOverlay) {
        window.openDetailsOverlay({ ...fileData, path });
      } else {
        console.error('[enhanced-ui] openDetailsOverlay not available on window');
      }
    }
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

  // Prev/Next buttons with specific IDs
  document.getElementById('prevPage')?.addEventListener('click', () => {
    if (page > 1) {
      page--;
      render();
    }
  });
  
  document.getElementById('nextPage')?.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(files.length / pageSize));
    if (page < totalPages) {
      page++;
      render();
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
    
    const selectedPaths = Array.from(selected);
    
    // Build items array with file info
    const itemsToDelete = selectedPaths.map(path => {
      const name = path.split('/').pop();
      const fileInfo = files.find(f => f.path === path || f.name === name);
      return {
        path,
        name,
        type: fileInfo?.type || 'file'
      };
    });
    
    if (window.openDeleteOverlay) {
      window.openDeleteOverlay(
        itemsToDelete,
        async (items) => {
          const paths = items.map(item => item.path);
          await deleteItems(paths);
        }
      );
    } else {
      // Fallback to confirm
      if (confirm(`Hapus ${selected.size} item terpilih?`)) {
        await deleteItems(selectedPaths);
      }
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
  fileDropZone?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  // --- Drag-drop to .card upload (new modal - wait for user confirmation) ---
  let pendingUploadFiles = []; // Store files waiting to be uploaded
  let isUploadInProgress = false; // Flag to prevent duplicate uploads
  let isUploadCompleted = false; // Flag to track if upload has completed

  // Create card upload modal dynamically
  function createCardUploadModal() {
    if (document.getElementById('cardUploadModal')) return;
    const container = document.createElement('div');
    container.id = 'cardUploadModal';
    container.className = 'card-upload-modal-backdrop';
    container.innerHTML = `
      <div class="card-upload-modal">
        <div class="card-upload-modal__header">
          <div class="card-upload-modal__title-group">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="card-upload-modal__icon"><path d="M12 3v10" stroke="#0ea5e9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8 9l4-4 4 4" stroke="#0ea5e9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#0ea5e9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            <div>
              <div class="card-upload-modal__title">Upload Files</div>
              <div class="card-upload-modal__subtitle">Klik tombol "Upload" untuk memulai unggahan</div>
            </div>
          </div>
          <div>
            <button id="cardUploadClose" class="btn card-upload-modal__close-btn">×</button>
          </div>
        </div>
        <div id="cardUploadList" class="card-upload-modal__file-list"></div>
        <div id="cardUploadSummary" class="card-upload-modal__summary" style="display:none;">
          <div id="cardUploadSummaryText"></div>
        </div>
        <div class="card-upload-modal__footer">
          <button id="cardUploadCancel" class="btn">Batal</button>
          <button id="cardUploadStart" class="btn btn-primary">
            <span class="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
              Upload
            </span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // Close modal handler
    const closeModal = () => {
      const el = document.getElementById('cardUploadModal');
      el?.parentNode?.removeChild(el);
      pendingUploadFiles = [];
      isUploadInProgress = false;
      isUploadCompleted = false;
    };

    document.getElementById('cardUploadClose')?.addEventListener('click', closeModal);
    document.getElementById('cardUploadCancel')?.addEventListener('click', closeModal);

    // Upload button handler
    document.getElementById('cardUploadStart')?.addEventListener('click', async () => {
      // If upload already completed, just close the modal
      if (isUploadCompleted) {
        closeModal();
        return;
      }
      
      // Prevent duplicate upload
      if (isUploadInProgress || pendingUploadFiles.length === 0) return;
      
      isUploadInProgress = true;
      
      const uploadBtn = document.getElementById('cardUploadStart');
      const cancelBtn = document.getElementById('cardUploadCancel');
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="flex items-center gap-1.5">Mengupload...</span>';
      }
      if (cancelBtn) cancelBtn.disabled = true;

      const list = document.getElementById('cardUploadList');
      const rows = list?.querySelectorAll('.card-upload-row') || [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingUploadFiles.length; i++) {
        const file = pendingUploadFiles[i];
        const row = rows[i];
        const progressEl = row?.querySelector('.card-upload-progress');
        const statusEl = row?.querySelector('.card-upload-status');

        if (statusEl) statusEl.textContent = 'Mengupload...';
        
        const result = await uploadFileWithProgress(file, progressEl, statusEl);
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      // Show summary
      const summary = document.getElementById('cardUploadSummary');
      const summaryText = document.getElementById('cardUploadSummaryText');
      if (summary && summaryText) {
        summary.style.display = 'block';
        if (successCount > 0 && errorCount === 0) {
          summary.className = 'card-upload-modal__summary summary-success';
          summaryText.textContent = `✓ ${successCount} file berhasil diupload`;
        } else if (successCount > 0 && errorCount > 0) {
          summary.className = 'card-upload-modal__summary summary-warning';
          summaryText.textContent = `${successCount} berhasil, ${errorCount} gagal`;
        } else {
          summary.className = 'card-upload-modal__summary summary-danger';
          summaryText.textContent = `✗ Semua file gagal diupload`;
        }
      }

      // Update buttons
      if (uploadBtn) {
        uploadBtn.innerHTML = '<span>Selesai</span>';
        uploadBtn.disabled = false;
      }
      if (cancelBtn) cancelBtn.style.display = 'none';
      
      // Mark upload as completed
      isUploadCompleted = true;
      isUploadInProgress = false;

      // Reload file list
      await loadFiles(currentPath);
    });
  }

  // Show modal with file list (no auto-upload)
  function showCardUploadModal(files) {
    // Remove existing modal if any
    const existingModal = document.getElementById('cardUploadModal');
    if (existingModal) existingModal.parentNode?.removeChild(existingModal);

    createCardUploadModal();
    const list = document.getElementById('cardUploadList');
    if (!list) return;
    list.innerHTML = '';

    pendingUploadFiles = Array.from(files);
    let totalSize = 0;

    pendingUploadFiles.forEach((file, idx) => {
      totalSize += file.size;
      const row = document.createElement('div');
      row.className = 'card-upload-row';
      
      // Get file icon based on extension
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const iconInfo = getFileIconColor(ext);
      
      row.innerHTML = `
        <div class="card-upload-row__icon-container ${iconInfo.bgClass}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="${iconInfo.strokeClass}">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="card-upload-row__info">
          <div class="card-upload-row__name">${file.name}</div>
          <div class="card-upload-row__size">${formatFileSize(file.size)}</div>
        </div>
        <div class="card-upload-row__progress-container">
          <div class="card-upload-row__progress-bar">
            <div class="card-upload-progress" style="width:0%;"></div>
          </div>
          <div class="card-upload-status">Siap upload</div>
        </div>
        <button class="card-upload-remove" data-index="${idx}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `;
      list.appendChild(row);

      // Remove file handler
      row.querySelector('.card-upload-remove')?.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        pendingUploadFiles.splice(index, 1);
        showCardUploadModal(pendingUploadFiles); // Refresh modal
      });
    });

    // Update summary text
    const summaryText = document.getElementById('cardUploadSummaryText');
    const summary = document.getElementById('cardUploadSummary');
    if (summary && summaryText && pendingUploadFiles.length > 0) {
      summary.style.display = 'block';
      summary.className = 'card-upload-modal__summary summary-info'; // Reset and add class
      summaryText.textContent = `${pendingUploadFiles.length} file (${formatFileSize(totalSize)}) siap diupload`;
    }
  }

  // Helper: get icon color based on file extension
  function getFileIconColor(ext) {
    const colorMap = {
      // Images
      'jpg': { bgClass: 'bg-red-100 dark:bg-red-900/30', strokeClass: 'text-red-500' },
      'jpeg': { bgClass: 'bg-red-100 dark:bg-red-900/30', strokeClass: 'text-red-500' },
      'png': { bgClass: 'bg-red-100 dark:bg-red-900/30', strokeClass: 'text-red-500' },
      'gif': { bgClass: 'bg-red-100 dark:bg-red-900/30', strokeClass: 'text-red-500' },
      'svg': { bgClass: 'bg-red-100 dark:bg-red-900/30', strokeClass: 'text-red-500' },
      'webp': { bgClass: 'bg-red-100 dark:bg-red-900/30', strokeClass: 'text-red-500' },
      // Code
      'js': { bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', strokeClass: 'text-yellow-500' },
      'ts': { bgClass: 'bg-blue-100 dark:bg-blue-900/30', strokeClass: 'text-blue-500' },
      'php': { bgClass: 'bg-purple-100 dark:bg-purple-900/30', strokeClass: 'text-purple-500' },
      'html': { bgClass: 'bg-orange-100 dark:bg-orange-900/30', strokeClass: 'text-orange-500' },
      'css': { bgClass: 'bg-sky-100 dark:bg-sky-900/30', strokeClass: 'text-sky-500' },
      'json': { bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', strokeClass: 'text-yellow-500' },
      // Documents
      'pdf': { bgClass: 'bg-red-100 dark:bg-red-900/30', strokeClass: 'text-red-600' },
      'doc': { bgClass: 'bg-blue-100 dark:bg-blue-900/30', strokeClass: 'text-blue-600' },
      'docx': { bgClass: 'bg-blue-100 dark:bg-blue-900/30', strokeClass: 'text-blue-600' },
      'xls': { bgClass: 'bg-green-100 dark:bg-green-900/30', strokeClass: 'text-green-600' },
      'xlsx': { bgClass: 'bg-green-100 dark:bg-green-900/30', strokeClass: 'text-green-600' },
      // Archives
      'zip': { bgClass: 'bg-amber-100 dark:bg-amber-900/30', strokeClass: 'text-amber-600' },
      'rar': { bgClass: 'bg-amber-100 dark:bg-amber-900/30', strokeClass: 'text-amber-600' },
      '7z': { bgClass: 'bg-amber-100 dark:bg-amber-900/30', strokeClass: 'text-amber-600' },
    };
    return colorMap[ext] || { bgClass: 'bg-gray-100 dark:bg-gray-700', strokeClass: 'text-gray-500' };
  }

  // Helper: format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  // Upload single file using XHR to have progress events
  function uploadFileWithProgress(file, progressEl, statusEl) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const url = `${API_BASE}?action=upload&path=${encodeURIComponent(currentPath)}`;
      xhr.open('POST', url, true);

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          if (progressEl) progressEl.style.width = percent + '%';
          if (statusEl) statusEl.textContent = percent + '%';
        }
      };

      xhr.onload = function () {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (data.success) {
            if (progressEl) {
                progressEl.style.width = '100%';
                progressEl.classList.add('bg-green-500');
            }
            if (statusEl) {
                statusEl.textContent = 'Selesai ✓';
                statusEl.classList.add('text-green-600');
            }
            resolve({ success: true, data });
          } else {
            if (progressEl) {
                progressEl.style.width = '100%';
                progressEl.classList.add('bg-red-500');
            }
            if (statusEl) {
                statusEl.textContent = `Gagal: ${data.error || 'error'}`;
                statusEl.classList.add('text-red-600');
            }
            resolve({ success: false, error: data.error || 'Server error' });
          }
        } catch (err) {
            if (progressEl) {
                progressEl.style.width = '100%';
                progressEl.classList.add('bg-red-500');
            }
            if (statusEl) {
                statusEl.textContent = 'Gagal: Invalid response';
                statusEl.classList.add('text-red-600');
            }
            resolve({ success: false, error: 'Invalid response' });
        }
      };

      xhr.onerror = function () {
        if (progressEl) {
            progressEl.style.width = '100%';
            progressEl.classList.add('bg-red-500');
        }
        if (statusEl) {
            statusEl.textContent = 'Gagal: Network error';
            statusEl.classList.add('text-red-600');
        }
        resolve({ success: false, error: 'Network error' });
      };

      const fd = new FormData();
      fd.append('files[]', file);
      xhr.send(fd);
    });
  }

  // Attach drag/drop listeners to elements with class 'card'
  function attachCardDropHandlers() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      // prevent duplicate listeners
      if (card.dataset.dropAttached === '1') return;
      card.dataset.dropAttached = '1';

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('card-drag-over');
      });
      card.addEventListener('dragleave', (e) => {
        e.preventDefault();
        card.classList.remove('card-drag-over');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('card-drag-over');
        const dt = e.dataTransfer;
        if (!dt) return;
        if (dt.files && dt.files.length > 0) {
          showCardUploadModal(dt.files);
        }
      });
    });
  }

  // Initial attach and observe DOM changes to attach to new cards
  attachCardDropHandlers();
  const mo = new MutationObserver((mutations) => {
    attachCardDropHandlers();
  });
  mo.observe(document.body, { childList: true, subtree: true });

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
  const savedTheme = localStorage.getItem('theme') || 'dark';
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

  // Double-click to open folder or preview file
  tbody?.addEventListener('dblclick', async (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    
    const path = row.dataset.path;
    const file = files.find(f => f.path === path);
    
    if (!file) return;
    
    if (file.type === 'folder') {
      // Open folder
      await loadFiles(path);
    } else {
      // Open file in preview modal
      if (window.openPreviewModal) {
        window.openPreviewModal(path, file.name);
      } else {
        console.log('Preview modal not available, file:', file.name);
      }
    }
  });
}

// ============= Initialization =============

let appInitialized = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Prevent duplicate initialization
  if (appInitialized) {
    console.log('[enhanced-ui] App already initialized, skipping');
    return;
  }
  appInitialized = true;
  
  console.log('[enhanced-ui] Starting app initialization');
  
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
  
  // Export functions to window for use by modals-handler
  window.loadFiles = loadFiles;
  window.deleteItems = deleteItems;
  
  // Initialize event handlers
  initializeEventHandlers();
  
  // Wait a bit before loading files to ensure all handlers are ready
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Load files
  await loadFiles('');
});

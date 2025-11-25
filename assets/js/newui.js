/**
 * New UI Implementation - Core Functionality (Full Integration)
 * Menangani: theme toggle, modal, context menu, pagination, drag-drop, file operations
 */

// --- State Management ---
let files = [];
let selected = new Set();
let page = 1;
let pageSize = 5;
let currentPath = '';
let isDragging = false;
let draggedItems = new Set();

const tbody = document.getElementById('tbody');
const showing = document.getElementById('showing');
const selectedCount = document.getElementById('selectedCount');
const ctxMenu = document.getElementById('contextMenu');
const app = document.getElementById('app');
const loaderOverlay = document.getElementById('loader-overlay');

let currentContextId = null;
let contextFileData = null;

// --- Utility Functions ---
function save() {
  localStorage.setItem('fm-files', JSON.stringify(files));
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

async function loadFiles(path = '') {
  try {
    const response = await fetch(`api.php?action=list&path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error('Failed to load files');
    const data = await response.json();
    
    if (data.success && data.items) {
      currentPath = path;
      // Transform API data to match our format
      files = data.items.map((item, idx) => ({
        id: Date.now() + idx, // Generate unique ID
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
      render();
    }
  } catch (error) {
    console.error('Error loading files:', error);
    // Fallback to sample data
    files = sampleFiles.slice();
    render();
  }
}

function render() {
  pageSize = parseInt(document.getElementById('pageSize').value);
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
  
  if (pageItems.length === 0) {
    document.getElementById('empty-state').classList.remove('hidden');
  } else {
    document.getElementById('empty-state').classList.add('hidden');
  }

  for (const f of pageItems) {
    const tr = document.createElement('tr');
    tr.dataset.id = f.id;

    const checked = selected.has(f.id);
    const icon = f.type === 'folder' ? '📁' : getFileIcon(f.type);

    tr.innerHTML = `
      <td class="px-3 py-3"><input type="checkbox" class="sel" data-id="${f.id}" ${checked ? 'checked' : ''}></td>
      <td class="px-3 py-3"><span class="file-name"><span>${icon}</span><span class="text-dark">${f.name}</span></span></td>
      <td class="px-3 py-3 text-sm">${f.type}</td>
      <td class="px-3 py-3 text-sm">${f.date}</td>
      <td class="px-3 py-3 text-right text-sm">${f.size}</td>
      <td class="px-3 py-3 text-sm">
        <button class="btn" data-action="preview" data-id="${f.id}">Preview</button>
        <button class="btn" data-action="share" data-id="${f.id}">Share</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  showing.textContent = `Menampilkan ${start + 1}–${Math.min(end, total)} dari ${total} item`;
  selectedCount.textContent = `${selected.size} selected`;

  // Wire checkbox events
  document.querySelectorAll('.sel').forEach(el =>
    el.addEventListener('change', e => {
      const id = parseInt(e.target.dataset.id);
      if (e.target.checked) selected.add(id);
      else selected.delete(id);
      selectedCount.textContent = `${selected.size} selected`;
    })
  );

  // Wire right-click context menu
  document.querySelectorAll('#tbody tr').forEach(row => {
    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      const id = parseInt(row.dataset.id);
      currentContextId = id;
      showContext(e.pageX, e.pageY);
    });
  });
}

function getFileIcon(type) {
  const icons = {
    'folder': '📁',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'pdf': '📄',
    'txt': '📝',
    'doc': '📘',
    'docx': '📘',
    'xls': '📊',
    'xlsx': '📊',
    'zip': '📦',
    'rar': '📦',
    'mp3': '🎵',
    'mp4': '🎬',
    'video': '🎬',
    'audio': '🎵'
  };
  return icons[type] || '🗎';
}

// Load files on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFiles('');
});

// Initial render
render();

// --- Search Debounce ---
let dbt;
document.getElementById('search')?.addEventListener('input', () => {
  clearTimeout(dbt);
  dbt = setTimeout(() => {
    page = 1;
    render();
  }, 250);
});

// --- Pagination Controls ---
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

// --- Select All ---
document.getElementById('selectAll')?.addEventListener('change', function () {
  const checked = this.checked;
  const visible = Array.from(document.querySelectorAll('#tbody .sel')).map(i =>
    parseInt(i.dataset.id)
  );
  visible.forEach(id => {
    if (checked) selected.add(id);
    else selected.delete(id);
  });
  render();
});

// --- Delete Selected ---
document.getElementById('deleteSel')?.addEventListener('click', () => {
  if (selected.size === 0) return alert('Tidak ada item terpilih');
  if (!confirm('Hapus item terpilih?')) return;
  // TODO: implement delete via API
  alert('Fitur delete akan segera diimplementasikan');
});

// --- New Folder ---
document.getElementById('newFolderBtn')?.addEventListener('click', () => {
  const name = prompt('Nama folder baru');
  if (!name) return;
  
  // TODO: implement create folder via API
  alert('Fitur create folder akan segera diimplementasikan');
});

// --- Upload Modal ---
const modal = document.getElementById('modalBackdrop');
const fileInput = document.getElementById('fileInput');

document.getElementById('uploadBtn')?.addEventListener('click', () => {
  modal.classList.add('visible');
  modal.style.display = 'flex';
});

document.getElementById('cancelUpload')?.addEventListener('click', () => {
  modal.classList.remove('visible');
  modal.style.display = 'none';
  fileInput.value = '';
});

document.getElementById('doUpload')?.addEventListener('click', async () => {
  const list = Array.from(fileInput.files);
  if (list.length === 0) {
    alert('Pilih file dulu');
    return;
  }
  
  // TODO: implement upload via API
  alert('Fitur upload akan segera diimplementasikan');
});

// --- Context Menu ---
function showContext(x, y) {
  ctxMenu.classList.add('visible');
  ctxMenu.style.display = 'block';
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top = y + 'px';
}

window.addEventListener('click', () => {
  ctxMenu.classList.remove('visible');
  ctxMenu.style.display = 'none';
});

ctxMenu?.addEventListener('click', e => {
  const action = e.target.dataset.action;
  if (!action) return;
  const id = currentContextId;
  const file = files.find(f => f.id === id);
  if (!file) return;

  if (action === 'open') alert('Open: ' + file.name);
  if (action === 'download') alert('Download: ' + file.name);
  if (action === 'rename') {
    const name = prompt('Nama baru', file.name);
    if (!name) return;
    alert('Fitur rename akan segera diimplementasikan');
  }
  if (action === 'delete') {
    if (!confirm('Hapus ' + file.name + '?')) return;
    alert('Fitur delete akan segera diimplementasikan');
  }
  ctxMenu.classList.remove('visible');
  ctxMenu.style.display = 'none';
});

// --- Preview & Share Buttons ---
tbody?.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = parseInt(btn.dataset.id);
  const file = files.find(f => f.id === id);
  if (!file) return;

  if (action === 'preview') {
    alert('Preview: ' + file.name);
  } else if (action === 'share') {
    const url = 'https://example.com/file/' + id;
    navigator.clipboard?.writeText(url).then(() => alert('Link disalin: ' + url));
  }
});

// --- New Button Quick Menu ---
document.getElementById('newBtn')?.addEventListener('click', () => {
  const opt = prompt('Pilih: folder/file (ketik folder atau file)');
  if (!opt) return;
  if (opt.toLowerCase() === 'folder') {
    document.getElementById('newFolderBtn').click();
  } else {
    document.getElementById('uploadBtn').click();
  }
});

// --- Theme Toggle ---
document.getElementById('toggleTheme')?.addEventListener('click', () => {
  const cur = app.getAttribute('data-theme');
  const newTheme = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  app.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
  const btn = document.getElementById('toggleTheme');
  btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

// Load theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
app.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// --- Keyboard Shortcut: Delete ---
window.addEventListener('keydown', e => {
  if (e.key === 'Delete') {
    document.getElementById('deleteSel')?.click();
  }
});

// --- Save on Unload ---
window.addEventListener('beforeunload', save);

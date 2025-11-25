/**
 * Modal Handlers - Menangani semua modal interactions
 * Includes: Preview, Confirm, Create, Rename, Move, Log, Settings
 */

// ============= Modal State =============
let modalState = {
  preview: {
    currentFile: null,
    isDirty: false,
    originalContent: ''
  },
  move: {
    currentPath: '',
    selectedFolder: null,
    itemsToMove: []
  },
  confirm: {
    callback: null,
    items: []
  }
};

// ============= Preview/Editor Modal =============

function openPreviewModal(filePath, fileName) {
  const overlay = document.getElementById('preview-overlay');
  const title = document.getElementById('preview-title');
  const meta = document.getElementById('preview-meta');
  const editor = document.getElementById('preview-editor');
  const saveBtn = document.getElementById('preview-save');
  const loader = document.getElementById('preview-loader');
  const openRaw = document.getElementById('preview-open-raw');
  
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  
  title.textContent = fileName;
  meta.textContent = 'Memuat...';
  editor.value = '';
  editor.disabled = true;
  saveBtn.disabled = true;
  loader.hidden = false;
  
  modalState.preview.currentFile = filePath;
  modalState.preview.isDirty = false;
  
  // Load file content
  fetch(`${API_BASE}?action=content&path=${encodeURIComponent(filePath)}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        editor.value = data.content || '';
        modalState.preview.originalContent = data.content || '';
        meta.textContent = `${formatSize(data.size)} • Terakhir diubah: ${formatDate(data.modified)}`;
        editor.disabled = false;
        openRaw.href = `api.php?action=content&path=${encodeURIComponent(filePath)}`;
        updateLineNumbers();
      } else {
        throw new Error(data.error || 'Gagal memuat file');
      }
    })
    .catch(error => {
      meta.textContent = 'Error: ' + error.message;
      editor.value = 'Gagal memuat konten file.';
    })
    .finally(() => {
      loader.hidden = true;
    });
}

function closePreviewModal() {
  if (modalState.preview.isDirty) {
    openUnsavedModal();
    return;
  }
  
  const overlay = document.getElementById('preview-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  
  modalState.preview.currentFile = null;
  modalState.preview.isDirty = false;
  modalState.preview.originalContent = '';
}

function savePreviewContent() {
  const editor = document.getElementById('preview-editor');
  const saveBtn = document.getElementById('preview-save');
  const status = document.getElementById('preview-status');
  
  saveBtn.disabled = true;
  status.textContent = 'Menyimpan...';
  
  fetch(`${API_BASE}?action=save&path=${encodeURIComponent(modalState.preview.currentFile)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: editor.value })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        modalState.preview.isDirty = false;
        modalState.preview.originalContent = editor.value;
        status.textContent = 'Tersimpan • ' + new Date().toLocaleTimeString('id-ID');
        saveBtn.disabled = true;
        showSuccess('File berhasil disimpan');
      } else {
        throw new Error(data.error || 'Gagal menyimpan file');
      }
    })
    .catch(error => {
      status.textContent = 'Error: ' + error.message;
      showError(error.message);
      saveBtn.disabled = false;
    });
}

function updateLineNumbers() {
  const editor = document.getElementById('preview-editor');
  const lineNumbers = document.getElementById('preview-line-numbers-inner');
  const lines = editor.value.split('\n').length;
  
  let html = '';
  for (let i = 1; i <= lines; i++) {
    html += `<span>${i}</span>`;
  }
  lineNumbers.innerHTML = html;
}

// ============= Confirm Modal =============

function openConfirmModal(title, message, items, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const descEl = document.getElementById('confirm-description');
  const listEl = document.getElementById('confirm-list');
  const confirmBtn = document.getElementById('confirm-confirm');
  
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  
  titleEl.textContent = title;
  messageEl.textContent = message;
  descEl.textContent = items.length > 1 ? `${items.length} item akan dihapus:` : '';
  
  if (items.length > 1) {
    listEl.hidden = false;
    listEl.innerHTML = items.map(item => `<li>• ${item}</li>`).join('');
  } else {
    listEl.hidden = true;
  }
  
  modalState.confirm.callback = onConfirm;
  modalState.confirm.items = items;
}

function closeConfirmModal() {
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  
  modalState.confirm.callback = null;
  modalState.confirm.items = [];
}

function executeConfirm() {
  if (modalState.confirm.callback) {
    modalState.confirm.callback();
  }
  closeConfirmModal();
}

// ============= Create Modal =============

function openCreateModal() {
  const overlay = document.getElementById('create-overlay');
  const nameInput = document.getElementById('create-name');
  const nameGroup = document.getElementById('create-name-group');
  const fileRadio = document.getElementById('file-option');
  const folderRadio = document.getElementById('folder-option');
  
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  
  nameInput.value = '';
  nameGroup.style.display = 'none';
  fileRadio.checked = false;
  folderRadio.checked = false;
}

function closeCreateModal() {
  const overlay = document.getElementById('create-overlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

async function submitCreate() {
  const nameInput = document.getElementById('create-name');
  const fileRadio = document.getElementById('file-option');
  const folderRadio = document.getElementById('folder-option');
  
  const name = nameInput.value.trim();
  if (!name) {
    showError('Nama wajib diisi');
    return;
  }
  
  const type = fileRadio.checked ? 'file' : (folderRadio.checked ? 'folder' : '');
  if (!type) {
    showError('Pilih tipe item terlebih dahulu');
    return;
  }
  
  showLoader(true);
  try {
    const response = await fetch(`${API_BASE}?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        name: name,
        path: currentPath
      })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Gagal membuat item');
    
    await loadFiles(currentPath);
    closeCreateModal();
    showSuccess(`${type === 'file' ? 'File' : 'Folder'} "${name}" berhasil dibuat`);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoader(false);
  }
}

// ============= Rename Modal =============

function openRenameModal(filePath, currentName) {
  const overlay = document.getElementById('rename-overlay');
  const subtitle = document.getElementById('rename-subtitle');
  const nameInput = document.getElementById('rename-name');
  
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  
  subtitle.textContent = `Mengubah nama: ${currentName}`;
  nameInput.value = currentName;
  nameInput.focus();
  nameInput.select();
  
  modalState.rename = { path: filePath, oldName: currentName };
}

function closeRenameModal() {
  const overlay = document.getElementById('rename-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

async function submitRename(e) {
  if (e) e.preventDefault();
  
  const nameInput = document.getElementById('rename-name');
  const newName = nameInput.value.trim();
  
  if (!newName) {
    showError('Nama baru wajib diisi');
    return;
  }
  
  if (!modalState.rename || !modalState.rename.path) {
    showError('Data rename tidak valid');
    return;
  }
  
  await renameItem(modalState.rename.path, newName);
  closeRenameModal();
}

// ============= Move Modal =============

function openMoveModal(items) {
  const overlay = document.getElementById('move-overlay');
  const subtitle = document.getElementById('move-subtitle');
  const list = document.getElementById('move-list');
  
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  
  modalState.move.itemsToMove = items;
  modalState.move.currentPath = '';
  modalState.move.selectedFolder = null;
  
  subtitle.textContent = `Memindahkan ${items.length} item`;
  
  loadMoveFolders('');
}

function closeMoveModal() {
  const overlay = document.getElementById('move-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  
  modalState.move = {
    currentPath: '',
    selectedFolder: null,
    itemsToMove: []
  };
}

async function loadMoveFolders(path) {
  const list = document.getElementById('move-list');
  const breadcrumbs = document.getElementById('move-breadcrumbs');
  const error = document.getElementById('move-error');
  
  modalState.move.currentPath = path;
  list.innerHTML = '<li class="p-3 text-sm text-gray-500">Memuat...</li>';
  error.textContent = '';
  
  try {
    const response = await fetch(`${API_BASE}?action=list&path=${encodeURIComponent(path)}`);
    const data = await response.json();
    
    if (!data.success) throw new Error(data.error);
    
    const folders = data.items.filter(item => item.type === 'folder');
    
    // Update breadcrumbs
    breadcrumbs.innerHTML = path ? 
      `<span class="text-blue-600 cursor-pointer" onclick="loadMoveFolders('')">Root</span> / ${path.split('/').join(' / ')}` :
      '<span>Root</span>';
    
    // Update list
    if (folders.length === 0) {
      list.innerHTML = '<li class="p-3 text-sm text-gray-500">Tidak ada folder di sini</li>';
    } else {
      list.innerHTML = folders.map(folder => `
        <li class="move-folder-item p-3 border-b hover:bg-gray-50 cursor-pointer flex items-center gap-2" data-path="${folder.path}">
          <span>📁</span>
          <span>${folder.name}</span>
        </li>
      `).join('');
      
      // Wire folder click events
      list.querySelectorAll('.move-folder-item').forEach(item => {
        item.addEventListener('click', () => {
          const folderPath = item.dataset.path;
          loadMoveFolders(folderPath);
        });
        
        item.addEventListener('dblclick', () => {
          modalState.move.selectedFolder = item.dataset.path;
          executeMoveItems();
        });
      });
    }
  } catch (error) {
    error.textContent = error.message;
    list.innerHTML = '<li class="p-3 text-sm text-red-500">Gagal memuat folder</li>';
  }
}

async function executeMoveItems() {
  const destPath = modalState.move.selectedFolder || modalState.move.currentPath;
  const items = modalState.move.itemsToMove;
  
  if (items.length === 0) {
    showError('Tidak ada item yang akan dipindahkan');
    return;
  }
  
  closeMoveModal();
  await moveItems(items, destPath);
}

// ============= Unsaved Changes Modal =============

function openUnsavedModal() {
  const overlay = document.getElementById('unsaved-overlay');
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
}

function closeUnsavedModal() {
  const overlay = document.getElementById('unsaved-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

// ============= Settings Modal =============

function openSettingsModal() {
  const overlay = document.getElementById('settings-overlay');
  const debugToggle = document.getElementById('toggle-debug');
  
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  
  debugToggle.checked = localStorage.getItem('fm-debug') === 'true';
}

function closeSettingsModal() {
  const overlay = document.getElementById('settings-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

function saveSettings() {
  const debugToggle = document.getElementById('toggle-debug');
  localStorage.setItem('fm-debug', debugToggle.checked);
  closeSettingsModal();
  showSuccess('Pengaturan disimpan');
}

// ============= Event Listeners Setup =============

document.addEventListener('DOMContentLoaded', () => {
  // Preview Modal
  document.getElementById('preview-close')?.addEventListener('click', closePreviewModal);
  document.getElementById('preview-save')?.addEventListener('click', savePreviewContent);
  document.getElementById('preview-copy')?.addEventListener('click', () => {
    const editor = document.getElementById('preview-editor');
    navigator.clipboard?.writeText(editor.value);
    showSuccess('Konten disalin ke clipboard');
  });
  
  document.getElementById('preview-editor')?.addEventListener('input', (e) => {
    modalState.preview.isDirty = e.target.value !== modalState.preview.originalContent;
    document.getElementById('preview-save').disabled = !modalState.preview.isDirty;
    updateLineNumbers();
  });
  
  // Confirm Modal
  document.getElementById('confirm-cancel')?.addEventListener('click', closeConfirmModal);
  document.getElementById('confirm-confirm')?.addEventListener('click', executeConfirm);
  
  // Create Modal
  document.getElementById('create-cancel')?.addEventListener('click', closeCreateModal);
  document.getElementById('create-cancel-alt')?.addEventListener('click', closeCreateModal);
  document.getElementById('create-submit')?.addEventListener('click', submitCreate);
  
  // Show name input when type is selected and update placeholder
  document.querySelectorAll('input[name="create-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const nameGroup = document.getElementById('create-name-group');
      const nameInput = document.getElementById('create-name');
      
      nameGroup.style.display = 'block';
      
      // Update placeholder based on selected type
      if (e.target.value === 'file') {
        nameInput.placeholder = 'Misal: document.txt';
      } else if (e.target.value === 'folder') {
        nameInput.placeholder = 'Misal: My Documents';
      }
      
      nameInput.focus();
    });
  });
  
  // Rename Modal
  document.getElementById('rename-cancel')?.addEventListener('click', closeRenameModal);
  document.getElementById('rename-form')?.addEventListener('submit', submitRename);
  
  // Move Modal
  document.getElementById('move-cancel')?.addEventListener('click', closeMoveModal);
  document.getElementById('move-confirm')?.addEventListener('click', executeMoveItems);
  document.getElementById('move-select-here')?.addEventListener('click', () => {
    modalState.move.selectedFolder = modalState.move.currentPath;
    document.getElementById('move-confirm').disabled = false;
  });
  document.getElementById('move-root-shortcut')?.addEventListener('click', () => loadMoveFolders(''));
  document.getElementById('move-current-shortcut')?.addEventListener('click', () => loadMoveFolders(currentPath));
  
  // Unsaved Modal
  document.getElementById('unsaved-save')?.addEventListener('click', () => {
    closeUnsavedModal();
    savePreviewContent();
    setTimeout(closePreviewModal, 500);
  });
  document.getElementById('unsaved-discard')?.addEventListener('click', () => {
    closeUnsavedModal();
    modalState.preview.isDirty = false;
    closePreviewModal();
  });
  document.getElementById('unsaved-cancel')?.addEventListener('click', closeUnsavedModal);
  
  // Settings Modal
  document.getElementById('settings-close')?.addEventListener('click', closeSettingsModal);
  document.getElementById('settings-cancel')?.addEventListener('click', closeSettingsModal);
  document.getElementById('settings-save')?.addEventListener('click', saveSettings);
  
  // Toggle switch styling
  document.getElementById('toggle-debug')?.addEventListener('change', function() {
    this.setAttribute('aria-checked', this.checked);
  });
});

// Export functions for use in other scripts
window.openPreviewModal = openPreviewModal;
window.openConfirmModal = openConfirmModal;
window.openCreateModal = openCreateModal;
window.openRenameModal = openRenameModal;
window.openMoveModal = openMoveModal;
window.openSettingsModal = openSettingsModal;
window.loadMoveFolders = loadMoveFolders;
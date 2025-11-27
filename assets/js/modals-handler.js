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

// Store scroll handler reference for cleanup
let previewScrollHandler = null;

// File type detection helpers
const PREVIEW_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
  video: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
  pdf: ['pdf'],
  text: ['txt', 'html', 'css', 'js', 'json', 'xml', 'md', 'php', 'py', 'java', 'c', 'cpp', 'h', 'sh', 'bat', 'sql', 'yml', 'yaml', 'ini', 'conf', 'log', 'htaccess', 'gitignore', 'env', 'ts', 'tsx', 'jsx', 'vue', 'svelte']
};

function getFileExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ext === filename.toLowerCase() ? '' : ext;
}

function getPreviewType(filename) {
  const ext = getFileExtension(filename);
  for (const [type, extensions] of Object.entries(PREVIEW_TYPES)) {
    if (extensions.includes(ext)) return type;
  }
  // Default to text for unknown extensions
  return 'text';
}

function hideAllPreviewWrappers() {
  const wrappers = ['preview-editor-wrapper', 'preview-image-wrapper', 'preview-video-wrapper', 'preview-audio-wrapper', 'preview-pdf-wrapper'];
  wrappers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
    }
  });
}

function showPreviewWrapper(type) {
  hideAllPreviewWrappers();
  const wrapperMap = {
    text: 'preview-editor-wrapper',
    image: 'preview-image-wrapper',
    video: 'preview-video-wrapper',
    audio: 'preview-audio-wrapper',
    pdf: 'preview-pdf-wrapper'
  };
  const wrapper = document.getElementById(wrapperMap[type]);
  if (wrapper) {
    wrapper.style.display = type === 'audio' ? 'flex' : (type === 'text' ? 'flex' : 'flex');
  }
}

function openPreviewModal(filePath, fileName) {
  const overlay = document.getElementById('preview-overlay');
  const title = document.getElementById('preview-title');
  const meta = document.getElementById('preview-meta');
  const editor = document.getElementById('preview-editor');
  const saveBtn = document.getElementById('preview-save');
  const copyBtn = document.getElementById('preview-copy');
  const loader = document.getElementById('preview-loader');
  const openRaw = document.getElementById('preview-open-raw');
  const downloadBtn = document.getElementById('preview-download');
  const lineNumbersInner = document.getElementById('preview-line-numbers-inner');
  
  // Detect file type
  const previewType = getPreviewType(fileName);
  
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  
  title.textContent = fileName;
  meta.textContent = 'Memuat...';
  loader.hidden = false;
  
  modalState.preview.currentFile = filePath;
  modalState.preview.isDirty = false;
  
  // Show/hide appropriate actions based on preview type
  const isEditable = previewType === 'text';
  if (saveBtn) saveBtn.style.display = isEditable ? '' : 'none';
  if (copyBtn) copyBtn.style.display = isEditable ? '' : 'none';
  
  // Set download link for all file types
  const downloadUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;
  if (downloadBtn) {
    downloadBtn.href = downloadUrl;
    downloadBtn.download = fileName;
  }
  
  // Show appropriate wrapper
  showPreviewWrapper(previewType);
  
  if (previewType === 'text') {
    // Text/Code Editor Mode
    editor.value = '';
    editor.disabled = true;
    saveBtn.disabled = true;
    
    // Setup direct scroll synchronization
    if (previewScrollHandler) {
      editor.removeEventListener('scroll', previewScrollHandler);
    }
    
    previewScrollHandler = function() {
      if (lineNumbersInner) {
        lineNumbersInner.style.transform = `translateY(${-editor.scrollTop}px)`;
      }
    };
    
    editor.addEventListener('scroll', previewScrollHandler, { passive: true });
    
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
          
          // Update line numbers after a small delay to ensure DOM is ready
          setTimeout(() => {
            updateLineNumbers();
            // Reset scroll position and sync
            editor.scrollTop = 0;
            if (lineNumbersInner) {
              lineNumbersInner.style.transform = 'translateY(0px)';
            }
            // Ensure consistent styling
            if (typeof window.ensureConsistentStyling === 'function') {
              try { window.ensureConsistentStyling(); } catch (e) { /* ignore */ }
            }
          }, 50);
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
      
  } else if (previewType === 'image') {
    // Image Preview Mode
    const img = document.getElementById('preview-image');
    const rawUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;
    
    img.onload = function() {
      meta.textContent = `${this.naturalWidth} × ${this.naturalHeight} piksel`;
      loader.hidden = true;
    };
    img.onerror = function() {
      meta.textContent = 'Error: Gagal memuat gambar';
      loader.hidden = true;
    };
    img.src = rawUrl;
    openRaw.href = rawUrl;
    
  } else if (previewType === 'video') {
    // Video Preview Mode
    const video = document.getElementById('preview-video');
    const rawUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;
    
    video.onloadedmetadata = function() {
      const duration = formatDuration(this.duration);
      meta.textContent = `${this.videoWidth} × ${this.videoHeight} • ${duration}`;
      loader.hidden = true;
    };
    video.onerror = function() {
      meta.textContent = 'Error: Gagal memuat video';
      loader.hidden = true;
    };
    video.src = rawUrl;
    openRaw.href = rawUrl;
    
  } else if (previewType === 'audio') {
    // Audio Preview Mode
    const audio = document.getElementById('preview-audio');
    const rawUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;
    
    audio.onloadedmetadata = function() {
      const duration = formatDuration(this.duration);
      meta.textContent = `Durasi: ${duration}`;
      loader.hidden = true;
    };
    audio.onerror = function() {
      meta.textContent = 'Error: Gagal memuat audio';
      loader.hidden = true;
    };
    audio.src = rawUrl;
    openRaw.href = rawUrl;
    
  } else if (previewType === 'pdf') {
    // PDF Preview Mode
    const iframe = document.getElementById('preview-pdf');
    const rawUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;
    
    iframe.onload = function() {
      meta.textContent = 'PDF Document';
      loader.hidden = true;
    };
    iframe.src = rawUrl;
    openRaw.href = rawUrl;
  }
}

// Helper function to format duration (for video/audio)
function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  
  // Cleanup media elements to stop playback
  const video = document.getElementById('preview-video');
  const audio = document.getElementById('preview-audio');
  const image = document.getElementById('preview-image');
  const pdf = document.getElementById('preview-pdf');
  
  if (video) {
    video.pause();
    video.src = '';
    video.load();
  }
  if (audio) {
    audio.pause();
    audio.src = '';
    audio.load();
  }
  if (image) {
    image.src = '';
  }
  if (pdf) {
    pdf.src = '';
  }
  
  // Hide all wrappers
  hideAllPreviewWrappers();
  
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
  // Use the global function from appInitializer.js if available
  if (typeof window.updateLineNumbers === 'function' && window.updateLineNumbers !== updateLineNumbers) {
    window.updateLineNumbers();
    return;
  }
  
  // Fallback: Direct implementation
  const editor = document.getElementById('preview-editor');
  const lineNumbersInner = document.getElementById('preview-line-numbers-inner');
  if (!editor || !lineNumbersInner) return;
  
  const value = editor.value || '';
  const lines = value.split('\n');
  const totalLines = lines.length || 1;
  
  // Get computed line height from editor
  const editorStyle = window.getComputedStyle(editor);
  const lineHeight = parseFloat(editorStyle.lineHeight) || 24;
  
  // Build line numbers
  let html = '';
  for (let i = 1; i <= totalLines; i++) {
    html += `<span style="display:block;height:${lineHeight}px;line-height:${lineHeight}px">${i}</span>`;
  }
  lineNumbersInner.innerHTML = html;
  
  // Sync scroll
  if (typeof window.syncLineNumbersScroll === 'function') {
    window.syncLineNumbersScroll(true);
  }
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
  
  // Delete overlay event listeners
  document.getElementById('delete-cancel')?.addEventListener('click', closeDeleteOverlay);
  document.getElementById('delete-confirm')?.addEventListener('click', confirmDelete);
  document.getElementById('delete-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeDeleteOverlay();
  });
  
  // Download overlay event listeners
  document.getElementById('download-cancel')?.addEventListener('click', closeDownloadOverlay);
  document.getElementById('download-confirm')?.addEventListener('click', confirmDownload);
  document.getElementById('download-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeDownloadOverlay();
  });
  
  // Global keyboard handler for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Check which modal is open and close it
      const deleteOverlay = document.getElementById('delete-overlay');
      const downloadOverlay = document.getElementById('download-overlay');
      
      if (deleteOverlay && !deleteOverlay.classList.contains('hidden')) {
        closeDeleteOverlay();
      } else if (downloadOverlay && !downloadOverlay.classList.contains('hidden')) {
        closeDownloadOverlay();
      }
    }
  });
});

// ============= Delete Overlay =============

let deleteState = {
  items: [],
  confirmCallback: null,
  cancelCallback: null
};

function openDeleteOverlay(items, onConfirm, onCancel = null) {
  const overlay = document.getElementById('delete-overlay');
  if (!overlay) return;
  
  const itemsArray = Array.isArray(items) ? items : [items];
  const itemCount = itemsArray.length;
  
  // Store state
  deleteState.items = itemsArray;
  deleteState.confirmCallback = onConfirm;
  deleteState.cancelCallback = onCancel;
  
  // Update title and subtitle
  const title = document.getElementById('delete-title');
  const subtitle = document.getElementById('delete-subtitle');
  const message = document.getElementById('delete-message');
  const itemsList = document.getElementById('delete-items-list');
  
  if (title) {
    title.textContent = itemCount > 1 ? `Hapus ${itemCount} Item` : 'Hapus Item';
  }
  
  if (subtitle) {
    subtitle.textContent = itemCount > 1 
      ? `Konfirmasi penghapusan ${itemCount} item` 
      : 'Konfirmasi penghapusan';
  }
  
  if (message) {
    message.textContent = itemCount > 1 
      ? `Apakah Anda yakin ingin menghapus ${itemCount} item berikut?` 
      : `Apakah Anda yakin ingin menghapus item ini?`;
  }
  
  // Populate items list
  if (itemsList) {
    itemsList.innerHTML = itemsArray.slice(0, 10).map(item => {
      const name = typeof item === 'string' ? item.split('/').pop() : (item.name || item.path?.split('/').pop() || 'Unknown');
      const isFolder = typeof item === 'object' && item.type === 'folder';
      const icon = isFolder 
        ? '<svg viewBox="0 0 24 24" fill="currentColor" class="delete-item-icon w-4 h-4"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor" class="delete-item-icon w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>';
      return `<div class="delete-item flex items-center gap-2 py-1 px-2 text-xs rounded">${icon}<span class="delete-item-name flex-1 truncate">${escapeHtml(name)}</span></div>`;
    }).join('');
    
    if (itemCount > 10) {
      itemsList.innerHTML += `<div class="delete-item text-gray-500 py-1 px-2 text-xs">... dan ${itemCount - 10} item lainnya</div>`;
    }
  }
  
  // Show overlay
  overlay.hidden = false;
  overlay.classList.remove('hidden');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.style.display = 'flex';
  
  // Focus cancel button
  setTimeout(() => {
    document.getElementById('delete-cancel')?.focus();
  }, 100);
}

function closeDeleteOverlay() {
  const overlay = document.getElementById('delete-overlay');
  if (!overlay) return;
  
  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  overlay.style.display = 'none';
  
  // Clear items list
  const itemsList = document.getElementById('delete-items-list');
  if (itemsList) itemsList.innerHTML = '';
  
  // Clear state
  deleteState = { items: [], confirmCallback: null, cancelCallback: null };
}

async function confirmDelete() {
  if (typeof deleteState.confirmCallback === 'function') {
    try {
      await deleteState.confirmCallback(deleteState.items);
    } catch (e) {
      console.error('[modals-handler] Delete confirm error:', e);
    }
  }
  closeDeleteOverlay();
}

// ============= Download Overlay =============

let downloadState = {
  fileData: null,
  confirmCallback: null,
  cancelCallback: null
};

function openDownloadOverlay(fileData, onConfirm, onCancel = null) {
  const overlay = document.getElementById('download-overlay');
  if (!overlay) return;
  
  // Store state
  downloadState.fileData = fileData;
  downloadState.confirmCallback = onConfirm;
  downloadState.cancelCallback = onCancel;
  
  // Update file info
  const fileName = document.getElementById('download-file-name');
  const fileSize = document.getElementById('download-file-size');
  const fileIcon = document.getElementById('download-file-icon');
  const subtitle = document.getElementById('download-subtitle');
  
  if (fileName) {
    fileName.textContent = fileData.name || 'Unknown file';
  }
  
  if (fileSize) {
    const size = fileData.size || 0;
    fileSize.textContent = formatFileSize(size);
  }
  
  if (subtitle) {
    subtitle.textContent = `Unduh ${fileData.name || 'file'}`;
  }
  
  // Set appropriate icon based on file type
  if (fileIcon) {
    fileIcon.className = 'download-file-icon w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0';
    const ext = (fileData.name || '').split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      fileIcon.classList.add('image');
    } else if (['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'html', 'css', 'json', 'xml'].includes(ext)) {
      fileIcon.classList.add('code');
    } else if (['doc', 'docx', 'pdf', 'txt', 'md', 'rtf'].includes(ext)) {
      fileIcon.classList.add('document');
    } else if (fileData.type === 'folder') {
      fileIcon.classList.add('folder');
    }
  }
  
  // Show overlay
  overlay.hidden = false;
  overlay.classList.remove('hidden');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.style.display = 'flex';
  
  // Focus download button
  setTimeout(() => {
    document.getElementById('download-confirm')?.focus();
  }, 100);
}

function closeDownloadOverlay() {
  const overlay = document.getElementById('download-overlay');
  if (!overlay) return;
  
  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  overlay.style.display = 'none';
  
  // Clear state
  downloadState = { fileData: null, confirmCallback: null, cancelCallback: null };
}

async function confirmDownload() {
  if (typeof downloadState.confirmCallback === 'function') {
    try {
      await downloadState.confirmCallback(downloadState.fileData);
    } catch (e) {
      console.error('[modals-handler] Download confirm error:', e);
    }
  }
  closeDownloadOverlay();
}

// ============= Helper Functions =============

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper functions for notifications - delegate to toast system
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

// Export functions for use in other scripts
window.openPreviewModal = openPreviewModal;
window.openConfirmModal = openConfirmModal;
window.openCreateModal = openCreateModal;
window.openRenameModal = openRenameModal;
window.openMoveModal = openMoveModal;
window.openSettingsModal = openSettingsModal;
window.loadMoveFolders = loadMoveFolders;
window.openDeleteOverlay = openDeleteOverlay;
window.closeDeleteOverlay = closeDeleteOverlay;
window.confirmDelete = confirmDelete;
window.openDownloadOverlay = openDownloadOverlay;
window.closeDownloadOverlay = closeDownloadOverlay;
window.confirmDownload = confirmDownload;
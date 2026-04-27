/**
 * Upload Manager Module
 * Handles upload progress UI, drag-to-upload drop zone, file queue with cancel/retry
 * @module uploadManager
 */

// ─── State ───────────────────────────────────────────────────────────────────

const uploadState = {
    files: [],          // { id, file, status, progress, xhr, error }
    isOpen: false,
    isUploading: false,
    modalEl: null,
    dropOverlayEl: null,
    dragCounter: 0
};

let onUploadComplete = null; // callback after all uploads finish

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getFileIconClass(ext) {
    const map = {
        jpg: 'red', jpeg: 'red', png: 'red', gif: 'red', svg: 'red', webp: 'red', bmp: 'red',
        js: 'yellow', ts: 'blue', php: 'purple', html: 'orange', css: 'sky', json: 'yellow',
        pdf: 'red', doc: 'blue', docx: 'blue', xls: 'green', xlsx: 'green', ppt: 'orange',
        zip: 'amber', rar: 'amber', '7z': 'amber', tar: 'amber', gz: 'amber',
        mp3: 'purple', wav: 'purple', mp4: 'red', avi: 'red', mkv: 'red',
        md: 'blue', txt: 'gray', csv: 'green', xml: 'orange', yml: 'gray', yaml: 'gray'
    };
    return map[ext] || 'gray';
}

// ─── Modal DOM ───────────────────────────────────────────────────────────────

function createModal() {
    if (uploadState.modalEl) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'upload-progress-modal';
    backdrop.className = 'upload-modal-backdrop';
    backdrop.innerHTML = `
        <div class="upload-modal" role="dialog" aria-label="Upload Files" aria-modal="true">
            <div class="upload-modal__header">
                <div class="upload-modal__title-group">
                    <svg class="upload-modal__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div>
                        <div class="upload-modal__title">Upload Files</div>
                        <div class="upload-modal__subtitle" id="upload-modal-subtitle">Siap untuk upload</div>
                    </div>
                </div>
                <button class="upload-modal__close-btn" id="upload-modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="upload-modal__overall">
                <div class="upload-modal__overall-bar">
                    <div class="upload-modal__overall-fill" id="upload-overall-fill" style="width:0%"></div>
                </div>
                <div class="upload-modal__overall-text" id="upload-overall-text">0%</div>
            </div>
            <div class="upload-modal__file-list" id="upload-file-list"></div>
            <div class="upload-modal__footer">
                <button class="upload-modal__btn upload-modal__btn--secondary" id="upload-btn-cancel">Batal</button>
                <button class="upload-modal__btn upload-modal__btn--primary" id="upload-btn-start">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Upload
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
    uploadState.modalEl = backdrop;

    // Wire up buttons
    document.getElementById('upload-modal-close').addEventListener('click', closeModal);
    document.getElementById('upload-btn-cancel').addEventListener('click', handleCancel);
    document.getElementById('upload-btn-start').addEventListener('click', handleStartUpload);

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop && !uploadState.isUploading) {
            closeModal();
        }
    });

    // Escape key
    backdrop._keyHandler = (e) => {
        if (e.key === 'Escape' && !uploadState.isUploading) {
            closeModal();
        }
    };
    document.addEventListener('keydown', backdrop._keyHandler);
}

function destroyModal() {
    if (!uploadState.modalEl) return;
    if (uploadState.modalEl._keyHandler) {
        document.removeEventListener('keydown', uploadState.modalEl._keyHandler);
    }
    uploadState.modalEl.remove();
    uploadState.modalEl = null;
}

// ─── Modal Actions ───────────────────────────────────────────────────────────

function openModal(files) {
    // Add files to queue
    const newEntries = Array.from(files).map(file => ({
        id: generateId(),
        file,
        status: 'pending',  // pending | uploading | success | error | cancelled
        progress: 0,
        xhr: null,
        error: null
    }));

    uploadState.files = newEntries;
    uploadState.isOpen = true;
    uploadState.isUploading = false;

    createModal();
    renderFileList();
    updateOverallProgress();
    updateButtons();

    const subtitle = document.getElementById('upload-modal-subtitle');
    const totalSize = newEntries.reduce((sum, e) => sum + e.file.size, 0);
    if (subtitle) {
        subtitle.textContent = `${newEntries.length} file (${formatBytes(totalSize)}) siap diupload`;
    }
}

function closeModal() {
    if (uploadState.isUploading) {
        // Abort all active uploads
        uploadState.files.forEach(entry => {
            if (entry.xhr && entry.status === 'uploading') {
                entry.xhr.abort();
                entry.status = 'cancelled';
            }
        });
        uploadState.isUploading = false;
    }

    uploadState.files = [];
    uploadState.isOpen = false;
    destroyModal();
}

function handleCancel() {
    if (uploadState.isUploading) {
        // Cancel all active uploads
        uploadState.files.forEach(entry => {
            if (entry.xhr && entry.status === 'uploading') {
                entry.xhr.abort();
                entry.status = 'cancelled';
            }
        });
        uploadState.isUploading = false;
        renderFileList();
        updateOverallProgress();
        updateButtons();
    } else {
        closeModal();
    }
}

async function handleStartUpload() {
    const startBtn = document.getElementById('upload-btn-start');
    const cancelBtn = document.getElementById('upload-btn-cancel');

    // If all done, close
    const allDone = uploadState.files.every(e => e.status === 'success' || e.status === 'error' || e.status === 'cancelled');
    if (allDone && !uploadState.isUploading) {
        closeModal();
        return;
    }

    uploadState.isUploading = true;
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Mengupload...';
    }
    if (cancelBtn) {
        cancelBtn.textContent = 'Batalkan';
    }

    const currentPath = window.getState ? window.getState().currentPath : '';

    // Upload files sequentially
    for (const entry of uploadState.files) {
        if (entry.status !== 'pending') continue;
        if (!uploadState.isUploading) break; // cancelled

        entry.status = 'uploading';
        entry.progress = 0;
        renderFileRow(entry);

        try {
            await uploadSingleFile(entry, currentPath);
            entry.status = 'success';
            entry.progress = 100;
        } catch (err) {
            if (entry.status !== 'cancelled') {
                entry.status = 'error';
                entry.error = err.message || 'Upload gagal';
            }
        }

        renderFileRow(entry);
        updateOverallProgress();
    }

    uploadState.isUploading = false;

    // Update buttons
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = 'Selesai';
    }
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }

    // Update subtitle with summary
    const subtitle = document.getElementById('upload-modal-subtitle');
    const successCount = uploadState.files.filter(e => e.status === 'success').length;
    const errorCount = uploadState.files.filter(e => e.status === 'error').length;
    if (subtitle) {
        if (errorCount === 0) {
            subtitle.textContent = `✓ ${successCount} file berhasil diupload`;
            subtitle.classList.add('upload-modal__subtitle--success');
        } else if (successCount > 0) {
            subtitle.textContent = `${successCount} berhasil, ${errorCount} gagal`;
            subtitle.classList.add('upload-modal__subtitle--warning');
        } else {
            subtitle.textContent = `✗ Semua file gagal diupload`;
            subtitle.classList.add('upload-modal__subtitle--error');
        }
    }

    // Refresh directory
    if (onUploadComplete && successCount > 0) {
        onUploadComplete();
    }
}

// ─── XHR Upload with Progress ────────────────────────────────────────────────

function uploadSingleFile(entry, currentPath) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        entry.xhr = xhr;

        const url = `api.php?action=upload&path=${encodeURIComponent(currentPath || '')}`;
        xhr.open('POST', url, true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                entry.progress = Math.round((e.loaded / e.total) * 100);
                renderFileRow(entry);
                updateOverallProgress();
            }
        };

        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText || '{}');
                if (data.success || (data.uploaded && data.uploaded.length > 0)) {
                    resolve(data);
                } else {
                    reject(new Error(data.error || 'Server error'));
                }
            } catch (err) {
                reject(new Error('Invalid response'));
            }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Timeout'));
        xhr.onabort = () => reject(new Error('Dibatalkan'));

        xhr.timeout = 300000; // 5 minutes

        const fd = new FormData();
        fd.append('files[]', entry.file, entry.file.name);
        xhr.send(fd);
    });
}

// ─── Render ──────────────────────────────────────────────────────────────────

function renderFileList() {
    const list = document.getElementById('upload-file-list');
    if (!list) return;
    list.innerHTML = '';

    uploadState.files.forEach(entry => {
        const row = createFileRow(entry);
        list.appendChild(row);
    });
}

function createFileRow(entry) {
    const ext = entry.file.name.split('.').pop().toLowerCase();
    const color = getFileIconClass(ext);

    const row = document.createElement('div');
    row.className = 'upload-row';
    row.id = `upload-row-${entry.id}`;
    row.dataset.entryId = entry.id;

    row.innerHTML = `
        <div class="upload-row__icon upload-row__icon--${color}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
        </div>
        <div class="upload-row__info">
            <div class="upload-row__name" title="${entry.file.name}">${entry.file.name}</div>
            <div class="upload-row__size">${formatBytes(entry.file.size)}</div>
        </div>
        <div class="upload-row__progress">
            <div class="upload-row__bar">
                <div class="upload-row__fill upload-row__fill--${entry.status}" style="width:${entry.progress}%"></div>
            </div>
            <div class="upload-row__status upload-row__status--${entry.status}">${getStatusText(entry)}</div>
        </div>
        <button class="upload-row__action" data-id="${entry.id}" title="${getActionTitle(entry)}" aria-label="${getActionTitle(entry)}">
            ${getActionIcon(entry)}
        </button>
    `;

    // Wire action button
    const actionBtn = row.querySelector('.upload-row__action');
    actionBtn.addEventListener('click', () => handleRowAction(entry));

    return row;
}

function renderFileRow(entry) {
    const existing = document.getElementById(`upload-row-${entry.id}`);
    if (!existing) return;

    // Update progress bar
    const fill = existing.querySelector('.upload-row__fill');
    if (fill) {
        fill.style.width = entry.progress + '%';
        fill.className = `upload-row__fill upload-row__fill--${entry.status}`;
    }

    // Update status text
    const status = existing.querySelector('.upload-row__status');
    if (status) {
        status.textContent = getStatusText(entry);
        status.className = `upload-row__status upload-row__status--${entry.status}`;
    }

    // Update action button
    const actionBtn = existing.querySelector('.upload-row__action');
    if (actionBtn) {
        actionBtn.innerHTML = getActionIcon(entry);
        actionBtn.title = getActionTitle(entry);
        actionBtn.setAttribute('aria-label', getActionTitle(entry));
    }
}

function getStatusText(entry) {
    switch (entry.status) {
    case 'pending': return 'Menunggu';
    case 'uploading': return entry.progress + '%';
    case 'success': return 'Selesai ✓';
    case 'error': return entry.error || 'Gagal ✗';
    case 'cancelled': return 'Dibatalkan';
    default: return '';
    }
}

function getActionIcon(entry) {
    if (entry.status === 'uploading') {
        // Cancel icon
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    }
    if (entry.status === 'error' || entry.status === 'cancelled') {
        // Retry icon
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (entry.status === 'success') {
        // Check icon
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    // Remove icon (pending)
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
}

function getActionTitle(entry) {
    if (entry.status === 'uploading') return 'Batalkan';
    if (entry.status === 'error' || entry.status === 'cancelled') return 'Coba lagi';
    if (entry.status === 'success') return 'Selesai';
    return 'Hapus';
}

function handleRowAction(entry) {
    if (entry.status === 'uploading') {
        // Cancel this upload
        if (entry.xhr) entry.xhr.abort();
        entry.status = 'cancelled';
        renderFileRow(entry);
        updateOverallProgress();
    } else if (entry.status === 'error' || entry.status === 'cancelled') {
        // Retry
        entry.status = 'pending';
        entry.progress = 0;
        entry.error = null;
        entry.xhr = null;
        renderFileRow(entry);

        // If not currently uploading, start upload for this file
        if (!uploadState.isUploading) {
            retryUpload(entry);
        }
    } else if (entry.status === 'pending') {
        // Remove from queue
        uploadState.files = uploadState.files.filter(e => e.id !== entry.id);
        const row = document.getElementById(`upload-row-${entry.id}`);
        if (row) row.remove();
        updateOverallProgress();

        // Update subtitle
        const subtitle = document.getElementById('upload-modal-subtitle');
        const totalSize = uploadState.files.reduce((sum, e) => sum + e.file.size, 0);
        if (subtitle) {
            subtitle.textContent = `${uploadState.files.length} file (${formatBytes(totalSize)}) siap diupload`;
        }

        // Close if no files left
        if (uploadState.files.length === 0) {
            closeModal();
        }
    }
}

async function retryUpload(entry) {
    uploadState.isUploading = true;
    const currentPath = window.getState ? window.getState().currentPath : '';

    entry.status = 'uploading';
    entry.progress = 0;
    renderFileRow(entry);

    try {
        await uploadSingleFile(entry, currentPath);
        entry.status = 'success';
        entry.progress = 100;
    } catch (err) {
        if (entry.status !== 'cancelled') {
            entry.status = 'error';
            entry.error = err.message || 'Upload gagal';
        }
    }

    renderFileRow(entry);
    updateOverallProgress();
    uploadState.isUploading = false;

    // Refresh if success
    if (entry.status === 'success' && onUploadComplete) {
        onUploadComplete();
    }
}

function updateOverallProgress() {
    const fill = document.getElementById('upload-overall-fill');
    const text = document.getElementById('upload-overall-text');
    if (!fill || !text) return;

    const total = uploadState.files.length;
    if (total === 0) {
        fill.style.width = '0%';
        text.textContent = '0%';
        return;
    }

    const totalProgress = uploadState.files.reduce((sum, e) => sum + e.progress, 0);
    const percent = Math.round(totalProgress / total);

    fill.style.width = percent + '%';
    text.textContent = percent + '%';

    // Color based on state
    const hasError = uploadState.files.some(e => e.status === 'error');
    const allDone = uploadState.files.every(e => e.status === 'success' || e.status === 'error' || e.status === 'cancelled');

    fill.classList.remove('upload-modal__overall-fill--success', 'upload-modal__overall-fill--error');
    if (allDone && !hasError) {
        fill.classList.add('upload-modal__overall-fill--success');
    } else if (allDone && hasError) {
        fill.classList.add('upload-modal__overall-fill--error');
    }
}

function updateButtons() {
    const startBtn = document.getElementById('upload-btn-start');
    const cancelBtn = document.getElementById('upload-btn-cancel');

    if (startBtn) {
        startBtn.disabled = uploadState.files.length === 0;
        startBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Upload
        `;
    }
    if (cancelBtn) {
        cancelBtn.style.display = '';
        cancelBtn.textContent = 'Batal';
    }
}

// ─── Drop Zone ───────────────────────────────────────────────────────────────

function createDropOverlay() {
    if (uploadState.dropOverlayEl) return;

    const overlay = document.createElement('div');
    overlay.id = 'upload-drop-overlay';
    overlay.className = 'upload-drop-overlay';
    overlay.innerHTML = `
        <div class="upload-drop-overlay__content">
            <svg class="upload-drop-overlay__icon" width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="upload-drop-overlay__text">Drop file di sini untuk upload</div>
            <div class="upload-drop-overlay__hint">File akan diupload ke folder saat ini</div>
        </div>
    `;

    document.body.appendChild(overlay);
    uploadState.dropOverlayEl = overlay;
}

function showDropOverlay() {
    if (!uploadState.dropOverlayEl) createDropOverlay();
    uploadState.dropOverlayEl.classList.add('upload-drop-overlay--visible');
}

function hideDropOverlay() {
    if (uploadState.dropOverlayEl) {
        uploadState.dropOverlayEl.classList.remove('upload-drop-overlay--visible');
    }
}

/**
 * Initialize drag-to-upload on a target element (e.g. #main-content)
 * @param {HTMLElement} dropTarget - Element to listen for drag events
 */
function setupDropZone(dropTarget) {
    if (!dropTarget) return;

    createDropOverlay();

    dropTarget.addEventListener('dragenter', (e) => {
        // Only handle external file drops, not internal drag-and-drop
        if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        uploadState.dragCounter++;
        if (uploadState.dragCounter === 1) {
            showDropOverlay();
        }
    });

    dropTarget.addEventListener('dragover', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    dropTarget.addEventListener('dragleave', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        uploadState.dragCounter--;
        if (uploadState.dragCounter <= 0) {
            uploadState.dragCounter = 0;
            hideDropOverlay();
        }
    });

    dropTarget.addEventListener('drop', (e) => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        uploadState.dragCounter = 0;
        hideDropOverlay();

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            openModal(files);
        }
    });

    // Also listen on the overlay itself for drop
    if (uploadState.dropOverlayEl) {
        uploadState.dropOverlayEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        uploadState.dropOverlayEl.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadState.dragCounter = 0;
            hideDropOverlay();

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                openModal(files);
            }
        });

        uploadState.dropOverlayEl.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadState.dragCounter--;
            if (uploadState.dragCounter <= 0) {
                uploadState.dragCounter = 0;
                hideDropOverlay();
            }
        });
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the upload manager
 * @param {Object} options
 * @param {HTMLElement} options.dropTarget - Element for drag-to-upload
 * @param {Function} options.onComplete - Callback after uploads finish (to refresh directory)
 */
export function initUploadManager({ dropTarget, onComplete }) {
    onUploadComplete = onComplete || null;
    if (dropTarget) {
        setupDropZone(dropTarget);
    }
}

/**
 * Open upload modal with files (called from file input change or button click)
 * @param {FileList|File[]} files
 */
export function showUploadModal(files) {
    if (!files || files.length === 0) return;
    openModal(files);
}

/**
 * Check if upload is in progress
 * @returns {boolean}
 */
export function isUploadInProgress() {
    return uploadState.isUploading;
}

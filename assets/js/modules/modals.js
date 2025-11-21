/**
 * Modal Management Module
 * Berisi fungsi-fungsi untuk mengelola berbagai modal dalam aplikasi
 * @version 1.2.0 - Added log modal support
 */

import { config } from './constants.js';
import { hasUnsavedChanges } from './utils.js';

/**
 * Overlay open-count guard to avoid removing body.modal-open while other overlays remain open.
 * We use a simple counter so individual open/close flows can call markOverlayOpen/markOverlayClosed
 * without needing to coordinate with other modules.
 */
let _openOverlayCount = 0;
export function markOverlayOpen() {
    try {
        _openOverlayCount = Math.max(0, _openOverlayCount) + 1;
        if (_openOverlayCount === 1) {
            document.body.classList.add('modal-open');
        }
    } catch (e) {
        // defensive: if DOM not available, fallback to direct add
        try { document.body.classList.add('modal-open'); } catch (_) {}
    }
}
export function markOverlayClosed() {
    try {
        _openOverlayCount = Math.max(0, _openOverlayCount - 1);
        if (_openOverlayCount === 0) {
            document.body.classList.remove('modal-open');
        }
    } catch (e) {
        // defensive fallback
        try { document.body.classList.remove('modal-open'); } catch (_) {}
    }
}

/**
 * Membuka overlay preview
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} previewOverlay - Elemen preview overlay
 * @param {HTMLElement} previewClose - Elemen tombol close
 */
export function openPreviewOverlay(state, previewOverlay, previewClose) {
    if (state.preview.isOpen) {
        return;
    }

    state.preview.isOpen = true;
    state.preview.lastFocusedElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    previewOverlay.hidden = false;
    // Add Tailwind utilities for overlay + dialog (non-destructive, keeps existing classes)
    previewOverlay.classList.add(
        'tw-overlay',
        'fixed',
        'inset-0',
        'flex',
        'items-center',
        'justify-center',
        'bg-black/50',
        'z-50'
    );
    requestAnimationFrame(() => {
        previewOverlay.classList.add('visible');
        // Enhance inner dialog (if present) with Tailwind utilities; keep try/catch defensive
        try {
            const dialog = previewOverlay.querySelector('.modal') || previewOverlay.querySelector('.dialog') || previewOverlay.querySelector('.overlay-dialog');
            if (dialog) {
                dialog.classList.add('bg-white', 'rounded-lg', 'shadow-lg', 'p-4', 'max-w-3xl', 'w-full');
                // Accessibility: mark dialog semantics and make it programmatically focusable
                try {
                    dialog.setAttribute('role', 'dialog');
                    dialog.setAttribute('aria-modal', 'true');
                    dialog.tabIndex = -1;
                } catch (e) {}
            }
        } catch (e) {
            // intentionally silent to avoid breaking if DOM shape differs
        }
    });
    previewOverlay.setAttribute('aria-hidden', 'false');
    try {
        const dialogEl = previewOverlay.querySelector('.modal, .dialog, .overlay-dialog');
        console.log('[modals] openPreviewOverlay ->', {
            overlayId: previewOverlay.id || null,
            overlayClasses: previewOverlay.className,
            dialogClasses: dialogEl ? dialogEl.className : null
        });
    } catch (e) { /* ignore */ }
    markOverlayOpen();
    // Attach accessibility hooks (focus trap + Escape) using close via provided close button
    try {
        attachOverlayA11y(previewOverlay, () => {
            if (previewClose && typeof previewClose.click === 'function') previewClose.click();
        });
    } catch (e) {}
    previewClose.focus();
}

/**
 * Menutup overlay preview
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} previewOverlay - Elemen preview overlay
 * @param {HTMLElement} previewEditor - Elemen editor
 * @param {HTMLElement} previewLineNumbers - Elemen line numbers
 * @param {HTMLElement} previewMeta - Elemen meta
 * @param {HTMLElement} previewStatus - Elemen status
 * @param {HTMLElement} previewLoader - Elemen loader
 * @param {HTMLElement} previewSave - Elemen tombol save
 * @param {HTMLElement} previewOpenRaw - Elemen link open raw
 * @param {Function} confirmDiscardChanges - Fungsi konfirmasi perubahan
 * @param {Function} updateLineNumbers - Fungsi update line numbers
 * @returns {Promise<boolean>} Promise yang resolve dengan true jika berhasil ditutup
 */
export async function closePreviewOverlay(
    state, 
    previewOverlay, 
    previewEditor, 
    previewLineNumbers, 
    previewMeta, 
    previewStatus, 
    previewLoader, 
    previewSave, 
    previewOpenRaw,
    confirmDiscardChanges,
    updateLineNumbers
) {
    if (!state.preview.isOpen) {
        return Promise.resolve(true);
    }

    if (hasUnsavedChanges(state.preview)) {
        const confirmed = await confirmDiscardChanges('Perubahan belum disimpan. Tutup tanpa menyimpan?');
        if (confirmed === null || confirmed === false) {
            return false;
        }
        return doClosePreviewOverlay(
            state, 
            previewOverlay, 
            previewEditor, 
            previewLineNumbers, 
            previewMeta, 
            previewStatus, 
            previewLoader, 
            previewSave, 
            previewOpenRaw,
            updateLineNumbers
        );
    }

    return doClosePreviewOverlay(
        state, 
        previewOverlay, 
        previewEditor, 
        previewLineNumbers, 
        previewMeta, 
        previewStatus, 
        previewLoader, 
        previewSave, 
        previewOpenRaw,
        updateLineNumbers
    );
}

/**
 * Melakukan penutupan overlay preview
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} previewOverlay - Elemen preview overlay
 * @param {HTMLElement} previewEditor - Elemen editor
 * @param {HTMLElement} previewLineNumbers - Elemen line numbers
 * @param {HTMLElement} previewMeta - Elemen meta
 * @param {HTMLElement} previewStatus - Elemen status
 * @param {HTMLElement} previewLoader - Elemen loader
 * @param {HTMLElement} previewSave - Elemen tombol save
 * @param {HTMLElement} previewOpenRaw - Elemen link open raw
 * @param {Function} updateLineNumbers - Fungsi update line numbers
 * @returns {boolean} True jika berhasil ditutup
 */
function doClosePreviewOverlay(
    state, 
    previewOverlay, 
    previewEditor, 
    previewLineNumbers, 
    previewMeta, 
    previewStatus, 
    previewLoader, 
    previewSave, 
    previewOpenRaw,
    updateLineNumbers
) {
    state.preview.isOpen = false;
    previewOverlay.classList.remove('visible');
    previewOverlay.setAttribute('aria-hidden', 'true');
    markOverlayClosed();
    previewOpenRaw.href = '#';
    previewEditor.value = '';
    updateLineNumbers();
    previewEditor.classList.remove('is-loading');
    previewMeta.textContent = '';
    previewStatus.textContent = '';
    previewLoader.hidden = true;
    state.preview.path = null;
    state.preview.originalContent = '';
    state.preview.dirty = false;
    state.preview.isSaving = false;
    previewSave.disabled = true;
    previewEditor.readOnly = true;

    // Cleanup media viewer (if present) and reset mode
    const pvWrapper = document.getElementById('preview-viewer-wrapper');
    if (pvWrapper) {
        pvWrapper.style.display = 'none';
        const pv = document.getElementById('preview-viewer');
        if (pv) {
            pv.innerHTML = '';
        }
    }
    state.preview.mode = 'text';

    setTimeout(() => {
        if (!state.preview.isOpen) {
            previewOverlay.hidden = true;
        }
    }, config.animationDuration);

    const { lastFocusedElement } = state.preview;
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    }

    return true;
}

/**
 * Membuka overlay konfirmasi
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} confirmOverlay - Elemen confirm overlay
 * @param {HTMLElement} confirmMessage - Elemen pesan
 * @param {HTMLElement} confirmDescription - Elemen deskripsi
 * @param {HTMLElement} confirmList - Elemen list
 * @param {HTMLElement} confirmConfirm - Elemen tombol confirm
 * @param {Object} options - Opsi konfirmasi
 */
export function openConfirmOverlay(
    state, 
    confirmOverlay, 
    confirmMessage, 
    confirmDescription, 
    confirmList, 
    confirmConfirm,
    options
) {
    const {
        message,
        description,
        paths,
        showList,
        confirmLabel = 'Hapus',
    } = options;

    if (!paths || paths.length === 0) {
        return;
    }

    state.confirm.isOpen = true;
    state.confirm.paths = paths;

    confirmMessage.textContent = message;
    confirmDescription.textContent = description || '';
    confirmList.innerHTML = '';
    confirmList.hidden = !showList;

    if (showList) {
        paths.slice(0, 5).forEach((path) => {
            const item = state.itemMap.get(path);
            const label = item ? item.name : path;
            const li = document.createElement('li');
            li.textContent = label;
            confirmList.appendChild(li);
        });
        if (paths.length > 5) {
            const li = document.createElement('li');
            li.textContent = `dan ${paths.length - 5} item lainnya...`;
            confirmList.appendChild(li);
        }
    }

    confirmConfirm.textContent = confirmLabel;

    confirmOverlay.hidden = false;
    // Add Tailwind utilities for confirm overlay/dialog (additive)
    confirmOverlay.classList.add(
        'tw-overlay',
        'fixed',
        'inset-0',
        'flex',
        'items-center',
        'justify-center',
        'bg-black/50',
        'z-50'
    );
    requestAnimationFrame(() => {
        confirmOverlay.classList.add('visible');
        try {
            const dialog = confirmOverlay.querySelector('.modal') || confirmOverlay.querySelector('.dialog') || confirmOverlay.querySelector('.confirm-dialog');
            if (dialog) {
                dialog.classList.add('bg-white', 'rounded-lg', 'shadow-lg', 'p-4', 'max-w-lg', 'w-full');
                // Accessibility semantics
                try {
                    dialog.setAttribute('role', 'dialog');
                    dialog.setAttribute('aria-modal', 'true');
                    dialog.tabIndex = -1;
                } catch (e) {}
            }
        } catch (e) {}
    });
    confirmOverlay.setAttribute('aria-hidden', 'false');
    try {
        const dialogEl = confirmOverlay.querySelector('.modal, .dialog, .confirm-dialog');
        console.log('[modals] openConfirmOverlay ->', {
            overlayId: confirmOverlay.id || null,
            overlayClasses: confirmOverlay.className,
            dialogClasses: dialogEl ? dialogEl.className : null,
            pathsSample: (Array.isArray(paths) ? paths.slice(0,3) : null)
        });
    } catch (e) { /* ignore */ }
    markOverlayOpen();
    // Attach accessibility hooks: use closeConfirmOverlay (bind state+overlay)
    try {
        attachOverlayA11y(confirmOverlay, () => closeConfirmOverlay(state, confirmOverlay));
    } catch (e) {}
    confirmConfirm.focus();
}

/**
 * Menutup overlay konfirmasi
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} confirmOverlay - Elemen confirm overlay
 */
export function closeConfirmOverlay(state, confirmOverlay) {
    if (!state.confirm.isOpen) {
        return;
    }
    state.confirm.isOpen = false;
    state.confirm.paths = [];
    confirmOverlay.classList.remove('visible');
    confirmOverlay.setAttribute('aria-hidden', 'true');
    markOverlayClosed();
    setTimeout(() => {
        if (!state.confirm.isOpen) {
            confirmOverlay.hidden = true;
        }
    }, config.animationDuration);
}

/**
 * Membuka overlay unsaved changes
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} unsavedOverlay - Elemen unsaved overlay
 * @param {HTMLElement} unsavedMessage - Elemen pesan
 * @param {HTMLElement} unsavedCancel - Elemen tombol cancel
 * @param {Object} options - Opsi overlay
 */
export function openUnsavedOverlay(state, unsavedOverlay, unsavedMessage, unsavedCancel, options) {
    const { message, onSave, onDiscard, onCancel } = options;
    
    state.unsaved.isOpen = true;
    state.unsaved.callback = { onSave, onDiscard, onCancel };

    unsavedMessage.textContent = message || 'Anda memiliki perubahan yang belum disimpan. Apa yang ingin Anda lakukan?';

    unsavedOverlay.hidden = false;
    // Tailwind utilities for unsaved overlay
    unsavedOverlay.classList.add(
        'tw-overlay',
        'fixed',
        'inset-0',
        'flex',
        'items-center',
        'justify-center',
        'bg-black/50',
        'z-50'
    );
    requestAnimationFrame(() => {
        unsavedOverlay.classList.add('visible');
        // Enhance inner dialog if available
        try {
            const dialog = unsavedOverlay.querySelector('.modal') || unsavedOverlay.querySelector('.dialog') || unsavedOverlay.querySelector('.unsaved-dialog');
            if (dialog) {
                dialog.classList.add('bg-white', 'rounded-lg', 'shadow-lg', 'p-4', 'max-w-md', 'w-full');
                // Accessibility semantics
                try {
                    dialog.setAttribute('role', 'dialog');
                    dialog.setAttribute('aria-modal', 'true');
                    dialog.tabIndex = -1;
                } catch (e) {}
            }
        } catch (e) {}
        // Focus after the modal is visible to avoid aria-hidden warning
        unsavedCancel.focus();
    });
    unsavedOverlay.setAttribute('aria-hidden', 'false');
    try {
        const dialogEl = unsavedOverlay.querySelector('.modal, .dialog, .unsaved-dialog');
        console.log('[modals] openUnsavedOverlay ->', {
            overlayId: unsavedOverlay.id || null,
            overlayClasses: unsavedOverlay.className,
            dialogClasses: dialogEl ? dialogEl.className : null,
            messagePreview: (message || '').slice(0,140)
        });
    } catch (e) { /* ignore */ }
    markOverlayOpen();
    // Attach accessibility hooks using unsaved close handler
    try {
        attachOverlayA11y(unsavedOverlay, () => closeUnsavedOverlay(state, unsavedOverlay));
    } catch (e) {}
}

/**
 * Menutup overlay unsaved changes
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} unsavedOverlay - Elemen unsaved overlay
 */
export function closeUnsavedOverlay(state, unsavedOverlay) {
    if (!state.unsaved.isOpen) {
        return;
    }
    state.unsaved.isOpen = false;
    state.unsaved.callback = null;
    unsavedOverlay.classList.remove('visible');
    unsavedOverlay.setAttribute('aria-hidden', 'true');
    markOverlayClosed();
    setTimeout(() => {
        if (!state.unsaved.isOpen) {
            unsavedOverlay.hidden = true;
        }
    }, config.animationDuration);
}

/**
 * Membuka overlay create
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} createOverlay - Elemen create overlay
 * @param {HTMLElement} createTitle - Elemen title
 * @param {HTMLElement} createSubtitle - Elemen subtitle
 * @param {HTMLElement} createLabel - Elemen label
 * @param {HTMLElement} createName - Elemen input nama
 * @param {HTMLElement} createHint - Elemen hint
 * @param {HTMLElement} createSubmit - Elemen tombol submit
 * @param {string} kind - Jenis item ('file' atau 'folder')
 */
export function openCreateOverlay(
    state, 
    createOverlay, 
    createTitle, 
    createSubtitle, 
    createLabel, 
    createName, 
    createHint, 
    createSubmit,
    kind
) {
    state.create.isOpen = true;
    state.create.kind = kind;

    const isFolder = kind === 'folder';
    createTitle.textContent = isFolder ? 'Tambah Folder' : 'Tambah File';
    createSubtitle.textContent = isFolder
        ? 'Buat folder baru pada lokasi saat ini.'
        : 'Buat file baru pada lokasi saat ini.';
    createLabel.textContent = isFolder ? 'Nama Folder' : 'Nama File';
    createName.placeholder = isFolder ? 'Misal: dokumen' : 'Misal: catatan.txt';
    createHint.textContent = isFolder
        ? 'Gunakan huruf, angka, titik, atau garis bawah.'
        : 'Sertakan ekstensi file jika diperlukan.';
    createSubmit.textContent = 'Buat';

    createOverlay.hidden = false;
    createOverlay.classList.remove('hidden');
    // Tailwind utilities for create overlay + dialog
    createOverlay.classList.add(
        'tw-overlay',
        'fixed',
        'inset-0',
        'flex',
        'items-center',
        'justify-center',
        'bg-black/50',
        'z-50'
    );
    requestAnimationFrame(() => {
        createOverlay.classList.add('visible');
        try {
            const dialog = createOverlay.querySelector('.modal') || createOverlay.querySelector('.dialog') || createOverlay.querySelector('.create-dialog');
            if (dialog) {
                dialog.classList.add('bg-white', 'rounded-lg', 'shadow-lg', 'p-4', 'max-w-md', 'w-full');
                // Accessibility semantics
                try {
                    dialog.setAttribute('role', 'dialog');
                    dialog.setAttribute('aria-modal', 'true');
                    dialog.tabIndex = -1;
                } catch (e) {}
            }
        } catch (e) {}
    });
    createOverlay.setAttribute('aria-hidden', 'false');
    try {
        const dialogEl = createOverlay.querySelector('.modal, .dialog, .create-dialog');
        console.log('[modals] openCreateOverlay ->', {
            overlayId: createOverlay.id || null,
            overlayClasses: createOverlay.className,
            dialogClasses: dialogEl ? dialogEl.className : null,
            kind
        });
    } catch (e) { /* ignore */ }
    markOverlayOpen();
    
    createName.value = '';
    createName.focus();
}

/**
 * Menutup overlay create
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} createOverlay - Elemen create overlay
 * @param {HTMLElement} createForm - Elemen form
 * @param {HTMLElement} createHint - Elemen hint
 * @param {HTMLElement} createSubmit - Elemen tombol submit
 * @param {HTMLElement} createName - Elemen input nama
 */
export function closeCreateOverlay(
    state, 
    createOverlay, 
    createForm, 
    createHint, 
    createSubmit, 
    createName
) {
    if (!state.create.isOpen) {
        return;
    }
    state.create.isOpen = false;
    state.create.kind = 'file';
    createOverlay.classList.remove('visible');
    createOverlay.setAttribute('aria-hidden', 'true');
    createForm.reset();
    createHint.textContent = '';
    createSubmit.disabled = false;
    createName.disabled = false;
    markOverlayClosed();
    setTimeout(() => {
        if (!state.create.isOpen) {
            createOverlay.hidden = true;
            createOverlay.classList.add('hidden');
        }
    }, config.animationDuration);
}

/**
 * Membuka overlay rename
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} renameOverlay - Elemen rename overlay
 * @param {HTMLElement} renameTitle - Elemen title
 * @param {HTMLElement} renameSubtitle - Elemen subtitle
 * @param {HTMLElement} renameLabel - Elemen label
 * @param {HTMLElement} renameName - Elemen input nama
 * @param {HTMLElement} renameHint - Elemen hint
 * @param {HTMLElement} renameSubmit - Elemen tombol submit
 * @param {Object} item - Item yang akan di-rename
 */
export function openRenameOverlay(
    state, 
    renameOverlay, 
    renameTitle, 
    renameSubtitle, 
    renameLabel, 
    renameName, 
    renameHint, 
    renameSubmit,
    item
) {
    state.rename.isOpen = true;
    state.rename.targetItem = item;
    state.rename.originalName = item.name;

    const isFolder = item.type === 'folder';
    renameTitle.textContent = 'Rename Item';
    renameSubtitle.textContent = `Ubah nama ${isFolder ? 'folder' : 'file'} "${item.name}".`;
    renameLabel.textContent = 'Nama Baru';
    renameName.value = item.name;
    renameName.placeholder = isFolder ? 'Masukkan nama folder baru' : 'Masukkan nama file baru';
    renameHint.textContent = isFolder
        ? 'Gunakan huruf, angka, titik, atau garis bawah.'
        : 'Sertakan ekstensi file jika diperlukan.';
    renameSubmit.textContent = 'Rename';

    renameOverlay.hidden = false;
    // Tailwind utilities for rename overlay/dialog
    renameOverlay.classList.add(
        'tw-overlay',
        'fixed',
        'inset-0',
        'flex',
        'items-center',
        'justify-center',
        'bg-black/50',
        'z-50'
    );
    requestAnimationFrame(() => {
        renameOverlay.classList.add('visible');
        try {
            const dialog = renameOverlay.querySelector('.modal') || renameOverlay.querySelector('.dialog') || renameOverlay.querySelector('.rename-dialog');
            if (dialog) {
                dialog.classList.add('bg-white', 'rounded-lg', 'shadow-lg', 'p-4', 'max-w-md', 'w-full');
                // Accessibility semantics
                try {
                    dialog.setAttribute('role', 'dialog');
                    dialog.setAttribute('aria-modal', 'true');
                    dialog.tabIndex = -1;
                } catch (e) {}
            }
        } catch (e) {}
    });
    renameOverlay.setAttribute('aria-hidden', 'false');
    try {
        const dialogEl = renameOverlay.querySelector('.modal, .dialog, .rename-dialog');
        console.log('[modals] openRenameOverlay ->', {
            overlayId: renameOverlay.id || null,
            overlayClasses: renameOverlay.className,
            dialogClasses: dialogEl ? dialogEl.className : null,
            targetName: item && item.name ? item.name : null
        });
    } catch (e) { /* ignore */ }
    markOverlayOpen();
    
    // Select filename without extension for files
    if (!isFolder) {
        const dotIndex = item.name.lastIndexOf('.');
        if (dotIndex > 0) {
            renameName.focus();
            renameName.setSelectionRange(0, dotIndex);
        } else {
            renameName.select();
        }
    } else {
        renameName.select();
    }
}

/**
 * Menutup overlay rename
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} renameOverlay - Elemen rename overlay
 * @param {HTMLElement} renameForm - Elemen form
 * @param {HTMLElement} renameHint - Elemen hint
 * @param {HTMLElement} renameSubmit - Elemen tombol submit
 * @param {HTMLElement} renameName - Elemen input nama
 */
export function closeRenameOverlay(
    state,
    renameOverlay,
    renameForm,
    renameHint,
    renameSubmit,
    renameName
) {
    if (!state.rename.isOpen) {
        return;
    }
    state.rename.isOpen = false;
    state.rename.targetItem = null;
    state.rename.originalName = '';
    renameOverlay.classList.remove('visible');
    renameOverlay.setAttribute('aria-hidden', 'true');
    renameForm.reset();
    renameHint.textContent = '';
    renameSubmit.disabled = false;
    renameName.disabled = false;
    markOverlayClosed();
    setTimeout(() => {
        if (!state.rename.isOpen) {
            renameOverlay.hidden = true;
        }
    }, config.animationDuration);
}

/**
 * Mengatur status loading pada preview
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} previewLoader - Elemen loader
 * @param {HTMLElement} previewEditor - Elemen editor
 * @param {HTMLElement} previewSave - Elemen tombol save
 * @param {Function} updateLineNumbers - Fungsi update line numbers
 * @param {boolean} isLoading - Status loading
 */
export function setPreviewLoading(
    state, 
    previewLoader, 
    previewEditor, 
    previewSave, 
    updateLineNumbers, 
    isLoading
) {
    previewLoader.hidden = !isLoading;
    previewEditor.classList.toggle('is-loading', isLoading);
    previewEditor.readOnly = isLoading || state.preview.isSaving;
    if (isLoading) {
        previewEditor.value = '';
        previewSave.disabled = true;
        updateLineNumbers();
    }
}

/**
 * Mengupdate status preview
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} previewEditor - Elemen editor
 * @param {HTMLElement} previewStatus - Elemen status
 * @param {string} detail - Detail status
 */
export function updatePreviewStatus(state, previewEditor, previewStatus, detail = null) {
    const length = previewEditor.value.length;
    const base = `Karakter: ${length.toLocaleString('id-ID')}`;
    let suffix = '';

    if (state.preview.isSaving) {
        suffix = 'Menyimpan...';
    } else if (typeof detail === 'string' && detail !== '') {
        suffix = detail;
    } else if (state.preview.dirty) {
        suffix = 'Perubahan belum disimpan';
    }

    previewStatus.textContent = suffix ? `${base} • ${suffix}` : base;
}

/**
 * Memastikan media viewer wrapper ada di preview modal
 * @param {HTMLElement} previewBody - Elemen body preview
 * @returns {HTMLElement} Wrapper element
 */
export function ensurePreviewViewer(previewBody) {
    let wrapper = document.getElementById('preview-viewer-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'preview-viewer-wrapper';
        wrapper.classList.add('preview-viewer-wrapper');
        const viewer = document.createElement('div');
        viewer.id = 'preview-viewer';
        viewer.classList.add('preview-viewer');
        wrapper.appendChild(viewer);
        if (previewBody) {
            previewBody.appendChild(wrapper);
        }
    }
    return wrapper;
}

/**
 * Switch modal antara text editor dan media preview modes
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} previewEditorWrapper - Wrapper editor
 */
export function setPreviewMode(state, previewEditorWrapper) {
    const mode = state.preview.mode;
    if (previewEditorWrapper) {
        // Show text editor saat mode text, hide otherwise
        previewEditorWrapper.style.display = mode === 'text' ? '' : 'none';
    }
    const wrapper = document.getElementById('preview-viewer-wrapper');
    if (wrapper) {
        // Default CSS sets .preview-viewer-wrapper { display: none }
        // Use explicit 'block' untuk make it visible di media mode
        wrapper.style.display = mode === 'media' ? 'block' : 'none';
    }
}

/**
 * Membuka media preview (images, pdf) di dalam modal tanpa download
 * @param {Object} item - Item yang akan di-preview
 * @param {Object} state - State aplikasi
 * @param {Object} elements - Object berisi elemen-elemen DOM yang dibutuhkan
 * @param {Function} buildFileUrl - Fungsi untuk build URL file
 * @param {Function} formatBytes - Fungsi format bytes
 * @param {Function} formatDate - Fungsi format date
 * @param {Function} getFileExtension - Fungsi get file extension
 * @param {Function} hasUnsavedChanges - Fungsi cek unsaved changes
 * @param {Function} confirmDiscardChanges - Fungsi konfirmasi discard changes
 */
export async function openMediaPreview(
    item,
    state,
    elements,
    buildFileUrl,
    formatBytes,
    formatDate,
    getFileExtension,
    hasUnsavedChanges,
    confirmDiscardChanges
) {
    const {
        previewTitle,
        previewMeta,
        previewOpenRaw,
        previewSave,
        previewCopy,
        previewBody,
        previewEditorWrapper
    } = elements;

    // Cek unsaved changes
    if (hasUnsavedChanges(state.preview)) {
        const confirmed = await confirmDiscardChanges('Perubahan belum disimpan. Buka file lain tanpa menyimpan?');
        if (!confirmed) {
            return;
        }
    }

    // Prepare overlay
    previewTitle.textContent = item.name;
    const sizeInfo = typeof item.size === 'number' ? formatBytes(item.size) : '-';
    const modifiedInfo = item.modified ? formatDate(item.modified) : '-';
    previewMeta.textContent = `${item.path} • ${sizeInfo} • ${modifiedInfo}`;
    previewOpenRaw.href = buildFileUrl(item.path);

    state.preview.path = item.path;
    state.preview.originalContent = '';
    state.preview.dirty = false;
    state.preview.isSaving = false;

    // Disable text-only actions untuk media
    previewSave.disabled = true;
    previewCopy.disabled = true;

    // Ensure preview is open
    const wrapper = ensurePreviewViewer(previewBody);
    state.preview.mode = 'media';
    setPreviewMode(state, previewEditorWrapper);

    const viewer = document.getElementById('preview-viewer');
    if (viewer) {
        const extension = getFileExtension(item.name);
        const url = buildFileUrl(item.path);
        viewer.innerHTML = '';

        // Decide element based on type
        let el;
        if (extension === 'pdf') {
            // Optimization 8: Progressive PDF loading with loading indicator
            const loadingMsg = document.createElement('div');
            loadingMsg.style.cssText = 'text-align: center; padding: 40px; color: var(--text-secondary);';
            // Build spinner + message using DOM APIs to avoid inline class attributes in HTML strings
            loadingMsg.innerHTML = '';
            const pdfSpinner = document.createElement('div');
            pdfSpinner.classList.add('spinner');
            const pdfMsg = document.createElement('p');
            pdfMsg.textContent = 'Loading PDF...';
            loadingMsg.appendChild(pdfSpinner);
            loadingMsg.appendChild(pdfMsg);
            viewer.appendChild(loadingMsg);
            
            el = document.createElement('iframe');
            el.src = url;
            el.title = item.name;
            el.setAttribute('aria-label', `Pratinjau PDF ${item.name}`);
            el.style.display = 'none'; // Hide until loaded
            
            // Show iframe when loaded
            el.addEventListener('load', () => {
                console.log('[MEDIA] PDF loaded successfully:', item.name);
                loadingMsg.remove();
                el.style.display = 'block';
            });
        } else {
            // Optimization 11: Image Lazy Loading with native loading="lazy"
            // Optimization 8: Progressive image loading with placeholder
            const loadingMsg = document.createElement('div');
            loadingMsg.style.cssText = 'text-align: center; padding: 40px; color: var(--text-secondary);';
            // Build spinner + message using DOM APIs
            loadingMsg.innerHTML = '';
            const imgSpinner = document.createElement('div');
            imgSpinner.classList.add('spinner');
            const imgMsg = document.createElement('p');
            imgMsg.textContent = 'Loading image...';
            loadingMsg.appendChild(imgSpinner);
            loadingMsg.appendChild(imgMsg);
            viewer.appendChild(loadingMsg);
            
            el = document.createElement('img');
            el.src = url;
            el.alt = item.name;
            el.loading = 'lazy'; // Native lazy loading
            el.decoding = 'async'; // Async decode for better performance
            el.style.display = 'none'; // Hide until loaded
            
            // Add loading and error handlers
            el.addEventListener('load', () => {
                console.log('[MEDIA] Image loaded successfully:', item.name);
                loadingMsg.remove();
                el.style.display = 'block';
                
                // Optimization 8: Log performance metrics
                if (item.size && item.size > 1048576) { // > 1MB
                    console.log(`[MEDIA PERFORMANCE] Large image (${(item.size / 1048576).toFixed(2)}MB) loaded`);
                }
            });
            el.addEventListener('error', () => {
                console.error('[MEDIA] Failed to load image:', item.name);
                loadingMsg.remove();
                viewer.innerHTML = '<p style="color: var(--error); text-align: center; padding: 20px;">Gagal memuat gambar</p>';
            });
        }

        // Basic sizing (CSS can refine later)
        el.style.maxWidth = '100%';
        el.style.maxHeight = '70vh';
        el.style.border = '1px solid var(--border)';
        el.style.borderRadius = '12px';
        el.style.background = 'var(--surface)';
        el.style.display = 'block';
        el.style.margin = '0 auto';

        viewer.appendChild(el);
    }

    // Update status
    const previewStatus = document.getElementById('preview-status');
    if (previewStatus) {
        previewStatus.textContent = 'Mode pratinjau media';
    }
}

/**
 * Membuka overlay log modal
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} logOverlay - Elemen log overlay
 * @param {HTMLElement} logClose - Elemen tombol close
 */
export function openLogModal(state, logOverlay, logClose) {
    if (state.logs.isOpen) {
        return;
    }

    state.logs.isOpen = true;
    state.logs.currentPage = 1;
    state.logs.activeFilters = {};
    
    logOverlay.hidden = false;
    // Tailwind utilities for log modal overlay/dialog
    logOverlay.classList.add(
        'tw-overlay',
        'fixed',
        'inset-0',
        'flex',
        'items-center',
        'justify-center',
        'bg-black/50',
        'z-50'
    );
    requestAnimationFrame(() => {
        logOverlay.classList.add('visible');
        try {
            const dialog = logOverlay.querySelector('.modal') || logOverlay.querySelector('.dialog') || logOverlay.querySelector('.log-dialog');
            if (dialog) {
                dialog.classList.add('bg-white', 'rounded-lg', 'shadow-lg', 'p-4', 'max-w-4xl', 'w-full', 'overflow-hidden');
                // Accessibility semantics
                try {
                    dialog.setAttribute('role', 'dialog');
                    dialog.setAttribute('aria-modal', 'true');
                    dialog.tabIndex = -1;
                } catch (e) {}
            }
        } catch (e) {}
    });
    logOverlay.setAttribute('aria-hidden', 'false');
    try {
        const dialogEl = logOverlay.querySelector('.modal, .dialog, .log-dialog');
        console.log('[modals] openLogModal ->', {
            overlayId: logOverlay.id || null,
            overlayClasses: logOverlay.className,
            dialogClasses: dialogEl ? dialogEl.className : null
        });
    } catch (e) { /* ignore */ }
    markOverlayOpen();
    
    if (logClose) {
        logClose.focus();
    }
}

/**
 * Menutup overlay log modal
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} logOverlay - Elemen log overlay
 */
export function closeLogModal(state, logOverlay) {
    if (!state.logs.isOpen) {
        return;
    }

    state.logs.isOpen = false;
    logOverlay.classList.remove('visible');
    logOverlay.setAttribute('aria-hidden', 'true');
    markOverlayClosed();
    
    setTimeout(() => {
        if (!state.logs.isOpen) {
            logOverlay.hidden = true;
        }
    }, 200);
}

/**
 * Mengatur status loading pada log modal
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} logRefresh - Tombol refresh
 * @param {HTMLElement} logPrev - Tombol previous
 * @param {HTMLElement} logNext - Tombol next
 * @param {HTMLElement} logPageInfo - Info halaman
 * @param {boolean} isLoading - Status loading
 */
/**
 * Mengatur status loading pada log modal
 * CRITICAL FIX: Now manages BOTH table body AND global loader overlay
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} logTableBody - Table body element
 * @param {boolean} isLoading - Status loading
 */
export function setLogLoading(state, logTableBody, isLoading) {
    const timestamp = new Date().toISOString();
    console.log(`[LOG_LOADING ${timestamp}] Setting loading state:`, {
        isLoading,
        hasTableBody: !!logTableBody,
        currentState: state.logs.isLoading,
        stackTrace: new Error().stack
    });
    
    // Update state
    state.logs.isLoading = isLoading;
    
    // Get global loader overlay
    const loaderOverlay = document.querySelector('.loader-overlay');
    const btnRefresh = document.querySelector('#btn-refresh');
    
    if (isLoading) {
        // SHOW loading - both table and global overlay
        if (logTableBody) {
            // Build loading row using DOM APIs instead of template innerHTML
            logTableBody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.style.textAlign = 'center';
            td.style.padding = '20px';
            const spinnerDiv = document.createElement('div');
            spinnerDiv.classList.add('spinner');
            const p = document.createElement('p');
            p.textContent = 'Loading logs...';
            td.appendChild(spinnerDiv);
            td.appendChild(p);
            tr.appendChild(td);
            logTableBody.appendChild(tr);
        } else {
            console.warn('[LOG_LOADING] logTableBody element not found');
        }
        
        // Show global loader
        if (loaderOverlay) {
            loaderOverlay.classList.add('visible');
            console.log('[LOG_LOADING] Global loader shown');
        } else {
            console.warn('[LOG_LOADING] Global loader-overlay element not found');
        }
        
        // Disable refresh button
        if (btnRefresh) {
            btnRefresh.disabled = true;
        }
        
        console.log('[LOG_LOADING] ✓ Loading state activated');
    } else {
        // HIDE loading - clear EVERYTHING
        
        // Clear table loading (renderLogTable will populate it)
        if (logTableBody && logTableBody.innerHTML.includes('Loading logs')) {
            // Only clear if it's still showing loading message
            console.log('[LOG_LOADING] Table still has loading message, will be cleared by renderLogTable');
        }
        
        // CRITICAL: Hide global loader
        if (loaderOverlay) {
            loaderOverlay.classList.remove('visible');
            console.log('[LOG_LOADING] Global loader hidden');
        } else {
            console.warn('[LOG_LOADING] Global loader-overlay element not found for hiding');
        }
        
        // Re-enable refresh button
        if (btnRefresh) {
            btnRefresh.disabled = false;
        }
        
        console.log('[LOG_LOADING] ✓ Loading state deactivated');
    }
    
    // Defensive check: Ensure global loader is actually hidden
    if (!isLoading) {
        setTimeout(() => {
            const overlay = document.querySelector('.loader-overlay');
            if (overlay && overlay.classList.contains('visible')) {
                console.error('[LOG_LOADING] ⚠️ FAILSAFE: Loader still visible after clear! Force removing...');
                overlay.classList.remove('visible');
            }
        }, 100);
    }
}

/**
 * Mengupdate informasi pagination log
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} logPrev - Tombol previous
 * @param {HTMLElement} logNext - Tombol next
 * @param {HTMLElement} logPageInfo - Info halaman
 */
export function updateLogPagination(state, logPrev, logNext, logPageInfo) {
    if (logPrev) {
        logPrev.disabled = state.logs.currentPage <= 1 || state.logs.isLoading;
    }
    if (logNext) {
        logNext.disabled = state.logs.currentPage >= state.logs.totalPages || state.logs.isLoading;
    }
    if (logPageInfo) {
        logPageInfo.textContent = `Halaman ${state.logs.currentPage} dari ${state.logs.totalPages}`;
    }
}

/**
 * Accessibility helpers for overlays/modals
 * - attachOverlayA11y(overlay, closeCallback): sets up Escape-to-close and a basic focus-trap
 * - detachOverlayA11y(overlay): removes listeners set by attachOverlayA11y
 *
 * These are intentionally defensive and non-invasive: they won't throw if the overlay
 * structure differs. They only register a single document-level keydown handler per overlay.
 */
const overlayA11yMap = new WeakMap();

export function attachOverlayA11y(overlay, closeCallback) {
    if (!overlay || overlayA11yMap.has(overlay)) return;
    const keydownHandler = (e) => {
        // Close on Escape
        if (e.key === 'Escape') {
            e.preventDefault();
            try { if (closeCallback) closeCallback(); } catch (err) {}
            return;
        }

        // Basic focus trap for Tab and Shift+Tab
        if (e.key === 'Tab') {
            try {
                const focusable = Array.from(
                    overlay.querySelectorAll(
                        'a[href], area[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    )
                ).filter((el) => el.offsetParent !== null); // visible only

                if (focusable.length === 0) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            } catch (err) {
                // swallow errors to avoid breaking the app
            }
        }
    };

    const initialFocus = () => {
        try {
            const focusable = Array.from(
                overlay.querySelectorAll(
                    'a[href], area[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter((el) => el.offsetParent !== null);
            if (focusable.length > 0) {
                focusable[0].focus();
            } else if (overlay && typeof overlay.focus === 'function') {
                // Make overlay focusable then focus it
                overlay.tabIndex = -1;
                overlay.focus();
            }
        } catch (err) {
            // ignore
        }
    };

    // Register handler and store detach
    document.addEventListener('keydown', keydownHandler);
    const detach = () => {
        try {
            document.removeEventListener('keydown', keydownHandler);
        } catch (e) {}
        overlayA11yMap.delete(overlay);
        try { delete overlay._a11yDetach; } catch (e) {}
    };

    overlay._a11yDetach = detach;
    overlayA11yMap.set(overlay, { detach, initialFocus });

    // Run initial focus asynchronously so the overlay DOM has a chance to settle
    setTimeout(initialFocus, 0);
}

export function detachOverlayA11y(overlay) {
    if (!overlay) return;
    const entry = overlayA11yMap.get(overlay);
    if (entry && typeof entry.detach === 'function') {
        try { entry.detach(); } catch (e) {}
    }
    if (overlay && overlay._a11yDetach) {
        try { overlay._a11yDetach(); } catch (e) {}
    }
}
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
    // PENTING: Hapus class 'hidden' dari Tailwind
    previewOverlay.classList.remove('hidden');
    
    // ADD VISIBLE CLASS IMMEDIATELY
    previewOverlay.classList.add('visible');
    
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
    // PENTING: Hapus class 'hidden' dari Tailwind
    confirmOverlay.classList.remove('hidden');
    
    // ADD VISIBLE CLASS IMMEDIATELY
    confirmOverlay.classList.add('visible');
    
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
            // Add back class 'hidden' dari Tailwind
            confirmOverlay.classList.add('hidden');
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
    // PENTING: Hapus class 'hidden' dari Tailwind
    unsavedOverlay.classList.remove('hidden');
    
    // ADD VISIBLE CLASS IMMEDIATELY
    unsavedOverlay.classList.add('visible');
    
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
            // Add back class 'hidden' dari Tailwind
            unsavedOverlay.classList.add('hidden');
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
    state.create.kind = kind || 'file'; // Default ke 'file' jika tidak ada kind

    // Reset radio buttons - unchecked semua
    const radioButtons = createOverlay.querySelectorAll('input[name="create-type"]');
    radioButtons.forEach(radio => radio.checked = false);
    
    // Hide input name group secara default
    const createNameGroup = createOverlay.querySelector('#create-name-group');
    if (createNameGroup) {
        createNameGroup.style.display = 'none';
    }

    // Hanya set radio jika kind diberikan (dari split action buttons)
    if (kind) {
        const radioToCheck = createOverlay.querySelector(`input[name="create-type"][value="${kind}"]`);
        if (radioToCheck) {
            radioToCheck.checked = true;
        }
        // Tampilkan input name jika ada kind yang diberikan
        if (createNameGroup) {
            createNameGroup.style.display = 'block';
        }
    }

    const isFolder = state.create.kind === 'folder';
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
    
    // ADD VISIBLE CLASS IMMEDIATELY
    createOverlay.classList.add('visible');
    
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
    
    // Add event listeners untuk perubahan pilihan file/folder
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            const isFolder = radio.value === 'folder';
            createName.placeholder = isFolder ? 'Misal: dokumen' : 'Misal: catatan.txt';
            // Tampilkan input name ketika ada pilihan
            if (createNameGroup) {
                createNameGroup.style.display = 'block';
            }
            // Set fokus ke input name
            createName.focus();
        });
    });
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
    
    // Sembunyikan input name group dan reset radio buttons
    const createNameGroup = createOverlay.querySelector('#create-name-group');
    if (createNameGroup) {
        createNameGroup.style.display = 'none';
    }
    const radioButtons = createOverlay.querySelectorAll('input[name="create-type"]');
    radioButtons.forEach(radio => radio.checked = false);
    
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
    renameOverlay.classList.remove('hidden');
    
    // ADD VISIBLE CLASS IMMEDIATELY
    renameOverlay.classList.add('visible');
    
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
            renameOverlay.classList.add('hidden');
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
    console.log('[openLogModal] ========== START ==========');
    console.log('[openLogModal] logOverlay element:', logOverlay);
    console.log('[openLogModal] logOverlay ID:', logOverlay ? logOverlay.id : 'NULL');
    
    if (!logOverlay) {
        console.error('[openLogModal] ERROR: logOverlay is NULL or undefined!');
        alert('Error: Log overlay element not found!');
        return;
    }
    
    if (state.logs.isOpen) {
        console.log('[openLogModal] Modal already open, returning');
        return;
    }

    console.log('[openLogModal] Step 1: Setting state');
    state.logs.isOpen = true;
    state.logs.currentPage = 1;
    state.logs.activeFilters = {};
    
    console.log('[openLogModal] Step 2: Setting hidden=false');
    logOverlay.hidden = false;
    
    console.log('[openLogModal] Step 3: Removing Tailwind hidden class');
    logOverlay.classList.remove('hidden');
    
    console.log('[openLogModal] Step 4: Setting aria-hidden=false (CRITICAL for CSS)');
    logOverlay.setAttribute('aria-hidden', 'false');
    
    console.log('[openLogModal] Step 5: Adding visible class (CRITICAL for CSS)');
    logOverlay.classList.add('visible');
    
    console.log('[openLogModal] Step 6: Adding Tailwind display classes');
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
    
    console.log('[openLogModal] Step 7: Classes applied:', logOverlay.className);
    console.log('[openLogModal] Step 8: aria-hidden value:', logOverlay.getAttribute('aria-hidden'));
    
    // Check computed styles
    const computedStyle = window.getComputedStyle(logOverlay);
    console.log('[openLogModal] Step 9: Computed display:', computedStyle.display);
    console.log('[openLogModal] Step 9: Computed visibility:', computedStyle.visibility);
    console.log('[openLogModal] Step 9: Computed opacity:', computedStyle.opacity);
    console.log('[openLogModal] Step 9: Computed z-index:', computedStyle.zIndex);
    
    requestAnimationFrame(() => {
        console.log('[openLogModal] RAF: Applying styles to dialog');
        try {
            const dialog = logOverlay.querySelector('.modal') || logOverlay.querySelector('.dialog') || logOverlay.querySelector('.log-dialog');
            if (dialog) {
                console.log('[openLogModal] RAF: Found dialog element');
                dialog.classList.add('bg-white', 'rounded-lg', 'shadow-lg', 'p-4', 'max-w-4xl', 'w-full', 'overflow-hidden');
                dialog.setAttribute('role', 'dialog');
                dialog.setAttribute('aria-modal', 'true');
                dialog.tabIndex = -1;
            } else {
                console.warn('[openLogModal] RAF: Dialog element NOT found!');
            }
        } catch (e) {
            console.error('[openLogModal] RAF: Error:', e);
        }
    });
    
    console.log('[openLogModal] Step 10: Calling markOverlayOpen');
    markOverlayOpen();
    
    if (logClose) {
        logClose.focus();
    }
    
    console.log('[openLogModal] ========== COMPLETE ==========');
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
            // Add back class 'hidden' dari Tailwind
            logOverlay.classList.add('hidden');
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

// ============================================================================
// DELETE OVERLAY FUNCTIONS
// ============================================================================

/**
 * Opens the delete confirmation overlay
 * @param {Array|Object} items - Items to delete (can be single item or array)
 * @param {Function} onConfirm - Callback when delete is confirmed
 * @param {Function} onCancel - Optional callback when cancelled
 */
export function openDeleteOverlay(items, onConfirm, onCancel = null) {
    const overlay = document.getElementById('delete-overlay');
    if (!overlay) {
        console.warn('[modals] delete-overlay not found');
        return;
    }
    
    const itemsArray = Array.isArray(items) ? items : [items];
    const itemCount = itemsArray.length;
    
    // Update title and subtitle
    const title = overlay.querySelector('#delete-title');
    const subtitle = overlay.querySelector('#delete-subtitle');
    const message = overlay.querySelector('#delete-message');
    const itemsList = overlay.querySelector('#delete-items-list');
    
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
                ? '<svg viewBox="0 0 24 24" fill="currentColor" class="delete-item-icon"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="currentColor" class="delete-item-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>';
            return `<div class="delete-item">${icon}<span class="delete-item-name">${escapeHtml(name)}</span></div>`;
        }).join('');
        
        if (itemCount > 10) {
            itemsList.innerHTML += `<div class="delete-item text-gray-500">... dan ${itemCount - 10} item lainnya</div>`;
        }
    }
    
    // Store callbacks
    overlay._deleteConfirmCallback = onConfirm;
    overlay._deleteCancelCallback = onCancel;
    overlay._deleteItems = itemsArray;
    
    // Show overlay
    overlay.hidden = false;
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    
    // Setup event listeners
    const confirmBtn = overlay.querySelector('#delete-confirm');
    const cancelBtn = overlay.querySelector('#delete-cancel');
    
    const handleConfirm = async () => {
        if (typeof overlay._deleteConfirmCallback === 'function') {
            try {
                await overlay._deleteConfirmCallback(overlay._deleteItems);
            } catch (e) {
                console.error('[modals] Delete confirm error:', e);
            }
        }
        closeDeleteOverlay();
    };
    
    const handleCancel = () => {
        if (typeof overlay._deleteCancelCallback === 'function') {
            overlay._deleteCancelCallback();
        }
        closeDeleteOverlay();
    };
    
    // Remove old listeners
    confirmBtn?.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn?.replaceWith(cancelBtn.cloneNode(true));
    
    // Add new listeners
    overlay.querySelector('#delete-confirm')?.addEventListener('click', handleConfirm);
    overlay.querySelector('#delete-cancel')?.addEventListener('click', handleCancel);
    
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleCancel();
    }, { once: true });
    
    // Focus cancel button
    setTimeout(() => {
        overlay.querySelector('#delete-cancel')?.focus();
    }, 100);
    
    markOverlayOpen();
    attachOverlayA11y(overlay, handleCancel);
    
    console.log('[modals] openDeleteOverlay ->', { itemCount, items: itemsArray });
}

/**
 * Closes the delete confirmation overlay
 */
export function closeDeleteOverlay() {
    const overlay = document.getElementById('delete-overlay');
    if (!overlay) return;
    
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;
    
    // Clear callbacks
    delete overlay._deleteConfirmCallback;
    delete overlay._deleteCancelCallback;
    delete overlay._deleteItems;
    
    // Clear items list
    const itemsList = overlay.querySelector('#delete-items-list');
    if (itemsList) itemsList.innerHTML = '';
    
    markOverlayClosed();
    detachOverlayA11y(overlay);
}

// ============================================================================
// DOWNLOAD OVERLAY FUNCTIONS
// ============================================================================

/**
 * Opens the download confirmation overlay
 * @param {Object} fileData - File data with name, size, path, type
 * @param {Function} onConfirm - Callback when download is confirmed
 * @param {Function} onCancel - Optional callback when cancelled
 */
export function openDownloadOverlay(fileData, onConfirm, onCancel = null) {
    const overlay = document.getElementById('download-overlay');
    if (!overlay) {
        console.warn('[modals] download-overlay not found');
        return;
    }
    
    // Update file info
    const fileName = overlay.querySelector('#download-file-name');
    const fileSize = overlay.querySelector('#download-file-size');
    const fileIcon = overlay.querySelector('#download-file-icon');
    const subtitle = overlay.querySelector('#download-subtitle');
    
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
    
    // Store callbacks
    overlay._downloadConfirmCallback = onConfirm;
    overlay._downloadCancelCallback = onCancel;
    overlay._downloadFileData = fileData;
    
    // Show overlay
    overlay.hidden = false;
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    
    // Setup event listeners
    const confirmBtn = overlay.querySelector('#download-confirm');
    const cancelBtn = overlay.querySelector('#download-cancel');
    
    const handleConfirm = async () => {
        if (typeof overlay._downloadConfirmCallback === 'function') {
            try {
                await overlay._downloadConfirmCallback(overlay._downloadFileData);
            } catch (e) {
                console.error('[modals] Download confirm error:', e);
            }
        }
        closeDownloadOverlay();
    };
    
    const handleCancel = () => {
        if (typeof overlay._downloadCancelCallback === 'function') {
            overlay._downloadCancelCallback();
        }
        closeDownloadOverlay();
    };
    
    // Remove old listeners
    confirmBtn?.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn?.replaceWith(cancelBtn.cloneNode(true));
    
    // Add new listeners
    overlay.querySelector('#download-confirm')?.addEventListener('click', handleConfirm);
    overlay.querySelector('#download-cancel')?.addEventListener('click', handleCancel);
    
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleCancel();
    }, { once: true });
    
    // Focus download button
    setTimeout(() => {
        overlay.querySelector('#download-confirm')?.focus();
    }, 100);
    
    markOverlayOpen();
    attachOverlayA11y(overlay, handleCancel);
    
    console.log('[modals] openDownloadOverlay ->', { fileData });
}

/**
 * Closes the download overlay
 */
export function closeDownloadOverlay() {
    const overlay = document.getElementById('download-overlay');
    if (!overlay) return;
    
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;
    
    // Clear callbacks
    delete overlay._downloadConfirmCallback;
    delete overlay._downloadCancelCallback;
    delete overlay._downloadFileData;
    
    markOverlayClosed();
    detachOverlayA11y(overlay);
}

/**
 * Helper function to format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to escape HTML
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
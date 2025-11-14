/**
 * Modal Management Module
 * Berisi fungsi-fungsi untuk mengelola berbagai modal dalam aplikasi
 */

import { config } from './constants.js';
import { hasUnsavedChanges } from './utils.js';

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
    requestAnimationFrame(() => {
        previewOverlay.classList.add('visible');
    });
    previewOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
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
    document.body.classList.remove('modal-open');
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
    requestAnimationFrame(() => {
        confirmOverlay.classList.add('visible');
    });
    confirmOverlay.setAttribute('aria-hidden', 'false');
    if (!state.preview.isOpen) {
        document.body.classList.add('modal-open');
    }
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
    if (!state.preview.isOpen) {
        document.body.classList.remove('modal-open');
    }
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
    requestAnimationFrame(() => {
        unsavedOverlay.classList.add('visible');
        // Focus after the modal is visible to avoid aria-hidden warning
        unsavedCancel.focus();
    });
    unsavedOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
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
    document.body.classList.remove('modal-open');
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
    requestAnimationFrame(() => {
        createOverlay.classList.add('visible');
    });
    createOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

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
    if (!state.preview.isOpen && !state.confirm.isOpen) {
        document.body.classList.remove('modal-open');
    }
    setTimeout(() => {
        if (!state.create.isOpen) {
            createOverlay.hidden = true;
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
    requestAnimationFrame(() => {
        renameOverlay.classList.add('visible');
    });
    renameOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

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
    if (!state.preview.isOpen && !state.confirm.isOpen && !state.create.isOpen) {
        document.body.classList.remove('modal-open');
    }
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
/**
 * Event Handlers Module - Facade
 * Re-exports all event handler functions from sub-modules for backward compatibility
 */

import { config } from './constants.js';
import { debounce } from './utils.js';

// Re-export from file handlers
export {
    setupRefreshHandler,
    setupUpHandler,
    setupSelectAllHandler,
    setupDeleteSelectedHandler,
    setupDeleteSelectedDesktopHandler,
    setupVisibilityHandler,
    setupContextMenuHandler,
    setupSelectAllMobileButtonHandler,
    setupMobileActionsHandler
} from './handlers/fileHandlers.js';

// Re-export from keyboard handlers
export {
    setupKeyboardHandler as setupKeyboardNavigationHandler,
    handleKeyboardNavigation,
    setupSearchKeyboardHandler,
    setupCopyPasteHandler,
    setupSelectAllKeyboardHandler,
    setupDeleteKeyboardHandler,
    setupRenameKeyboardHandler,
    setupNewItemKeyboardHandler,
    setupRefreshKeyboardHandler,
    setupBackNavigationHandler
} from './handlers/keyboardHandlers.js';

// Re-export from drag handlers
export {
    setupDragDropHandlers,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDropEvent,
    handleDragEnd,
    setupUploadDropZone,
    setupSortableDrag,
    setupBreadcrumbDropZones
} from './handlers/dragHandlers.js';

// Re-export from form handlers
export {
    setupCreateFormHandler,
    setupRenameFormHandler,
    setupUploadFormHandler,
    setupSearchFormHandler,
    setupSettingsFormHandler,
    setupMoveFormHandler,
    setupFormValidation,
    setupCreateButtonHandlers,
    setupOverlayCloseHandlers,
    setupBackdropClickHandlers
} from './handlers/formHandlers.js';


// ============================================================================
// Functions that remain in this file (facade-specific or cross-cutting)
// ============================================================================

/**
 * Mengatur event handler untuk filter input
 * @param {HTMLElement} filterInput - Input filter
 * @param {HTMLElement} clearSearch - Tombol clear search
 * @param {Object} state - State aplikasi
 * @param {Function} renderItems - Fungsi render items
 */
export function setupFilterHandler(filterInput, clearSearch, state, renderItems, resetPagination) {
    clearSearch.hidden = true;

    // Debounced filter for better performance
    const debouncedFilter = debounce((value, items, lastUpdated) => {
        state.filter = value.trim();
        clearSearch.hidden = state.filter === '';
        
        // Reset pagination to page 1 when filter changes
        if (resetPagination) {
            resetPagination();
        }
        
        renderItems(items, lastUpdated, false);
    }, 300); // 300ms delay

    filterInput.addEventListener('input', (event) => {
        const value = event.target.value;
        // Show/hide clear button immediately for better UX
        clearSearch.hidden = value === '';
        // Debounce the actual filtering and rendering
        debouncedFilter(value, state.items, state.lastUpdated);
    });

    filterInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && filterInput.value !== '') {
            event.preventDefault();
            filterInput.value = '';
            state.filter = '';
            clearSearch.hidden = true;
            
            // Reset pagination when clearing filter
            if (resetPagination) {
                resetPagination();
            }
            
            renderItems(state.items, state.lastUpdated, false);
        }
    });

    clearSearch.addEventListener('click', () => {
        filterInput.value = '';
        state.filter = '';
        clearSearch.hidden = true;
        
        // Reset pagination when clearing filter
        if (resetPagination) {
            resetPagination();
        }
        
        renderItems(state.items, state.lastUpdated, false);
        filterInput.focus();
    });
}

/**
 * Mengatur event handler untuk sort headers
 * @param {NodeList} sortHeaders - Daftar header sorting
 * @param {Object} state - State aplikasi
 * @param {Function} changeSort - Fungsi ubah sorting
 */
export function setupSortHandlers(sortHeaders, state, changeSort) {
    sortHeaders.forEach((header) => {
        header.setAttribute('role', 'button');
        header.tabIndex = 0;
        header.addEventListener('click', () => changeSort(header.dataset.sortKey));
        header.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                changeSort(header.dataset.sortKey);
            }
        });
    });
}

/**
 * Mengatur event handler untuk tombol upload
 * @param {HTMLElement} btnUpload - Tombol upload
 * @param {HTMLElement} uploadInput - Input upload
 * @param {Object} state - State aplikasi
 * @param {Function} hasUnsavedChanges - Fungsi cek perubahan belum disimpan
 * @param {Function} confirmDiscardChanges - Fungsi konfirmasi perubahan
 * @param {Function} uploadFiles - Fungsi upload files
 */
export function setupUploadHandler(
    btnUpload,
    uploadInput,
    state,
    hasUnsavedChanges,
    confirmDiscardChanges,
    uploadFilesWrapper
) {
    // Prevent multiple event listeners
    if (btnUpload._uploadHandlerAttached) {
        return;
    }
    btnUpload._uploadHandlerAttached = true;
    
    btnUpload.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (state.isLoading) {
            return;
        }
        uploadInput.value = '';
        uploadInput.click();
    });

    uploadInput.addEventListener('change', async (event) => {
        const { files } = event.target;
        if (!files || files.length === 0) {
            return;
        }

        if (hasUnsavedChanges()) {
            const proceed = await confirmDiscardChanges('Perubahan belum disimpan. Tetap unggah file baru?');
            if (!proceed) {
                uploadInput.value = '';
                return;
            }
        }

        await uploadFilesWrapper(files);
        uploadInput.value = '';
    });
}

/**
 * Mengatur event handler untuk tombol upload desktop
 * @param {HTMLElement} btnUploadDesktop - Tombol upload desktop
 * @param {HTMLElement} uploadInputDesktop - Input upload desktop
 * @param {Object} state - State aplikasi
 * @param {Function} hasUnsavedChanges - Fungsi cek perubahan belum disimpan
 * @param {Function} confirmDiscardChanges - Fungsi konfirmasi perubahan
 * @param {Function} uploadFilesWrapper - Fungsi upload files
 */
export function setupUploadDesktopHandler(
    btnUploadDesktop,
    uploadInputDesktop,
    state,
    hasUnsavedChanges,
    confirmDiscardChanges,
    uploadFilesWrapper
) {
    // Prevent multiple event listeners
    if (btnUploadDesktop._uploadHandlerAttached) {
        return;
    }
    btnUploadDesktop._uploadHandlerAttached = true;
    
    btnUploadDesktop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (state.isLoading) {
            return;
        }
        uploadInputDesktop.value = '';
        uploadInputDesktop.click();
    });

    uploadInputDesktop.addEventListener('change', async (event) => {
        const { files } = event.target;
        if (!files || files.length === 0) {
            return;
        }

        if (hasUnsavedChanges()) {
            const proceed = await confirmDiscardChanges('Perubahan belum disimpan. Tetap unggah file baru?');
            if (!proceed) {
                uploadInputDesktop.value = '';
                return;
            }
        }

        await uploadFilesWrapper(files);
        uploadInputDesktop.value = '';
    });
}

/**
 * Mengatur event handler untuk tombol upload folder (mobile)
 * @param {HTMLElement} btnUploadFolder - Tombol upload folder
 * @param {HTMLElement} uploadFolderInput - Input upload folder
 * @param {Object} state - State aplikasi
 * @param {Function} hasUnsavedChanges - Fungsi cek perubahan belum disimpan
 * @param {Function} confirmDiscardChanges - Fungsi konfirmasi perubahan
 * @param {Function} uploadFolderWrapper - Fungsi upload folder
 */
export function setupUploadFolderHandler(
    btnUploadFolder,
    uploadFolderInput,
    state,
    hasUnsavedChanges,
    confirmDiscardChanges,
    uploadFolderWrapper
) {
    // Prevent multiple event listeners
    if (btnUploadFolder._uploadFolderHandlerAttached) {
        return;
    }
    btnUploadFolder._uploadFolderHandlerAttached = true;
    
    btnUploadFolder.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (state.isLoading) {
            return;
        }
        uploadFolderInput.value = '';
        uploadFolderInput.click();
    });

    uploadFolderInput.addEventListener('change', async (event) => {
        const { files } = event.target;
        if (!files || files.length === 0) {
            return;
        }

        if (hasUnsavedChanges()) {
            const proceed = await confirmDiscardChanges('Perubahan belum disimpan. Tetap unggah folder baru?');
            if (!proceed) {
                uploadFolderInput.value = '';
                return;
            }
        }

        await uploadFolderWrapper(files);
        uploadFolderInput.value = '';
    });
}

/**
 * Mengatur event handler untuk tombol upload folder desktop
 * @param {HTMLElement} btnUploadFolderDesktop - Tombol upload folder desktop
 * @param {HTMLElement} uploadFolderInputDesktop - Input upload folder desktop
 * @param {Object} state - State aplikasi
 * @param {Function} hasUnsavedChanges - Fungsi cek perubahan belum disimpan
 * @param {Function} confirmDiscardChanges - Fungsi konfirmasi perubahan
 * @param {Function} uploadFolderWrapper - Fungsi upload folder
 */
export function setupUploadFolderDesktopHandler(
    btnUploadFolderDesktop,
    uploadFolderInputDesktop,
    state,
    hasUnsavedChanges,
    confirmDiscardChanges,
    uploadFolderWrapper
) {
    // Prevent multiple event listeners
    if (btnUploadFolderDesktop._uploadFolderHandlerAttached) {
        return;
    }
    btnUploadFolderDesktop._uploadFolderHandlerAttached = true;
    
    btnUploadFolderDesktop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (state.isLoading) {
            return;
        }
        uploadFolderInputDesktop.value = '';
        uploadFolderInputDesktop.click();
    });

    uploadFolderInputDesktop.addEventListener('change', async (event) => {
        const { files } = event.target;
        if (!files || files.length === 0) {
            return;
        }

        if (hasUnsavedChanges()) {
            const proceed = await confirmDiscardChanges('Perubahan belum disimpan. Tetap unggah folder baru?');
            if (!proceed) {
                uploadFolderInputDesktop.value = '';
                return;
            }
        }

        await uploadFolderWrapper(files);
        uploadFolderInputDesktop.value = '';
    });
}

/**
 * Mengatur event handler untuk preview editor
 * @param {HTMLElement} previewEditor - Elemen preview editor
 * @param {HTMLElement} previewSave - Tombol save preview
 * @param {HTMLElement} previewStatus - Elemen status preview
 * @param {Object} state - State aplikasi
 * @param {Function} updatePreviewStatus - Fungsi update preview status
 * @param {Function} updateLineNumbers - Fungsi update line numbers
 * @param {Function} ensureConsistentStyling - Fungsi ensure consistent styling
 * @param {Function} syncLineNumbersScroll - Fungsi sync line numbers scroll
 * @param {Function} savePreviewContent - Fungsi save preview content
 */
export function setupPreviewEditorHandler(
    previewEditor,
    previewSave,
    previewStatus,
    state,
    updatePreviewStatus,
    updateLineNumbers,
    ensureConsistentStyling,
    syncLineNumbersScroll,
    savePreviewContent
) {
    // Setup save button click handler
    previewSave.addEventListener('click', () => {
        if (!previewSave.disabled && !state.preview.isSaving) {
            savePreviewContent();
        }
    });
    
    previewEditor.addEventListener('input', () => {
        if (!state.preview.isOpen) {
            return;
        }

        const isDirty = previewEditor.value !== state.preview.originalContent;
        state.preview.dirty = isDirty;

        if (!state.preview.isSaving) {
            previewEditor.readOnly = false;
        }

        previewSave.disabled = !isDirty;
        
        // Update save button text and style
        if (isDirty) {
            previewSave.textContent = 'Simpan *';
            previewSave.classList.add('dirty');
        } else {
            previewSave.textContent = 'Simpan';
            previewSave.classList.remove('dirty');
        }
        
        updatePreviewStatus();
        updateLineNumbers();
        
        // Ensure consistent styling after content changes
        setTimeout(() => ensureConsistentStyling(), 0);
        
        syncLineNumbersScroll();
        
        // Update window title to indicate unsaved changes
        const originalTitle = document.title.replace(/^\* /, '');
        document.title = isDirty ? `* ${originalTitle}` : originalTitle;
    });

    previewEditor.addEventListener('scroll', () => {
        syncLineNumbersScroll();
        
        // Debug scroll alignment every 10 scroll events
        if (!window.scrollDebugCounter) window.scrollDebugCounter = 0;
        if (++window.scrollDebugCounter % 10 === 0) {
            // debugElementStyles();
        }
    });

    previewEditor.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + S for save
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            if (!previewSave.disabled) {
                savePreviewContent();
            }
            return;
        }

        // Ctrl/Cmd + Enter for save and close
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (!previewSave.disabled) {
                savePreviewContent().then(() => {
                    // Close after successful save
                    const closeBtn = document.getElementById('preview-close');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                });
            }
            return;
        }

        // Escape to close (if no unsaved changes)
        if (event.key === 'Escape') {
            const hasUnsaved = previewEditor.value !== state.preview.originalContent;
            if (!hasUnsaved) {
                const closeBtn = document.getElementById('preview-close');
                if (closeBtn) {
                    closeBtn.click();
                }
            } else {
                // Show unsaved changes dialog
                event.preventDefault();
            }
            return;
        }

        // Ctrl/Cmd + F for find
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            // Implement find functionality
            const searchTerm = prompt('Cari teks:');
            if (searchTerm) {
                const content = previewEditor.value;
                const index = content.indexOf(searchTerm);
                if (index !== -1) {
                    previewEditor.focus();
                    previewEditor.setSelectionRange(index, index + searchTerm.length);
                } else {
                    alert('Teks tidak ditemukan');
                }
            }
            return;
        }

        // Tab key handling for proper indentation
        if (event.key === 'Tab') {
            event.preventDefault();
            const start = previewEditor.selectionStart;
            const end = previewEditor.selectionEnd;
            const value = previewEditor.value;
            
            // Insert 4 spaces for tab
            const spaces = '    ';
            previewEditor.value = value.substring(0, start) + spaces + value.substring(end);
            
            // Restore cursor position
            previewEditor.selectionStart = previewEditor.selectionEnd = start + spaces.length;
            
            // Trigger input event to update line numbers
            previewEditor.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
    });

    // MOBILE: Monitor scroll position continuously to keep line numbers stable
    // This ensures line numbers stay synchronized even when keyboard appears
    const isMobile = navigator.maxTouchPoints > 0 || /mobile/i.test(navigator.userAgent);
    if (isMobile) {
        let scrollMonitorInterval = null;
        let isKeyboardVisible = false;
        
        previewEditor.addEventListener('focusin', () => {
            if (!isKeyboardVisible) {
                isKeyboardVisible = true;
                console.log('[PREVIEW] Mobile: Focus detected, keyboard likely visible');
                // Start aggressive monitoring while keyboard is visible
                scrollMonitorInterval = setInterval(() => {
                    syncLineNumbersScroll();
                }, 16); // ~60fps for smoother monitoring
            }
        });

        previewEditor.addEventListener('focusout', () => {
            console.log('[PREVIEW] Mobile: Blur detected, stopping scroll monitor');
            if (scrollMonitorInterval) {
                clearInterval(scrollMonitorInterval);
                scrollMonitorInterval = null;
            }
            isKeyboardVisible = false;
            // Final sync
            syncLineNumbersScroll();
        });

        // Also monitor on input event (typing)
        previewEditor.addEventListener('input', () => {
            syncLineNumbersScroll();
        });

        // Monitor resize events for keyboard appearing/disappearing
        previewEditor.addEventListener('resize', () => {
            console.log('[PREVIEW] Mobile: Resize detected, syncing line numbers');
            syncLineNumbersScroll();
        });

        // Observe visibility and size changes on the editor wrapper
        const previewEditorWrapper = previewEditor.parentElement;
        if (previewEditorWrapper && 'ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(() => {
                if (isKeyboardVisible) {
                    syncLineNumbersScroll();
                }
            });
            resizeObserver.observe(previewEditorWrapper);
        }
    }
}

/**
 * Mengatur event handler untuk preview overlay
 * @param {HTMLElement} previewOverlay - Elemen preview overlay
 * @param {HTMLElement} previewClose - Tombol close preview
 * @param {Function} closePreviewOverlay - Fungsi tutup preview overlay
 */
export function setupPreviewOverlayHandler(previewOverlay, previewClose, closePreviewOverlay) {
    previewClose.addEventListener('click', () => {
        closePreviewOverlay().catch(() => {});
    });

    previewOverlay.addEventListener('click', (event) => {
        if (event.target === previewOverlay) {
            closePreviewOverlay().catch(() => {});
        }
    });
}

/**
 * Mengatur event handler untuk confirm overlay
 * @param {HTMLElement} confirmOverlay - Elemen confirm overlay
 * @param {HTMLElement} confirmCancel - Tombol cancel confirm
 * @param {HTMLElement} confirmConfirm - Tombol confirm
 * @param {Object} state - State aplikasi
 * @param {Function} closeConfirmOverlay - Fungsi tutup confirm overlay
 * @param {Function} deleteItems - Fungsi delete items
 */
export function setupConfirmOverlayHandler(
    confirmOverlay,
    confirmCancel,
    confirmConfirm,
    state,
    closeConfirmOverlay,
    deleteItemsWrapper
) {
    confirmCancel.addEventListener('click', () => {
        if (state.isDeleting) {
            return;
        }
        closeConfirmOverlay();
    });

    confirmConfirm.addEventListener('click', () => {
        if (state.isDeleting) {
            return;
        }
        const { paths } = state.confirm;
        deleteItemsWrapper(paths);
    });

    confirmOverlay.addEventListener('click', (event) => {
        if (event.target === confirmOverlay && !state.isDeleting) {
            closeConfirmOverlay();
        }
    });
}

/**
 * Mengatur event handler untuk create overlay
 * @param {HTMLElement} createOverlay - Elemen create overlay
 * @param {HTMLElement} createForm - Form create
 * @param {HTMLElement} createName - Input nama create
 * @param {HTMLElement} createHint - Elemen hint create
 * @param {HTMLElement} createCancel - Tombol cancel create
 * @param {HTMLElement} createSubmit - Tombol submit create
 * @param {Object} state - State aplikasi
 * @param {Function} closeCreateOverlay - Fungsi tutup create overlay
 * @param {Function} createItem - Fungsi create item
 */
export function setupCreateOverlayHandler(
    createOverlay,
    createForm,
    createName,
    createHint,
    createCancel,
    createSubmit,
    state,
    closeCreateOverlay,
    createItemWrapper
) {
    createName.addEventListener('input', () => {
        if (createHint.classList.contains('error')) {
            createHint.classList.remove('error');
            createHint.textContent = state.create.kind === 'folder'
                ? 'Gunakan huruf, angka, titik, atau garis bawah.'
                : 'Sertakan ekstensi file jika diperlukan.';
        }
    });

    createForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (state.isLoading) {
            return;
        }
        createItemWrapper(state.create.kind, createName.value);
    });

    // Handler untuk tombol submit di modal add item
    createSubmit.addEventListener('click', () => {
        if (state.isLoading) {
            return;
        }
        // Baca nilai dari radio button yang dipilih
        const createTypeRadio = document.querySelector('input[name="create-type"]:checked');
        const kind = createTypeRadio ? createTypeRadio.value : 'folder';
        const name = createName.value;
        
        // Update state dan panggil create wrapper
        state.create.kind = kind;
        createItemWrapper(kind, name);
    });

    // Handler untuk Enter key di input create-name
    createName.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (state.isLoading) {
                return;
            }
            // Baca nilai dari radio button yang dipilih
            const createTypeRadio = document.querySelector('input[name="create-type"]:checked');
            const kind = createTypeRadio ? createTypeRadio.value : 'folder';
            const name = createName.value;
            
            // Update state dan panggil create wrapper
            state.create.kind = kind;
            createItemWrapper(kind, name);
        }
    });

    createCancel.addEventListener('click', () => {
        if (state.isLoading) {
            return;
        }
        closeCreateOverlay();
    });

    createOverlay.addEventListener('click', (event) => {
        if (event.target === createOverlay && !state.isLoading) {
            closeCreateOverlay();
        }
    });
}

/**
 * Mengatur event handler untuk rename overlay
 * @param {HTMLElement} renameOverlay - Elemen rename overlay
 * @param {HTMLElement} renameForm - Form rename
 * @param {HTMLElement} renameName - Input nama rename
 * @param {HTMLElement} renameHint - Elemen hint rename
 * @param {HTMLElement} renameCancel - Tombol cancel rename
 * @param {HTMLElement} renameSubmit - Tombol submit rename
 * @param {Object} state - State aplikasi
 * @param {Function} closeRenameOverlay - Fungsi tutup rename overlay
 * @param {Function} renameItem - Fungsi rename item
 */
export function setupRenameOverlayHandler(
    renameOverlay,
    renameForm,
    renameName,
    renameHint,
    renameCancel,
    renameSubmit,
    state,
    closeRenameOverlay,
    renameItemWrapper
) {
    renameName.addEventListener('input', () => {
        if (renameHint.classList.contains('error')) {
            renameHint.classList.remove('error');
            renameHint.textContent = state.rename.targetItem && state.rename.targetItem.type === 'folder'
                ? 'Gunakan huruf, angka, titik, atau garis bawah.'
                : 'Sertakan ekstensi file jika diperlukan.';
        }
    });

    renameForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (state.isLoading) {
            return;
        }
        renameItemWrapper();
    });

    renameCancel.addEventListener('click', () => {
        if (state.isLoading) {
            return;
        }
        closeRenameOverlay();
    });

    renameOverlay.addEventListener('click', (event) => {
        if (event.target === renameOverlay && !state.isLoading) {
            closeRenameOverlay();
        }
    });
}

/**
 * Mengatur event handler untuk unsaved overlay
 * @param {HTMLElement} unsavedOverlay - Elemen unsaved overlay
 * @param {HTMLElement} unsavedSave - Tombol save unsaved
 * @param {HTMLElement} unsavedDiscard - Tombol discard unsaved
 * @param {HTMLElement} unsavedCancel - Tombol cancel unsaved
 * @param {Object} state - State aplikasi
 * @param {Function} closeUnsavedOverlay - Fungsi tutup unsaved overlay
 */
export function setupUnsavedOverlayHandler(
    unsavedOverlay,
    unsavedSave,
    unsavedDiscard,
    unsavedCancel,
    state,
    closeUnsavedOverlay
) {
    unsavedSave.addEventListener('click', async (event) => {
        event.stopPropagation();
        console.log('[DEBUG] unsavedSave clicked');
        console.log('[DEBUG] state.unsaved.callback:', state.unsaved.callback);
        console.log('[DEBUG] onSave exists:', !!(state.unsaved.callback && state.unsaved.callback.onSave));
        
        if (state.unsaved.callback && state.unsaved.callback.onSave) {
            console.log('[DEBUG] Calling onSave callback');
            // Don't close overlay yet, let the callback handle it
            await state.unsaved.callback.onSave();
        } else {
            console.log('[DEBUG] No onSave callback found, closing overlay');
            closeUnsavedOverlay();
        }
    });

    unsavedDiscard.addEventListener('click', async (event) => {
        event.stopPropagation();
        console.log('[DEBUG] unsavedDiscard clicked');
        console.log('[DEBUG] state.unsaved.callback:', state.unsaved.callback);
        console.log('[DEBUG] onDiscard exists:', !!(state.unsaved.callback && state.unsaved.callback.onDiscard));
        
        if (state.unsaved.callback && state.unsaved.callback.onDiscard) {
            console.log('[DEBUG] Calling onDiscard callback');
            await state.unsaved.callback.onDiscard();
        } else {
            console.log('[DEBUG] No onDiscard callback found, closing overlay');
            closeUnsavedOverlay();
        }
    });

    unsavedCancel.addEventListener('click', async (event) => {
        event.stopPropagation();
        console.log('[DEBUG] unsavedCancel clicked');
        console.log('[DEBUG] state.unsaved.callback:', state.unsaved.callback);
        console.log('[DEBUG] onCancel exists:', !!(state.unsaved.callback && state.unsaved.callback.onCancel));
        
        if (state.unsaved.callback && state.unsaved.callback.onCancel) {
            console.log('[DEBUG] Calling onCancel callback');
            await state.unsaved.callback.onCancel();
        } else {
            console.log('[DEBUG] No onCancel callback found, closing overlay');
            closeUnsavedOverlay();
        }
    });

    unsavedOverlay.addEventListener('click', async (event) => {
        console.log('[DEBUG] unsavedOverlay clicked, target:', event.target);
        if (event.target === unsavedOverlay) {
            console.log('[DEBUG] Click on overlay background, triggering cancel');
            if (state.unsaved.callback && state.unsaved.callback.onCancel) {
                await state.unsaved.callback.onCancel();
            } else {
                closeUnsavedOverlay();
            }
        }
    });
}

/**
 * Mengatur event handler untuk keyboard navigation
 * @param {Object} state - State aplikasi
 * @param {Function} closeUnsavedOverlay - Fungsi tutup unsaved overlay
 * @param {Function} closeConfirmOverlay - Fungsi tutup confirm overlay
 * @param {Function} closeCreateOverlay - Fungsi tutup create overlay
 * @param {Function} closeRenameOverlay - Fungsi tutup rename overlay
 * @param {Function} closePreviewOverlay - Fungsi tutup preview overlay
 * @param {Function} hasUnsavedChanges - Fungsi cek perubahan belum disimpan
 */
export function setupKeyboardHandler(
    state,
    closeUnsavedOverlay,
    closeConfirmOverlay,
    closeCreateOverlay,
    closeRenameOverlay,
    closePreviewOverlay,
    hasUnsavedChanges
) {
    document.addEventListener('keydown', async (event) => {
        if (event.key === 'Escape') {
            if (state.unsaved.isOpen) {
                event.preventDefault();
                if (state.unsaved.callback && state.unsaved.callback.onCancel) {
                    await state.unsaved.callback.onCancel();
                } else {
                    closeUnsavedOverlay();
                }
                return;
            }

            if (state.confirm.isOpen && !state.isDeleting) {
                event.preventDefault();
                closeConfirmOverlay();
                return;
            }

            if (state.create.isOpen && !state.isLoading) {
                event.preventDefault();
                closeCreateOverlay();
                return;
            }

            if (state.rename.isOpen && !state.isLoading) {
                event.preventDefault();
                closeRenameOverlay();
                return;
            }

            if (state.preview.isOpen) {
                event.preventDefault();
                closePreviewOverlay().catch(() => {});
            }
        }
    });

    // Handle beforeunload event
    window.addEventListener('beforeunload', (event) => {
        if (hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
}

/**
 * Mengatur event handler untuk split action
 * @param {HTMLElement} splitAction - Elemen split action
 * @param {HTMLElement} splitToggle - Elemen split toggle
 * @param {HTMLElement} splitMenu - Elemen split menu
 * @param {NodeList} splitOptions - Daftar opsi split
 * @param {HTMLElement} splitMain - Elemen split main
 * @param {Function} openCreateOverlay - Fungsi buka create overlay
 */
export function setupSplitActionHandler(
    splitAction,
    splitToggle,
    splitMenu,
    splitOptions,
    splitMain,
    openCreateOverlay
) {
    const closeMenu = () => {
        splitToggle.setAttribute('aria-expanded', 'false');
        splitMenu.setAttribute('aria-hidden', 'true');
    };

    splitToggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSplitMenu();
        if (splitMenu.getAttribute('aria-hidden') === 'false') {
            splitMenu.querySelector('button')?.focus();
        }
    });

    document.addEventListener('click', (event) => {
        if (splitMenu && splitAction && !splitAction.contains(event.target)) {
            closeMenu();
        }
    });

    splitOptions.forEach((option) => {
        option.addEventListener('click', (event) => {
            const button = event.currentTarget;
            const action = button.dataset.action;
            if (!action) {
                closeMenu();
                return;
            }

            if (action === 'add-modal') {
                openCreateOverlay();
            }

            closeMenu();
        });
    });

    splitMenu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMenu();
            splitToggle.focus();
        }
    });

    if (splitMain) {
        splitMain.addEventListener('click', () => {
            openCreateOverlay();
        });
    }

    if (splitAction) {
        splitAction.addEventListener('keydown', (event) => {
            if ((event.key === 'Enter' || event.key === ' ') && splitMain && event.target === splitMain) {
                event.preventDefault();
                openCreateOverlay();
            }
            if (event.key === 'ArrowDown' && splitToggle) {
                event.preventDefault();
                toggleSplitMenu();
                if (splitMenu && splitMenu.getAttribute('aria-hidden') === 'false') {
                    splitMenu.querySelector('button')?.focus();
                }
            }
            if (event.key === 'Escape' && splitMenu && splitMenu.getAttribute('aria-hidden') === 'false') {
                closeMenu();
                splitToggle.focus();
            }
        });
    }

    function toggleSplitMenu() {
        const expanded = splitToggle.getAttribute('aria-expanded') === 'true';
        splitToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        splitMenu.setAttribute('aria-hidden', expanded ? 'true' : 'false');
    }
}

/**
 * Mengatur event handler untuk log export dropdown
 * @param {HTMLElement} exportToggle - Tombol toggle export
 * @param {HTMLElement} exportMenu - Menu export
 * @param {HTMLElement} exportCsv - Tombol export CSV
 * @param {HTMLElement} exportJson - Tombol export JSON
 * @param {Function} handleExportCsv - Fungsi handle export CSV
 * @param {Function} handleExportJson - Fungsi handle export JSON
 */
export function setupLogExportHandler(
    exportToggle,
    exportMenu,
    exportCsv,
    exportJson,
    handleExportCsv,
    handleExportJson
) {
    if (!exportToggle || !exportMenu) {
        return;
    }

    const closeMenu = () => {
        exportToggle.setAttribute('aria-expanded', 'false');
        exportMenu.setAttribute('aria-hidden', 'true');
        exportMenu.hidden = true;
    };

    const openMenu = () => {
        exportToggle.setAttribute('aria-expanded', 'true');
        exportMenu.setAttribute('aria-hidden', 'false');
        exportMenu.hidden = false;
    };

    const toggleMenu = () => {
        const isOpen = exportMenu.getAttribute('aria-hidden') === 'false';
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    };

    // Toggle dropdown on button click
    exportToggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleMenu();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (exportMenu.getAttribute('aria-hidden') === 'false' &&
            !exportToggle.contains(event.target) &&
            !exportMenu.contains(event.target)) {
            closeMenu();
        }
    });

    // Handle CSV export
    if (exportCsv) {
        exportCsv.addEventListener('click', (event) => {
            event.preventDefault();
            handleExportCsv();
            closeMenu();
        });
    }

    // Handle JSON export
    if (exportJson) {
        exportJson.addEventListener('click', (event) => {
            event.preventDefault();
            handleExportJson();
            closeMenu();
        });
    }

    // Close dropdown on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && exportMenu.getAttribute('aria-hidden') === 'false') {
            closeMenu();
            exportToggle.focus();
        }
    });
}

/**
 * Mengatur event handler untuk mobile search modal
 * @param {HTMLElement} btnSearchMobile - Tombol search mobile
 * @param {HTMLElement} searchModal - Modal search
 * @param {HTMLElement} searchModalInput - Input search di modal
 * @param {HTMLElement} searchClose - Tombol close modal
 * @param {HTMLElement} searchClear - Tombol clear input
 * @param {HTMLElement} searchApply - Tombol apply search
 * @param {HTMLElement} filterInput - Input filter yang sebenarnya
 */
export function setupSearchModalHandler(
    btnSearchMobile,
    searchModal,
    searchModalInput,
    searchClose,
    searchClear,
    searchApply,
    filterInput
) {
    if (!btnSearchMobile || !searchModal || !searchModalInput) {
        return;
    }

    // Open modal
    btnSearchMobile.addEventListener('click', () => {
        searchModal.classList.remove('hidden');
        searchModal.setAttribute('aria-hidden', 'false');
        searchModalInput.value = filterInput.value;
        searchModalInput.focus();
    });

    // Close modal
    const closeModal = () => {
        searchModal.classList.add('hidden');
        searchModal.setAttribute('aria-hidden', 'true');
    };

    searchClose.addEventListener('click', closeModal);
    
    // Close on backdrop click
    searchModal.addEventListener('click', (event) => {
        if (event.target === searchModal) {
            closeModal();
        }
    });

    // Clear input
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchModalInput.value = '';
            searchModalInput.focus();
        });
    }

    // Apply search
    if (searchApply) {
        searchApply.addEventListener('click', () => {
            filterInput.value = searchModalInput.value;
            filterInput.dispatchEvent(new Event('input', { bubbles: true }));
            closeModal();
        });
    }

    // Allow Enter key to apply
    searchModalInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            filterInput.value = searchModalInput.value;
            filterInput.dispatchEvent(new Event('input', { bubbles: true }));
            closeModal();
        }
    });

    // Allow Escape to close
    searchModalInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal();
        }
    });
}
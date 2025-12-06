/**
 * File Handlers Module
 * Handles file-related event handlers for the File Manager application
 */

/**
 * Sets up the refresh button handler
 * @param {HTMLElement} btnRefresh - Refresh button element
 * @param {Object} state - Application state
 * @param {Function} hasUnsavedChanges - Check unsaved changes function
 * @param {Function} confirmDiscardChanges - Confirm discard changes function
 * @param {Function} fetchDirectory - Fetch directory function
 */
export function setupRefreshHandler(
    btnRefresh,
    state,
    hasUnsavedChanges,
    confirmDiscardChanges,
    fetchDirectory
) {
    if (!btnRefresh) return;
    
    btnRefresh.addEventListener('click', () => {
        if (hasUnsavedChanges()) {
            confirmDiscardChanges('Perubahan belum disimpan. Muat ulang daftar dan buang perubahan?')
                .then((confirmed) => {
                    if (!confirmed) return;
                    fetchDirectory(state.currentPath);
                });
            return;
        }

        fetchDirectory(state.currentPath);
    });
}

/**
 * Sets up the up button handler for parent directory navigation
 * @param {HTMLElement} btnUp - Up button element
 * @param {Object} state - Application state
 * @param {Function} navigateTo - Navigation function
 */
export function setupUpHandler(btnUp, state, navigateTo) {
    if (!btnUp) return;
    
    btnUp.addEventListener('click', () => {
        const parent = btnUp.dataset.parentPath || '';
        if (parent !== state.currentPath) {
            navigateTo(parent);
        }
    });
}

/**
 * Sets up the select all checkbox handler
 * @param {HTMLElement} selectAllCheckbox - Select all checkbox element
 * @param {Object} state - Application state
 * @param {Function} setSelectionForVisible - Function to set selection for visible items
 */
export function setupSelectAllHandler(selectAllCheckbox, state, setSelectionForVisible) {
    if (!selectAllCheckbox) return;
    
    selectAllCheckbox.addEventListener('change', (event) => {
        if (state.isLoading || state.isDeleting) {
            event.preventDefault();
            return;
        }
        setSelectionForVisible(event.target.checked);
    });
}

/**
 * Sets up the delete selected button handler
 * @param {HTMLElement} btnDeleteSelected - Delete selected button
 * @param {Object} state - Application state
 * @param {Function} hasUnsavedChanges - Check unsaved changes function
 * @param {Function} confirmDiscardChanges - Confirm discard function
 * @param {Function} openConfirmOverlay - Open confirm overlay function
 */
export function setupDeleteSelectedHandler(
    btnDeleteSelected,
    state,
    hasUnsavedChanges,
    confirmDiscardChanges,
    openConfirmOverlay
) {
    if (!btnDeleteSelected) return;
    
    btnDeleteSelected.addEventListener('click', () => {
        if (state.isLoading || state.isDeleting || state.selected.size === 0) {
            return;
        }

        const paths = Array.from(state.selected);
        const labels = paths.map((path) => {
            const item = state.itemMap.get(path);
            return item ? item.name : path;
        });

        if (hasUnsavedChanges()) {
            confirmDiscardChanges('Perubahan belum disimpan. Tetap hapus item terpilih?')
                .then((proceed) => {
                    if (!proceed) return;
                    
                    const paths = Array.from(state.selected);
                    const labels = paths.map((path) => {
                        const item = state.itemMap.get(path);
                        return item ? item.name : path;
                    });
                    const message = paths.length === 1
                        ? `Hapus "${labels[0]}"?`
                        : `Hapus ${paths.length.toLocaleString('id-ID')} item terpilih?`;
                    const description = 'Item yang dihapus tidak dapat dikembalikan.';
                    
                    openConfirmOverlay({
                        message,
                        description,
                        paths,
                        showList: paths.length > 1,
                        confirmLabel: 'Hapus',
                    });
                });
            return;
        }

        const message = paths.length === 1
            ? `Hapus "${labels[0]}"?`
            : `Hapus ${paths.length.toLocaleString('id-ID')} item terpilih?`;

        const description = 'Item yang dihapus tidak dapat dikembalikan.';

        openConfirmOverlay({
            message,
            description,
            paths,
            showList: paths.length > 1,
            confirmLabel: 'Hapus',
        });
    });
}

/**
 * Sets up the delete selected button handler for desktop
 * @param {HTMLElement} btnDeleteSelectedDesktop - Delete selected button (desktop)
 * @param {Object} state - Application state
 * @param {Function} hasUnsavedChanges - Check unsaved changes function
 * @param {Function} confirmDiscardChanges - Confirm discard function
 * @param {Function} openConfirmOverlay - Open confirm overlay function
 */
export function setupDeleteSelectedDesktopHandler(
    btnDeleteSelectedDesktop,
    state,
    hasUnsavedChanges,
    confirmDiscardChanges,
    openConfirmOverlay
) {
    if (!btnDeleteSelectedDesktop) return;
    
    btnDeleteSelectedDesktop.addEventListener('click', () => {
        if (state.isLoading || state.isDeleting || state.selected.size === 0) {
            return;
        }

        const paths = Array.from(state.selected);
        const labels = paths.map((path) => {
            const item = state.itemMap.get(path);
            return item ? item.name : path;
        });

        if (hasUnsavedChanges()) {
            confirmDiscardChanges('Perubahan belum disimpan. Tetap hapus item terpilih?')
                .then((proceed) => {
                    if (!proceed) return;
                    
                    const paths = Array.from(state.selected);
                    const labels = paths.map((path) => {
                        const item = state.itemMap.get(path);
                        return item ? item.name : path;
                    });
                    const message = paths.length === 1
                        ? `Hapus "${labels[0]}"?`
                        : `Hapus ${paths.length.toLocaleString('id-ID')} item terpilih?`;
                    const description = 'Item yang dihapus tidak dapat dikembalikan.';
                    
                    openConfirmOverlay({
                        message,
                        description,
                        paths,
                        showList: paths.length > 1,
                        confirmLabel: 'Hapus',
                    });
                });
            return;
        }

        const message = paths.length === 1
            ? `Hapus "${labels[0]}"?`
            : `Hapus ${paths.length.toLocaleString('id-ID')} item terpilih?`;

        const description = 'Item yang dihapus tidak dapat dikembalikan.';

        openConfirmOverlay({
            message,
            description,
            paths,
            showList: paths.length > 1,
            confirmLabel: 'Hapus',
        });
    });
}

/**
 * Sets up the visibility change handler for auto-refresh
 * @param {Object} state - Application state
 * @param {Function} fetchDirectory - Fetch directory function
 * @param {Function} startPolling - Start polling function
 */
export function setupVisibilityHandler(state, fetchDirectory, startPolling) {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(state.polling);
            state.polling = null;
        } else {
            fetchDirectory(state.currentPath).then(startPolling);
        }
    });
}

/**
 * Sets up the context menu handler
 * @param {NodeList} contextMenuItems - Context menu item elements
 * @param {HTMLElement} contextMenu - Context menu element
 * @param {Object} state - Application state
 * @param {Function} handleContextMenuAction - Context menu action handler
 * @param {Function} closeContextMenu - Close context menu function
 */
export function setupContextMenuHandler(
    contextMenuItems,
    contextMenu,
    state,
    handleContextMenuAction,
    closeContextMenu
) {
    if (!contextMenuItems || !contextMenu) return;
    
    console.log('[DEBUG] Setting up context menu event listeners for', contextMenuItems.length, 'items');
    
    contextMenuItems.forEach((item, index) => {
        console.log('[DEBUG] Setting up listener for context menu item', index, 'with action:', item.dataset.action);
        item.addEventListener('click', (event) => {
            const action = event.currentTarget.dataset.action;
            console.log('[DEBUG] Context menu item clicked with action:', action);
            handleContextMenuAction(action);
        });
    });

    document.addEventListener('click', (event) => {
        if (state.contextMenu.isOpen && !contextMenu.contains(event.target)) {
            closeContextMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (state.contextMenu.isOpen) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeContextMenu();
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                const focusedItem = document.activeElement;
                const currentIndex = Array.from(contextMenuItems).indexOf(focusedItem);
                if (currentIndex < contextMenuItems.length - 1) {
                    contextMenuItems[currentIndex + 1].focus();
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                const focusedItem = document.activeElement;
                const currentIndex = Array.from(contextMenuItems).indexOf(focusedItem);
                if (currentIndex > 0) {
                    contextMenuItems[currentIndex - 1].focus();
                }
            }
        }
    });
}

/**
 * Sets up mobile select all button handler
 * @param {HTMLElement} btnSelectAllMobile - Select all mobile button
 * @param {HTMLElement} selectAllCheckboxMobile - Select all checkbox (mobile)
 * @param {Object} state - Application state
 * @param {Function} setSelectionForVisible - Set selection for visible function
 */
export function setupSelectAllMobileButtonHandler(
    btnSelectAllMobile,
    selectAllCheckboxMobile,
    state,
    setSelectionForVisible
) {
    if (!btnSelectAllMobile || !selectAllCheckboxMobile) {
        console.warn('[setupSelectAllMobileButtonHandler] Button or checkbox not found');
        return;
    }

    btnSelectAllMobile.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (state.isLoading || state.isDeleting) {
            console.warn('[setupSelectAllMobileButtonHandler] Loading or deleting - ignoring click');
            return;
        }
        
        console.log('[setupSelectAllMobileButtonHandler] Click detected, current checked state:', selectAllCheckboxMobile.checked);
        
        // Toggle select all
        const newState = !selectAllCheckboxMobile.checked;
        selectAllCheckboxMobile.checked = newState;
        
        console.log('[setupSelectAllMobileButtonHandler] New state:', newState);
        
        setSelectionForVisible(newState);
    });
}

/**
 * Sets up mobile actions floating context menu handler
 * @param {HTMLElement} mobileActionsMenu - Mobile actions menu element
 * @param {HTMLElement} mobileActionsViewBtn - View button
 * @param {HTMLElement} mobileActionsEditBtn - Edit button
 * @param {HTMLElement} mobileActionsMoveBtn - Move button
 * @param {HTMLElement} mobileActionsDeleteBtn - Delete button
 * @param {Object} state - Application state
 * @param {Function} openTextPreview - Open text preview function
 * @param {Function} openMediaPreview - Open media preview function
 * @param {Function} openRenameOverlayWrapper - Open rename overlay function
 * @param {Function} openConfirmOverlayWrapper - Open confirm overlay function
 * @param {Function} navigateTo - Navigation function
 * @param {Function} buildFileUrl - Build file URL function
 * @param {Set} previewableExtensions - Previewable extensions
 * @param {Set} mediaPreviewableExtensions - Media previewable extensions
 */
export function setupMobileActionsHandler(
    mobileActionsMenu,
    mobileActionsViewBtn,
    mobileActionsEditBtn,
    mobileActionsMoveBtn,
    mobileActionsDeleteBtn,
    state,
    openTextPreview,
    openMediaPreview,
    openRenameOverlayWrapper,
    openConfirmOverlayWrapper,
    navigateTo,
    buildFileUrl,
    previewableExtensions,
    mediaPreviewableExtensions
) {
    if (!mobileActionsMenu) {
        console.warn('[setupMobileActionsHandler] Context menu not found');
        return;
    }

    let currentActionItem = null;

    // Close menu function
    const closeMenu = () => {
        mobileActionsMenu.classList.add('hidden');
        mobileActionsMenu.setAttribute('aria-hidden', 'true');
        currentActionItem = null;
    };

    // Open menu function at specific position
    const openMenu = (item, x, y) => {
        currentActionItem = item;
        mobileActionsMenu.classList.remove('hidden');
        mobileActionsMenu.setAttribute('aria-hidden', 'false');
        
        // Position menu at click location, adjusted if near edge
        let left = x;
        let top = y;
        
        // Adjust if menu goes off screen
        const rect = mobileActionsMenu.getBoundingClientRect();
        const menuWidth = rect.width || 150;
        const menuHeight = rect.height || 120;
        
        if (left + menuWidth > window.innerWidth) {
            left = window.innerWidth - menuWidth - 10;
        }
        
        if (top + menuHeight > window.innerHeight) {
            top = window.innerHeight - menuHeight - 10;
        }
        
        mobileActionsMenu.style.left = left + 'px';
        mobileActionsMenu.style.top = top + 'px';
    };

    // View button handler
    if (mobileActionsViewBtn) {
        mobileActionsViewBtn.addEventListener('click', () => {
            if (!currentActionItem) return;
            
            const ext = currentActionItem.name.split('.').pop().toLowerCase();
            
            if (currentActionItem.type === 'folder') {
                navigateTo(currentActionItem.path);
                closeMenu();
            } else if (previewableExtensions.has(ext)) {
                openTextPreview(currentActionItem);
                closeMenu();
            } else if (mediaPreviewableExtensions.has(ext)) {
                openMediaPreview(currentActionItem);
                closeMenu();
            }
        });
    }

    // Edit button handler
    if (mobileActionsEditBtn) {
        mobileActionsEditBtn.addEventListener('click', () => {
            if (!currentActionItem) return;
            
            openRenameOverlayWrapper(currentActionItem);
            closeMenu();
        });
    }

    // Move button handler
    if (mobileActionsMoveBtn) {
        mobileActionsMoveBtn.addEventListener('click', async () => {
            if (!currentActionItem) return;
            
            try {
                const moveOverlayModule = await import('../moveOverlay.js');
                if (moveOverlayModule.openMoveOverlay) {
                    moveOverlayModule.openMoveOverlay([currentActionItem.path]);
                    closeMenu();
                }
            } catch (error) {
                console.error('Failed to load move overlay:', error);
                alert('Gagal memuat fitur pindah. Silakan coba lagi.');
            }
        });
    }

    // Delete button handler
    if (mobileActionsDeleteBtn) {
        mobileActionsDeleteBtn.addEventListener('click', () => {
            if (!currentActionItem) return;
            
            openConfirmOverlayWrapper({
                message: `Hapus "${currentActionItem.name}"?`,
                description: 'Item yang dihapus tidak dapat dikembalikan.',
                paths: [currentActionItem.path],
                showList: false,
                confirmLabel: 'Hapus',
            });
            closeMenu();
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!mobileActionsMenu.classList.contains('hidden') && 
            !mobileActionsMenu.contains(event.target)) {
            closeMenu();
        }
    });

    // ESC key handler
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !mobileActionsMenu.classList.contains('hidden')) {
            closeMenu();
        }
    });

    // Expose openMenu globally for item buttons
    window.mobileActionsOpenMenu = openMenu;
}
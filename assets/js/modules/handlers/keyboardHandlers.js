/**
 * Keyboard Handlers Module
 * Handles keyboard event handlers for the File Manager application
 */

/**
 * Sets up global keyboard event handlers
 * @param {Object} state - Application state
 * @param {Function} closePreviewOverlay - Close preview overlay function
 * @param {Function} closeMoveOverlay - Close move overlay function
 * @param {Function} closeDetailsOverlay - Close details overlay function
 * @param {Function} closeRenameOverlay - Close rename overlay function
 * @param {Function} closeDeleteOverlay - Close delete overlay function
 * @param {Function} closeDownloadOverlay - Close download overlay function
 * @param {Function} closeConfirmOverlay - Close confirm overlay function
 * @param {Function} closeCreateOverlay - Close create overlay function
 * @param {Function} closeSettingsOverlay - Close settings overlay function
 * @param {Function} closeAllOverlays - Close all overlays function
 * @param {Function} closeUnsavedOverlay - Close unsaved overlay function
 * @param {HTMLElement} searchInput - Search input element
 * @param {Function} handleSearchKey - Search key handler function
 */
export function setupKeyboardHandler(
    state,
    closePreviewOverlay,
    closeMoveOverlay,
    closeDetailsOverlay,
    closeRenameOverlay,
    closeDeleteOverlay,
    closeDownloadOverlay,
    closeConfirmOverlay,
    closeCreateOverlay,
    closeSettingsOverlay,
    closeAllOverlays,
    closeUnsavedOverlay,
    searchInput,
    handleSearchKey
) {
    document.addEventListener('keydown', (event) => {
        // Handle Escape key - close overlays
        if (event.key === 'Escape') {
            // Try to close overlays in order of priority
            if (state.overlays.preview) {
                closePreviewOverlay();
            } else if (state.overlays.move) {
                closeMoveOverlay();
            } else if (state.overlays.details) {
                closeDetailsOverlay();
            } else if (state.overlays.rename) {
                closeRenameOverlay();
            } else if (state.overlays.delete) {
                closeDeleteOverlay();
            } else if (state.overlays.download) {
                closeDownloadOverlay();
            } else if (state.overlays.confirm) {
                closeConfirmOverlay();
            } else if (state.overlays.create) {
                closeCreateOverlay();
            } else if (state.overlays.settings) {
                closeSettingsOverlay();
            } else if (state.overlays.unsaved) {
                closeUnsavedOverlay();
            }
            return;
        }

        // Handle search shortcut (Ctrl+F or Cmd+F)
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }

        // Handle search key (forward slash)
        if (event.key === '/' && handleSearchKey) {
            // Don't trigger if user is typing in an input
            if (document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                document.activeElement.isContentEditable) {
                return;
            }
            
            event.preventDefault();
            handleSearchKey();
            return;
        }

        // Handle keyboard navigation
        handleKeyboardNavigation(event, state);
    });
}

/**
 * Handles keyboard navigation for file list
 * @param {KeyboardEvent} event - Keyboard event
 * @param {Object} state - Application state
 */
export function handleKeyboardNavigation(event, state) {
    // Only handle when table is focused or no input is active
    if (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable) {
        return;
    }

    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr[data-path]');
    if (rows.length === 0) return;

    // Find currently focused or selected row
    let currentIndex = -1;
    const focusedRow = tableBody.querySelector('tr:focus');
    
    if (focusedRow) {
        currentIndex = Array.from(rows).indexOf(focusedRow);
    } else if (state.selected.size > 0) {
        // Find last selected item
        const lastSelected = Array.from(state.selected).pop();
        currentIndex = Array.from(rows).findIndex(row => row.dataset.path === lastSelected);
    }

    let newIndex = currentIndex;

    switch (event.key) {
        case 'ArrowDown':
        case 'j':
            event.preventDefault();
            newIndex = Math.min(currentIndex + 1, rows.length - 1);
            break;
            
        case 'ArrowUp':
        case 'k':
            event.preventDefault();
            newIndex = Math.max(currentIndex - 1, 0);
            break;
            
        case 'Home':
            event.preventDefault();
            newIndex = 0;
            break;
            
        case 'End':
            event.preventDefault();
            newIndex = rows.length - 1;
            break;
            
        case 'PageDown':
            event.preventDefault();
            newIndex = Math.min(currentIndex + 10, rows.length - 1);
            break;
            
        case 'PageUp':
            event.preventDefault();
            newIndex = Math.max(currentIndex - 10, 0);
            break;
            
        case 'Enter':
            event.preventDefault();
            if (currentIndex >= 0) {
                const row = rows[currentIndex];
                if (row) {
                    row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                }
            }
            return;
            
        case ' ':
            event.preventDefault();
            if (currentIndex >= 0) {
                const row = rows[currentIndex];
                if (row) {
                    const checkbox = row.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.click();
                    }
                }
            }
            return;
            
        default:
            return;
    }

    if (newIndex !== currentIndex && newIndex >= 0) {
        const newRow = rows[newIndex];
        if (newRow) {
            newRow.focus();
            newRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            
            // If shift is held, extend selection
            if (event.shiftKey && currentIndex >= 0) {
                const startIndex = Math.min(currentIndex, newIndex);
                const endIndex = Math.max(currentIndex, newIndex);
                
                for (let i = startIndex; i <= endIndex; i++) {
                    const path = rows[i].dataset.path;
                    if (path) {
                        state.selected.add(path);
                    }
                }
            }
        }
    }
}

/**
 * Sets up search input keyboard handlers
 * @param {HTMLElement} searchInput - Search input element
 * @param {Function} doSearch - Search function
 * @param {Function} clearSearch - Clear search function
 */
export function setupSearchKeyboardHandler(searchInput, doSearch, clearSearch) {
    if (!searchInput) return;
    
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            doSearch();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            clearSearch();
            searchInput.blur();
        }
    });
}

/**
 * Sets up copy/paste keyboard handlers
 * @param {Object} state - Application state
 * @param {Function} copySelectedItems - Copy function
 * @param {Function} pasteItems - Paste function
 * @param {Function} cutSelectedItems - Cut function
 */
export function setupCopyPasteHandler(state, copySelectedItems, pasteItems, cutSelectedItems) {
    document.addEventListener('keydown', (event) => {
        // Don't trigger if user is typing in an input
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable) {
            return;
        }

        // Handle Ctrl+C (copy)
        if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
            event.preventDefault();
            if (state.selected.size > 0 && copySelectedItems) {
                copySelectedItems();
            }
            return;
        }

        // Handle Ctrl+X (cut)
        if ((event.ctrlKey || event.metaKey) && event.key === 'x') {
            event.preventDefault();
            if (state.selected.size > 0 && cutSelectedItems) {
                cutSelectedItems();
            }
            return;
        }

        // Handle Ctrl+V (paste)
        if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
            event.preventDefault();
            if (pasteItems) {
                pasteItems();
            }
            return;
        }
    });
}

/**
 * Sets up select all keyboard handler
 * @param {Object} state - Application state
 * @param {Function} selectAll - Select all function
 */
export function setupSelectAllKeyboardHandler(state, selectAll) {
    document.addEventListener('keydown', (event) => {
        // Don't trigger if user is typing in an input
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable) {
            return;
        }

        // Handle Ctrl+A (select all)
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();
            if (selectAll) {
                selectAll();
            }
        }
    });
}

/**
 * Sets up delete keyboard handler
 * @param {Object} state - Application state
 * @param {Function} deleteSelectedItems - Delete function
 */
export function setupDeleteKeyboardHandler(state, deleteSelectedItems) {
    document.addEventListener('keydown', (event) => {
        // Don't trigger if user is typing in an input
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable) {
            return;
        }

        // Handle Delete key
        if (event.key === 'Delete') {
            event.preventDefault();
            if (state.selected.size > 0 && deleteSelectedItems) {
                deleteSelectedItems();
            }
        }
    });
}

/**
 * Sets up rename keyboard handler (F2)
 * @param {Object} state - Application state
 * @param {Function} renameSelectedItem - Rename function
 */
export function setupRenameKeyboardHandler(state, renameSelectedItem) {
    document.addEventListener('keydown', (event) => {
        // Don't trigger if user is typing in an input
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable) {
            return;
        }

        // Handle F2 (rename)
        if (event.key === 'F2') {
            event.preventDefault();
            if (state.selected.size === 1 && renameSelectedItem) {
                renameSelectedItem();
            }
        }
    });
}

/**
 * Sets up new file/folder keyboard handler
 * @param {Function} createNewFile - Create new file function
 * @param {Function} createNewFolder - Create new folder function
 */
export function setupNewItemKeyboardHandler(createNewFile, createNewFolder) {
    document.addEventListener('keydown', (event) => {
        // Don't trigger if user is typing in an input
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable) {
            return;
        }

        // Handle Ctrl+Shift+N (new folder)
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
            event.preventDefault();
            if (createNewFolder) {
                createNewFolder();
            }
            return;
        }

        // Handle Ctrl+N (new file)
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            if (createNewFile) {
                createNewFile();
            }
        }
    });
}

/**
 * Sets up refresh keyboard handler
 * @param {Function} refresh - Refresh function
 */
export function setupRefreshKeyboardHandler(refresh) {
    document.addEventListener('keydown', (event) => {
        // Handle F5 or Ctrl+R (refresh)
        if (event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key === 'r')) {
            event.preventDefault();
            if (refresh) {
                refresh();
            }
        }
    });
}

/**
 * Sets up back navigation keyboard handler
 * @param {Function} goBack - Go back function
 * @param {Function} goUp - Go up function
 */
export function setupBackNavigationHandler(goBack, goUp) {
    document.addEventListener('keydown', (event) => {
        // Don't trigger if user is typing in an input
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable) {
            return;
        }

        // Handle Backspace (go up)
        if (event.key === 'Backspace') {
            event.preventDefault();
            if (goUp) {
                goUp();
            }
            return;
        }

        // Handle Alt+Left (go back)
        if (event.altKey && event.key === 'ArrowLeft') {
            event.preventDefault();
            if (goBack) {
                goBack();
            }
        }
    });
}
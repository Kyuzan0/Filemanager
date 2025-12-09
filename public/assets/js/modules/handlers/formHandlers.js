/**
 * Form Handlers Module
 * Handles form-related event handlers for the File Manager application
 */

/**
 * Sets up the create file/folder form handler
 * @param {HTMLElement} createForm - Create form element
 * @param {HTMLElement} createTypeInput - Hidden input for type
 * @param {HTMLElement} createNameInput - Name input element
 * @param {Function} closeCreateOverlay - Close create overlay function
 * @param {Function} createItem - Create item function
 * @param {Function} showToast - Show toast function
 */
export function setupCreateFormHandler(
    createForm,
    createTypeInput,
    createNameInput,
    closeCreateOverlay,
    createItem,
    showToast
) {
    if (!createForm) return;

    createForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const type = createTypeInput?.value || 'file';
        const name = createNameInput?.value?.trim();

        if (!name) {
            showToast?.('Nama tidak boleh kosong', 'error');
            return;
        }

        // Validate name (no special characters)
        if (!isValidFileName(name)) {
            showToast?.('Nama mengandung karakter yang tidak valid', 'error');
            return;
        }

        try {
            await createItem(type, name);
            closeCreateOverlay?.();
            createForm.reset();
        } catch (error) {
            console.error('[FormHandlers] Create error:', error);
            showToast?.(error.message || 'Gagal membuat item', 'error');
        }
    });
}

/**
 * Sets up the rename form handler
 * @param {HTMLElement} renameForm - Rename form element
 * @param {HTMLElement} renameInput - Rename input element
 * @param {HTMLElement} renamePathInput - Hidden path input
 * @param {Function} closeRenameOverlay - Close rename overlay function
 * @param {Function} renameItem - Rename item function
 * @param {Function} showToast - Show toast function
 */
export function setupRenameFormHandler(
    renameForm,
    renameInput,
    renamePathInput,
    closeRenameOverlay,
    renameItem,
    showToast
) {
    if (!renameForm) return;

    renameForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const path = renamePathInput?.value;
        const newName = renameInput?.value?.trim();

        if (!path) {
            console.error('[FormHandlers] No path specified for rename');
            return;
        }

        if (!newName) {
            showToast?.('Nama tidak boleh kosong', 'error');
            return;
        }

        // Validate name
        if (!isValidFileName(newName)) {
            showToast?.('Nama mengandung karakter yang tidak valid', 'error');
            return;
        }

        try {
            await renameItem(path, newName);
            closeRenameOverlay?.();
            renameForm.reset();
        } catch (error) {
            console.error('[FormHandlers] Rename error:', error);
            showToast?.(error.message || 'Gagal mengubah nama', 'error');
        }
    });
}

/**
 * Sets up the upload form handler
 * @param {HTMLElement} uploadForm - Upload form element
 * @param {HTMLElement} uploadInput - File input element
 * @param {Function} closeUploadOverlay - Close upload overlay function
 * @param {Function} uploadFiles - Upload files function
 * @param {Function} showToast - Show toast function
 * @param {Function} updateUploadProgress - Update progress function
 */
export function setupUploadFormHandler(
    uploadForm,
    uploadInput,
    closeUploadOverlay,
    uploadFiles,
    showToast,
    updateUploadProgress
) {
    if (!uploadForm) return;

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const files = uploadInput?.files;

        if (!files || files.length === 0) {
            showToast?.('Pilih file untuk diunggah', 'error');
            return;
        }

        try {
            await uploadFiles(files, updateUploadProgress);
            closeUploadOverlay?.();
            uploadForm.reset();
        } catch (error) {
            console.error('[FormHandlers] Upload error:', error);
            showToast?.(error.message || 'Gagal mengunggah file', 'error');
        }
    });

    // Handle file selection change
    uploadInput?.addEventListener('change', () => {
        const files = uploadInput.files;
        if (files && files.length > 0) {
            updateFileList(uploadForm, files);
        }
    });
}

/**
 * Updates the file list display in the upload form
 * @param {HTMLElement} form - Form element
 * @param {FileList} files - Selected files
 */
function updateFileList(form, files) {
    let fileListContainer = form.querySelector('.file-list');
    
    if (!fileListContainer) {
        fileListContainer = document.createElement('div');
        fileListContainer.className = 'file-list';
        form.insertBefore(fileListContainer, form.querySelector('button[type="submit"]'));
    }

    fileListContainer.innerHTML = Array.from(files).map(file => `
        <div class="file-list-item">
            <span class="file-name">${escapeHtml(file.name)}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
        </div>
    `).join('');
}

/**
 * Sets up the search form handler
 * @param {HTMLElement} searchForm - Search form element
 * @param {HTMLElement} searchInput - Search input element
 * @param {HTMLElement} searchClearBtn - Clear button element
 * @param {Function} doSearch - Search function
 * @param {Function} clearSearch - Clear search function
 */
export function setupSearchFormHandler(
    searchForm,
    searchInput,
    searchClearBtn,
    doSearch,
    clearSearch
) {
    if (!searchForm && !searchInput) return;

    // Form submit handler
    searchForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        doSearch?.();
    });

    // Input handler with debounce
    let searchTimeout = null;
    searchInput?.addEventListener('input', () => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        searchTimeout = setTimeout(() => {
            doSearch?.();
        }, 300);
    });

    // Clear button handler
    searchClearBtn?.addEventListener('click', () => {
        clearSearch?.();
    });
}

/**
 * Sets up the settings form handler
 * @param {HTMLElement} settingsForm - Settings form element
 * @param {Function} closeSettingsOverlay - Close settings overlay function
 * @param {Function} saveSettings - Save settings function
 * @param {Function} showToast - Show toast function
 */
export function setupSettingsFormHandler(
    settingsForm,
    closeSettingsOverlay,
    saveSettings,
    showToast
) {
    if (!settingsForm) return;

    settingsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const formData = new FormData(settingsForm);
        const settings = Object.fromEntries(formData.entries());

        // Convert checkbox values to boolean
        for (const key in settings) {
            if (settings[key] === 'on') {
                settings[key] = true;
            }
        }

        // Add unchecked checkboxes as false
        settingsForm.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (!settings[checkbox.name]) {
                settings[checkbox.name] = false;
            }
        });

        try {
            await saveSettings?.(settings);
            closeSettingsOverlay?.();
            showToast?.('Pengaturan disimpan', 'success');
        } catch (error) {
            console.error('[FormHandlers] Settings error:', error);
            showToast?.(error.message || 'Gagal menyimpan pengaturan', 'error');
        }
    });
}

/**
 * Sets up the move form handler
 * @param {HTMLElement} moveForm - Move form element
 * @param {HTMLElement} moveDestinationInput - Destination input
 * @param {HTMLElement} moveSourceInput - Source paths input
 * @param {Function} closeMoveOverlay - Close move overlay function
 * @param {Function} moveItems - Move items function
 * @param {Function} showToast - Show toast function
 */
export function setupMoveFormHandler(
    moveForm,
    moveDestinationInput,
    moveSourceInput,
    closeMoveOverlay,
    moveItems,
    showToast
) {
    if (!moveForm) return;

    moveForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const destination = moveDestinationInput?.value;
        const sourcePaths = moveSourceInput?.value;

        if (!destination) {
            showToast?.('Pilih folder tujuan', 'error');
            return;
        }

        if (!sourcePaths) {
            showToast?.('Tidak ada item untuk dipindahkan', 'error');
            return;
        }

        let paths;
        try {
            paths = JSON.parse(sourcePaths);
        } catch (e) {
            paths = [sourcePaths];
        }

        try {
            await moveItems?.(paths, destination);
            closeMoveOverlay?.();
            moveForm.reset();
        } catch (error) {
            console.error('[FormHandlers] Move error:', error);
            showToast?.(error.message || 'Gagal memindahkan item', 'error');
        }
    });
}

/**
 * Sets up form input validation handlers
 * @param {HTMLElement} form - Form element
 * @param {Object} validationRules - Validation rules
 */
export function setupFormValidation(form, validationRules) {
    if (!form) return;

    form.querySelectorAll('input, textarea, select').forEach(input => {
        const rules = validationRules[input.name];
        if (!rules) return;

        input.addEventListener('blur', () => {
            validateInput(input, rules);
        });

        input.addEventListener('input', () => {
            // Clear error on input
            clearInputError(input);
        });
    });

    form.addEventListener('submit', (event) => {
        let isValid = true;

        form.querySelectorAll('input, textarea, select').forEach(input => {
            const rules = validationRules[input.name];
            if (rules) {
                const valid = validateInput(input, rules);
                if (!valid) {
                    isValid = false;
                }
            }
        });

        if (!isValid) {
            event.preventDefault();
        }
    });
}

/**
 * Validates a single input against rules
 * @param {HTMLElement} input - Input element
 * @param {Object} rules - Validation rules
 * @returns {boolean} Whether the input is valid
 */
function validateInput(input, rules) {
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Required check
    if (rules.required && !value) {
        isValid = false;
        errorMessage = rules.requiredMessage || 'Field ini wajib diisi';
    }

    // Min length check
    if (isValid && rules.minLength && value.length < rules.minLength) {
        isValid = false;
        errorMessage = rules.minLengthMessage || `Minimal ${rules.minLength} karakter`;
    }

    // Max length check
    if (isValid && rules.maxLength && value.length > rules.maxLength) {
        isValid = false;
        errorMessage = rules.maxLengthMessage || `Maksimal ${rules.maxLength} karakter`;
    }

    // Pattern check
    if (isValid && rules.pattern && !rules.pattern.test(value)) {
        isValid = false;
        errorMessage = rules.patternMessage || 'Format tidak valid';
    }

    // Custom validation
    if (isValid && rules.custom) {
        const result = rules.custom(value);
        if (result !== true) {
            isValid = false;
            errorMessage = result || 'Validasi gagal';
        }
    }

    if (!isValid) {
        showInputError(input, errorMessage);
    } else {
        clearInputError(input);
    }

    return isValid;
}

/**
 * Shows an error message for an input
 * @param {HTMLElement} input - Input element
 * @param {string} message - Error message
 */
function showInputError(input, message) {
    input.classList.add('input-error');
    
    let errorElement = input.parentElement.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.className = 'error-message';
        input.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

/**
 * Clears error message for an input
 * @param {HTMLElement} input - Input element
 */
function clearInputError(input) {
    input.classList.remove('input-error');
    
    const errorElement = input.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

/**
 * Validates a file name
 * @param {string} name - File name
 * @returns {boolean} Whether the name is valid
 */
function isValidFileName(name) {
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
        return false;
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (reservedNames.test(name)) {
        return false;
    }

    // Check for empty name or only dots
    if (!name || /^\.+$/.test(name)) {
        return false;
    }

    // Check max length
    if (name.length > 255) {
        return false;
    }

    return true;
}

/**
 * Escapes HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formats file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sets up create overlay button handlers
 * @param {HTMLElement} btnCreateFile - Create file button
 * @param {HTMLElement} btnCreateFolder - Create folder button
 * @param {Function} openCreateOverlay - Open create overlay function
 */
export function setupCreateButtonHandlers(btnCreateFile, btnCreateFolder, openCreateOverlay) {
    btnCreateFile?.addEventListener('click', () => {
        openCreateOverlay?.('file');
    });

    btnCreateFolder?.addEventListener('click', () => {
        openCreateOverlay?.('folder');
    });
}

/**
 * Sets up overlay close button handlers
 * @param {Object} closeButtons - Object with close button elements
 * @param {Object} closeHandlers - Object with close handler functions
 */
export function setupOverlayCloseHandlers(closeButtons, closeHandlers) {
    for (const [key, button] of Object.entries(closeButtons)) {
        if (button && closeHandlers[key]) {
            button.addEventListener('click', closeHandlers[key]);
        }
    }
}

/**
 * Sets up overlay backdrop click handlers
 * @param {Array<HTMLElement>} overlays - Array of overlay elements
 * @param {Function} closeOverlay - Close overlay function
 */
export function setupBackdropClickHandlers(overlays, closeOverlay) {
    overlays.forEach(overlay => {
        if (!overlay) return;

        overlay.addEventListener('click', (event) => {
            // Only close if clicking on backdrop, not on content
            if (event.target === overlay) {
                closeOverlay?.();
            }
        });
    });
}
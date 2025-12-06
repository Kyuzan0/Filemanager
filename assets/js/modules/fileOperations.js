/**
 * File Operations Module
 * Berisi fungsi-fungsi untuk operasi file seperti delete, move, rename, dll.
 * Enhanced with centralized error handling
 */

import { deleteItems as apiDeleteItems, moveItem as apiMoveItem, renameItem as apiRenameItem, createItem as apiCreateItem, uploadFiles as apiUploadFiles } from './apiService.js';
import { errorMessages, successMessages } from './constants.js';
import { getParentPath, isSubPath } from './utils.js';
import { debugLog, debugError, debugPerf } from './debug.js';
import {
    handleError,
    createErrorHandler,
    FileManagerError,
    ErrorCategory,
    ErrorSeverity,
    isRetryableError
} from './errorHandler.js';

// Create context-specific error handlers for each operation type
const deleteErrorHandler = createErrorHandler('FileOperations:Delete');
const moveErrorHandler = createErrorHandler('FileOperations:Move');
const renameErrorHandler = createErrorHandler('FileOperations:Rename');
const createErrorHandler_internal = createErrorHandler('FileOperations:Create');
const uploadErrorHandler = createErrorHandler('FileOperations:Upload');

/**
 * Menghapus item-item yang dipilih
 * @param {Array} paths - Array path item yang akan dihapus
 * @param {Object} state - State aplikasi
 * @param {Function} setLoading - Fungsi set loading
 * @param {Function} setError - Fungsi set error
 * @param {Function} fetchDirectory - Fungsi fetch directory
 * @param {Function} closeConfirmOverlay - Fungsi tutup confirm overlay
 * @param {Function} updateSelectionUI - Fungsi update selection UI
 * @param {Function} closePreviewOverlay - Fungsi tutup preview overlay
 * @param {HTMLElement} btnDeleteSelected - Tombol delete selected
 */
export async function deleteItems(
    paths,
    state,
    setLoading,
    setError,
    fetchDirectory,
    closeConfirmOverlay,
    updateSelectionUI,
    closePreviewOverlay,
    btnDeleteSelected
) {
    debugLog('[DEBUG] deleteItems called with paths:', paths);
    
    if (!Array.isArray(paths) || paths.length === 0) {
        debugLog('[DEBUG] No paths provided for deletion');
        return;
    }

    closeConfirmOverlay();
    state.isDeleting = true;
    setLoading(true);
    updateSelectionUI();

    try {
        debugLog('[DEBUG] Sending delete request to API');
        const data = await apiDeleteItems(paths);
        debugLog('[DEBUG] Delete response received:', data);

        const deletedList = Array.isArray(data.deleted) ? data.deleted : [];
        const failedList = Array.isArray(data.failed) ? data.failed : [];
        
        debugLog('[DEBUG] Deleted items:', deletedList);
        debugLog('[DEBUG] Failed items:', failedList);

        const deletedPaths = new Set(
            deletedList
                .map((entry) => {
                    if (typeof entry === 'string') {
                        return entry;
                    }
                    if (entry && typeof entry === 'object' && typeof entry.path === 'string') {
                        return entry.path;
                    }
                    return '';
                })
                .filter((value) => value !== ''),
        );

        if (state.preview.isOpen && state.preview.path && deletedPaths.has(state.preview.path)) {
            closePreviewOverlay(true);
        }

        if (failedList.length > 0) {
            const failedSet = new Set();
            failedList.forEach((entry) => {
                if (entry && typeof entry === 'object' && typeof entry.path === 'string' && entry.path !== '') {
                    failedSet.add(entry.path);
                }
            });
            state.selected = failedSet;

            const example = failedList[0] ?? null;
            let detail = '';
            if (example && typeof example === 'object' && 'path' in example) {
                const examplePath = example.path;
                const exampleError = example.error ?? 'Tidak diketahui';
                detail = `${examplePath}: ${exampleError}`;
            }
            const message = failedList.length === 1
                ? `Gagal menghapus ${detail || 'item.'}`
                : `Gagal menghapus ${failedList.length.toLocaleString('id-ID')} item. ${detail ? `Contoh: ${detail}` : ''}`;
            setError(message.trim());
        } else {
            state.selected.clear();
            setError('');
        }

        await fetchDirectory(state.currentPath, { silent: true });
    } catch (error) {
        debugError('[ERROR] Delete operation error:', error);
        
        // Use centralized error handler for consistent error processing
        const processedError = deleteErrorHandler(error, {
            silent: true, // We'll show error via setError instead
            context: 'deleteItems'
        });
        
        // Get user-friendly message
        const message = processedError instanceof FileManagerError
            ? processedError.getUserMessage()
            : (error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus item.');
        setError(message);
    } finally {
        state.isDeleting = false;
        if (btnDeleteSelected) {
            btnDeleteSelected.textContent = state.selected.size > 0
                ? `Hapus (${state.selected.size.toLocaleString('id-ID')})`
                : 'Hapus Terpilih';
        }
        setLoading(false);
        updateSelectionUI();
    }
}

/**
 * Memindahkan item ke lokasi baru dengan optimistic UI update
 * @param {string} sourcePath - Path sumber
 * @param {string} targetPath - Path target
 * @param {Object} state - State aplikasi
 * @param {Function} setLoading - Fungsi set loading
 * @param {Function} setError - Fungsi set error
 * @param {Function} fetchDirectory - Fungsi fetch directory
 * @param {Function} flashStatus - Fungsi flash status
 * @param {HTMLElement} previewTitle - Elemen preview title
 * @param {HTMLElement} previewMeta - Elemen preview meta
 * @param {HTMLElement} previewOpenRaw - Elemen preview open raw
 * @param {Function} buildFileUrl - Fungsi build file URL
 * @param {boolean} optimistic - Whether to use optimistic UI updates (default: true)
 */
export async function moveItem(
    sourcePath,
    targetPath,
    state,
    setLoading,
    setError,
    fetchDirectory,
    flashStatus,
    previewTitle,
    previewMeta,
    previewOpenRaw,
    buildFileUrl,
    optimistic = true
) {
    // Import optimistic update functions
    const { optimisticUpdate, commitOptimisticUpdate } = await import('./state.js');
    const { moveRowInDOM, rollbackMove } = await import('./uiRenderer.js');
    
    let rollbackFn = null;
    let domRollback = null;
    let optimisticStart = null;
    let optimisticEnd = null;
    
    try {
        debugLog('[PERF] Move operation started:', sourcePath, '->', targetPath);
        const perfStart = performance.now();
        
        if (optimistic) {
            // OPTIMISTIC UPDATE: Immediately update UI before API call
            debugLog('[PERF] Applying optimistic UI update');
            optimisticStart = performance.now();
            
            // Remove row from DOM immediately
            domRollback = moveRowInDOM(sourcePath);
            
            // Update state optimistically
            rollbackFn = optimisticUpdate(
                () => {
                    // Remove from state immediately
                    const movedItem = state.itemMap.get(sourcePath);
                    if (movedItem) {
                        state.items = state.items.filter(item => item.path !== sourcePath);
                        state.visibleItems = state.visibleItems.filter(item => item.path !== sourcePath);
                        state.itemMap.delete(sourcePath);
                    }
                },
                () => {
                    // Rollback function - restore DOM
                    if (domRollback) {
                        rollbackMove(domRollback);
                    }
                }
            );
            
            optimisticEnd = performance.now();
            debugPerf('Optimistic UI update completed in', optimisticEnd - optimisticStart);
        }
        
        // Perform the actual move operation in background (non-blocking for UI)
        debugLog('[PERF] Starting API call');
        const apiStart = performance.now();
        const data = await apiMoveItem(sourcePath, targetPath);
        const apiEnd = performance.now();
        debugPerf('API call completed in', apiEnd - apiStart);
        
        if (optimistic) {
            // Commit the optimistic update (clear snapshot)
            commitOptimisticUpdate();
        }
        
        // Show success message
        if (flashStatus) {
            flashStatus(`"${data.item.name}" berhasil dipindahkan.`);
        }
        
        // Only refresh if needed (viewing target directory or moved a folder)
        const movedItem = state.itemMap.get(sourcePath);
        const needsRefresh =
            state.currentPath === targetPath ||
            state.currentPath === '' ||
            (movedItem && movedItem.type === 'folder');
        
        if (needsRefresh && !optimistic) {
            debugLog('[PERF] Refreshing directory');
            await fetchDirectory(state.currentPath, { silent: true });
        }
        
        const perfEnd = performance.now();
        debugPerf('Total move operation time', perfEnd - perfStart);
        debugPerf('User perceived time', (optimistic && optimisticStart !== null && optimisticEnd !== null)
            ? (optimisticEnd - optimisticStart)
            : (perfEnd - perfStart));
        
    } catch (error) {
        debugError('[ERROR] Move operation failed:', error);
        
        // ROLLBACK: Restore UI and state on error
        if (optimistic && rollbackFn) {
            debugLog('[PERF] Rolling back optimistic update');
            rollbackFn();
        }
        
        // Use centralized error handler for consistent error processing
        const processedError = moveErrorHandler(error, {
            silent: true, // We'll show error via setError instead
            context: 'moveItem'
        });
        
        // Get user-friendly message
        const message = processedError instanceof FileManagerError
            ? processedError.getUserMessage()
            : (error instanceof Error ? error.message : 'Terjadi kesalahan saat memindahkan item.');
        if (setError) {
            setError(message);
        }
        
        // Refresh to ensure correct state
        if (fetchDirectory) {
            await fetchDirectory(state.currentPath, { silent: true });
        }
    } finally {
        if (setLoading) {
            setLoading(false);
        }
    }
}

// Keep the complex version for backward compatibility
export async function moveItemComplex(
    sourcePath,
    targetPath,
    state,
    setLoading,
    setError,
    fetchDirectory,
    flashStatus,
    previewTitle,
    previewMeta,
    previewOpenRaw,
    buildFileUrl
) {
    try {
        setLoading(true);
        
        debugLog('[DEBUG] Moving item from', sourcePath, 'to', targetPath);
        
        const data = await apiMoveItem(sourcePath, targetPath);
        debugLog('[DEBUG] Move response:', data);
        
        flashStatus(`"${data.item.name}" berhasil dipindahkan.`);
        
        // Refresh the directory
        await fetchDirectory(state.currentPath, { silent: true });
        
        // If the moved item is currently open in preview, update the preview
        if (state.preview.isOpen && state.preview.path === sourcePath) {
            state.preview.path = data.item.path;
            previewTitle.textContent = data.item.name;
            previewMeta.textContent = previewMeta.textContent.replace(
                state.currentPath === '' ? sourcePath : `${state.currentPath}/${sourcePath}`,
                state.currentPath === '' ? data.item.path : `${state.currentPath}/${data.item.path}`
            );
            previewOpenRaw.href = buildFileUrl(data.item.path);
        }
        
    } catch (error) {
        debugError(error);
        const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat memindahkan item.';
        setError(message);
    } finally {
        setLoading(false);
    }
}

/**
 * Mengubah nama item
 * @param {Object} item - Item yang akan di-rename
 * @param {string} newName - Nama baru
 * @param {Object} state - State aplikasi
 * @param {Function} setLoading - Fungsi set loading
 * @param {Function} setError - Fungsi set error
 * @param {Function} fetchDirectory - Fungsi fetch directory
 * @param {Function} flashStatus - Fungsi flash status
 * @param {Function} closeRenameOverlay - Fungsi tutup rename overlay
 * @param {HTMLElement} renameSubmit - Tombol submit rename
 * @param {HTMLElement} renameName - Input nama rename
 * @param {HTMLElement} renameHint - Elemen hint rename
 * @param {HTMLElement} previewTitle - Elemen preview title
 * @param {HTMLElement} previewMeta - Elemen preview meta
 * @param {HTMLElement} previewOpenRaw - Elemen preview open raw
 * @param {Function} buildFileUrl - Fungsi build file URL
 * @param {Function} encodePathSegments - Fungsi encode path segments
 */
export async function renameItem(
    item,
    newName,
    state,
    setLoading,
    setError,
    fetchDirectory,
    flashStatus,
    closeRenameOverlay,
    renameSubmit,
    renameName,
    renameHint,
    previewTitle,
    previewMeta,
    previewOpenRaw,
    buildFileUrl,
    encodePathSegments
) {
    const oldPath = item.path;
    const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = directory ? `${directory}/${newName}` : newName;

    try {
        setLoading(true);
        renameSubmit.disabled = true;
        renameName.disabled = true;

        const data = await apiRenameItem(oldPath, newName, newPath);
        
        flashStatus(`${item.name} berhasil diubah namanya menjadi ${newName}.`);
        closeRenameOverlay();
        
        // If renamed item is currently open in preview, update the preview
        if (state.preview.isOpen && state.preview.path === oldPath) {
            state.preview.path = newPath;
            previewTitle.textContent = newName;
            previewMeta.textContent = previewMeta.textContent.replace(item.name, newName);
            previewOpenRaw.href = buildFileUrl(newPath);
        }
        
        return fetchDirectory(state.currentPath, { silent: true });
    } catch (error) {
        // Use centralized error handler for consistent error processing
        const processedError = renameErrorHandler(error, {
            silent: true, // We'll show error via setError/renameHint instead
            context: 'renameItem'
        });
        
        // Get user-friendly message
        const message = processedError instanceof FileManagerError
            ? processedError.getUserMessage()
            : (error instanceof Error ? error.message : 'Gagal mengubah nama item.');
        setError(message);
        renameHint.textContent = message;
        renameHint.classList.add('error');
        renameSubmit.disabled = false;
        renameName.disabled = false;
        renameName.focus();
    } finally {
        setLoading(false);
    }
}

/**
 * Membuat item baru (file atau folder)
 * @param {string} kind - Jenis item ('file' atau 'folder')
 * @param {string} name - Nama item
 * @param {Object} state - State aplikasi
 * @param {Function} setLoading - Fungsi set loading
 * @param {Function} setError - Fungsi set error
 * @param {Function} fetchDirectory - Fungsi fetch directory
 * @param {Function} flashStatus - Fungsi flash status
 * @param {Function} closeCreateOverlay - Fungsi tutup create overlay
 * @param {HTMLElement} createSubmit - Tombol submit create
 * @param {HTMLElement} createName - Input nama create
 * @param {HTMLElement} createHint - Elemen hint create
 * @param {Function} encodePathSegments - Fungsi encode path segments
 */
export async function createItem(
    kind,
    name,
    state,
    setLoading,
    setError,
    fetchDirectory,
    flashStatus,
    closeCreateOverlay,
    createSubmit,
    createName,
    createHint,
    encodePathSegments
) {
    const trimmed = name.trim();
    if (trimmed === '') {
        createHint.textContent = 'Nama tidak boleh kosong.';
        createHint.classList.add('error');
        return;
    }

    try {
        setLoading(true);
        createSubmit.disabled = true;
        createName.disabled = true;

        const data = await apiCreateItem(state.currentPath, kind, trimmed);
        flashStatus(`${data.item.name} berhasil dibuat.`);
        closeCreateOverlay();
        return fetchDirectory(state.currentPath, { silent: true });
    } catch (error) {
        // Use centralized error handler for consistent error processing
        const processedError = createErrorHandler_internal(error, {
            silent: true, // We'll show error via setError/createHint instead
            context: 'createItem'
        });
        
        // Get user-friendly message
        const message = processedError instanceof FileManagerError
            ? processedError.getUserMessage()
            : (error instanceof Error ? error.message : 'Gagal membuat item baru.');
        setError(message);
        createHint.textContent = message;
        createHint.classList.add('error');
        createSubmit.disabled = false;
        createName.disabled = false;
        createName.focus();
    } finally {
        setLoading(false);
    }
}

/**
 * Mengunggah file ke server
 * @param {FileList} files - Daftar file yang akan diunggah
 * @param {Object} state - State aplikasi
 * @param {Function} setLoading - Fungsi set loading
 * @param {Function} setError - Fungsi set error
 * @param {Function} fetchDirectory - Fungsi fetch directory
 * @param {Function} flashStatus - Fungsi flash status
 * @param {HTMLElement} btnUpload - Tombol upload
 */
export async function uploadFiles(
    files,
    state,
    setLoading,
    setError,
    fetchDirectory,
    flashStatus,
    btnUpload
) {
    if (!files || files.length === 0) {
        return;
    }

    // Chunk threshold: files larger than this will be uploaded in chunks (5 MB)
    const CHUNK_SIZE = 5 * 1024 * 1024;

    // Helper to upload a single small-file FormData using existing API wrapper
    async function sendFormData(fd) {
        const data = await apiUploadFiles(fd);
        return data;
    }

    try {
        setLoading(true);
        if (btnUpload) btnUpload.disabled = true;

        const fileArray = Array.from(files);
        let anyUploadedNames = [];
        let anyFailures = [];

        // Separate small and large files
        const smallFiles = fileArray.filter(file => file.size <= CHUNK_SIZE);
        const largeFiles = fileArray.filter(file => file.size > CHUNK_SIZE);
        
        // Upload all small files together in a single request for bulk logging
        if (smallFiles.length > 0) {
            const fd = new FormData();
            smallFiles.forEach(file => {
                fd.append('files[]', file, file.name);
            });
            fd.append('path', state.currentPath);

            try {
                const data = await sendFormData(fd);
                const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
                const failures = Array.isArray(data.errors) ? data.errors : [];
                
                if (uploaded.length > 0) {
                    anyUploadedNames = anyUploadedNames.concat(uploaded.map(u => u.name));
                }
                if (failures.length > 0) {
                    anyFailures = anyFailures.concat(failures);
                }
            } catch (e) {
                // If bulk upload fails, fall back to individual uploads for small files
                console.warn('Bulk upload failed, falling back to individual uploads:', e);
                await uploadFilesIndividually(smallFiles, state, CHUNK_SIZE, sendFormData, flashStatus, anyUploadedNames, anyFailures);
            }
        }
        
        // Upload large files individually (chunked)
        if (largeFiles.length > 0) {
            await uploadFilesIndividually(largeFiles, state, CHUNK_SIZE, sendFormData, flashStatus, anyUploadedNames, anyFailures);
        }

        // Prepare user feedback
        if (anyUploadedNames.length > 0) {
            const names = anyUploadedNames.join(', ');
            if (flashStatus) flashStatus(`File diunggah: ${names}`);
        } else {
            if (flashStatus) flashStatus('Tidak ada file yang diunggah.');
        }

        if (anyFailures.length > 0) {
            const example = anyFailures[0];
            const detail = example && typeof example === 'object'
                ? `${example.name || 'File'}: ${example.error || 'Tidak diketahui'}`
                : 'Beberapa file gagal diunggah.';
            setError(`Sebagian file gagal diunggah. ${detail}`);
        } else {
            setError('');
        }

        await fetchDirectory(state.currentPath, { silent: true });
    } catch (error) {
        // Use centralized error handler for consistent error processing
        const processedError = uploadErrorHandler(error, {
            silent: true, // We'll show error via setError instead
            context: 'uploadFiles'
        });
        
        // Get user-friendly message
        const message = processedError instanceof FileManagerError
            ? processedError.getUserMessage()
            : (error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah.');
        setError(message);
    } finally {
        setLoading(false);
        if (btnUpload) btnUpload.disabled = false;
    }
}

/**
 * Helper function to upload files individually
 * @param {Array} fileArray - Array of files to upload
 * @param {Object} state - Application state
 * @param {number} CHUNK_SIZE - Chunk size threshold
 * @param {Function} sendFormData - Function to send FormData
 * @param {Function} flashStatus - Function to show status
 * @param {Array} anyUploadedNames - Array to store uploaded names
 * @param {Array} anyFailures - Array to store failures
 */
async function uploadFilesIndividually(fileArray, state, CHUNK_SIZE, sendFormData, flashStatus, anyUploadedNames, anyFailures) {
    // Upload files sequentially to avoid overwhelming the server
    for (const file of fileArray) {
        // Small file: send as legacy multi-file field
        if (file.size <= CHUNK_SIZE) {
            const fd = new FormData();
            fd.append('files[]', file, file.name);
            fd.append('path', state.currentPath);

            try {
                const data = await sendFormData(fd);
                const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
                const failures = Array.isArray(data.errors) ? data.errors : [];
                if (uploaded.length > 0) {
                    anyUploadedNames.push(...uploaded.map(u => u.name));
                }
                if (failures.length > 0) {
                    anyFailures.push(...failures);
                }
            } catch (e) {
                anyFailures.push({ name: file.name, error: e instanceof Error ? e.message : String(e) });
            }
        } else {
            // Large file: chunked upload
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            let finished = false;

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const blob = file.slice(start, end);

                const fd = new FormData();
                // Use field name 'file' for chunk upload (server recognizes 'file' + chunk metadata)
                fd.append('file', blob, file.name);
                fd.append('originalName', file.name);
                fd.append('chunkIndex', String(chunkIndex));
                fd.append('totalChunks', String(totalChunks));
                fd.append('path', state.currentPath);

                try {
                    const data = await sendFormData(fd);
                    finished = !!(data && data.finished);
                    const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
                    const failures = Array.isArray(data.errors) ? data.errors : [];

                    if (uploaded.length > 0) {
                        anyUploadedNames.push(...uploaded.map(u => u.name));
                    }
                    if (failures.length > 0) {
                        anyFailures.push(...failures);
                        // If server reports errors for chunk, break out and treat as failure
                        break;
                    }

                    // Optionally report progress per-chunk (coarse)
                    if (flashStatus) {
                        const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                        flashStatus(`Mengunggah ${file.name}: ${percent}%`);
                    }

                    // If assembly finished on server, break early
                    if (finished) {
                        break;
                    }
                } catch (e) {
                    anyFailures.push({ name: file.name, error: e instanceof Error ? e.message : String(e) });
                    break;
                }
            } // end chunks loop

            // If not finished and no explicit server error, mark failure
            if (!finished && !anyFailures.find(f => f.name === file.name)) {
                anyFailures.push({ name: file.name, error: 'Upload chunked tidak selesai.' });
            }
        } // end large-file handling
    } // end per-file loop
}

/**
 * Mengunggah folder beserta isinya ke server
 * @param {FileList} files - Daftar file dari folder (dengan webkitRelativePath)
 * @param {Object} state - State aplikasi
 * @param {Function} setLoading - Fungsi set loading
 * @param {Function} setError - Fungsi set error
 * @param {Function} fetchDirectory - Fungsi fetch directory
 * @param {Function} flashStatus - Fungsi flash status
 * @param {HTMLElement} btnUpload - Tombol upload
 */
export async function uploadFolder(
    files,
    state,
    setLoading,
    setError,
    fetchDirectory,
    flashStatus,
    btnUpload
) {
    if (!files || files.length === 0) {
        return;
    }

    // Chunk threshold: files larger than this will be uploaded in chunks (5 MB)
    const CHUNK_SIZE = 5 * 1024 * 1024;

    // Helper to upload FormData
    async function sendFormData(fd) {
        const data = await apiUploadFiles(fd);
        return data;
    }

    try {
        setLoading(true);
        if (btnUpload) btnUpload.disabled = true;

        const fileArray = Array.from(files);
        let anyUploadedNames = [];
        let anyFailures = [];

        // Group files by their relative folder path
        const folderGroups = new Map();
        for (const file of fileArray) {
            const relativePath = file.webkitRelativePath || file.name;
            const folderPath = relativePath.includes('/') 
                ? relativePath.substring(0, relativePath.lastIndexOf('/'))
                : '';
            
            if (!folderGroups.has(folderPath)) {
                folderGroups.set(folderPath, []);
            }
            folderGroups.get(folderPath).push(file);
        }

        // Get root folder name for display
        const rootFolderName = fileArray[0]?.webkitRelativePath?.split('/')[0] || 'folder';
        if (flashStatus) flashStatus(`Mengunggah folder: ${rootFolderName}...`);

        // Process each folder group
        for (const [folderPath, folderFiles] of folderGroups) {
            // Calculate target path including subfolders
            const targetPath = folderPath 
                ? (state.currentPath ? `${state.currentPath}/${folderPath}` : folderPath)
                : state.currentPath;

            // Separate small and large files
            const smallFiles = folderFiles.filter(file => file.size <= CHUNK_SIZE);
            const largeFiles = folderFiles.filter(file => file.size > CHUNK_SIZE);

            // Upload small files in batch
            if (smallFiles.length > 0) {
                const fd = new FormData();
                smallFiles.forEach(file => {
                    fd.append('files[]', file, file.name);
                    fd.append('relativePaths[]', file.webkitRelativePath || file.name);
                });
                fd.append('path', state.currentPath);
                fd.append('folderUpload', 'true');

                try {
                    const data = await sendFormData(fd);
                    const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
                    const failures = Array.isArray(data.errors) ? data.errors : [];
                    
                    if (uploaded.length > 0) {
                        anyUploadedNames = anyUploadedNames.concat(uploaded.map(u => u.name));
                    }
                    if (failures.length > 0) {
                        anyFailures = anyFailures.concat(failures);
                    }
                } catch (e) {
                    console.warn('Batch folder upload failed, falling back to individual:', e);
                    // Fall back to individual uploads
                    for (const file of smallFiles) {
                        const individualFd = new FormData();
                        individualFd.append('files[]', file, file.name);
                        individualFd.append('relativePaths[]', file.webkitRelativePath || file.name);
                        individualFd.append('path', state.currentPath);
                        individualFd.append('folderUpload', 'true');

                        try {
                            const data = await sendFormData(individualFd);
                            const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
                            const failures = Array.isArray(data.errors) ? data.errors : [];
                            if (uploaded.length > 0) {
                                anyUploadedNames.push(...uploaded.map(u => u.name));
                            }
                            if (failures.length > 0) {
                                anyFailures.push(...failures);
                            }
                        } catch (err) {
                            anyFailures.push({ 
                                name: file.webkitRelativePath || file.name, 
                                error: err instanceof Error ? err.message : String(err) 
                            });
                        }
                    }
                }
            }

            // Upload large files individually (chunked) with relative path
            for (const file of largeFiles) {
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                let finished = false;

                for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                    const start = chunkIndex * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, file.size);
                    const blob = file.slice(start, end);

                    const fd = new FormData();
                    fd.append('file', blob, file.name);
                    fd.append('originalName', file.name);
                    fd.append('relativePath', file.webkitRelativePath || file.name);
                    fd.append('chunkIndex', String(chunkIndex));
                    fd.append('totalChunks', String(totalChunks));
                    fd.append('path', state.currentPath);
                    fd.append('folderUpload', 'true');

                    try {
                        const data = await sendFormData(fd);
                        finished = !!(data && data.finished);
                        const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
                        const failures = Array.isArray(data.errors) ? data.errors : [];

                        if (uploaded.length > 0) {
                            anyUploadedNames.push(...uploaded.map(u => u.name));
                        }
                        if (failures.length > 0) {
                            anyFailures.push(...failures);
                            break;
                        }

                        if (flashStatus) {
                            const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                            flashStatus(`Mengunggah ${file.webkitRelativePath || file.name}: ${percent}%`);
                        }

                        if (finished) break;
                    } catch (e) {
                        anyFailures.push({ 
                            name: file.webkitRelativePath || file.name, 
                            error: e instanceof Error ? e.message : String(e) 
                        });
                        break;
                    }
                }

                if (!finished && !anyFailures.find(f => f.name === (file.webkitRelativePath || file.name))) {
                    anyFailures.push({ 
                        name: file.webkitRelativePath || file.name, 
                        error: 'Upload chunked tidak selesai.' 
                    });
                }
            }
        }

        // Prepare user feedback
        if (anyUploadedNames.length > 0) {
            if (flashStatus) flashStatus(`Folder "${rootFolderName}" berhasil diunggah (${anyUploadedNames.length} file)`);
        } else {
            if (flashStatus) flashStatus('Tidak ada file yang diunggah dari folder.');
        }

        if (anyFailures.length > 0) {
            const example = anyFailures[0];
            const detail = example && typeof example === 'object'
                ? `${example.name || 'File'}: ${example.error || 'Tidak diketahui'}`
                : 'Beberapa file gagal diunggah.';
            setError(`Sebagian file gagal diunggah. ${detail}`);
        } else {
            setError('');
        }

        await fetchDirectory(state.currentPath, { silent: true });
    } catch (error) {
        // Use centralized error handler for consistent error processing
        const processedError = uploadErrorHandler(error, {
            silent: true, // We'll show error via setError instead
            context: 'uploadFolder'
        });
        
        // Get user-friendly message
        const message = processedError instanceof FileManagerError
            ? processedError.getUserMessage()
            : (error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah folder.');
        setError(message);
    } finally {
        setLoading(false);
        if (btnUpload) btnUpload.disabled = false;
    }
}

/**
 * Membuka dokumen di Microsoft Word
 * @param {Object} item - Item yang akan dibuka
 * @param {Function} buildAbsoluteFileUrl - Fungsi build absolute file URL
 * @param {Function} buildUncSharePath - Fungsi build UNC share path
 * @param {Function} buildFileUrl - Fungsi build file URL
 * @param {Function} flashStatus - Fungsi flash status
 * @param {Function} setError - Fungsi set error
 */
export function openInWord(
    item,
    buildAbsoluteFileUrl,
    buildUncSharePath,
    buildFileUrl,
    flashStatus,
    setError
) {
    if (!item || item.type !== 'file') {
        return;
    }

    const httpAbsUrl = buildAbsoluteFileUrl(item.path);
    const uncSharePath = buildUncSharePath(item.path);

    const proceed = window.confirm(
        'Buka dokumen ini di Microsoft Word?\n' +
        'Jika muncul prompt keamanan, pilih "Yes".\n' +
        'Jika gagal via UNC, sistem akan mencoba alamat web.'
    );
    if (!proceed) {
        // Fallback: buka di tab baru (web)
        const url = buildFileUrl(item.path);
        const win = window.open(url, '_blank');
        if (win) {
            win.opener = null;
        }
        return;
    }

    // Final fallback setelah semua percobaan: buka tab web dan tampilkan overlay bantuan
    const finalFallback = () => {
        flashStatus(`Word tidak dapat membuka langsung. File dibuka di tab baru. Jika masih gagal, lihat bantuan konfigurasi untuk membuka di Word.`);
        const url = buildFileUrl(item.path);
        const win = window.open(url, '_blank');
        if (win) {
            win.opener = null;
        }

        try {
            const host = window.location.hostname || 'localhost';
            const uncPath = uncSharePath;
            const httpUrl = httpAbsUrl;

            let ov = document.getElementById('word-help-overlay');
            if (!ov) {
                ov = document.createElement('div');
                ov.id = 'word-help-overlay';
                ov.setAttribute('role', 'dialog');
                ov.setAttribute('aria-modal', 'true');
                ov.style.position = 'fixed';
                ov.style.inset = '0';
                ov.style.background = 'rgba(0,0,0,0.45)';
                ov.style.zIndex = '9999';

                const panel = document.createElement('div');
                panel.style.maxWidth = '640px';
                panel.style.margin = '10vh auto';
                panel.style.background = '#fff';
                panel.style.borderRadius = '12px';
                panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                panel.style.padding = '20px 24px';
                panel.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
                panel.setAttribute('aria-labelledby', 'word-help-title');

                const h = document.createElement('h2');
                h.id = 'word-help-title';
                h.textContent = 'Buka di Microsoft Word diblokir';
                h.style.margin = '0 0 8px';

                const p = document.createElement('p');
                p.textContent = 'Office memblokir karena sumber berada di Restricted Sites. Ikuti langkah berikut agar klik .docx membuka Word:';
                p.style.margin = '0 0 12px';

                const steps = document.createElement('ol');
                steps.style.margin = '0 0 12px 20px';
                steps.style.padding = '0';
                steps.innerHTML = `
<li>Tambahkan host ke Trusted Sites atau Local Intranet:
   buka Internet Options → Security → Trusted sites → Sites, lalu tambahkan:
   <code>http://${host}</code>. Untuk UNC, tambahkan juga <code>file:///${host}</code>.</li>
<li>Di Microsoft Word: File → Options → Trust Center → Trust Center Settings → Protected View.
   Nonaktifkan opsi untuk "files from the Internet" atau "Restricted Sites" sesuai kebijakan (hubungi admin bila perlu).</li>
<li>Alternatif: buka via File Explorer menggunakan jalur UNC di bawah.</li>
`;

                const label = document.createElement('label');
                label.textContent = 'UNC path:';
                label.style.fontWeight = '600';
                label.style.display = 'block';
                label.style.margin = '8px 0 4px';

                const input = document.createElement('input');
                input.type = 'text';
                input.value = uncPath;
                input.readOnly = true;
                input.style.width = '100%';
                input.style.padding = '8px';
                input.style.border = '1px solid #ddd';
                input.style.borderRadius = '8px';

                const buttons = document.createElement('div');
                buttons.style.display = 'flex';
                buttons.style.gap = '8px';
                buttons.style.margin = '12px 0 0';

                const copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.classList.add('btn');
                copyBtn.textContent = 'Salin UNC';
                copyBtn.style.padding = '8px 12px';
                
                const tryHttpBtn = document.createElement('button');
                tryHttpBtn.type = 'button';
                tryHttpBtn.classList.add('btn');
                tryHttpBtn.textContent = 'Coba via HTTP';
                tryHttpBtn.style.padding = '8px 12px';
                
                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.classList.add('btn');
                closeBtn.textContent = 'Tutup';
                closeBtn.style.padding = '8px 12px';
                
                buttons.append(copyBtn, tryHttpBtn, closeBtn);

                panel.append(h, p, steps, label, input, buttons);
                ov.appendChild(panel);
                document.body.appendChild(ov);
                document.body.classList.add('modal-open');

                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(uncPath)
                        .then(() => flashStatus('UNC tersalin ke clipboard'))
                        .catch(() => setError('Gagal menyalin UNC'));
                });
                tryHttpBtn.addEventListener('click', () => {
                    try {
                        const msWordHttp = 'ms-word:ofe|u|' + encodeURI(httpUrl);
                        window.location.href = msWordHttp;
                    } catch (_) {
                        // ignore
                    }
                });
                closeBtn.addEventListener('click', () => {
                    ov.remove();
                    document.body.classList.remove('modal-open');
                });
            }
        } catch (_) {
            // ignore overlay errors
        }
    };

    // Percobaan 1: gunakan UNC path langsung (JANGAN di-encode)
    try {
        const msWordUnc = 'ms-word:ofe|u|' + uncSharePath; // e.g. \\d.local\public\www\file\tugas metopen.docx
        window.location.href = msWordUnc;
    } catch (_) {
        // lanjut ke percobaan HTTP
    }

    // Percobaan 2: gunakan URL HTTP/HTTPS absolut via ms-word setelah jeda singkat
    const httpTryTimer = setTimeout(() => {
        try {
            const msWordHttp = 'ms-word:ofe|u|' + encodeURI(httpAbsUrl);
            window.location.href = msWordHttp;
        } catch (_) {
            // abaikan, lanjut ke fallback terakhir
        }
    }, 1500);

    // Fallback terakhir: buka di browser tab jika percobaan protokol tidak berhasil
    const fallbackTimer = setTimeout(() => {
        clearTimeout(httpTryTimer);
        finalFallback();
    }, 7000);

    // Safety cleanup untuk memastikan tidak ada timer menggantung
    setTimeout(() => {
        clearTimeout(fallbackTimer);
    }, 12000);
}

/**
 * Validasi target untuk operasi move
 * @param {string} targetPath - Path target
 * @param {Array} sources - Array path sumber
 * @param {Object} state - State aplikasi
 * @returns {Object} Hasil validasi { valid: boolean, message: string }
 */
export function validateMoveTarget(targetPath, sources, state) {
    if (typeof targetPath !== 'string') return { valid: false, message: 'Pilih folder tujuan.' };
    for (const sp of sources) {
        const item = state.itemMap.get(sp);
        const isDir = item ? item.type === 'folder' : false;
        // same folder for file
        if (!isDir && getParentPath(sp) === targetPath) {
            return { valid: false, message: 'Item sudah berada di folder ini.' };
        }
        // folder into itself or its descendant
        if (isDir && isSubPath(sp, targetPath)) {
            return { valid: false, message: 'Tidak dapat memindahkan folder ke dirinya sendiri atau subfoldernya.' };
        }
    }
    return { valid: true, message: '' };
}

/**
 * Melakukan operasi move untuk multiple items
 * @param {Array} sources - Array path sumber
 * @param {string} targetFolder - Path folder target
 * @param {Object} state - State aplikasi
 * @param {Function} setLoading - Fungsi set loading
 * @param {Function} setError - Fungsi set error
 * @param {Function} fetchDirectory - Fungsi fetch directory
 * @param {Function} flashStatus - Fungsi flash status
 * @param {Function} closeMoveOverlay - Fungsi tutup move overlay
 * @param {Function} updateMoveConfirmState - Fungsi update move confirm state
 * @param {Function} addRecentDestination - Fungsi tambah recent destination
 */
export async function performMove(
    sources,
    targetFolder,
    state,
    setLoading,
    setError,
    fetchDirectory,
    flashStatus,
    closeMoveOverlay,
    updateMoveConfirmState,
    addRecentDestination
) {
    if (!Array.isArray(sources) || sources.length === 0) return;
    const check = validateMoveTarget(targetFolder ?? '', sources, state);
    if (!check.valid) {
        setError(check.message || 'Tujuan tidak valid.');
        return;
    }
    
    setLoading(true);
    
    try {
        const results = [];
        for (const sp of sources) {
            try {
                const resp = await apiMoveItem(sp, targetFolder ?? '');
                const data = await resp.json().catch(() => null);
                if (!resp.ok || !data || !data.success) {
                    const err = data && data.error ? data.error : 'Gagal memindahkan item.';
                    results.push({ path: sp, ok: false, error: err });
                } else {
                    results.push({ path: sp, ok: true, item: data.item });
                }
            } catch (e) {
                results.push({ path: sp, ok: false, error: e instanceof Error ? e.message : 'Gagal memindahkan.' });
            }
        }

        const okCount = results.filter(r => r.ok).length;
        const failCount = results.length - okCount;

        if (okCount > 0) {
            // Update recents with chosen destination
            addRecentDestination(targetFolder ?? '');

            if (sources.length === 1) {
                const name = (state.itemMap.get(sources[0])?.name) || (sources[0].split('/').pop() || sources[0]);
                flashStatus(`"${name}" berhasil dipindahkan.`);
            } else {
                flashStatus(`${okCount.toLocaleString('id-ID')} item berhasil dipindahkan${failCount ? `, ${failCount.toLocaleString('id-ID')} gagal` : ''}.`);
            }
        }
        if (failCount > 0) {
            const example = results.find(r => !r.ok);
            const detail = example ? `${example.path}: ${example.error}` : '';
            setError(`Sebagian item gagal dipindahkan. ${detail}`);
        } else {
            setError('');
        }

        // Refresh once
        await fetchDirectory(state.currentPath, { silent: true });
        closeMoveOverlay();
    } finally {
        setLoading(false);
        updateMoveConfirmState();
    }
}
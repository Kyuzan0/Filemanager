/**
 * Drag and Drop Module
 * Berisi fungsi-fungsi untuk menangani drag and drop
 */

import { moveItem } from './fileOperations.js';
import { state } from './state.js';
import { fetchDirectory } from './apiService.js';

/**
 * Menangani event drag start
 * @param {DragEvent} event - Event drag start
 * @param {Object} item - Item yang di-drag
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} fileCard - Elemen file card
 * @param {Function} handleBodyDragOver - Fungsi handle body drag over
 * @param {Function} handleBodyDrop - Fungsi handle body drop
 */
export function handleDragStart(event, item, state, fileCard, handleBodyDragOver, handleBodyDrop) {
    state.drag.isDragging = true;
    state.drag.draggedItem = item;
    
    // Set the drag effect
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.path);
    
    // Add visual feedback
    event.target.classList.add('dragging');
    
    // Show file-card drop zone cosmetic immediately
    if (fileCard) {
        console.log('[DEBUG] Drag started - adding .drag-over to file-card');
        fileCard.classList.add('drag-over');
    }
    
    // Make the entire document a drop zone for dropping in the current directory
    document.body.addEventListener('dragover', handleBodyDragOver);
    document.body.addEventListener('drop', handleBodyDrop);
}

/**
 * Menangani event drag end
 * @param {DragEvent} event - Event drag end
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} fileCard - Elemen file card
 * @param {Function} handleBodyDragOver - Fungsi handle body drag over
 * @param {Function} handleBodyDrop - Fungsi handle body drop
 */
export function handleDragEnd(event, state, fileCard, handleBodyDragOver, handleBodyDrop) {
    state.drag.isDragging = false;
    state.drag.draggedItem = null;
    state.drag.dropTarget = null;
    
    // Remove visual feedback
    event.target.classList.remove('dragging');
    
    // Remove file-card drop zone cosmetic immediately
    if (fileCard) {
        console.log('[DEBUG] Drag ended - removing .drag-over from file-card');
        fileCard.classList.remove('drag-over');
    }
    
    // Remove all drop target highlights
    document.querySelectorAll('.drop-target').forEach(el => {
        el.classList.remove('drop-target');
    });
    
    // Remove body event listeners
    document.body.removeEventListener('dragover', handleBodyDragOver);
    document.body.removeEventListener('drop', handleBodyDrop);
}

/**
 * Menangani event drag over pada item
 * @param {DragEvent} event - Event drag over
 * @param {Object} item - Item target
 * @param {Object} state - State aplikasi
 */
export function handleDragOver(event, item, state) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    // Don't allow dropping on itself
    if (state.drag.draggedItem && state.drag.draggedItem.path === item.path) {
        return;
    }
    
    // Don't allow dropping a folder into itself
    if (state.drag.draggedItem && state.drag.draggedItem.type === 'folder') {
        if (item.path.startsWith(state.drag.draggedItem.path + '/')) {
            return;
        }
    }
    
    // Add visual feedback
    if (state.drag.dropTarget !== item.path) {
        // Remove previous highlight
        document.querySelectorAll('.drop-target').forEach(el => {
            el.classList.remove('drop-target');
        });
        
        // Add new highlight
        event.currentTarget.classList.add('drop-target');
        state.drag.dropTarget = item.path;
    }
}

/**
 * Menangani event drag leave
 * @param {DragEvent} event - Event drag leave
 * @param {Object} state - State aplikasi
 */
export function handleDragLeave(event, state) {
    // Only remove highlight if leaving the actual element, not a child
    if (event.currentTarget === event.target) {
        event.currentTarget.classList.remove('drop-target');
        if (state.drag.dropTarget === event.currentTarget.dataset.itemPath) {
            state.drag.dropTarget = null;
        }
    }
}

/**
 * Menangani event drop pada item
 * @param {DragEvent} event - Event drop
 * @param {Object} targetItem - Item target
 * @param {Object} state - State aplikasi
 * @param {Function} handleBodyDragOver - Fungsi handle body drag over
 * @param {Function} handleBodyDrop - Fungsi handle body drop
 */
export function handleDrop(event, targetItem, state, handleBodyDragOver, handleBodyDrop) {
    event.preventDefault();
    // Prevent bubbling to body drop handler to avoid duplicate move requests
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
    }
    
    if (!state.drag.draggedItem) {
        return;
    }
    
    // Don't allow dropping on itself
    if (state.drag.draggedItem.path === targetItem.path) {
        return;
    }
    
    // Don't allow dropping a folder into itself
    if (state.drag.draggedItem.type === 'folder') {
        if (targetItem.path.startsWith(state.drag.draggedItem.path + '/')) {
            return;
        }
    }
    
    console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'into folder', targetItem.name, 'with path', targetItem.path);
    
    // Ensure targetPath is not empty
    const targetPath = targetItem.path || state.currentPath;
    console.log('[DEBUG] Final target path:', targetPath);
    
    // Remove body drag/drop listeners to avoid global drop firing
    document.body.removeEventListener('dragover', handleBodyDragOver);
    document.body.removeEventListener('drop', handleBodyDrop);
    
    // Perform the move operation
    moveItem(
        state.drag.draggedItem.path,
        targetPath,
        state,
        () => { /* setLoading - will be implemented later */ },
        (error) => { console.error('Move error:', error); },
        () => fetchDirectory(state.currentPath, { silent: true }),
        (message) => { console.log('Status:', message); },
        null, // previewTitle
        null, // previewMeta
        null, // previewOpenRaw
        null  // buildFileUrl
    );
    
    // Clean up
    event.currentTarget.classList.remove('drop-target');
    state.drag.dropTarget = null;
}

/**
 * Menangani event drag over pada body
 * @param {DragEvent} event - Event drag over
 * @param {Object} state - State aplikasi
 */
export function handleBodyDragOver(event, state) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    // Remove all drop target highlights when over the body
    document.querySelectorAll('.drop-target').forEach(el => {
        el.classList.remove('drop-target');
    });
    state.drag.dropTarget = null;
}

/**
 * Menangani event drop pada body
 * @param {DragEvent} event - Event drop
 * @param {Object} state - State aplikasi
 * @param {HTMLElement} fileCard - Elemen file card
 * @param {Function} handleBodyDragOver - Fungsi handle body drag over
 * @param {Function} handleBodyDrop - Fungsi handle body drop
 */
export function handleBodyDrop(event, state, fileCard, handleBodyDragOver, handleBodyDrop) {
    event.preventDefault();
    
    // Remove file-card drop zone cosmetic on body drop
    if (fileCard) {
        console.log('[DEBUG] Body drop - removing .drag-over from file-card');
        fileCard.classList.remove('drag-over');
    }
    
    if (!state.drag.draggedItem) {
        return;
    }
    
    console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'in current directory', state.currentPath);
    
    // Drop in the current directory
    moveItem(
        state.drag.draggedItem.path,
        state.currentPath,
        state,
        () => { /* setLoading - will be implemented later */ },
        (error) => { console.error('Move error:', error); },
        () => fetchDirectory(state.currentPath, { silent: true }),
        (message) => { console.log('Status:', message); },
        null, // previewTitle
        null, // previewMeta
        null, // previewOpenRaw
        null  // buildFileUrl
    );
}

/**
 * Mengatur event listener untuk file card sebagai drop zone
 * @param {HTMLElement} fileCard - Elemen file card
 * @param {Object} state - State aplikasi
 * @param {Function} handleBodyDragOver - Fungsi handle body drag over
 * @param {Function} handleBodyDrop - Fungsi handle body drop
 */
export function setupFileCardDropZone(fileCard, state, handleBodyDragOver, handleBodyDrop) {
    if (!fileCard) return;
    
    fileCard.addEventListener('dragover', (event) => {
        if (state.drag.isDragging) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            fileCard.classList.add('drag-over');
        }
    });
    
    fileCard.addEventListener('dragleave', (event) => {
        // Keep highlight while dragging; only remove when drag ends or drop
        if (!state.drag.isDragging) {
            console.log('[DEBUG] File card dragleave while not dragging - removing .drag-over');
            fileCard.classList.remove('drag-over');
        }
    });
    
    fileCard.addEventListener('drop', (event) => {
        if (state.drag.isDragging) {
            event.preventDefault();
            // Prevent bubbling to body drop handler to avoid duplicate move requests
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
            console.log('[DEBUG] File card drop - removing .drag-over');
            fileCard.classList.remove('drag-over');
            
            if (state.drag.draggedItem) {
                console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'in current directory via file card', state.currentPath);
                // Remove body drag/drop listeners to avoid global drop firing
                document.body.removeEventListener('dragover', handleBodyDragOver);
                document.body.removeEventListener('drop', handleBodyDrop);
                // Drop in current directory
                moveItem(
                    state.drag.draggedItem.path,
                    state.currentPath,
                    state,
                    () => { /* setLoading - will be implemented later */ },
                    (error) => { console.error('Move error:', error); },
                    () => fetchDirectory(state.currentPath, { silent: true }),
                    (message) => { console.log('Status:', message); },
                    null, // previewTitle
                    null, // previewMeta
                    null, // previewOpenRaw
                    null  // buildFileUrl
                );
            }
        }
    });
}

/**
 * Mengatur event listener untuk up row sebagai drop zone
 * @param {HTMLElement} upRow - Elemen up row
 * @param {Object} state - State aplikasi
 * @param {Function} handleBodyDragOver - Fungsi handle body drag over
 * @param {Function} handleBodyDrop - Fungsi handle body drop
 */
export function setupUpRowDropZone(upRow, state, handleBodyDragOver, handleBodyDrop) {
    if (!upRow) return;
    
    upRow.addEventListener('dragover', (event) => {
        if (!state.drag.isDragging) {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        // Visual highlight for drop target
        upRow.classList.add('drop-target');
    });
    
    upRow.addEventListener('dragleave', (event) => {
        // Only remove when actually leaving the row, not entering children
        if (event.currentTarget === event.target) {
            upRow.classList.remove('drop-target');
        }
    });
    
    upRow.addEventListener('drop', (event) => {
        if (!state.drag.isDragging || !state.drag.draggedItem) {
            return;
        }
        event.preventDefault();
        // Prevent bubbling to body to avoid duplicate move requests
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
        
        // Remove global listeners to avoid body drop firing
        document.body.removeEventListener('dragover', handleBodyDragOver);
        document.body.removeEventListener('drop', handleBodyDrop);
        
        const targetPath = state.parentPath || '';
        console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'onto up-row to move into parent', targetPath);
        
        // Perform the move operation to parent directory
        moveItem(
            state.drag.draggedItem.path,
            targetPath,
            state,
            () => { /* setLoading - will be implemented later */ },
            (error) => { console.error('Move error:', error); },
            () => fetchDirectory(state.currentPath, { silent: true }),
            (message) => { console.log('Status:', message); },
            null, // previewTitle
            null, // previewMeta
            null, // previewOpenRaw
            null  // buildFileUrl
        );
        
        // Clean up highlight/state
        upRow.classList.remove('drop-target');
        state.drag.dropTarget = null;
    });
}

/**
 * Setup drag and drop functionality
 * Main setup function that initializes drag and drop for the file manager
 */
export function setupDragAndDrop() {
    console.log('[DEBUG] Setting up drag and drop functionality');
    
    // Set up body as a drop zone for dragging to current directory
    const bodyDragOverHandler = (event) => {
        if (!state.drag) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };
    
    const bodyDropHandler = (event) => {
        if (!state.drag) return;
        event.preventDefault();
        
        if (!state.drag.draggedItem) {
            return;
        }
        
        console.log('[DEBUG] Body drop - dropping in current directory:', state.currentPath);
        
        // Drop in current directory
        moveItem(
            state.drag.draggedItem.path,
            state.currentPath,
            state,
            () => { /* setLoading - will be implemented later */ },
            (error) => { console.error('Move error:', error); },
            () => fetchDirectory(state.currentPath, { silent: true }),
            (message) => { console.log('Status:', message); },
            null, // previewTitle
            null, // previewMeta
            null, // previewOpenRaw
            null  // buildFileUrl
        );
        
        // Clean up
        document.body.removeEventListener('dragover', bodyDragOverHandler);
        document.body.removeEventListener('drop', bodyDropHandler);
    };
    
    // Store handlers for later removal
    window.bodyDragHandlers = {
        dragOver: bodyDragOverHandler,
        drop: bodyDropHandler
    };
    
    console.log('[DEBUG] Drag and Drop module initialized');
}
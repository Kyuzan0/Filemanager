/**
 * Drag and Drop Module
 * Berisi fungsi-fungsi untuk menangani drag and drop
 */

import { moveItem } from './fileOperations.js';
import { state } from './state.js';
import { elements } from './constants.js';
import { fetchDirectory } from './apiService.js';
import { debugLog } from './debug.js';

/**
 * DOM Reference Cache for performance optimization
 * Caches frequently accessed DOM queries to avoid repeated lookups
 */
const domCache = {
    folderRows: null,
    dropTargets: null,
    lastCacheTime: 0,
    cacheTimeout: 100 // Cache valid for 100ms
};

/**
 * Gets cached folder rows or performs fresh query if cache is stale
 * @returns {NodeList} - List of folder row elements
 */
function getCachedFolderRows() {
    const now = Date.now();
    if (!domCache.folderRows || (now - domCache.lastCacheTime) > domCache.cacheTimeout) {
        domCache.folderRows = document.querySelectorAll('.folder-row');
        domCache.lastCacheTime = now;
    }
    return domCache.folderRows;
}

/**
 * Gets all drop target elements (uses cached query)
 * @returns {NodeList} - List of elements with .drop-target class
 */
function getCachedDropTargets() {
    return document.querySelectorAll('.drop-target');
}

/**
 * Invalidates the DOM cache (call after DOM changes)
 */
export function invalidateDOMCache() {
    domCache.folderRows = null;
    domCache.dropTargets = null;
    domCache.lastCacheTime = 0;
}

/**
 * Menangani event drag start
 * @param {DragEvent} event - Event drag start
 * @param {Object} item - Item yang di-drag
 */
export function handleDragStart(event, item) {
    state.drag.isDragging = true;
    state.drag.draggedItem = item;
    
    // Set the drag effect
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.path);
    
    // Add visual feedback
    event.target.classList.add('dragging');
    
    // Show file-card drop zone cosmetic immediately
    if (elements.fileCard) {
        debugLog('[DEBUG] Drag started - adding .drag-over to file-card');
        elements.fileCard.classList.add('drag-over');
    }
    
    // Make the entire document a drop zone for dropping in the current directory
    document.body.addEventListener('dragover', handleBodyDragOver);
    document.body.addEventListener('drop', handleBodyDrop);
}

/**
 * Menangani event drag end
 * @param {DragEvent} event - Event drag end
 */
export function handleDragEnd(event) {
    state.drag.isDragging = false;
    state.drag.draggedItem = null;
    state.drag.dropTarget = null;
    
    // Remove visual feedback
    event.target.classList.remove('dragging');
    
    // Remove file-card drop zone cosmetic immediately
    if (elements.fileCard) {
        debugLog('[DEBUG] Drag ended - removing .drag-over from file-card');
        elements.fileCard.classList.remove('drag-over');
    }
    
    // Remove all drop target highlights (using cached query)
    getCachedDropTargets().forEach(el => {
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
 */
export function handleDragOver(event, item) {
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
        // Remove previous highlight (using cached query)
        getCachedDropTargets().forEach(el => {
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
 */
export function handleDragLeave(event) {
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
 */
export function handleDrop(event, targetItem) {
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
    
    debugLog('[DEBUG] Dropping', state.drag.draggedItem.name, 'into folder', targetItem.name, 'with path', targetItem.path);
    
    // Ensure targetPath is not empty
    const targetPath = targetItem.path || state.currentPath;
    debugLog('[DEBUG] Final target path:', targetPath);
    
    // Remove body drag/drop listeners to avoid global drop firing
    document.body.removeEventListener('dragover', handleBodyDragOver);
    document.body.removeEventListener('drop', handleBodyDrop);
    
    // Perform the move operation
    moveItem(
        state.drag.draggedItem.path,
        targetPath,
        state,
        (isLoading) => { debugLog('[DEBUG] Loading:', isLoading); },
        (error) => { debugLog('[DEBUG] Move error:', error); },
        () => fetchDirectory(state.currentPath, { silent: true }),
        (message) => { debugLog('[DEBUG] Status:', message); },
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
 */
export function handleBodyDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    // Remove all drop target highlights when over the body (using cached query)
    getCachedDropTargets().forEach(el => {
        el.classList.remove('drop-target');
    });
    state.drag.dropTarget = null;
}

/**
 * Menangani event drop pada body
 * @param {DragEvent} event - Event drop
 */
export function handleBodyDrop(event) {
    event.preventDefault();
    
    // Remove file-card drop zone cosmetic on body drop
    if (elements.fileCard) {
        debugLog('[DEBUG] Body drop - removing .drag-over from file-card');
        elements.fileCard.classList.remove('drag-over');
    }
    
    if (!state.drag.draggedItem) {
        return;
    }
    
    debugLog('[DEBUG] Dropping', state.drag.draggedItem.name, 'in current directory', state.currentPath);
    
    // Drop in the current directory
    moveItem(
        state.drag.draggedItem.path,
        state.currentPath,
        state,
        (isLoading) => { debugLog('[DEBUG] Loading:', isLoading); },
        (error) => { debugLog('[DEBUG] Move error:', error); },
        () => fetchDirectory(state.currentPath, { silent: true }),
        (message) => { debugLog('[DEBUG] Status:', message); },
        null, // previewTitle
        null, // previewMeta
        null, // previewOpenRaw
        null  // buildFileUrl
    );
}

/**
 * Mengatur event listener untuk file card sebagai drop zone
 */
export function setupFileCardDropZone() {
    if (!elements.fileCard) return;
    
    elements.fileCard.addEventListener('dragover', (event) => {
        if (state.drag.isDragging) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            elements.fileCard.classList.add('drag-over');
        }
    });
    
    elements.fileCard.addEventListener('dragleave', (event) => {
        // Keep highlight while dragging; only remove when drag ends or drop
        if (!state.drag.isDragging) {
            debugLog('[DEBUG] File card dragleave while not dragging - removing .drag-over');
            elements.fileCard.classList.remove('drag-over');
        }
    });
    
    elements.fileCard.addEventListener('drop', (event) => {
        if (state.drag.isDragging) {
            event.preventDefault();
            // Prevent bubbling to body drop handler to avoid duplicate move requests
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
            debugLog('[DEBUG] File card drop - removing .drag-over');
            elements.fileCard.classList.remove('drag-over');
            
            if (state.drag.draggedItem) {
                debugLog('[DEBUG] Dropping', state.drag.draggedItem.name, 'in current directory via file card', state.currentPath);
                // Remove body drag/drop listeners to avoid global drop firing
                document.body.removeEventListener('dragover', handleBodyDragOver);
                document.body.removeEventListener('drop', handleBodyDrop);
                // Drop in current directory
                moveItem(
                    state.drag.draggedItem.path,
                    state.currentPath,
                    state,
                    (isLoading) => { debugLog('[DEBUG] Loading:', isLoading); },
                    (error) => { debugLog('[DEBUG] Move error:', error); },
                    () => fetchDirectory(state.currentPath, { silent: true }),
                    (message) => { debugLog('[DEBUG] Status:', message); },
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
 * NOTE: This function is NOT used anymore - up-row setup is done in uiRenderer.js
 * Keeping for reference only
 * @param {HTMLElement} upRow - Elemen up row
 */
export function setupUpRowDropZone(upRow) {
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
        debugLog('[DEBUG] Dropping', state.drag.draggedItem.name, 'onto up-row to move into parent', targetPath);
        
        // Perform the move operation to parent directory
        moveItem(
            state.drag.draggedItem.path,
            targetPath,
            state,
            () => { /* setLoading - will be implemented later */ },
            (error) => { debugLog('Move error:', error); },
            () => fetchDirectory(state.currentPath, { silent: true }),
            (message) => { debugLog('Status:', message); },
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

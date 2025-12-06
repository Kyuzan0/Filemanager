/**
 * Drag Handlers Module
 * Handles drag and drop event handlers for the File Manager application
 */

/**
 * Sets up drag and drop handlers for the file list
 * @param {Object} state - Application state
 * @param {HTMLElement} tableBody - Table body element
 * @param {HTMLElement} mobileList - Mobile list element
 * @param {Function} handleDrop - Drop handler function
 * @param {Function} updateDropIndicator - Update drop indicator function
 */
export function setupDragDropHandlers(
    state,
    tableBody,
    mobileList,
    handleDrop,
    updateDropIndicator
) {
    // Setup for table body
    if (tableBody) {
        setupDragListeners(tableBody, state, handleDrop, updateDropIndicator);
    }
    
    // Setup for mobile list
    if (mobileList) {
        setupDragListeners(mobileList, state, handleDrop, updateDropIndicator);
    }
}

/**
 * Sets up drag event listeners for a container element
 * @param {HTMLElement} container - Container element
 * @param {Object} state - Application state
 * @param {Function} handleDrop - Drop handler function
 * @param {Function} updateDropIndicator - Update drop indicator function
 */
function setupDragListeners(container, state, handleDrop, updateDropIndicator) {
    container.addEventListener('dragstart', (event) => handleDragStart(event, state));
    container.addEventListener('dragover', (event) => handleDragOver(event, state, updateDropIndicator));
    container.addEventListener('dragleave', (event) => handleDragLeave(event, state));
    container.addEventListener('drop', (event) => handleDropEvent(event, state, handleDrop));
    container.addEventListener('dragend', (event) => handleDragEnd(event, state));
}

/**
 * Handles drag start event
 * @param {DragEvent} event - Drag event
 * @param {Object} state - Application state
 */
export function handleDragStart(event, state) {
    const row = event.target.closest('tr[data-path], .mobile-item[data-path]');
    if (!row) {
        event.preventDefault();
        return;
    }

    const path = row.dataset.path;
    if (!path) {
        event.preventDefault();
        return;
    }

    // Set drag data
    state.dragState = {
        isDragging: true,
        draggedPath: path,
        draggedPaths: state.selected.has(path) ? Array.from(state.selected) : [path],
        sourceElement: row
    };

    // Set data transfer
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify(state.dragState.draggedPaths));

    // Add visual feedback
    row.classList.add('dragging');
    
    // If multiple items are selected, show count
    if (state.dragState.draggedPaths.length > 1) {
        const dragImage = createDragImage(state.dragState.draggedPaths.length);
        event.dataTransfer.setDragImage(dragImage, 0, 0);
        
        // Clean up drag image after a brief delay
        setTimeout(() => {
            if (dragImage.parentNode) {
                dragImage.parentNode.removeChild(dragImage);
            }
        }, 100);
    }

    console.log('[DragHandlers] Drag started:', state.dragState.draggedPaths);
}

/**
 * Creates a drag image showing item count
 * @param {number} count - Number of items being dragged
 * @returns {HTMLElement} Drag image element
 */
function createDragImage(count) {
    const dragImage = document.createElement('div');
    dragImage.className = 'drag-image';
    dragImage.textContent = `${count} items`;
    dragImage.style.cssText = `
        position: fixed;
        left: -1000px;
        top: -1000px;
        padding: 8px 16px;
        background: var(--color-primary, #3b82f6);
        color: white;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        pointer-events: none;
        z-index: 10000;
    `;
    document.body.appendChild(dragImage);
    return dragImage;
}

/**
 * Handles drag over event
 * @param {DragEvent} event - Drag event
 * @param {Object} state - Application state
 * @param {Function} updateDropIndicator - Update drop indicator function
 */
export function handleDragOver(event, state, updateDropIndicator) {
    event.preventDefault();
    
    const row = event.target.closest('tr[data-path], .mobile-item[data-path]');
    if (!row) {
        event.dataTransfer.dropEffect = 'none';
        return;
    }

    const targetPath = row.dataset.path;
    const targetItem = state.itemMap.get(targetPath);

    // Can only drop on folders
    if (!targetItem || targetItem.type !== 'folder') {
        event.dataTransfer.dropEffect = 'none';
        clearDropHighlight();
        return;
    }

    // Can't drop on self or own children
    if (state.dragState && state.dragState.draggedPaths.includes(targetPath)) {
        event.dataTransfer.dropEffect = 'none';
        clearDropHighlight();
        return;
    }

    // Valid drop target
    event.dataTransfer.dropEffect = 'move';
    
    // Update visual feedback
    clearDropHighlight();
    row.classList.add('drop-target');
    
    if (updateDropIndicator) {
        updateDropIndicator(row, event);
    }
}

/**
 * Clears drop highlight from all elements
 */
function clearDropHighlight() {
    document.querySelectorAll('.drop-target').forEach(el => {
        el.classList.remove('drop-target');
    });
}

/**
 * Handles drag leave event
 * @param {DragEvent} event - Drag event
 * @param {Object} state - Application state
 */
export function handleDragLeave(event, state) {
    const row = event.target.closest('tr[data-path], .mobile-item[data-path]');
    if (row) {
        row.classList.remove('drop-target');
    }
}

/**
 * Handles drop event
 * @param {DragEvent} event - Drag event
 * @param {Object} state - Application state
 * @param {Function} handleDrop - Drop handler function
 */
export function handleDropEvent(event, state, handleDrop) {
    event.preventDefault();
    clearDropHighlight();

    const row = event.target.closest('tr[data-path], .mobile-item[data-path]');
    if (!row) return;

    const targetPath = row.dataset.path;
    const targetItem = state.itemMap.get(targetPath);

    if (!targetItem || targetItem.type !== 'folder') {
        console.warn('[DragHandlers] Invalid drop target');
        return;
    }

    // Get dragged paths
    let draggedPaths = [];
    
    if (state.dragState && state.dragState.draggedPaths) {
        draggedPaths = state.dragState.draggedPaths;
    } else {
        try {
            const data = event.dataTransfer.getData('text/plain');
            draggedPaths = JSON.parse(data);
        } catch (e) {
            console.error('[DragHandlers] Failed to parse drag data:', e);
            return;
        }
    }

    // Can't drop on self
    if (draggedPaths.includes(targetPath)) {
        console.warn('[DragHandlers] Cannot drop on self');
        return;
    }

    console.log('[DragHandlers] Dropping', draggedPaths.length, 'items into', targetPath);

    // Call drop handler
    if (handleDrop) {
        handleDrop(draggedPaths, targetPath);
    }

    // Clean up drag state
    cleanupDragState(state);
}

/**
 * Handles drag end event
 * @param {DragEvent} event - Drag event
 * @param {Object} state - Application state
 */
export function handleDragEnd(event, state) {
    // Remove dragging class from source element
    if (state.dragState && state.dragState.sourceElement) {
        state.dragState.sourceElement.classList.remove('dragging');
    }

    // Clear any remaining drop targets
    clearDropHighlight();

    // Clean up drag state
    cleanupDragState(state);

    console.log('[DragHandlers] Drag ended');
}

/**
 * Cleans up drag state
 * @param {Object} state - Application state
 */
function cleanupDragState(state) {
    state.dragState = {
        isDragging: false,
        draggedPath: null,
        draggedPaths: [],
        sourceElement: null
    };
}

/**
 * Sets up file upload drop zone
 * @param {HTMLElement} dropZone - Drop zone element
 * @param {Function} handleFileUpload - File upload handler function
 * @param {Object} options - Options
 */
export function setupUploadDropZone(dropZone, handleFileUpload, options = {}) {
    if (!dropZone) return;

    const {
        highlightClass = 'upload-highlight',
        onDragEnter = null,
        onDragLeave = null
    } = options;

    let dragCounter = 0;

    dropZone.addEventListener('dragenter', (event) => {
        event.preventDefault();
        dragCounter++;
        
        // Check if dropping files (not internal drag)
        if (event.dataTransfer.types.includes('Files')) {
            dropZone.classList.add(highlightClass);
            if (onDragEnter) onDragEnter(event);
        }
    });

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes('Files')) {
            event.dataTransfer.dropEffect = 'copy';
        }
    });

    dropZone.addEventListener('dragleave', (event) => {
        event.preventDefault();
        dragCounter--;
        
        if (dragCounter === 0) {
            dropZone.classList.remove(highlightClass);
            if (onDragLeave) onDragLeave(event);
        }
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dragCounter = 0;
        dropZone.classList.remove(highlightClass);

        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            console.log('[DragHandlers] Files dropped:', files.length);
            if (handleFileUpload) {
                handleFileUpload(files);
            }
        }
    });
}

/**
 * Sets up sortable drag and drop for reordering items
 * @param {HTMLElement} container - Container element
 * @param {Function} onReorder - Reorder callback function
 * @param {Object} options - Options
 */
export function setupSortableDrag(container, onReorder, options = {}) {
    if (!container) return;

    const {
        itemSelector = '[data-sortable]',
        handleSelector = '.drag-handle',
        ghostClass = 'sortable-ghost',
        chosenClass = 'sortable-chosen'
    } = options;

    let draggedItem = null;
    let initialIndex = -1;

    container.addEventListener('dragstart', (event) => {
        const handle = event.target.closest(handleSelector);
        const item = event.target.closest(itemSelector);
        
        if (!item) {
            event.preventDefault();
            return;
        }

        // Only allow drag from handle if specified
        if (handleSelector && !handle) {
            event.preventDefault();
            return;
        }

        draggedItem = item;
        initialIndex = Array.from(container.querySelectorAll(itemSelector)).indexOf(item);
        
        item.classList.add(chosenClass);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', initialIndex.toString());
    });

    container.addEventListener('dragover', (event) => {
        event.preventDefault();
        
        const item = event.target.closest(itemSelector);
        if (!item || item === draggedItem) return;

        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        // Clear previous ghost class
        container.querySelectorAll(`.${ghostClass}`).forEach(el => {
            el.classList.remove(ghostClass);
        });
        
        // Determine insert position
        if (event.clientY < midY) {
            item.classList.add(ghostClass);
            container.insertBefore(draggedItem, item);
        } else {
            item.classList.add(ghostClass);
            container.insertBefore(draggedItem, item.nextSibling);
        }
    });

    container.addEventListener('dragend', (event) => {
        if (!draggedItem) return;

        draggedItem.classList.remove(chosenClass);
        container.querySelectorAll(`.${ghostClass}`).forEach(el => {
            el.classList.remove(ghostClass);
        });

        const items = Array.from(container.querySelectorAll(itemSelector));
        const newIndex = items.indexOf(draggedItem);

        if (newIndex !== initialIndex && onReorder) {
            onReorder(initialIndex, newIndex, items);
        }

        draggedItem = null;
        initialIndex = -1;
    });
}

/**
 * Sets up breadcrumb drop zones for quick navigation
 * @param {HTMLElement} breadcrumbContainer - Breadcrumb container element
 * @param {Function} handleBreadcrumbDrop - Drop handler function
 * @param {Object} state - Application state
 */
export function setupBreadcrumbDropZones(breadcrumbContainer, handleBreadcrumbDrop, state) {
    if (!breadcrumbContainer) return;

    breadcrumbContainer.addEventListener('dragover', (event) => {
        const breadcrumb = event.target.closest('[data-path]');
        if (!breadcrumb) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        breadcrumb.classList.add('drop-target');
    });

    breadcrumbContainer.addEventListener('dragleave', (event) => {
        const breadcrumb = event.target.closest('[data-path]');
        if (breadcrumb) {
            breadcrumb.classList.remove('drop-target');
        }
    });

    breadcrumbContainer.addEventListener('drop', (event) => {
        event.preventDefault();
        
        const breadcrumb = event.target.closest('[data-path]');
        if (!breadcrumb) return;

        const targetPath = breadcrumb.dataset.path;
        breadcrumb.classList.remove('drop-target');

        // Get dragged paths
        let draggedPaths = [];
        
        if (state.dragState && state.dragState.draggedPaths) {
            draggedPaths = state.dragState.draggedPaths;
        } else {
            try {
                const data = event.dataTransfer.getData('text/plain');
                draggedPaths = JSON.parse(data);
            } catch (e) {
                console.error('[DragHandlers] Failed to parse drag data:', e);
                return;
            }
        }

        if (draggedPaths.length > 0 && handleBreadcrumbDrop) {
            handleBreadcrumbDrop(draggedPaths, targetPath);
        }

        // Clean up drag state
        cleanupDragState(state);
    });
}
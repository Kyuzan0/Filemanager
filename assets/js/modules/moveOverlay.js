/**
 * Move Overlay Module
 * Berisi fungsi-fungsi untuk mengelola move overlay
 */

import { elements, config } from './constants.js';
import { state, updateState } from './state.js';
import { logModalOperation, modalLogger } from './logManager.js';
import { buildFileUrl, encodePathSegments } from './utils.js';
import { fetchDirectory } from './apiService.js';

// LocalStorage key untuk recent destinations
const RECENTS_STORAGE_KEY = 'filemanager_move_recents';
const MAX_RECENTS = 5;

// Search state
let allFolders = []; // Store all folders for filtering
let currentSearchQuery = '';

/**
 * Membuka move overlay
 * @param {Array} paths - Array path yang akan dipindahkan
 */
export function openMoveOverlay(paths) {
    if (!paths || paths.length === 0) {
        return;
    }

    // Load recent destinations from localStorage
    loadMoveRecentsFromStorage();

    updateState({
        move: {
            isOpen: true,
            paths: [...paths],
            targetPath: state.currentPath,
            isLoading: false,
            error: null
        }
    });

    // Reset form (only if elements exist)
    if (elements.movePath) {
        elements.movePath.value = state.currentPath;
    }
    if (elements.moveHint) {
        elements.moveHint.textContent = 'Pilih folder tujuan untuk memindahkan item.';
        elements.moveHint.classList.remove('error');
    }
    if (elements.moveSubmit) {
        elements.moveSubmit.disabled = false;
    }
    if (elements.moveCancel) {
        elements.moveCancel.disabled = false;
    }

    // Load current directory in move overlay
    loadMoveDirectory(state.currentPath);

    // Update recent destinations UI
    updateMoveRecentsUI();

    // Show overlay - only if overlay exists
    if (elements.moveOverlay) {
        elements.moveOverlay.setAttribute('aria-hidden', 'false');
        if (elements.movePath) {
            elements.movePath.focus();
        }
    } else {
        console.error('[MOVE_OVERLAY] Cannot open overlay: moveOverlay element not found');
        return;
    }

    logModalOperation('move', 'open', { paths });
}

/**
 * Menutup move overlay
 */
export function closeMoveOverlay() {
    if (state.move.isLoading) {
        return;
    }

    updateState({
        move: {
            isOpen: false,
            paths: [],
            targetPath: '',
            isLoading: false,
            error: null
        }
    });

    // Hide overlay - only if overlay exists
    if (elements.moveOverlay) {
        elements.moveOverlay.setAttribute('aria-hidden', 'true');
    } else {
        console.warn('[MOVE_OVERLAY] Cannot close overlay: moveOverlay element not found');
    }
    logModalOperation('move', 'close');
}

/**
 * Memuat direktori untuk move overlay
 * @param {string} path - Path direktori yang akan dimuat
 */
async function loadMoveDirectory(path) {
    try {
        updateState({ move: { ...state.move, isLoading: true, error: null } });
        if (elements.moveSubmit) {
            elements.moveSubmit.disabled = true;
        }
        if (elements.movePath) {
            elements.movePath.disabled = true;
        }

        const response = await fetch(`${config.apiBaseUrl}?path=${encodeURIComponent(path)}&json=1`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Gagal memuat direktori');
        }

        // Filter hanya folder
        const folders = data.items.filter(item => item.type === 'folder');
        
        // Store all folders for search functionality
        allFolders = folders;
        
        // Render folder list (with current search query if any)
        if (currentSearchQuery) {
            const filteredFolders = filterFolders(folders, currentSearchQuery);
            renderMoveFolderList(filteredFolders, path);
        } else {
            renderMoveFolderList(folders, path);
        }
        
        // Update current path display
        if (elements.movePath) {
            elements.movePath.value = path;
        }
        
        updateState({
            move: {
                ...state.move,
                isLoading: false,
                targetPath: path
            }
        });
        
        if (elements.moveSubmit) {
            elements.moveSubmit.disabled = false;
        }
        if (elements.movePath) {
            elements.movePath.disabled = false;
        }
        
    } catch (error) {
        modalLogger.error('Failed to load move directory', error);
        updateState({ 
            move: { 
                ...state.move, 
                isLoading: false, 
                error: error.message 
            } 
        });
        
        if (elements.moveHint) {
            elements.moveHint.textContent = `Error: ${error.message}`;
            elements.moveHint.classList.add('error');
        }
        if (elements.moveSubmit) {
            elements.moveSubmit.disabled = true;
        }
        if (elements.movePath) {
            elements.movePath.disabled = false;
        }
    }
}

/**
 * Merender daftar folder di move overlay
 * @param {Array} folders - Array folder
 * @param {string} currentPath - Path saat ini
 */
function renderMoveFolderList(folders, currentPath) {
    // Check if folder list exists before trying to modify it
    if (!elements.moveFolderList) {
        console.error('[MOVE_OVERLAY] Cannot render folder list: moveFolderList element not found');
        return;
    }
    
    elements.moveFolderList.innerHTML = '';
    
    // Add parent directory option (if not at root)
    if (currentPath !== '') {
        const parentPath = currentPath.split('/').slice(0, -1).join('/');
        const parentItem = createMoveFolderItem('..', parentPath, 'folder-parent');
        elements.moveFolderList.appendChild(parentItem);
    }
    
    // Add folders
    folders.forEach(folder => {
        const folderPath = currentPath === '' ? folder.name : `${currentPath}/${folder.name}`;
        const folderItem = createMoveFolderItem(folder.name, folderPath, 'folder');
        elements.moveFolderList.appendChild(folderItem);
    });
}

/**
 * Membuat item folder untuk move overlay
 * @param {string} name - Nama folder
 * @param {string} path - Path folder
 * @param {string} className - CSS class tambahan
 * @returns {HTMLElement} Elemen folder item
 */
function createMoveFolderItem(name, path, className) {
    const item = document.createElement('div');
    item.className = `move-folder-item ${className}`;
    item.dataset.path = path;
    
    const icon = document.createElement('div');
    icon.className = 'move-folder-icon';
    icon.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
    `;
    
    const label = document.createElement('div');
    label.className = 'move-folder-label';
    label.textContent = name;
    
    item.appendChild(icon);
    item.appendChild(label);
    
    // Add click handler
    item.addEventListener('click', () => {
        loadMoveDirectory(path);
    });
    
    // Add keyboard navigation
    item.tabIndex = 0;
    item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            loadMoveDirectory(path);
        }
    });
    
    return item;
}

/**
 * Memindahkan item ke target path
 */
export async function moveItems() {
    if (state.move.isLoading || state.move.paths.length === 0) {
        return;
    }

    const targetPath = elements.movePath ? encodePathSegments(elements.movePath.value) : state.move.targetPath || state.currentPath;
    
    // Validate target path
    if (!targetPath) {
        if (elements.moveHint) {
            elements.moveHint.textContent = 'Path tujuan tidak valid.';
            elements.moveHint.classList.add('error');
        }
        return;
    }

    // Check if target path is the same as current path
    if (targetPath === state.currentPath) {
        if (elements.moveHint) {
            elements.moveHint.textContent = 'Tidak dapat memindahkan ke folder yang sama.';
            elements.moveHint.classList.add('error');
        }
        return;
    }

    // Check if any item would be moved into its own subtree
    for (const sourcePath of state.move.paths) {
        if (targetPath.startsWith(sourcePath + '/')) {
            if (elements.moveHint) {
                elements.moveHint.textContent = 'Tidak dapat memindahkan folder ke dalam subfoldernya sendiri.';
                elements.moveHint.classList.add('error');
            }
            return;
        }
    }

    try {
        updateState({ move: { ...state.move, isLoading: true, error: null } });
        if (elements.moveSubmit) {
            elements.moveSubmit.disabled = true;
        }
        if (elements.moveCancel) {
            elements.moveCancel.disabled = true;
        }
        if (elements.moveHint) {
            elements.moveHint.textContent = 'Memindahkan item...';
            elements.moveHint.classList.remove('error');
        }

        const formData = new FormData();
        formData.append('action', 'move');
        formData.append('target', targetPath);
        
        state.move.paths.forEach((path, index) => {
            formData.append(`paths[${index}]`, path);
        });

        const response = await fetch(config.apiBaseUrl, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Gagal memindahkan item');
        }

        // Success - add to recent destinations
        addRecentDestination(targetPath);
        
        modalLogger.info('Items moved successfully', {
            paths: state.move.paths,
            targetPath
        });
        
        closeMoveOverlay();
        
        // Refresh current directory
        await fetchDirectory(state.currentPath);
        
    } catch (error) {
        modalLogger.error('Failed to move items', error);
        updateState({ 
            move: { 
                ...state.move, 
                isLoading: false, 
                error: error.message 
            } 
        });
        
        if (elements.moveHint) {
            elements.moveHint.textContent = `Error: ${error.message}`;
            elements.moveHint.classList.add('error');
        }
        if (elements.moveSubmit) {
            elements.moveSubmit.disabled = false;
        }
        if (elements.moveCancel) {
            elements.moveCancel.disabled = false;
        }
    }
}

/**
 * Mengatur event handler untuk move overlay
 */
export function setupMoveOverlayHandlers() {
    // Form submit - only if form exists
    if (elements.moveForm) {
        elements.moveForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!state.move.isLoading) {
                moveItems();
            }
        });
    } else {
        console.warn('[MOVE_OVERLAY] moveForm element not found');
    }

    // Path input change - only if path input exists
    if (elements.movePath) {
        elements.movePath.addEventListener('input', () => {
            if (elements.moveHint && elements.moveHint.classList.contains('error')) {
                elements.moveHint.classList.remove('error');
                elements.moveHint.textContent = 'Pilih folder tujuan untuk memindahkan item.';
            }
        });
    } else {
        console.warn('[MOVE_OVERLAY] movePath element not found');
    }

    // Cancel button - only if cancel button exists
    if (elements.moveCancel) {
        elements.moveCancel.addEventListener('click', () => {
            if (!state.move.isLoading) {
                closeMoveOverlay();
            }
        });
    } else {
        console.warn('[MOVE_OVERLAY] moveCancel element not found');
    }

    // Overlay click - only if overlay exists
    if (elements.moveOverlay) {
        elements.moveOverlay.addEventListener('click', (event) => {
            if (event.target === elements.moveOverlay && !state.move.isLoading) {
                closeMoveOverlay();
            }
        });

        // Keyboard navigation - only if overlay exists
        elements.moveOverlay.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !state.move.isLoading) {
                closeMoveOverlay();
            }
        });
    } else {
        console.warn('[MOVE_OVERLAY] moveOverlay element not found');
    }

    // Folder list keyboard navigation - only if folder list exists
    if (elements.moveFolderList) {
        elements.moveFolderList.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                const focusedItem = document.activeElement;
                const items = Array.from(elements.moveFolderList.children);
                const currentIndex = items.indexOf(focusedItem);
                if (currentIndex < items.length - 1) {
                    items[currentIndex + 1].focus();
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                const focusedItem = document.activeElement;
                const items = Array.from(elements.moveFolderList.children);
                const currentIndex = items.indexOf(focusedItem);
                if (currentIndex > 0) {
                    items[currentIndex - 1].focus();
                }
            }
        });
    } else {
        console.warn('[MOVE_OVERLAY] moveFolderList element not found');
    }
    
    // Search input handler - only if search input exists
    const moveSearchInput = document.getElementById('move-search');
    if (moveSearchInput) {
        moveSearchInput.addEventListener('input', (event) => {
            handleMoveSearch(event.target.value);
        });
        
        // Clear search on escape
        moveSearchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.target.value = '';
                handleMoveSearch('');
            }
        });
    } else {
        console.warn('[MOVE_OVERLAY] move-search element not found');
    }
    
    // Root shortcut handler - navigate to root directory
    if (elements.moveRootShortcut) {
        elements.moveRootShortcut.addEventListener('click', (event) => {
            event.preventDefault();
            if (!state.move.isLoading) {
                loadMoveDirectory('');
                modalLogger.info('Navigated to root via shortcut');
            }
        });
    } else {
        console.warn('[MOVE_OVERLAY] moveRootShortcut element not found');
    }
    
    // Current shortcut handler - navigate to current directory
    if (elements.moveCurrentShortcut) {
        elements.moveCurrentShortcut.addEventListener('click', (event) => {
            event.preventDefault();
            if (!state.move.isLoading) {
                loadMoveDirectory(state.currentPath);
                modalLogger.info('Navigated to current directory via shortcut', { path: state.currentPath });
            }
        });
    } else {
        console.warn('[MOVE_OVERLAY] moveCurrentShortcut element not found');
    }
}

/**
 * Handle search input untuk move overlay
 * @param {string} query - Search query
 */
function handleMoveSearch(query) {
    currentSearchQuery = query.toLowerCase().trim();
    
    // Get current path from state
    const currentPath = state.move.targetPath || state.currentPath;
    
    // Filter folders based on search query
    const filteredFolders = filterFolders(allFolders, currentSearchQuery);
    
    // Re-render folder list with filtered results
    renderMoveFolderList(filteredFolders, currentPath);
    
    // Show/hide "no results" message
    const folderList = elements.moveFolderList;
    if (folderList && currentSearchQuery && filteredFolders.length === 0) {
        const noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'move-no-results';
        noResultsMsg.textContent = `No folders found matching "${query}"`;
        noResultsMsg.style.cssText = `
            padding: 20px;
            text-align: center;
            color: var(--text-secondary, #666);
            font-size: 14px;
        `;
        folderList.appendChild(noResultsMsg);
    }
}

/**
 * Filter folders berdasarkan query
 * @param {Array} folders - Array of folders to filter
 * @param {string} query - Search query (already lowercased and trimmed)
 * @returns {Array} Filtered folders
 */
function filterFolders(folders, query) {
    if (!query) {
        return folders;
    }
    
    return folders.filter(folder => {
        return folder.name.toLowerCase().includes(query);
    });
}

/**
 * Load recent destinations dari localStorage
 */
function loadMoveRecentsFromStorage() {
    try {
        const stored = localStorage.getItem(RECENTS_STORAGE_KEY);
        if (stored) {
            const recents = JSON.parse(stored);
            if (Array.isArray(recents)) {
                updateState({
                    move: {
                        ...state.move,
                        recents: recents.slice(0, MAX_RECENTS)
                    }
                });
                modalLogger.info('Loaded recent destinations from storage', { count: recents.length });
            }
        }
    } catch (error) {
        modalLogger.error('Failed to load recent destinations from storage', error);
        // Reset to empty array on error
        updateState({
            move: {
                ...state.move,
                recents: []
            }
        });
    }
}

/**
 * Save recent destinations ke localStorage
 */
function saveMoveRecentsToStorage() {
    try {
        const recents = state.move.recents || [];
        localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
        modalLogger.info('Saved recent destinations to storage', { count: recents.length });
    } catch (error) {
        modalLogger.error('Failed to save recent destinations to storage', error);
    }
}

/**
 * Tambah destinasi baru ke recent destinations
 * @param {string} path - Path destinasi yang akan ditambahkan
 */
function addRecentDestination(path) {
    if (!path || path === '') {
        return;
    }

    try {
        let recents = [...(state.move.recents || [])];
        
        // Remove path if already exists (to move it to front)
        recents = recents.filter(r => r !== path);
        
        // Add to front
        recents.unshift(path);
        
        // Keep only MAX_RECENTS items
        recents = recents.slice(0, MAX_RECENTS);
        
        // Update state
        updateState({
            move: {
                ...state.move,
                recents: recents
            }
        });
        
        // Save to localStorage
        saveMoveRecentsToStorage();
        
        modalLogger.info('Added recent destination', { path, totalRecents: recents.length });
    } catch (error) {
        modalLogger.error('Failed to add recent destination', error);
    }
}

/**
 * Update UI untuk recent destinations
 */
function updateMoveRecentsUI() {
    const recentsContainer = document.getElementById('move-recents');
    
    if (!recentsContainer) {
        console.warn('[MOVE_OVERLAY] move-recents element not found, skipping UI update');
        return;
    }
    
    const recents = state.move.recents || [];
    
    if (recents.length === 0) {
        recentsContainer.hidden = true;
        recentsContainer.innerHTML = '';
        return;
    }
    
    recentsContainer.hidden = false;
    recentsContainer.innerHTML = '';
    
    // Create title
    const title = document.createElement('div');
    title.className = 'move-recents-title';
    title.textContent = 'Recent Destinations:';
    title.style.cssText = `
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary, #666);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;
    recentsContainer.appendChild(title);
    
    // Create list container
    const listContainer = document.createElement('div');
    listContainer.className = 'move-recents-list';
    listContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
    `;
    
    // Add each recent destination
    recents.forEach((path, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'move-recent-item';
        item.dataset.path = path;
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border: 1px solid var(--border, #e0e0e0);
            border-radius: 6px;
            background: var(--surface, #fff);
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: left;
            width: 100%;
        `;
        
        // Icon
        const icon = document.createElement('span');
        icon.className = 'move-recent-icon';
        icon.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
        icon.style.cssText = `
            flex-shrink: 0;
            color: var(--primary, #2196F3);
            display: flex;
            align-items: center;
        `;
        
        // Label
        const label = document.createElement('span');
        label.className = 'move-recent-label';
        label.textContent = path === '' ? '/ (Root)' : path;
        label.style.cssText = `
            flex: 1;
            font-size: 14px;
            color: var(--text-primary, #333);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        
        item.appendChild(icon);
        item.appendChild(label);
        
        // Click handler
        item.addEventListener('click', () => {
            loadMoveDirectory(path);
        });
        
        // Hover effect
        item.addEventListener('mouseenter', () => {
            item.style.background = 'var(--hover, #f5f5f5)';
            item.style.borderColor = 'var(--primary, #2196F3)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.background = 'var(--surface, #fff)';
            item.style.borderColor = 'var(--border, #e0e0e0)';
        });
        
        // Keyboard navigation
        item.tabIndex = 0;
        item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                loadMoveDirectory(path);
            }
        });
        
        listContainer.appendChild(item);
    });
    
    recentsContainer.appendChild(listContainer);
    
    modalLogger.info('Updated recent destinations UI', { count: recents.length });
}

/**
 * Export fungsi-fungsi recent destinations untuk testing
 */
export {
    loadMoveRecentsFromStorage,
    saveMoveRecentsToStorage,
    addRecentDestination,
    updateMoveRecentsUI
};
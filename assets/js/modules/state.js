/**
 * State Management Module
 * Mengelola state global aplikasi file manager
 */

export const state = {
    currentPath: '',
    parentPath: null,
    knownItems: new Map(),
    lastUpdated: null,
    polling: null,
    items: [],
    filter: '',
    isLoading: false,
    isDeleting: false,
    sortKey: 'name',
    sortDirection: 'asc',
    selected: new Set(),
    visibleItems: [],
    itemMap: new Map(),
    preview: {
        isOpen: false,
        lastFocusedElement: null,
        path: null,
        originalContent: '',
        dirty: false,
        isSaving: false,
        mode: 'text', // 'text' or 'media'
    },
    confirm: {
        isOpen: false,
        paths: [],
    },
    create: {
        isOpen: false,
        kind: 'file',
    },
    rename: {
        isOpen: false,
        targetItem: null,
        originalName: '',
    },
    unsaved: {
        isOpen: false,
        callback: null,
    },
    contextMenu: {
        isOpen: false,
        targetItem: null,
    },
    drag: {
        isDragging: false,
        draggedItem: null,
        dropTarget: null,
    },
    move: {
        isOpen: false,
        sources: [],
        browserPath: '',
        selectedTarget: null,
        isLoading: false,
        isMoving: false,
        search: '',
        currentFolders: [],
        lastData: null,
        recents: [],
    },
    logs: {
        isOpen: false,
        isLoading: false,
        currentPage: 1,
        totalPages: 1,
        filter: '',
        activeFilters: {},
        data: [],
        isCleaningUp: false,
        refreshInterval: null,
    },
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 1,
    },
};

/**
 * Mengupdate state dengan perubahan yang diberikan
 * @param {Object} updates - Objek berisi properti yang akan diupdate
 */
export function updateState(updates) {
    // Deep merge untuk nested objects
    Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
            if (typeof state[key] === 'object' && state[key] !== null && !Array.isArray(state[key])) {
                state[key] = { ...state[key], ...updates[key] };
            } else {
                state[key] = { ...updates[key] };
            }
        } else {
            state[key] = updates[key];
        }
    });
}

/**
 * State update lock untuk mencegah race conditions
 */
let stateUpdateLock = false;

/**
 * Mengupdate state dengan locking untuk mencegah race conditions
 * @param {Object} updates - Objek berisi properti yang akan diupdate
 */
export function updateStateLocked(updates) {
    if (stateUpdateLock) {
        console.warn('[STATE] State update in progress, queuing update:', updates);
        setTimeout(() => updateStateLocked(updates), 10);
        return;
    }
    
    stateUpdateLock = true;
    try {
        updateState(updates);
    } finally {
        stateUpdateLock = false;
    }
}

/**
 * Mengambil nilai state berdasarkan path
 * @param {string} path - Path ke properti state (misal: 'preview.isOpen')
 * @returns {*} Nilai dari state yang diminta
 */
export function getStateValue(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], state);
}

/**
 * Mengatur nilai state berdasarkan path
 * @param {string} path - Path ke properti state (misal: 'preview.isOpen')
 * @param {*} value - Nilai yang akan diatur
 */
export function setStateValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj && obj[key], state);
    
    if (target && lastKey) {
        target[lastKey] = value;
    }
}

/**
 * Reset state ke nilai default
 */
export function resetState() {
    // Reset state ke nilai awal
    state.currentPath = '';
    state.parentPath = null;
    state.knownItems.clear();
    state.lastUpdated = null;
    state.polling = null;
    state.items = [];
    state.filter = '';
    state.isLoading = false;
    state.isDeleting = false;
    state.sortKey = 'name';
    state.sortDirection = 'asc';
    state.selected.clear();
    state.visibleItems = [];
    state.itemMap.clear();
    
    // Reset preview state
    state.preview.isOpen = false;
    state.preview.lastFocusedElement = null;
    state.preview.path = null;
    state.preview.originalContent = '';
    state.preview.dirty = false;
    state.preview.isSaving = false;
    state.preview.mode = 'text';
    
    // Reset other states
    state.confirm.isOpen = false;
    state.confirm.paths = [];
    state.create.isOpen = false;
    state.create.kind = 'file';
    state.rename.isOpen = false;
    state.rename.targetItem = null;
    state.rename.originalName = '';
    state.unsaved.isOpen = false;
    state.unsaved.callback = null;
    state.contextMenu.isOpen = false;
    state.contextMenu.targetItem = null;
    state.drag.isDragging = false;
    state.drag.draggedItem = null;
    state.drag.dropTarget = null;
}
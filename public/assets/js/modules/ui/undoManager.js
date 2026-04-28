/**
 * Undo Manager Module
 * ====================
 * Tracks file operations and provides undo capability.
 * 
 * Supported undoable operations:
 * - delete  → restore from trash (using trashIds)
 * - move    → reverse move (swap source/target)
 * - rename  → reverse rename (swap old/new name)
 * - copy    → delete the copied items
 * 
 * Each operation is stored with enough metadata to reverse it.
 * Shows "Undo" button in success toasts.
 */

import { debugLog, debugError } from '../debug.js';

// ─── Configuration ───────────────────────────────────────────────
const MAX_HISTORY = 20;
const UNDO_TOAST_DURATION = 6000; // 6s to give user time to click Undo

// ─── State ───────────────────────────────────────────────────────
const undoStack = [];
let fetchDirectoryFn = null;
let getCurrentPathFn = null;

/**
 * Initialize the undo manager with required dependencies
 * @param {Object} deps
 * @param {Function} deps.fetchDirectory - Function to refresh directory listing
 * @param {Function} deps.getCurrentPath - Function to get current directory path
 */
export function initUndoManager(deps) {
    fetchDirectoryFn = deps.fetchDirectory;
    getCurrentPathFn = deps.getCurrentPath;
    debugLog('[UndoManager] Initialized');
}

/**
 * Push an undoable operation onto the stack
 * @param {Object} operation
 * @param {string} operation.type - 'delete' | 'move' | 'rename' | 'copy' | 'bulk-rename'
 * @param {string} operation.description - Human-readable description
 * @param {Object} operation.data - Operation-specific data for reversal
 */
export function pushUndo(operation) {
    undoStack.push({
        ...operation,
        timestamp: Date.now()
    });

    // Trim stack if too large
    if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
    }

    debugLog('[UndoManager] Pushed:', operation.type, operation.description);
}

/**
 * Check if there are undoable operations
 * @returns {boolean}
 */
export function canUndo() {
    return undoStack.length > 0;
}

/**
 * Get the last operation description (for UI display)
 * @returns {string|null}
 */
export function getLastOperationDescription() {
    if (undoStack.length === 0) return null;
    return undoStack[undoStack.length - 1].description;
}

/**
 * Execute undo for the last operation
 * @returns {Promise<boolean>} Whether undo was successful
 */
export async function undo() {
    if (undoStack.length === 0) {
        window.showWarning?.('Tidak ada operasi yang bisa di-undo.');
        return false;
    }

    const operation = undoStack.pop();
    debugLog('[UndoManager] Undoing:', operation.type, operation.description);

    try {
        switch (operation.type) {
        case 'delete':
            return await undoDelete(operation.data);
        case 'move':
            return await undoMove(operation.data);
        case 'rename':
            return await undoRename(operation.data);
        case 'copy':
            return await undoCopy(operation.data);
        case 'bulk-rename':
            return await undoBulkRename(operation.data);
        default:
            debugError('[UndoManager] Unknown operation type:', operation.type);
            window.showError?.('Operasi undo tidak dikenali.');
            return false;
        }
    } catch (error) {
        debugError('[UndoManager] Undo failed:', error);
        window.showError?.(`Gagal undo: ${error.message || 'Terjadi kesalahan.'}`);
        return false;
    }
}

/**
 * Show a success toast with an "Undo" action button
 * @param {string} message - Success message
 * @param {string} title - Toast title
 */
export function showUndoToast(message, title = 'Berhasil') {
    window.showToast?.('success', message, title, UNDO_TOAST_DURATION, [
        {
            label: 'Undo',
            callback: () => {
                undo().then(success => {
                    if (success) {
                        window.showSuccess?.('Undo berhasil.');
                    }
                });
            }
        }
    ]);
}

/**
 * Clear the undo stack
 */
export function clearUndoStack() {
    undoStack.length = 0;
    debugLog('[UndoManager] Stack cleared');
}

/**
 * Get current stack size (for debugging/UI)
 * @returns {number}
 */
export function getUndoStackSize() {
    return undoStack.length;
}

// ─── Undo Handlers ──────────────────────────────────────────────

/**
 * Undo delete: restore items from trash
 * @param {Object} data - { trashIds: string[] }
 */
async function undoDelete(data) {
    const { trashIds } = data;
    if (!trashIds || trashIds.length === 0) {
        window.showError?.('Tidak ada data trash untuk di-restore.');
        return false;
    }

    const response = await fetch('api.php?action=trash-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: trashIds })
    });

    const result = await response.json();

    if (result.success || (result.restored && result.restored.length > 0)) {
        await refreshDirectory();
        return true;
    }

    const errorMsg = result.errors?.[0]?.error || 'Gagal me-restore item dari trash.';
    throw new Error(errorMsg);
}

/**
 * Undo move: move items back to original location
 * @param {Object} data - { moves: Array<{sourcePath, targetPath, movedName}> }
 */
async function undoMove(data) {
    const { moves } = data;
    if (!moves || moves.length === 0) return false;

    let successCount = 0;
    for (const move of moves) {
        // Reverse: move from targetPath back to sourcePath's parent
        const movedItemPath = move.targetPath
            ? `${move.targetPath}/${move.movedName}`
            : move.movedName;
        const originalParent = getParentPath(move.sourcePath);

        try {
            const response = await fetch('api.php?action=move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourcePath: movedItemPath,
                    targetPath: originalParent
                })
            });

            const result = await response.json();
            if (result.success) successCount++;
        } catch (e) {
            debugError('[UndoManager] Failed to reverse move:', movedItemPath, e);
        }
    }

    if (successCount > 0) {
        await refreshDirectory();
        return true;
    }

    throw new Error('Gagal memindahkan item kembali.');
}

/**
 * Undo rename: rename back to original name
 * @param {Object} data - { oldPath, newPath, oldName, newName }
 */
async function undoRename(data) {
    const { oldPath, newPath, oldName } = data;

    const response = await fetch(`api.php?action=rename&path=${encodeURIComponent(newPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            newName: oldName,
            newPath: oldPath
        })
    });

    const result = await response.json();

    if (result.success) {
        await refreshDirectory();
        return true;
    }

    throw new Error(result.error || 'Gagal mengembalikan nama item.');
}

/**
 * Undo copy: delete the copied items
 * @param {Object} data - { copiedPaths: string[] }
 */
async function undoCopy(data) {
    const { copiedPaths } = data;
    if (!copiedPaths || copiedPaths.length === 0) return false;

    const response = await fetch('api.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: copiedPaths })
    });

    const result = await response.json();

    if (result.success || (result.deleted && result.deleted.length > 0)) {
        await refreshDirectory();
        return true;
    }

    throw new Error('Gagal menghapus item yang disalin.');
}

/**
 * Undo bulk rename: rename items back to original names
 * @param {Object} data - { renames: Array<{oldPath, newName}> }
 */
async function undoBulkRename(data) {
    const { renames } = data;
    if (!renames || renames.length === 0) return false;

    let successCount = 0;
    for (const entry of renames) {
        try {
            const response = await fetch(`api.php?action=rename&path=${encodeURIComponent(entry.oldPath)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newName: entry.newName,
                    newPath: getParentPath(entry.oldPath)
                        ? `${getParentPath(entry.oldPath)}/${entry.newName}`
                        : entry.newName
                })
            });

            const result = await response.json();
            if (result.success) successCount++;
        } catch (e) {
            debugError('[UndoManager] Failed to undo bulk rename entry:', entry, e);
        }
    }

    if (successCount > 0) {
        await refreshDirectory();
        return true;
    }

    throw new Error('Gagal mengembalikan nama item.');
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Get parent path from a full path
 * @param {string} path
 * @returns {string}
 */
function getParentPath(path) {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash > 0 ? path.substring(0, lastSlash) : '';
}

/**
 * Refresh the current directory listing
 */
async function refreshDirectory() {
    if (fetchDirectoryFn && getCurrentPathFn) {
        await fetchDirectoryFn(getCurrentPathFn(), { silent: true });
    }
}

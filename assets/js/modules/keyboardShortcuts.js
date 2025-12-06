/**
 * Keyboard Shortcuts Module
 * Provides comprehensive keyboard shortcut support for the File Manager
 * 
 * Features:
 * - File operations (copy, cut, paste, delete, rename)
 * - Navigation shortcuts (up, back, refresh)
 * - New item creation
 * - Search focus
 * - Help modal with shortcuts reference
 */

import { state } from './state.js';
import { debugLog } from './debug.js';
import { announce } from './accessibility.js';

// ============================================================================
// Shortcut Definitions
// ============================================================================

/**
 * Default keyboard shortcuts configuration
 * Format: { key, ctrl, shift, alt, action, description, category }
 */
const DEFAULT_SHORTCUTS = [
    // File Operations
    { key: 'c', ctrl: true, shift: false, alt: false, action: 'copy', description: 'Salin file terpilih', category: 'File Operations' },
    { key: 'x', ctrl: true, shift: false, alt: false, action: 'cut', description: 'Potong file terpilih', category: 'File Operations' },
    { key: 'v', ctrl: true, shift: false, alt: false, action: 'paste', description: 'Tempel file', category: 'File Operations' },
    { key: 'Delete', ctrl: false, shift: false, alt: false, action: 'delete', description: 'Hapus file terpilih', category: 'File Operations' },
    { key: 'F2', ctrl: false, shift: false, alt: false, action: 'rename', description: 'Ubah nama file terpilih', category: 'File Operations' },
    { key: 'a', ctrl: true, shift: false, alt: false, action: 'selectAll', description: 'Pilih semua file', category: 'File Operations' },
    { key: 'Escape', ctrl: false, shift: false, alt: false, action: 'deselect', description: 'Batalkan pilihan / Tutup overlay', category: 'File Operations' },
    { key: 'd', ctrl: true, shift: false, alt: false, action: 'download', description: 'Unduh file terpilih', category: 'File Operations' },
    
    // Navigation
    { key: 'Backspace', ctrl: false, shift: false, alt: false, action: 'goUp', description: 'Ke folder induk', category: 'Navigation' },
    { key: 'Enter', ctrl: false, shift: false, alt: false, action: 'open', description: 'Buka file/folder', category: 'Navigation' },
    { key: 'ArrowLeft', ctrl: false, shift: false, alt: true, action: 'goBack', description: 'Kembali ke folder sebelumnya', category: 'Navigation' },
    
    // Create New
    { key: 'n', ctrl: true, shift: false, alt: false, action: 'newFile', description: 'Buat file baru', category: 'Create' },
    { key: 'N', ctrl: true, shift: true, alt: false, action: 'newFolder', description: 'Buat folder baru', category: 'Create' },
    
    // Search & Refresh
    { key: 'f', ctrl: true, shift: false, alt: false, action: 'search', description: 'Fokus ke pencarian', category: 'Search' },
    { key: '/', ctrl: false, shift: false, alt: false, action: 'search', description: 'Fokus ke pencarian', category: 'Search' },
    { key: 'r', ctrl: true, shift: false, alt: false, action: 'refresh', description: 'Refresh daftar file', category: 'Refresh' },
    { key: 'F5', ctrl: false, shift: false, alt: false, action: 'refresh', description: 'Refresh daftar file', category: 'Refresh' },
    
    // Help
    { key: '/', ctrl: true, shift: false, alt: false, action: 'showHelp', description: 'Tampilkan bantuan pintasan', category: 'Help' },
    { key: '?', ctrl: false, shift: true, alt: false, action: 'showHelp', description: 'Tampilkan bantuan pintasan', category: 'Help' },
];

// Storage key for custom shortcuts
const SHORTCUTS_STORAGE_KEY = 'filemanager_shortcuts';

// ============================================================================
// State Management
// ============================================================================

let shortcuts = [...DEFAULT_SHORTCUTS];
let isEnabled = true;
let actionHandlers = {};
let helpModalVisible = false;

/**
 * Load shortcuts from localStorage
 */
function loadShortcuts() {
    try {
        const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
        if (stored) {
            const customShortcuts = JSON.parse(stored);
            // Merge with defaults
            shortcuts = DEFAULT_SHORTCUTS.map(def => {
                const custom = customShortcuts.find(c => c.action === def.action);
                return custom ? { ...def, ...custom } : def;
            });
            debugLog('[KeyboardShortcuts] Loaded custom shortcuts');
        }
    } catch (e) {
        debugLog('[KeyboardShortcuts] Failed to load custom shortcuts:', e);
    }
}

/**
 * Save shortcuts to localStorage
 */
function saveShortcuts() {
    try {
        localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
        debugLog('[KeyboardShortcuts] Saved shortcuts');
    } catch (e) {
        debugLog('[KeyboardShortcuts] Failed to save shortcuts:', e);
    }
}

// ============================================================================
// Shortcut Matching
// ============================================================================

/**
 * Check if a keyboard event matches a shortcut definition
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Object} shortcut - The shortcut definition
 * @returns {boolean} Whether the event matches the shortcut
 */
function matchesShortcut(event, shortcut) {
    const ctrlMatch = shortcut.ctrl === (event.ctrlKey || event.metaKey);
    const shiftMatch = shortcut.shift === event.shiftKey;
    const altMatch = shortcut.alt === event.altKey;
    
    // Handle special keys
    let keyMatch = false;
    if (shortcut.key.length === 1) {
        // Single character keys - compare case-insensitively
        keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
    } else {
        // Special keys (Enter, Escape, F2, etc.)
        keyMatch = event.key === shortcut.key;
    }
    
    return keyMatch && ctrlMatch && shiftMatch && altMatch;
}

/**
 * Find matching shortcut for an event
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {Object|null} The matching shortcut or null
 */
function findMatchingShortcut(event) {
    return shortcuts.find(shortcut => matchesShortcut(event, shortcut)) || null;
}

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Register action handlers
 * @param {Object} handlers - Object mapping action names to handler functions
 */
export function registerHandlers(handlers) {
    actionHandlers = { ...actionHandlers, ...handlers };
    debugLog('[KeyboardShortcuts] Registered handlers:', Object.keys(handlers));
}

/**
 * Execute an action
 * @param {string} action - The action name
 * @param {KeyboardEvent} event - The original keyboard event
 * @returns {boolean} Whether the action was handled
 */
function executeAction(action, event) {
    const handler = actionHandlers[action];
    if (handler && typeof handler === 'function') {
        try {
            handler(event);
            debugLog('[KeyboardShortcuts] Executed action:', action);
            return true;
        } catch (e) {
            debugLog('[KeyboardShortcuts] Action error:', action, e);
            return false;
        }
    }
    debugLog('[KeyboardShortcuts] No handler for action:', action);
    return false;
}

// ============================================================================
// Keyboard Event Handler
// ============================================================================

/**
 * Main keyboard event handler
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyDown(event) {
    // Skip if shortcuts are disabled
    if (!isEnabled) return;

    // Skip if focus is in an input field (unless it's Escape)
    const activeElement = document.activeElement;
    const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName) ||
                          activeElement.isContentEditable;

    // Always handle Escape, even in inputs
    if (event.key === 'Escape') {
        // Check if help modal is visible
        if (helpModalVisible) {
            hideHelpModal();
            event.preventDefault();
            return;
        }

        // Check for open overlays
        if (state.unsaved?.isOpen || state.confirm?.isOpen || state.create?.isOpen || 
            state.rename?.isOpen || state.preview?.isOpen || state.move?.isOpen) {
            // Let the overlay handlers handle it
            return;
        }

        // Deselect all if nothing else to close
        if (state.selected?.size > 0) {
            executeAction('deselect', event);
            event.preventDefault();
            return;
        }
    }

    // Skip other shortcuts if in input
    if (isInputActive && event.key !== 'Escape') {
        // Allow Ctrl+A in inputs normally
        if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
            return;
        }
        // Allow search shortcut to blur and then focus search
        if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            activeElement.blur();
            executeAction('search', event);
            return;
        }
        return;
    }

    // Find matching shortcut
    const shortcut = findMatchingShortcut(event);
    if (!shortcut) return;

    // Prevent default browser behavior
    event.preventDefault();
    event.stopPropagation();

    // Execute the action
    const handled = executeAction(shortcut.action, event);
    
    if (handled) {
        // Announce action for screen readers
        announce(`Pintasan ${shortcut.description} dijalankan`);
    }
}

// ============================================================================
// Help Modal
// ============================================================================

/**
 * Create and show the keyboard shortcuts help modal
 */
export function showHelpModal() {
    // Check if modal already exists
    let modal = document.getElementById('shortcuts-help-modal');
    
    if (!modal) {
        modal = createHelpModal();
        document.body.appendChild(modal);
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    helpModalVisible = true;

    // Focus the close button
    const closeBtn = modal.querySelector('.shortcuts-help-close');
    if (closeBtn) closeBtn.focus();

    announce('Modal bantuan pintasan keyboard dibuka');
    debugLog('[KeyboardShortcuts] Help modal shown');
}

/**
 * Hide the keyboard shortcuts help modal
 */
export function hideHelpModal() {
    const modal = document.getElementById('shortcuts-help-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        helpModalVisible = false;
        announce('Modal bantuan pintasan keyboard ditutup');
        debugLog('[KeyboardShortcuts] Help modal hidden');
    }
}

/**
 * Create the help modal element
 * @returns {HTMLElement} The modal element
 */
function createHelpModal() {
    const modal = document.createElement('div');
    modal.id = 'shortcuts-help-modal';
    modal.className = 'shortcuts-help-overlay fixed inset-0 flex items-center justify-center bg-black/45 p-4 z-50 hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'shortcuts-help-title');
    modal.setAttribute('aria-hidden', 'true');

    // Group shortcuts by category
    const categories = {};
    shortcuts.forEach(shortcut => {
        if (!categories[shortcut.category]) {
            categories[shortcut.category] = [];
        }
        categories[shortcut.category].push(shortcut);
    });

    // Generate HTML
    let categoriesHtml = '';
    for (const [category, categoryShortcuts] of Object.entries(categories)) {
        categoriesHtml += `
            <div class="shortcuts-category">
                <h3 class="shortcuts-category-title">${category}</h3>
                <div class="shortcuts-list">
                    ${categoryShortcuts.map(s => `
                        <div class="shortcut-item">
                            <span class="shortcut-keys">${formatShortcutKeys(s)}</span>
                            <span class="shortcut-description">${s.description}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="shortcuts-help-dialog bg-white dark:bg-[#1a2332] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <header class="shortcuts-help-header px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <h2 id="shortcuts-help-title" class="text-lg font-semibold text-gray-900 dark:text-slate-200">
                    Pintasan Keyboard
                </h2>
                <button type="button" class="shortcuts-help-close p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="Tutup">
                    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </header>
            <div class="shortcuts-help-body flex-1 overflow-y-auto px-6 py-4">
                <div class="shortcuts-categories grid gap-6 md:grid-cols-2">
                    ${categoriesHtml}
                </div>
            </div>
            <footer class="shortcuts-help-footer px-6 py-3 border-t border-gray-200 dark:border-white/10 text-center">
                <p class="text-sm text-gray-500 dark:text-slate-400">
                    Tekan <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">/</kbd> atau <kbd class="kbd">?</kbd> untuk membuka bantuan ini
                </p>
            </footer>
        </div>
    `;

    // Add event listeners
    const closeBtn = modal.querySelector('.shortcuts-help-close');
    closeBtn.addEventListener('click', hideHelpModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideHelpModal();
        }
    });

    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            hideHelpModal();
        }
    });

    return modal;
}

/**
 * Format shortcut keys for display
 * @param {Object} shortcut - The shortcut definition
 * @returns {string} Formatted key combination
 */
function formatShortcutKeys(shortcut) {
    const parts = [];
    
    if (shortcut.ctrl) {
        parts.push('<kbd class="kbd">Ctrl</kbd>');
    }
    if (shortcut.shift) {
        parts.push('<kbd class="kbd">Shift</kbd>');
    }
    if (shortcut.alt) {
        parts.push('<kbd class="kbd">Alt</kbd>');
    }
    
    // Format the main key
    let keyDisplay = shortcut.key;
    switch (shortcut.key) {
        case 'Backspace': keyDisplay = '⌫'; break;
        case 'Delete': keyDisplay = 'Del'; break;
        case 'Escape': keyDisplay = 'Esc'; break;
        case 'Enter': keyDisplay = '↵'; break;
        case 'ArrowUp': keyDisplay = '↑'; break;
        case 'ArrowDown': keyDisplay = '↓'; break;
        case 'ArrowLeft': keyDisplay = '←'; break;
        case 'ArrowRight': keyDisplay = '→'; break;
        case ' ': keyDisplay = 'Space'; break;
    }
    
    parts.push(`<kbd class="kbd">${keyDisplay}</kbd>`);
    
    return parts.join(' + ');
}

// ============================================================================
// Clipboard Operations (Cut/Copy/Paste)
// ============================================================================

// Clipboard state
let clipboard = {
    items: [],
    operation: null, // 'copy' or 'cut'
};

/**
 * Copy selected items to clipboard
 * @returns {Array} The copied items
 */
export function copySelectedItems() {
    const selectedPaths = Array.from(state.selected || []);
    if (selectedPaths.length === 0) {
        announce('Tidak ada item yang dipilih untuk disalin');
        return [];
    }

    clipboard = {
        items: selectedPaths,
        operation: 'copy',
    };

    announce(`${selectedPaths.length} item disalin ke clipboard`);
    debugLog('[KeyboardShortcuts] Copied to clipboard:', selectedPaths);
    
    return selectedPaths;
}

/**
 * Cut selected items to clipboard
 * @returns {Array} The cut items
 */
export function cutSelectedItems() {
    const selectedPaths = Array.from(state.selected || []);
    if (selectedPaths.length === 0) {
        announce('Tidak ada item yang dipilih untuk dipotong');
        return [];
    }

    clipboard = {
        items: selectedPaths,
        operation: 'cut',
    };

    // Add visual indicator for cut items
    selectedPaths.forEach(path => {
        const row = document.querySelector(`tr[data-item-path="${CSS.escape(path)}"]`);
        if (row) {
            row.classList.add('item-cut');
        }
    });

    announce(`${selectedPaths.length} item dipotong ke clipboard`);
    debugLog('[KeyboardShortcuts] Cut to clipboard:', selectedPaths);
    
    return selectedPaths;
}

/**
 * Get clipboard contents
 * @returns {Object} The clipboard state
 */
export function getClipboard() {
    return { ...clipboard };
}

/**
 * Clear clipboard
 */
export function clearClipboard() {
    // Remove cut visual indicator
    clipboard.items.forEach(path => {
        const row = document.querySelector(`tr[data-item-path="${CSS.escape(path)}"]`);
        if (row) {
            row.classList.remove('item-cut');
        }
    });

    clipboard = {
        items: [],
        operation: null,
    };
    
    debugLog('[KeyboardShortcuts] Clipboard cleared');
}

/**
 * Check if clipboard has items
 * @returns {boolean} Whether clipboard has items
 */
export function hasClipboardItems() {
    return clipboard.items.length > 0;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize keyboard shortcuts
 * @param {Object} handlers - Action handler functions
 */
export function initKeyboardShortcuts(handlers = {}) {
    // Load custom shortcuts
    loadShortcuts();

    // Register handlers
    if (Object.keys(handlers).length > 0) {
        registerHandlers(handlers);
    }

    // Register default handlers for clipboard operations
    registerHandlers({
        copy: copySelectedItems,
        cut: cutSelectedItems,
        showHelp: showHelpModal,
    });

    // Add global keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    debugLog('[KeyboardShortcuts] Keyboard shortcuts initialized');
}

/**
 * Enable keyboard shortcuts
 */
export function enableShortcuts() {
    isEnabled = true;
    debugLog('[KeyboardShortcuts] Shortcuts enabled');
}

/**
 * Disable keyboard shortcuts
 */
export function disableShortcuts() {
    isEnabled = false;
    debugLog('[KeyboardShortcuts] Shortcuts disabled');
}

/**
 * Check if shortcuts are enabled
 * @returns {boolean} Whether shortcuts are enabled
 */
export function areShortcutsEnabled() {
    return isEnabled;
}

/**
 * Get all shortcuts
 * @returns {Array} The shortcuts array
 */
export function getShortcuts() {
    return [...shortcuts];
}

/**
 * Update a shortcut
 * @param {string} action - The action name
 * @param {Object} updates - The updates to apply
 */
export function updateShortcut(action, updates) {
    const index = shortcuts.findIndex(s => s.action === action);
    if (index >= 0) {
        shortcuts[index] = { ...shortcuts[index], ...updates };
        saveShortcuts();
        debugLog('[KeyboardShortcuts] Updated shortcut:', action, updates);
    }
}

/**
 * Reset shortcuts to defaults
 */
export function resetShortcuts() {
    shortcuts = [...DEFAULT_SHORTCUTS];
    localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    debugLog('[KeyboardShortcuts] Shortcuts reset to defaults');
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Cleanup keyboard shortcuts
 */
export function cleanupKeyboardShortcuts() {
    document.removeEventListener('keydown', handleKeyDown);
    
    // Remove help modal if exists
    const modal = document.getElementById('shortcuts-help-modal');
    if (modal) {
        modal.remove();
    }

    // Clear state
    clipboard = { items: [], operation: null };
    actionHandlers = {};
    isEnabled = true;
    helpModalVisible = false;

    debugLog('[KeyboardShortcuts] Keyboard shortcuts cleaned up');
}

// ============================================================================
// Export convenience object
// ============================================================================

export const keyboardShortcuts = {
    init: initKeyboardShortcuts,
    cleanup: cleanupKeyboardShortcuts,
    registerHandlers,
    enable: enableShortcuts,
    disable: disableShortcuts,
    isEnabled: areShortcutsEnabled,
    showHelp: showHelpModal,
    hideHelp: hideHelpModal,
    getShortcuts,
    updateShortcut,
    resetShortcuts,
    copySelectedItems,
    cutSelectedItems,
    getClipboard,
    clearClipboard,
    hasClipboardItems,
};

export default keyboardShortcuts;
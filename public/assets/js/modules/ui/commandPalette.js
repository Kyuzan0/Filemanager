/**
 * Command Palette Module
 * ======================
 * VS Code-style command palette (Ctrl+K)
 * - Fuzzy search across commands and files
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Action execution with shortcut hints
 * - File search mode (type to navigate to files)
 *
 * @module commandPalette
 */

// ── State ──
let paletteEl = null;
let inputEl = null;
let resultsEl = null;
let badgeEl = null;
let activeIndex = -1;
let filteredItems = [];
let isOpen = false;
let actionHandlers = {};
let currentMode = 'commands'; // 'commands' | 'files'

// ── Command Registry ──
const COMMANDS = [
    // File Operations
    { id: 'copy', label: 'Copy', desc: 'Copy selected items', icon: '📋', category: 'File Operations', shortcut: 'Ctrl+C' },
    { id: 'cut', label: 'Cut', desc: 'Cut selected items', icon: '✂️', category: 'File Operations', shortcut: 'Ctrl+X' },
    { id: 'paste', label: 'Paste', desc: 'Paste items from clipboard', icon: '📌', category: 'File Operations', shortcut: 'Ctrl+V' },
    { id: 'rename', label: 'Rename', desc: 'Rename selected item', icon: '✏️', category: 'File Operations', shortcut: 'F2' },
    { id: 'delete', label: 'Delete', desc: 'Delete selected items', icon: '🗑️', category: 'File Operations', shortcut: 'Del' },
    { id: 'download', label: 'Download', desc: 'Download selected item', icon: '⬇️', category: 'File Operations', shortcut: 'Ctrl+D' },
    { id: 'details', label: 'Properties', desc: 'Show file/folder properties', icon: 'ℹ️', category: 'File Operations' },
    { id: 'select-all', label: 'Select All', desc: 'Select all items', icon: '☑️', category: 'File Operations', shortcut: 'Ctrl+A' },
    { id: 'undo', label: 'Undo', desc: 'Undo last operation', icon: '↩️', category: 'File Operations', shortcut: 'Ctrl+Z' },
    { id: 'bulk-rename', label: 'Bulk Rename', desc: 'Rename multiple selected items at once', icon: '📝', category: 'File Operations' },
    { id: 'content-search', label: 'Search in Files', desc: 'Full-text search across file contents', icon: '🔍', category: 'File Operations', shortcut: 'Ctrl+Shift+F' },
    { id: 'share', label: 'Share', desc: 'Create shareable link for selected item', icon: '🔗', category: 'File Operations' },

    // Create
    { id: 'new-file', label: 'New File', desc: 'Create a new file', icon: '📄', category: 'Create', shortcut: 'Ctrl+N' },
    { id: 'new-folder', label: 'New Folder', desc: 'Create a new folder', icon: '📁', category: 'Create', shortcut: 'Ctrl+Shift+N' },

    // Navigation
    { id: 'go-up', label: 'Go Up', desc: 'Navigate to parent folder', icon: '⬆️', category: 'Navigation', shortcut: 'Backspace' },
    { id: 'go-back', label: 'Go Back', desc: 'Navigate to previous folder', icon: '◀️', category: 'Navigation', shortcut: 'Alt+←' },
    { id: 'refresh', label: 'Refresh', desc: 'Refresh current directory', icon: '🔄', category: 'Navigation', shortcut: 'Ctrl+R' },

    // Views
    { id: 'view-logs', label: 'Activity Logs', desc: 'Open activity log viewer', icon: '📊', category: 'Views' },
    { id: 'view-trash', label: 'Trash', desc: 'Open trash bin', icon: '🗑️', category: 'Views' },
    { id: 'view-dashboard', label: 'Dashboard', desc: 'Open analytics dashboard', icon: '📈', category: 'Views' },

    // Upload
    { id: 'upload-files', label: 'Upload Files', desc: 'Upload files to current folder', icon: '📤', category: 'Upload' },
    { id: 'upload-folder', label: 'Upload Folder', desc: 'Upload an entire folder', icon: '📂', category: 'Upload' },

    // Settings
    { id: 'toggle-theme', label: 'Toggle Dark Mode', desc: 'Switch between light and dark theme', icon: '🌓', category: 'Settings' },
    { id: 'show-shortcuts', label: 'Keyboard Shortcuts', desc: 'Show all keyboard shortcuts', icon: '⌨️', category: 'Settings', shortcut: 'Ctrl+/' },

    // Layout
    { id: 'split-pane', label: 'Toggle Split Pane', desc: 'Open/close dual-pane file browser', icon: '📐', category: 'Layout', shortcut: 'Ctrl+\\' },

    // Account
    { id: 'logout', label: 'Logout', desc: 'Keluar dari akun', icon: '🚪', category: 'Account' },
];

/**
 * Initialize the command palette
 * @param {Object} handlers - Map of action IDs to handler functions
 */
export function initCommandPalette(handlers) {
    actionHandlers = handlers;

    // Global Ctrl+K listener
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            e.stopPropagation();
            if (isOpen) {
                close();
            } else {
                open();
            }
        }
    });
}

/**
 * Open the command palette
 * @param {string} [initialQuery=''] - Pre-fill the search input
 */
export function open(initialQuery = '') {
    if (isOpen) return;
    isOpen = true;
    currentMode = 'commands';
    activeIndex = -1;

    // Build DOM
    const backdrop = document.createElement('div');
    backdrop.className = 'cmd-palette-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Command Palette');

    backdrop.innerHTML = `
        <div class="cmd-palette">
            <div class="cmd-palette__search">
                <svg class="cmd-palette__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input class="cmd-palette__input" type="text" placeholder="Type a command or search files..." autocomplete="off" spellcheck="false" />
                <span class="cmd-palette__mode-badge" id="cmd-mode-badge">Files</span>
            </div>
            <div class="cmd-palette__results" role="listbox"></div>
            <div class="cmd-palette__footer">
                <span class="cmd-palette__footer-hint"><kbd>↑↓</kbd> navigate</span>
                <span class="cmd-palette__footer-hint"><kbd>↵</kbd> select</span>
                <span class="cmd-palette__footer-hint"><kbd>Esc</kbd> close</span>
                <span class="cmd-palette__footer-hint"><kbd>/</kbd> file search</span>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
    paletteEl = backdrop;
    inputEl = backdrop.querySelector('.cmd-palette__input');
    resultsEl = backdrop.querySelector('.cmd-palette__results');
    badgeEl = backdrop.querySelector('#cmd-mode-badge');

    // Events
    inputEl.addEventListener('input', handleInput);
    backdrop.addEventListener('keydown', handleKeyDown);
    backdrop.addEventListener('mousedown', (e) => {
        if (e.target === backdrop) close();
    });

    // Pre-fill
    if (initialQuery) {
        inputEl.value = initialQuery;
    }

    // Focus + render
    requestAnimationFrame(() => {
        inputEl.focus();
        renderResults();
    });
}

/**
 * Close the command palette
 */
export function close() {
    if (!isOpen) return;
    isOpen = false;

    if (paletteEl) {
        paletteEl.remove();
        paletteEl = null;
        inputEl = null;
        resultsEl = null;
        badgeEl = null;
    }

    activeIndex = -1;
    filteredItems = [];
    currentMode = 'commands';
}

// ── Input Handler ──
function handleInput() {
    const query = inputEl.value;

    // Switch to file mode if query starts with /
    if (query.startsWith('/') && currentMode !== 'files') {
        currentMode = 'files';
        badgeEl.classList.add('visible');
    } else if (!query.startsWith('/') && currentMode === 'files') {
        currentMode = 'commands';
        badgeEl.classList.remove('visible');
    }

    activeIndex = 0;
    renderResults();
}

// ── Keyboard Handler ──
function handleKeyDown(e) {
    switch (e.key) {
    case 'ArrowDown':
        e.preventDefault();
        if (filteredItems.length > 0) {
            activeIndex = (activeIndex + 1) % filteredItems.length;
            updateActiveItem();
            scrollActiveIntoView();
        }
        break;

    case 'ArrowUp':
        e.preventDefault();
        if (filteredItems.length > 0) {
            activeIndex = activeIndex <= 0 ? filteredItems.length - 1 : activeIndex - 1;
            updateActiveItem();
            scrollActiveIntoView();
        }
        break;

    case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredItems.length) {
            executeItem(filteredItems[activeIndex]);
        }
        break;

    case 'Escape':
        e.preventDefault();
        close();
        break;

    case 'Tab':
        e.preventDefault();
        // Tab toggles between modes
        if (currentMode === 'commands') {
            currentMode = 'files';
            inputEl.value = '/';
            badgeEl.classList.add('visible');
        } else {
            currentMode = 'commands';
            inputEl.value = '';
            badgeEl.classList.remove('visible');
        }
        activeIndex = 0;
        renderResults();
        break;
    }
}

// ── Render Results ──
function renderResults() {
    if (!resultsEl) return;

    if (currentMode === 'files') {
        renderFileResults();
    } else {
        renderCommandResults();
    }
}

function renderCommandResults() {
    const query = inputEl.value.trim().toLowerCase();
    let items;

    if (!query) {
        // Show all commands grouped by category
        items = COMMANDS.map(cmd => ({ ...cmd, paletteType: 'command', score: 0 }));
    } else {
        // Fuzzy filter
        items = COMMANDS
            .map(cmd => {
                const score = fuzzyScore(query, cmd.label.toLowerCase())
                    + fuzzyScore(query, cmd.desc.toLowerCase()) * 0.5;
                return { ...cmd, paletteType: 'command', score };
            })
            .filter(cmd => cmd.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    filteredItems = items;
    activeIndex = items.length > 0 ? 0 : -1;

    if (items.length === 0) {
        resultsEl.innerHTML = `
            <div class="cmd-palette__empty">
                <div class="cmd-palette__empty-icon">🔍</div>
                No commands found for "${escapeHtml(inputEl.value)}"
            </div>
        `;
        return;
    }

    // Group by category
    const grouped = groupBy(items, 'category');
    let html = '';

    for (const [category, cmds] of Object.entries(grouped)) {
        html += `<div class="cmd-palette__group">${escapeHtml(category)}</div>`;
        for (const cmd of cmds) {
            const idx = filteredItems.indexOf(cmd);
            const label = query ? highlightMatch(cmd.label, query) : escapeHtml(cmd.label);
            const shortcutHtml = cmd.shortcut ? renderShortcut(cmd.shortcut) : '';

            html += `
                <div class="cmd-palette__item${idx === activeIndex ? ' active' : ''}"
                     role="option" data-index="${idx}" data-id="${cmd.id}">
                    <span class="cmd-palette__item-icon">${cmd.icon}</span>
                    <div class="cmd-palette__item-body">
                        <span class="cmd-palette__item-label">${label}</span>
                        <span class="cmd-palette__item-desc">${escapeHtml(cmd.desc)}</span>
                    </div>
                    ${shortcutHtml}
                </div>
            `;
        }
    }

    resultsEl.innerHTML = html;
    attachItemListeners();
}

function renderFileResults() {
    const query = inputEl.value.slice(1).trim().toLowerCase(); // Remove leading /
    const stateData = typeof window.getState === 'function' ? window.getState() : null;
    const items = stateData ? (stateData.items || []) : [];

    let fileItems;

    if (!query) {
        // Show all items in current directory
        fileItems = items.slice(0, 50).map(item => ({
            ...item,
            paletteType: 'file',
            originalType: item.type,
            score: 0,
            id: 'navigate:' + item.path,
            label: item.name,
            icon: item.type === 'directory' ? '📁' : '📄',
        }));
    } else {
        // Fuzzy filter files
        fileItems = items
            .map(item => {
                const score = fuzzyScore(query, item.name.toLowerCase());
                return {
                    ...item,
                    paletteType: 'file',
                    originalType: item.type,
                    score,
                    id: 'navigate:' + item.path,
                    label: item.name,
                    icon: item.type === 'directory' ? '📁' : '📄',
                };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);
    }

    filteredItems = fileItems;
    activeIndex = fileItems.length > 0 ? 0 : -1;

    if (fileItems.length === 0) {
        resultsEl.innerHTML = `
            <div class="cmd-palette__empty">
                <div class="cmd-palette__empty-icon">📂</div>
                No files found for "${escapeHtml(query)}"
            </div>
        `;
        return;
    }

    let html = `<div class="cmd-palette__group">Files in current directory</div>`;

    for (let i = 0; i < fileItems.length; i++) {
        const item = fileItems[i];
        const label = query ? highlightMatch(item.label, query) : escapeHtml(item.label);
        const pathDisplay = item.path || '';

        html += `
            <div class="cmd-palette__item${i === activeIndex ? ' active' : ''}"
                 role="option" data-index="${i}" data-id="${item.id}">
                <span class="cmd-palette__item-icon">${item.icon}</span>
                <div class="cmd-palette__item-body">
                    <span class="cmd-palette__item-label">${label}</span>
                    <span class="cmd-palette__item-path">${escapeHtml(pathDisplay)}</span>
                </div>
            </div>
        `;
    }

    resultsEl.innerHTML = html;
    attachItemListeners();
}

// ── Execute Item ──
function executeItem(item) {
    close();

    if (item.paletteType === 'file') {
        // Navigate to file/folder
        const path = item.path;
        if (item.originalType === 'directory') {
            // Navigate into directory
            if (typeof actionHandlers.navigateTo === 'function') {
                actionHandlers.navigateTo(path);
            }
        } else {
            // Open file preview
            if (typeof actionHandlers.openFile === 'function') {
                actionHandlers.openFile(path, item.name || item.label);
            }
        }
        return;
    }

    // Execute command
    const handler = actionHandlers[item.id];
    if (typeof handler === 'function') {
        handler();
    }
}

// ── Attach Click/Hover Listeners ──
function attachItemListeners() {
    if (!resultsEl) return;

    const items = resultsEl.querySelectorAll('.cmd-palette__item');
    items.forEach((el) => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.index, 10);
            if (idx >= 0 && idx < filteredItems.length) {
                executeItem(filteredItems[idx]);
            }
        });

        el.addEventListener('mouseenter', () => {
            const idx = parseInt(el.dataset.index, 10);
            if (idx !== activeIndex) {
                activeIndex = idx;
                updateActiveItem();
            }
        });
    });
}

// ── Update Active Highlight ──
function updateActiveItem() {
    if (!resultsEl) return;

    const items = resultsEl.querySelectorAll('.cmd-palette__item');
    items.forEach((el) => {
        const idx = parseInt(el.dataset.index, 10);
        el.classList.toggle('active', idx === activeIndex);
    });
}

function scrollActiveIntoView() {
    if (!resultsEl) return;

    const activeEl = resultsEl.querySelector('.cmd-palette__item.active');
    if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// ── Fuzzy Scoring ──
function fuzzyScore(query, text) {
    if (!query) return 1;

    let qi = 0;
    let ti = 0;
    let score = 0;
    let consecutive = 0;

    while (qi < query.length && ti < text.length) {
        if (query[qi] === text[ti]) {
            qi++;
            consecutive++;
            // Bonus for consecutive matches
            score += 1 + consecutive * 0.5;
            // Bonus for match at start
            if (ti === 0) score += 2;
            // Bonus for match after separator
            if (ti > 0 && (text[ti - 1] === ' ' || text[ti - 1] === '-' || text[ti - 1] === '_' || text[ti - 1] === '.')) {
                score += 1.5;
            }
        } else {
            consecutive = 0;
        }
        ti++;
    }

    // All query chars must match
    return qi === query.length ? score : 0;
}

// ── Highlight Matches ──
function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);

    const result = [];
    let qi = 0;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    for (let i = 0; i < text.length; i++) {
        if (qi < lowerQuery.length && lowerText[i] === lowerQuery[qi]) {
            result.push(`<mark>${escapeHtml(text[i])}</mark>`);
            qi++;
        } else {
            result.push(escapeHtml(text[i]));
        }
    }

    return result.join('');
}

// ── Render Shortcut Keys ──
function renderShortcut(shortcut) {
    const keys = shortcut.split('+').map(k => `<kbd>${escapeHtml(k)}</kbd>`).join('');
    return `<span class="cmd-palette__item-shortcut">${keys}</span>`;
}

// ── Helpers ──
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function groupBy(arr, key) {
    const groups = {};
    for (const item of arr) {
        const group = item[key] || 'Other';
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
    }
    return groups;
}

// ── Exports ──
export { isOpen as isPaletteOpen };

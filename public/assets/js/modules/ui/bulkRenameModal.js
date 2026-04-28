/**
 * Bulk Rename Modal Module
 * ========================
 * Modal for batch renaming multiple files/folders.
 * Modes: Find & Replace, Numbering, Prefix/Suffix.
 * Live preview of changes before applying.
 *
 * @module bulkRenameModal
 */

import { bulkRenameItems } from '../apiService.js';
import { pushUndo, showUndoToast } from './undoManager.js';

// ── State ──
let modalEl = null;
let isOpen = false;
let items = []; // Array of { name, path, type }
let onComplete = null; // Callback after rename

const MODES = {
    FIND_REPLACE: 'find-replace',
    NUMBERING: 'numbering',
    PREFIX_SUFFIX: 'prefix-suffix',
};

let currentMode = MODES.FIND_REPLACE;

// ── Public API ──

/**
 * Open the bulk rename modal
 * @param {Array<{name: string, path: string, type: string}>} selectedItems
 * @param {Function} completeCb - Called after successful rename
 */
export function openBulkRename(selectedItems, completeCb) {
    if (isOpen || !selectedItems || selectedItems.length < 2) return;

    items = selectedItems.slice().sort((a, b) => a.name.localeCompare(b.name));
    onComplete = completeCb;
    isOpen = true;
    currentMode = MODES.FIND_REPLACE;

    buildModal();
    updatePreview();
}

/**
 * Close the bulk rename modal
 */
export function closeBulkRename() {
    if (!isOpen) return;
    isOpen = false;

    if (modalEl) {
        modalEl.remove();
        modalEl = null;
    }

    items = [];
    onComplete = null;
}

/**
 * Check if modal is open
 */
export function isBulkRenameOpen() {
    return isOpen;
}

// ── DOM Construction ──

function buildModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'bulk-rename-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Bulk Rename');

    backdrop.innerHTML = `
        <div class="bulk-rename">
            <div class="bulk-rename__header">
                <span class="bulk-rename__header-icon">✏️</span>
                <div class="bulk-rename__header-text">
                    <h3 class="bulk-rename__title">Bulk Rename</h3>
                    <p class="bulk-rename__subtitle">${items.length} item dipilih</p>
                </div>
                <button class="bulk-rename__close" aria-label="Close" title="Close">&times;</button>
            </div>
            <div class="bulk-rename__body">
                <div class="bulk-rename__tabs">
                    <button class="bulk-rename__tab active" data-mode="${MODES.FIND_REPLACE}">Find & Replace</button>
                    <button class="bulk-rename__tab" data-mode="${MODES.NUMBERING}">Numbering</button>
                    <button class="bulk-rename__tab" data-mode="${MODES.PREFIX_SUFFIX}">Prefix / Suffix</button>
                </div>

                <!-- Find & Replace Panel -->
                <div class="bulk-rename__panel active" id="panel-find-replace">
                    <div class="bulk-rename__field">
                        <label class="bulk-rename__label">Find</label>
                        <input class="bulk-rename__input" id="br-find" type="text" placeholder="Text to find..." autocomplete="off" />
                    </div>
                    <div class="bulk-rename__field">
                        <label class="bulk-rename__label">Replace with</label>
                        <input class="bulk-rename__input" id="br-replace" type="text" placeholder="Replacement text..." autocomplete="off" />
                    </div>
                    <div class="bulk-rename__options">
                        <label class="bulk-rename__checkbox">
                            <input type="checkbox" id="br-case-sensitive" />
                            Case sensitive
                        </label>
                        <label class="bulk-rename__checkbox">
                            <input type="checkbox" id="br-regex" />
                            Use regex
                        </label>
                    </div>
                </div>

                <!-- Numbering Panel -->
                <div class="bulk-rename__panel" id="panel-numbering">
                    <div class="bulk-rename__field">
                        <label class="bulk-rename__label">Pattern</label>
                        <input class="bulk-rename__input" id="br-pattern" type="text" placeholder="e.g. Photo_###" value="File_###" autocomplete="off" />
                    </div>
                    <div class="bulk-rename__options">
                        <span class="bulk-rename__label" style="margin-bottom:0">Use <code>###</code> for number (# count = zero-padding)</span>
                    </div>
                    <div class="bulk-rename__row">
                        <div class="bulk-rename__field">
                            <label class="bulk-rename__label">Start at</label>
                            <input class="bulk-rename__input--small" id="br-start" type="number" value="1" min="0" />
                        </div>
                        <div class="bulk-rename__field">
                            <label class="bulk-rename__label">Step</label>
                            <input class="bulk-rename__input--small" id="br-step" type="number" value="1" min="1" />
                        </div>
                    </div>
                    <div class="bulk-rename__options">
                        <label class="bulk-rename__checkbox">
                            <input type="checkbox" id="br-keep-ext" checked />
                            Keep original extension
                        </label>
                    </div>
                </div>

                <!-- Prefix/Suffix Panel -->
                <div class="bulk-rename__panel" id="panel-prefix-suffix">
                    <div class="bulk-rename__field">
                        <label class="bulk-rename__label">Prefix</label>
                        <input class="bulk-rename__input" id="br-prefix" type="text" placeholder="Add before name..." autocomplete="off" />
                    </div>
                    <div class="bulk-rename__field">
                        <label class="bulk-rename__label">Suffix</label>
                        <input class="bulk-rename__input" id="br-suffix" type="text" placeholder="Add after name (before extension)..." autocomplete="off" />
                    </div>
                </div>

                <!-- Preview -->
                <div class="bulk-rename__preview-header">
                    <span class="bulk-rename__preview-title">Preview</span>
                    <span class="bulk-rename__preview-count" id="br-preview-count"></span>
                </div>
                <div class="bulk-rename__preview-list" id="br-preview-list"></div>
            </div>
            <div class="bulk-rename__footer">
                <button class="bulk-rename__btn" id="br-cancel">Batal</button>
                <button class="bulk-rename__btn bulk-rename__btn--primary" id="br-apply">Rename ${items.length} Item</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
    modalEl = backdrop;

    // Wire events
    wireEvents();

    // Focus first input
    const firstInput = backdrop.querySelector('#br-find');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 50);
    }
}

function wireEvents() {
    if (!modalEl) return;

    // Close button
    modalEl.querySelector('.bulk-rename__close').addEventListener('click', closeBulkRename);

    // Cancel button
    modalEl.querySelector('#br-cancel').addEventListener('click', closeBulkRename);

    // Backdrop click
    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) closeBulkRename();
    });

    // Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeBulkRename();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Tab switching
    modalEl.querySelectorAll('.bulk-rename__tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            if (mode === currentMode) return;

            currentMode = mode;

            // Update tab active state
            modalEl.querySelectorAll('.bulk-rename__tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update panel visibility
            modalEl.querySelectorAll('.bulk-rename__panel').forEach(p => p.classList.remove('active'));
            const panelId = `panel-${mode}`;
            const panel = modalEl.querySelector(`#${panelId}`);
            if (panel) panel.classList.add('active');

            updatePreview();

            // Focus first input in active panel
            const input = panel?.querySelector('input');
            if (input) input.focus();
        });
    });

    // Input change listeners for live preview
    const inputIds = [
        'br-find', 'br-replace', 'br-case-sensitive', 'br-regex',
        'br-pattern', 'br-start', 'br-step', 'br-keep-ext',
        'br-prefix', 'br-suffix'
    ];

    inputIds.forEach(id => {
        const el = modalEl.querySelector(`#${id}`);
        if (el) {
            const eventType = el.type === 'checkbox' ? 'change' : 'input';
            el.addEventListener(eventType, () => updatePreview());
        }
    });

    // Apply button
    modalEl.querySelector('#br-apply').addEventListener('click', handleApply);
}

// ── Rename Logic ──

function getInputValue(id) {
    const el = modalEl?.querySelector(`#${id}`);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number') return parseInt(el.value, 10) || 0;
    return el.value;
}

/**
 * Split filename into name and extension
 */
function splitName(filename, isFolder) {
    if (isFolder) return { base: filename, ext: '' };
    const lastDot = filename.lastIndexOf('.');
    if (lastDot <= 0) return { base: filename, ext: '' };
    return {
        base: filename.substring(0, lastDot),
        ext: filename.substring(lastDot), // includes the dot
    };
}

/**
 * Compute new names for all items based on current mode
 * @returns {Array<{item: Object, newName: string, changed: boolean, error: string|null}>}
 */
function computeRenames() {
    const results = [];

    if (currentMode === MODES.FIND_REPLACE) {
        const findText = getInputValue('br-find');
        const replaceText = getInputValue('br-replace');
        const caseSensitive = getInputValue('br-case-sensitive');
        const useRegex = getInputValue('br-regex');

        items.forEach(item => {
            if (!findText) {
                results.push({ item, newName: item.name, changed: false, error: null });
                return;
            }

            let newName;
            try {
                if (useRegex) {
                    const flags = caseSensitive ? 'g' : 'gi';
                    const regex = new RegExp(findText, flags);
                    newName = item.name.replace(regex, replaceText);
                } else {
                    if (caseSensitive) {
                        newName = item.name.split(findText).join(replaceText);
                    } else {
                        const regex = new RegExp(escapeRegex(findText), 'gi');
                        newName = item.name.replace(regex, replaceText);
                    }
                }
            } catch (e) {
                results.push({ item, newName: item.name, changed: false, error: 'Invalid regex' });
                return;
            }

            const changed = newName !== item.name;
            const error = newName.trim() === '' ? 'Name cannot be empty' : null;
            results.push({ item, newName, changed, error });
        });

    } else if (currentMode === MODES.NUMBERING) {
        const pattern = getInputValue('br-pattern') || 'File_###';
        const startAt = getInputValue('br-start');
        const step = getInputValue('br-step') || 1;
        const keepExt = getInputValue('br-keep-ext');

        // Count # characters for zero-padding
        const hashMatch = pattern.match(/#+/);
        const padLength = hashMatch ? hashMatch[0].length : 1;

        items.forEach((item, index) => {
            const num = startAt + (index * step);
            const numStr = String(num).padStart(padLength, '0');
            let newName = pattern.replace(/#+/, numStr);

            if (keepExt && item.type !== 'folder') {
                const { ext } = splitName(item.name, false);
                if (ext) {
                    // Remove any extension from pattern result, then add original
                    const { base: patternBase } = splitName(newName, false);
                    newName = patternBase + ext;
                }
            }

            const changed = newName !== item.name;
            const error = newName.trim() === '' ? 'Name cannot be empty' : null;
            results.push({ item, newName, changed, error });
        });

    } else if (currentMode === MODES.PREFIX_SUFFIX) {
        const prefix = getInputValue('br-prefix');
        const suffix = getInputValue('br-suffix');

        items.forEach(item => {
            if (!prefix && !suffix) {
                results.push({ item, newName: item.name, changed: false, error: null });
                return;
            }

            const { base, ext } = splitName(item.name, item.type === 'folder');
            const newName = prefix + base + suffix + ext;
            const changed = newName !== item.name;
            const error = newName.trim() === '' ? 'Name cannot be empty' : null;
            results.push({ item, newName, changed, error });
        });
    }

    return results;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Preview ──

function updatePreview() {
    if (!modalEl) return;

    const previewList = modalEl.querySelector('#br-preview-list');
    const previewCount = modalEl.querySelector('#br-preview-count');
    if (!previewList) return;

    const renames = computeRenames();
    const changedCount = renames.filter(r => r.changed && !r.error).length;
    const errorCount = renames.filter(r => r.error).length;

    if (previewCount) {
        let countText = `${changedCount} of ${renames.length} will change`;
        if (errorCount > 0) countText += ` · ${errorCount} error(s)`;
        previewCount.textContent = countText;
    }

    // Update apply button state
    const applyBtn = modalEl.querySelector('#br-apply');
    if (applyBtn) {
        applyBtn.disabled = changedCount === 0;
        applyBtn.textContent = `Rename ${changedCount} Item`;
    }

    // Render preview items
    previewList.innerHTML = '';

    renames.forEach(({ item, newName, changed, error }) => {
        const row = document.createElement('div');
        row.className = 'bulk-rename__preview-item';

        const icon = document.createElement('span');
        icon.className = 'bulk-rename__preview-icon';
        icon.textContent = item.type === 'folder' ? '📁' : '📄';
        row.appendChild(icon);

        const oldSpan = document.createElement('span');
        oldSpan.className = 'bulk-rename__preview-old';
        oldSpan.textContent = item.name;
        oldSpan.title = item.name;
        row.appendChild(oldSpan);

        const arrow = document.createElement('span');
        arrow.className = 'bulk-rename__preview-arrow';
        arrow.textContent = '→';
        row.appendChild(arrow);

        if (error) {
            const errSpan = document.createElement('span');
            errSpan.className = 'bulk-rename__preview-error';
            errSpan.textContent = error;
            row.appendChild(errSpan);
        } else if (changed) {
            const newSpan = document.createElement('span');
            newSpan.className = 'bulk-rename__preview-new';
            newSpan.textContent = newName;
            newSpan.title = newName;
            row.appendChild(newSpan);
        } else {
            const sameSpan = document.createElement('span');
            sameSpan.className = 'bulk-rename__preview-same';
            sameSpan.textContent = '(no change)';
            row.appendChild(sameSpan);
        }

        previewList.appendChild(row);
    });
}

// ── Apply ──

async function handleApply() {
    const renames = computeRenames();
    const toRename = renames.filter(r => r.changed && !r.error);

    if (toRename.length === 0) return;

    const applyBtn = modalEl?.querySelector('#br-apply');
    const cancelBtn = modalEl?.querySelector('#br-cancel');

    // Disable buttons during operation
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.textContent = 'Renaming...';
    }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
        const renamePayload = toRename.map(({ item, newName }) => ({
            oldPath: item.path,
            newName: newName,
        }));

        const response = await bulkRenameItems(renamePayload);

        // Push undo for successful renames
        if (response.renamed && response.renamed.length > 0) {
            pushUndo({
                type: 'bulk-rename',
                description: `Bulk rename ${response.renamed.length} item`,
                data: {
                    renames: response.renamed.map(r => ({
                        oldPath: r.newPath,
                        newName: r.oldPath.split('/').pop(),
                    })),
                },
            });

            const count = response.renamed.length;
            const errCount = response.errors ? response.errors.length : 0;

            if (errCount > 0) {
                window.showWarning?.(`${count} item renamed, ${errCount} gagal.`);
            } else {
                showUndoToast(`${count} item berhasil di-rename.`);
            }
        }

        closeBulkRename();

        // Refresh directory
        if (typeof onComplete === 'function') {
            onComplete();
        }

    } catch (error) {
        console.error('[BulkRename] Error:', error);
        window.showError?.('Gagal melakukan bulk rename: ' + (error.message || 'Unknown error'));

        // Re-enable buttons
        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.textContent = `Rename ${toRename.length} Item`;
        }
        if (cancelBtn) cancelBtn.disabled = false;
    }
}

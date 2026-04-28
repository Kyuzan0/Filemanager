/**
 * Dual-Pane Module
 * ================
 * Self-contained right-side file browser panel.
 * Independent state, rendering, and navigation.
 * Shares context menu, preview, and overlays with main pane.
 *
 * @module dualPane
 */

import { fetchDirectory, moveItem as apiMoveItem, copyItems as apiCopyItems } from '../apiService.js';
import { getItemIcon } from '../fileIcons.js';
import { getIconColors } from './tableRenderer.js';
import { formatBytes, formatDate, getFileExtension } from '../utils.js';

// ── State ──
let isActive = false;
let paneEl = null;
let dividerEl = null;
let wrapperEl = null;
let bodyEl = null;
let footerCountEl = null;
let breadcrumbsEl = null;

const paneState = {
    currentPath: '',
    parentPath: null,
    items: [],
    selected: new Set(),
    isLoading: false,
};

let callbacks = {
    onClose: null,
    refreshMain: null,
};

// Divider drag state
let isDragging = false;
let startX = 0;
let startWidth = 0;

// ── Public API ──

/**
 * Initialize dual pane system
 * @param {Object} opts
 * @param {Function} opts.onClose - Called when pane is closed
 * @param {Function} opts.refreshMain - Refresh main pane directory
 */
export function initDualPane(opts = {}) {
    callbacks.onClose = opts.onClose || null;
    callbacks.refreshMain = opts.refreshMain || null;
}

/**
 * Toggle dual pane on/off
 * @param {string} [initialPath=''] - Path to open in right pane
 */
export function toggleDualPane(initialPath) {
    if (isActive) {
        closeDualPane();
    } else {
        openDualPane(initialPath);
    }
}

/**
 * Open the dual pane
 * @param {string} [initialPath=''] - Path to open
 */
export function openDualPane(initialPath) {
    if (isActive) return;
    isActive = true;

    // Determine initial path: use provided, or main pane's current path, or root
    const startPath = initialPath ?? (window.getState?.()?.currentPath || '');
    paneState.currentPath = startPath;
    paneState.items = [];
    paneState.selected.clear();

    buildDOM();
    loadDirectory(startPath);
    updateToggleButton(true);
}

/**
 * Close the dual pane
 */
export function closeDualPane() {
    if (!isActive) return;
    isActive = false;

    // Remove DOM
    if (dividerEl && dividerEl.parentNode) dividerEl.remove();
    if (paneEl && paneEl.parentNode) paneEl.remove();

    // Unwrap main from wrapper if needed
    if (wrapperEl) {
        const mainEl = wrapperEl.querySelector('.main');
        if (mainEl && wrapperEl.parentNode) {
            wrapperEl.parentNode.insertBefore(mainEl, wrapperEl);
            wrapperEl.remove();
        }
        wrapperEl = null;
    }

    paneEl = null;
    dividerEl = null;
    bodyEl = null;
    footerCountEl = null;
    breadcrumbsEl = null;

    updateToggleButton(false);
    if (callbacks.onClose) callbacks.onClose();
}

/** @returns {boolean} Whether dual pane is currently active */
export function isDualPaneActive() {
    return isActive;
}

/** Get the right pane's current path */
export function getRightPanePath() {
    return paneState.currentPath;
}

// ── DOM Construction ──

function buildDOM() {
    const mainEl = document.getElementById('main-content');
    if (!mainEl) return;

    // Create wrapper
    wrapperEl = document.createElement('div');
    wrapperEl.className = 'dual-pane-wrapper';

    // Wrap main element
    mainEl.parentNode.insertBefore(wrapperEl, mainEl);
    wrapperEl.appendChild(mainEl);

    // Create divider
    dividerEl = document.createElement('div');
    dividerEl.className = 'dual-pane-divider';
    dividerEl.setAttribute('role', 'separator');
    dividerEl.setAttribute('aria-label', 'Resize panes');
    dividerEl.setAttribute('tabindex', '0');
    setupDividerDrag();
    wrapperEl.appendChild(dividerEl);

    // Create right pane
    paneEl = document.createElement('div');
    paneEl.className = 'dual-pane-right';
    paneEl.id = 'dual-pane-right';

    paneEl.innerHTML = `
        <div class="dp-header">
            <div class="dp-header__breadcrumbs" id="dp-breadcrumbs"></div>
            <button class="dp-header__close" title="Tutup panel (Ctrl+\\)" aria-label="Tutup panel kedua">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="dp-body" id="dp-body"></div>
        <div class="dp-footer">
            <span class="dp-footer__count" id="dp-footer-count"></span>
        </div>
    `;

    wrapperEl.appendChild(paneEl);

    // Cache elements
    bodyEl = paneEl.querySelector('#dp-body');
    footerCountEl = paneEl.querySelector('#dp-footer-count');
    breadcrumbsEl = paneEl.querySelector('#dp-breadcrumbs');

    // Close button
    paneEl.querySelector('.dp-header__close').addEventListener('click', closeDualPane);

    // Setup drop zone on right pane body
    setupDropZone();
}

// ── Directory Loading ──

async function loadDirectory(path) {
    paneState.isLoading = true;
    paneState.selected.clear();
    renderLoading();

    try {
        const data = await fetchDirectory(path, { silent: true, retry: false });
        if (!data) return;

        paneState.currentPath = data.current_path ?? path;
        paneState.parentPath = data.parent_path ?? null;
        paneState.items = data.items || [];
        paneState.isLoading = false;

        renderBreadcrumbs();
        renderItems();
        updateFooter();
    } catch (err) {
        paneState.isLoading = false;
        renderError(err.message || 'Gagal memuat direktori');
    }
}

function navigateRight(path) {
    loadDirectory(path);
}

// ── Rendering ──

function renderLoading() {
    if (!bodyEl) return;
    bodyEl.innerHTML = '<div class="dp-loading"><div class="dp-spinner"></div></div>';
}

function renderError(msg) {
    if (!bodyEl) return;
    bodyEl.innerHTML = `
        <div class="dp-empty">
            <span class="dp-empty__icon">⚠️</span>
            <span class="dp-empty__text">${escapeHtml(msg)}</span>
        </div>
    `;
}

function renderItems() {
    if (!bodyEl) return;

    const items = paneState.items;

    if (items.length === 0 && paneState.parentPath === null) {
        bodyEl.innerHTML = `
            <div class="dp-empty">
                <span class="dp-empty__icon">📂</span>
                <span class="dp-empty__text">Folder kosong</span>
            </div>
        `;
        return;
    }

    // Sort: folders first, then by name
    const sorted = [...items].sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    });

    const table = document.createElement('table');
    table.className = 'dp-table';

    const tbody = document.createElement('tbody');

    // Up row
    if (paneState.parentPath !== null) {
        const upRow = document.createElement('tr');
        upRow.className = 'dp-up-row';
        upRow.innerHTML = `
            <td colspan="2">
                <div class="dp-name-cell">
                    <span class="dp-icon" style="background:transparent;color:var(--text-muted)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </span>
                    <span class="dp-filename">..</span>
                </div>
            </td>
        `;
        upRow.addEventListener('click', () => navigateRight(paneState.parentPath));
        tbody.appendChild(upRow);
    }

    // Item rows
    sorted.forEach(item => {
        const row = createItemRow(item);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    bodyEl.innerHTML = '';
    bodyEl.appendChild(table);
}

function createItemRow(item) {
    const row = document.createElement('tr');
    row.setAttribute('data-dp-path', item.path);
    row.setAttribute('draggable', 'true');

    if (paneState.selected.has(item.path)) {
        row.classList.add('dp-selected');
    }

    // Icon
    const iconInfo = getItemIcon(item);
    const iconColors = item.has_thumbnail ? {} : getIconColors(item);

    let iconHtml = '';
    if (item.has_thumbnail) {
        iconHtml = `<span class="dp-icon" style="background:transparent;overflow:hidden;border-radius:4px">
            <img src="api.php?action=thumbnail&path=${encodeURIComponent(item.path)}" 
                 alt="${escapeAttr(item.name)}" loading="lazy" decoding="async" 
                 onerror="this.parentElement.innerHTML='📄'" />
        </span>`;
    } else {
        const svgStr = iconInfo?.svg
            ? (typeof iconInfo.svg === 'string' ? iconInfo.svg : iconInfo.svg?.outerHTML || '📄')
            : '📄';
        iconHtml = `<span class="dp-icon" style="background:${iconColors.backgroundColor || 'transparent'};color:${iconColors.color || 'inherit'}">${svgStr}</span>`;
    }

    // Meta (size for files, item count hint for folders)
    const meta = item.type === 'folder' ? '' : formatBytes(item.size);

    row.innerHTML = `
        <td>
            <div class="dp-name-cell">
                ${iconHtml}
                <span class="dp-filename" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
            </div>
        </td>
        <td class="dp-meta">${meta}</td>
    `;

    // Click: select
    row.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) {
            // Toggle selection
            if (paneState.selected.has(item.path)) {
                paneState.selected.delete(item.path);
                row.classList.remove('dp-selected');
            } else {
                paneState.selected.add(item.path);
                row.classList.add('dp-selected');
            }
        } else {
            // Single select
            clearSelection();
            paneState.selected.add(item.path);
            row.classList.add('dp-selected');
        }
        updateFooter();
    });

    // Double-click: open
    row.addEventListener('dblclick', () => {
        if (item.type === 'folder') {
            navigateRight(item.path);
        } else {
            // Open in preview
            if (typeof window.openPreviewModal === 'function') {
                window.openPreviewModal(item.path, item.name);
            }
        }
    });

    // Context menu
    row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Use main pane's context menu if available
        if (typeof window.openContextMenuForItem === 'function') {
            window.openContextMenuForItem(e.clientX, e.clientY, item);
        }
    });

    // Drag start — for cross-pane move/copy
    row.addEventListener('dragstart', (e) => {
        const paths = paneState.selected.size > 0 && paneState.selected.has(item.path)
            ? Array.from(paneState.selected)
            : [item.path];
        e.dataTransfer.setData('text/plain', JSON.stringify({
            source: 'dual-pane',
            paths: paths,
            sourcePath: paneState.currentPath,
        }));
        e.dataTransfer.effectAllowed = 'copyMove';
        row.style.opacity = '0.5';
    });

    row.addEventListener('dragend', () => {
        row.style.opacity = '';
    });

    // Drop target for folders
    if (item.type === 'folder') {
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
            row.classList.add('dp-drag-over');
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('dp-drag-over');
        });

        row.addEventListener('drop', async (e) => {
            e.preventDefault();
            row.classList.remove('dp-drag-over');
            await handleDrop(e, item.path);
        });
    }

    return row;
}

function clearSelection() {
    paneState.selected.clear();
    if (bodyEl) {
        bodyEl.querySelectorAll('.dp-selected').forEach(el => el.classList.remove('dp-selected'));
    }
}

// ── Breadcrumbs ──

function renderBreadcrumbs() {
    if (!breadcrumbsEl) return;

    const parts = paneState.currentPath ? paneState.currentPath.split('/').filter(Boolean) : [];
    breadcrumbsEl.innerHTML = '';

    // Root crumb
    const rootBtn = document.createElement('button');
    rootBtn.className = 'dp-header__crumb' + (parts.length === 0 ? ' dp-header__crumb--active' : '');
    rootBtn.textContent = '🏠';
    rootBtn.title = 'Root';
    if (parts.length > 0) {
        rootBtn.addEventListener('click', () => navigateRight(''));
    }
    breadcrumbsEl.appendChild(rootBtn);

    // Path crumbs
    let accumulated = '';
    parts.forEach((part, i) => {
        // Separator
        const sep = document.createElement('span');
        sep.className = 'dp-header__sep';
        sep.textContent = '›';
        breadcrumbsEl.appendChild(sep);

        accumulated += (accumulated ? '/' : '') + part;
        const isLast = i === parts.length - 1;

        const crumb = document.createElement('button');
        crumb.className = 'dp-header__crumb' + (isLast ? ' dp-header__crumb--active' : '');
        crumb.textContent = part;
        crumb.title = accumulated;

        if (!isLast) {
            const path = accumulated;
            crumb.addEventListener('click', () => navigateRight(path));
        }

        breadcrumbsEl.appendChild(crumb);
    });
}

// ── Footer ──

function updateFooter() {
    if (!footerCountEl) return;

    const total = paneState.items.length;
    const folders = paneState.items.filter(i => i.type === 'folder').length;
    const files = total - folders;
    const selected = paneState.selected.size;

    let text = '';
    if (folders > 0 && files > 0) {
        text = `${folders} folder, ${files} file`;
    } else if (folders > 0) {
        text = `${folders} folder`;
    } else if (files > 0) {
        text = `${files} file`;
    } else {
        text = 'Kosong';
    }

    if (selected > 0) {
        text += ` · ${selected} dipilih`;
    }

    footerCountEl.textContent = text;
}

// ── Divider Drag ──

function setupDividerDrag() {
    if (!dividerEl) return;

    dividerEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startWidth = paneEl ? paneEl.offsetWidth : 420;
        dividerEl.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev) => {
            if (!isDragging || !paneEl) return;
            const diff = startX - ev.clientX;
            const newWidth = Math.max(280, Math.min(startWidth + diff, window.innerWidth * 0.6));
            paneEl.style.width = newWidth + 'px';
        };

        const onMouseUp = () => {
            isDragging = false;
            dividerEl.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Keyboard resize
    dividerEl.addEventListener('keydown', (e) => {
        if (!paneEl) return;
        const step = 40;
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const w = Math.min(paneEl.offsetWidth + step, window.innerWidth * 0.6);
            paneEl.style.width = w + 'px';
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const w = Math.max(paneEl.offsetWidth - step, 280);
            paneEl.style.width = w + 'px';
        }
    });
}

// ── Drop Zone (cross-pane) ──

function setupDropZone() {
    if (!bodyEl) return;

    bodyEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        if (paneEl) paneEl.classList.add('dp-drop-target');
    });

    bodyEl.addEventListener('dragleave', (e) => {
        // Only remove if leaving the body entirely
        if (!bodyEl.contains(e.relatedTarget)) {
            if (paneEl) paneEl.classList.remove('dp-drop-target');
        }
    });

    bodyEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (paneEl) paneEl.classList.remove('dp-drop-target');
        await handleDrop(e, paneState.currentPath);
    });
}

async function handleDrop(e, targetPath) {
    let data;
    try {
        const raw = e.dataTransfer.getData('text/plain');
        data = JSON.parse(raw);
    } catch {
        return; // Not our drag data
    }

    if (!data || !data.paths || !Array.isArray(data.paths)) return;

    const isCopy = e.ctrlKey;
    const paths = data.paths;

    // Don't drop onto same directory
    if (targetPath === data.sourcePath && !isCopy) return;

    try {
        if (isCopy) {
            await apiCopyItems(paths, targetPath);
            window.showSuccess?.(`${paths.length} item disalin`);
        } else {
            // Move each item
            for (const sourcePath of paths) {
                const name = sourcePath.split('/').pop();
                const newPath = targetPath ? `${targetPath}/${name}` : name;
                await apiMoveItem(sourcePath, name, newPath);
            }
            window.showSuccess?.(`${paths.length} item dipindahkan`);
        }

        // Refresh both panes
        loadDirectory(paneState.currentPath);
        if (callbacks.refreshMain) callbacks.refreshMain();
    } catch (err) {
        window.showError?.(err.message || 'Operasi gagal');
    }
}

// ── Toggle Button State ──

function updateToggleButton(active) {
    const btn = document.getElementById('btn-split-pane');
    const btnDesktop = document.getElementById('btn-split-pane-desktop');
    [btn, btnDesktop].forEach(b => {
        if (!b) return;
        if (active) {
            b.classList.add('active');
            b.setAttribute('aria-pressed', 'true');
            b.title = 'Tutup panel kedua (Ctrl+\\)';
        } else {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
            b.title = 'Buka panel kedua (Ctrl+\\)';
        }
    });
}

// ── Helpers ──

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

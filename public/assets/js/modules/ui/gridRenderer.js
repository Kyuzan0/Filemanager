/**
 * Grid Renderer Module
 * Renders file/folder items in a grid/card layout.
 * Uses the same params/callbacks as tableRenderer for consistency.
 */
import { getFileExtension, formatBytes } from '../utils.js';
import { getItemIcon } from '../fileIcons.js';
import { getIconColors } from './tableRenderer.js';

// Track last selected index for Shift+Click range selection
let lastSelectedGridIndex = -1;

/**
 * Simple HTML escape (avoids importing from security.js which may have side effects)
 */
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Render items in grid view
 * @param {HTMLElement} container - The grid container element
 * @param {Array} items - Items to render (already paginated)
 * @param {Object} state - Application state
 * @param {Object} params - Same renderParams as tableRenderer
 */
export function renderGridItems(container, items, state, params) {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const card = createGridItem(item, state, params);
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

/**
 * Create a single grid item card element
 */
function createGridItem(item, state, params) {
    const {
        previewableExtensions,
        mediaPreviewableExtensions,
        openTextPreview,
        openMediaPreview,
        navigateTo,
        openInWord,
        openRenameOverlay,
        openConfirmOverlay,
        toggleSelection,
        openContextMenu,
        isWordDocument,
        buildFileUrl,
        hasUnsavedChanges,
        confirmDiscardChanges,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop,
        handleDragLeave,
        showMobileContextMenu
    } = params;

    const key = item.path;
    const isSelected = state.selected.has(key);
    const extension = item.type === 'file' ? getFileExtension(item.name) : '';
    const isPreviewable = item.type === 'file' && previewableExtensions.has(extension);
    const isMediaPreviewable = item.type === 'file' && mediaPreviewableExtensions.has(extension);

    const div = document.createElement('div');
    div.classList.add('grid-item');
    if (isSelected) div.classList.add('selected');
    div.dataset.itemPath = key;
    div.dataset.itemType = item.type;
    div.tabIndex = 0;
    div.setAttribute('role', 'gridcell');
    div.setAttribute('aria-selected', String(isSelected));
    div.draggable = true;

    // --- Icon ---
    const iconInfo = getItemIcon(item);
    const iconColors = getIconColors(item);

    const iconEl = document.createElement('div');
    iconEl.classList.add('grid-icon');
    iconEl.style.backgroundColor = iconColors.backgroundColor;
    iconEl.style.color = iconColors.color;

    if (iconInfo && iconInfo.svg) {
        if (typeof iconInfo.svg === 'object' && iconInfo.svg.nodeType === 1) {
            const svgClone = iconInfo.svg.cloneNode(true);
            svgClone.style.width = '28px';
            svgClone.style.height = '28px';
            iconEl.appendChild(svgClone);
        } else if (typeof iconInfo.svg === 'string') {
            iconEl.innerHTML = iconInfo.svg;
        }
    }
    div.appendChild(iconEl);

    // --- Name ---
    const nameEl = document.createElement('div');
    nameEl.classList.add('grid-name');
    nameEl.textContent = item.name;
    nameEl.title = item.name;
    div.appendChild(nameEl);

    // --- Meta (size / "Folder") ---
    const metaEl = document.createElement('div');
    metaEl.classList.add('grid-meta');
    metaEl.textContent = item.type === 'folder' ? 'Folder' : formatBytes(item.size || 0);
    div.appendChild(metaEl);

    // --- Quick Actions (hover overlay) ---
    const actionsEl = document.createElement('div');
    actionsEl.classList.add('grid-actions');

    const renameBtn = document.createElement('button');
    renameBtn.classList.add('grid-action-btn');
    renameBtn.title = 'Ganti Nama';
    renameBtn.setAttribute('aria-label', 'Ganti Nama');
    renameBtn.innerHTML = '<i class="ri-edit-line"></i>';
    renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRenameOverlay(item);
    });
    actionsEl.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('grid-action-btn', 'danger');
    deleteBtn.title = 'Hapus';
    deleteBtn.setAttribute('aria-label', 'Hapus');
    deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hasUnsavedChanges && hasUnsavedChanges(state.preview)) {
            confirmDiscardChanges('Perubahan belum disimpan. Tetap hapus item terpilih?')
                .then((proceed) => {
                    if (!proceed) return;
                    openConfirmOverlay({
                        message: `Hapus "${item.name}"?`,
                        description: 'Item yang dihapus tidak dapat dikembalikan.',
                        paths: [item.path],
                        showList: false,
                        confirmLabel: 'Hapus',
                    });
                });
            return;
        }
        openConfirmOverlay({
            message: `Hapus "${item.name}"?`,
            description: 'Item yang dihapus tidak dapat dikembalikan.',
            paths: [item.path],
            showList: false,
            confirmLabel: 'Hapus',
        });
    });
    actionsEl.appendChild(deleteBtn);

    div.appendChild(actionsEl);

    // --- Hidden checkbox for selection state ---
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('sr-only-checkbox');
    checkbox.checked = isSelected;
    checkbox.setAttribute('aria-label', `Pilih ${item.name}`);
    div.appendChild(checkbox);

    // --- Click: toggle selection (Shift/Ctrl support) ---
    div.addEventListener('click', (e) => {
        if (e.target.closest('.grid-actions')) return;

        const allCards = Array.from(div.parentElement.querySelectorAll('.grid-item'));
        const currentIndex = allCards.indexOf(div);

        if (e.shiftKey && lastSelectedGridIndex >= 0) {
            const start = Math.min(lastSelectedGridIndex, currentIndex);
            const end = Math.max(lastSelectedGridIndex, currentIndex);
            for (let i = start; i <= end; i++) {
                const card = allCards[i];
                if (card) {
                    const path = card.dataset.itemPath;
                    const cb = card.querySelector('.sr-only-checkbox');
                    if (cb && !cb.checked) {
                        cb.checked = true;
                        toggleSelection(path, true);
                        card.classList.add('selected');
                        card.setAttribute('aria-selected', 'true');
                    }
                }
            }
        } else if (e.ctrlKey || e.metaKey) {
            const newState = !checkbox.checked;
            checkbox.checked = newState;
            toggleSelection(key, newState);
            div.classList.toggle('selected', newState);
            div.setAttribute('aria-selected', String(newState));
            lastSelectedGridIndex = currentIndex;
        } else {
            const newState = !checkbox.checked;
            checkbox.checked = newState;
            toggleSelection(key, newState);
            div.classList.toggle('selected', newState);
            div.setAttribute('aria-selected', String(newState));
            lastSelectedGridIndex = currentIndex;
        }
    });

    // --- Double-click: open/navigate/preview ---
    div.addEventListener('dblclick', () => {
        if (item.type === 'folder') {
            navigateTo(item.path);
        } else if (isPreviewable) {
            openTextPreview(item);
        } else if (isMediaPreviewable) {
            openMediaPreview(item);
        } else {
            const ext = getFileExtension(item.name);
            if (isWordDocument(ext)) {
                openInWord(item);
            } else {
                const url = buildFileUrl(item.path);
                const w = window.open(url, '_blank');
                if (w) w.opener = null;
            }
        }
    });

    // --- Context menu ---
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openContextMenu(e.clientX, e.clientY, item);
    });

    // --- Drag and drop ---
    div.addEventListener('dragstart', (e) => handleDragStart(e, item));
    div.addEventListener('dragend', (e) => handleDragEnd(e));

    if (item.type === 'folder') {
        div.addEventListener('dragover', (e) => handleDragOver(e, item));
        div.addEventListener('drop', (e) => handleDrop(e, item));
        div.addEventListener('dragleave', (e) => handleDragLeave(e));
    }

    return div;
}

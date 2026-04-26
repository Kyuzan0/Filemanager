/**
 * Overlay Renderer Module
 * Handles overlay/modal rendering logic for the File Manager application
 */

import { getFileExtension } from '../utils.js';

/**
 * Shows mobile context menu for file actions
 * @param {Event} event - Click event
 * @param {Object} item - File/folder item data
 */
export function showMobileContextMenu(event, item) {
    // Remove existing mobile context menu
    const existingMenu = document.getElementById('mobile-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.id = 'mobile-context-menu';
    menu.className = 'mobile-context-menu';

    const menuItems = [
        { action: 'preview', icon: 'ri-folder-open-line', label: 'Buka', color: 'context-action-open' },
        ...(item.type === 'file' ? [{ action: 'download', icon: 'ri-download-line', label: 'Unduh', color: 'context-action-download' }] : []),
        { action: 'rename', icon: 'ri-edit-line', label: 'Ganti Nama', color: 'context-action-rename' },
        { action: 'move', icon: 'ri-folder-transfer-line', label: 'Pindahkan', color: 'context-action-move' },
        { divider: true },
        { action: 'delete', icon: 'ri-delete-bin-line', label: 'Hapus', color: 'context-action-delete' }
    ];

    menu.innerHTML = menuItems.map(menuItem => {
        if (menuItem.divider) {
            return '<div class="context-menu-divider"></div>';
        }
        return `
            <button class="mobile-context-item" data-action="${menuItem.action}">
                <i class="${menuItem.icon} ${menuItem.color} text-lg"></i>
                <span class="context-item-label">${menuItem.label}</span>
            </button>
        `;
    }).join('');

    document.body.appendChild(menu);

    // Position the menu
    const rect = event.target.closest('button').getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    let top = rect.bottom + 4;
    let left = rect.left;

    // Adjust if menu goes off screen
    if (left + menuRect.width > window.innerWidth) {
        left = window.innerWidth - menuRect.width - 8;
    }
    if (top + menuRect.height > window.innerHeight) {
        top = rect.top - menuRect.height - 4;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    // Handle menu item clicks
    menu.querySelectorAll('.mobile-context-item').forEach(menuBtn => {
        menuBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const action = menuBtn.dataset.action;
            closeMobileContextMenu();
            await handleMobileContextAction(action, item);
        });
    });

    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeMobileContextMenu, { once: true });
    }, 0);
}

/**
 * Closes mobile context menu
 */
export function closeMobileContextMenu() {
    const menu = document.getElementById('mobile-context-menu');
    if (menu) {
        menu.remove();
    }
}

/**
 * Handles mobile context menu action
 * @param {string} action - Action type
 * @param {Object} item - File/folder item
 */
export async function handleMobileContextAction(action, item) {
    const { path, type, name } = item;

    if (action === 'preview') {
        if (type === 'folder') {
            // Use global navigateTo if available
            if (window.navigateTo) {
                window.navigateTo(path);
            }
        } else {
            // Check if previewable
            const ext = getFileExtension(name);
            const textExts = new Set(['txt','md','json','js','jsx','ts','tsx','css','scss','less','html','htm','xml','php','py','java','c','cpp','h','hpp','cs','go','rs','rb','swift','kt','sql','sh','bash','yml','yaml','toml','ini','cfg','conf','log','env']);
            const mediaExts = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','mp4','webm','mp3','wav','ogg','pdf']);

            if (textExts.has(ext) && window.openPreviewModal) {
                window.openPreviewModal(path, name);
            } else if (mediaExts.has(ext) && window.openPreviewModal) {
                window.openPreviewModal(path, name);
            } else {
                const url = `api.php?action=raw&path=${encodeURIComponent(path)}`;
                window.open(url, '_blank');
            }
        }
    } else if (action === 'download') {
        const url = `api.php?action=raw&path=${encodeURIComponent(path)}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = name || 'download';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else if (action === 'rename') {
        if (window.openRenameModal) {
            window.openRenameModal(path, name);
        } else if (window.openRenameOverlay) {
            window.openRenameOverlay(item);
        }
    } else if (action === 'move') {
        if (window.openMoveModal) {
            window.openMoveModal([path]);
        } else if (window.openMoveOverlay) {
            window.openMoveOverlay([path]);
        }
    } else if (action === 'delete') {
        if (window.openDeleteOverlay) {
            window.openDeleteOverlay(
                [item],
                async (items) => {
                    const paths = items.map(i => i.path);
                    if (window.deleteItems) {
                        await window.deleteItems(paths);
                    }
                }
            );
        } else if (window.openConfirmOverlay) {
            window.openConfirmOverlay({
                message: `Hapus "${name}"?`,
                description: 'Item yang dihapus tidak dapat dikembalikan.',
                paths: [path],
                showList: false,
                confirmLabel: 'Hapus',
            });
        }
    }
}

/**
 * Moves a row in the DOM immediately for optimistic UI update
 * @param {string} itemPath - Path of the item being moved
 * @returns {Object|null} - Object with row element and original position for rollback, or null if not found
 */
export function moveRowInDOM(itemPath) {
    const tableBody = document.getElementById('file-table');
    if (!tableBody) {
        return null;
    }

    const row = tableBody.querySelector(`tr[data-item-path="${CSS.escape(itemPath)}"]`);
    if (!row) {
        return null;
    }

    // Store original position for rollback
    const originalPosition = {
        row: row,
        parent: row.parentNode,
        nextSibling: row.nextSibling
    };

    // Remove row from DOM immediately
    row.remove();

    return originalPosition;
}

/**
 * Rolls back a DOM move operation
 * @param {Object} originalPosition - Original position object from moveRowInDOM
 */
export function rollbackMove(originalPosition) {
    if (!originalPosition || !originalPosition.row) {
        return;
    }

    const { row, parent, nextSibling } = originalPosition;

    // Re-insert the row at its original position
    if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(row, nextSibling);
    } else {
        parent.appendChild(row);
    }
}

/**
 * Creates a preview overlay with the given content
 * @param {HTMLElement} container - Container element for the preview
 * @param {Object} item - Item to preview
 * @param {string} content - Content to display
 * @param {Object} options - Preview options
 */
export function renderPreviewContent(container, item, content, options = {}) {
    if (!container) {
        return;
    }

    const { isEditable = false, lineNumbers = true } = options;

    // Clear previous content
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Create content wrapper
    const wrapper = document.createElement('div');
    wrapper.classList.add('preview-content-wrapper');

    if (lineNumbers) {
        // Create line numbers container
        const lineNumbersContainer = document.createElement('div');
        lineNumbersContainer.classList.add('line-numbers');

        // Count lines
        const lines = content.split('\n');
        for (let i = 1; i <= lines.length; i++) {
            const lineNum = document.createElement('div');
            lineNum.textContent = i;
            lineNum.classList.add('leading-6');
            lineNumbersContainer.appendChild(lineNum);
        }

        wrapper.appendChild(lineNumbersContainer);
    }

    // Create content area
    if (isEditable) {
        const textarea = document.createElement('textarea');
        textarea.classList.add('preview-editor');
        if (lineNumbers) {
            textarea.classList.add('pl-14');
        }
        textarea.value = content;
        textarea.id = 'preview-editor';
        wrapper.appendChild(textarea);
    } else {
        const pre = document.createElement('pre');
        pre.classList.add('preview-code');
        if (lineNumbers) {
            pre.classList.add('pl-14');
        }
        pre.textContent = content;
        wrapper.appendChild(pre);
    }

    container.appendChild(wrapper);
}

/**
 * Renders media preview (image, video, audio)
 * @param {HTMLElement} container - Container element
 * @param {Object} item - Item to preview
 * @param {string} url - Media URL
 */
export function renderMediaPreview(container, item, url) {
    if (!container) {
        return;
    }

    // Clear previous content
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const ext = getFileExtension(item.name);
    const wrapper = document.createElement('div');
    wrapper.classList.add('media-preview-wrapper');

    // Images
    const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']);
    if (imageExts.has(ext)) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = item.name;
        img.classList.add('preview-media-image');
        wrapper.appendChild(img);
    }

    // Videos
    const videoExts = new Set(['mp4', 'webm', 'mkv', 'mov', 'avi']);
    if (videoExts.has(ext)) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.classList.add('preview-media-video');
        wrapper.appendChild(video);
    }

    // Audio
    const audioExts = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac']);
    if (audioExts.has(ext)) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        audio.classList.add('preview-media-audio');
        wrapper.appendChild(audio);
    }

    // PDF
    if (ext === 'pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.classList.add('preview-media-iframe');
        wrapper.appendChild(iframe);
    }

    container.appendChild(wrapper);
}

/**
 * Renders a details overlay for file/folder information
 * @param {HTMLElement} container - Container element
 * @param {Object} item - Item to show details for
 * @param {Object} details - Additional details
 */
export function renderDetailsOverlay(container, item, details = {}) {
    if (!container) {
        return;
    }

    // Clear previous content
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const detailsList = document.createElement('dl');
    detailsList.classList.add('details-list');

    const addDetail = (label, value) => {
        const row = document.createElement('div');
        row.classList.add('details-row');

        const dt = document.createElement('dt');
        dt.classList.add('details-label');
        dt.textContent = label;

        const dd = document.createElement('dd');
        dd.classList.add('details-value');
        dd.textContent = value;

        row.appendChild(dt);
        row.appendChild(dd);
        detailsList.appendChild(row);
    };

    // Add item details
    addDetail('Nama', item.name);
    addDetail('Tipe', item.type === 'folder' ? 'Folder' : 'File');

    if (item.path) {
        addDetail('Path', item.path);
    }

    if (item.size !== undefined && item.type === 'file') {
        const { formatBytes } = require('../utils.js');
        addDetail('Ukuran', formatBytes(item.size));
    }

    if (item.modified) {
        const { formatDate } = require('../utils.js');
        addDetail('Dimodifikasi', formatDate(item.modified));
    }

    // Add any additional details
    Object.entries(details).forEach(([key, value]) => {
        addDetail(key, value);
    });

    container.appendChild(detailsList);
}
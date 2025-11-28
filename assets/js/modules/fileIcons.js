/**
 * File Type Icons Module
 * Berisi fungsi-fungsi terkait icon untuk berbagai jenis file
 */

// Icon cache to avoid redundant lookups
const iconCache = new Map();

// Determine a file kind string from an extension
export function fileKindFromExtension(ext) {
    const e = (ext || '').toLowerCase();

    const images = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','ico','tiff','tif','avif']);
    const pdf = new Set(['pdf']);
    const code = new Set(['js','jsx','ts','tsx','php','html','htm','css','scss','less','json','xml','yml','yaml']);
    const text = new Set(['txt','md','markdown','log','ini','conf','cfg','env','csv']);
    const archives = new Set(['zip','rar','7z','tar','gz','bz2','tgz','xz']);
    const audio = new Set(['mp3','wav','flac','ogg','m4a','aac']);
    const video = new Set(['mp4','webm','mkv','mov','avi','m4v']);
    const sheets = new Set(['xls','xlsx','ods','csv']);
    const docs = new Set(['doc','docx','odt','rtf']);
    const ppts = new Set(['ppt','pptx','odp']);

    if (images.has(e)) return 'image';
    if (pdf.has(e)) return 'pdf';
    if (docs.has(e)) return 'doc';
    if (ppts.has(e)) return 'ppt';
    if (sheets.has(e)) return 'sheet';
    if (archives.has(e)) return 'archive';
    if (audio.has(e)) return 'audio';
    if (video.has(e)) return 'video';
    if (code.has(e)) return 'code';
    if (text.has(e)) return 'text';
    return 'file';
}

// Helper to create an SVG element from path data (supports single or multiple paths)
function createSvg(viewBox, pathDs, fillColor = 'currentColor') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('style', 'width: 100%; height: 100%; display: block;');
    if (!Array.isArray(pathDs)) pathDs = [pathDs];
    pathDs.forEach(d => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', fillColor);
        path.setAttribute('d', d);
        svg.appendChild(path);
    });
    return svg;
}

// SVG icons for each kind (return Element nodes via factory functions)
export const itemTypeIcons = {
    folder: () => createSvg('0 0 24 24', 'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z', '#f59e0b'),
    file: () => createSvg('0 0 24 24', 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z', '#94a3b8'),
    image: () => createSvg('0 0 24 24', 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z', '#ef4444'),
    pdf: () => createSvg('0 0 24 24', 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z', '#ef4444'),
    code: () => createSvg('0 0 24 24', 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z', '#3b82f6'),
    archive: () => createSvg('0 0 24 24', 'M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 6h-2v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2v-2h-2V8h2v2h2v2z', '#8b5cf6'),
    text: () => createSvg('0 0 24 24', 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6zm2-6h8v2H8v-2zm0 4h5v2H8v-2z', '#94a3b8'),
    sheet: () => createSvg('0 0 24 24', 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6zm2-8h2v2H8v-2zm4 0h2v2h-2v-2zm-4 4h2v2H8v-2zm4 0h2v2h-2v-2z', '#22c55e'),
    doc: () => createSvg('0 0 24 24', 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6zm2-8h8v2H8v-2zm0 4h5v2H8v-2z', '#2563eb'),
    ppt: () => createSvg('0 0 24 24', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8 17H6v-4h2v4zm0-6H6V9h2v2zm4 6h-2v-4h2v4zm0-6h-2V9h2v2zm4 6h-2v-4h2v4zm0-6h-2V9h2v2z', '#f97316'),
    audio: () => createSvg('0 0 24 24', 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z', '#ec4899'),
    video: () => createSvg('0 0 24 24', 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z', '#a855f7'),
};

// Get icon info { className, svg } for an item with caching
export function getItemIcon(item) {
    if (!item || !item.type) {
        const svg = (typeof itemTypeIcons.file === 'function') ? itemTypeIcons.file() : itemTypeIcons.file;
        return { className: 'file', svg };
    }
    
    // Folders always use the same icon
    if (item.type === 'folder') {
        const svg = (typeof itemTypeIcons.folder === 'function') ? itemTypeIcons.folder() : itemTypeIcons.folder;
        return { className: 'folder', svg };
    }
    
    // Extract extension for caching
    const ext = typeof item.name === 'string' ? getFileExtension(item.name) : '';
    
    // Check cache first
    const cacheKey = `file-${ext}`;
    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey);
    }
    
    // Compute and cache the result
    const kind = fileKindFromExtension(ext);
    const svgSource = (typeof itemTypeIcons[kind] === 'function')
        ? itemTypeIcons[kind]()
        : (itemTypeIcons[kind] || ((typeof itemTypeIcons.file === 'function') ? itemTypeIcons.file() : itemTypeIcons.file));
    const result = { className: `file ${kind}`, svg: svgSource };
    
    iconCache.set(cacheKey, result);
    return result;
}

/**
 * Clear icon cache (useful for testing or memory management)
 */
export function clearIconCache() {
    iconCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getIconCacheStats() {
    return {
        size: iconCache.size,
        keys: Array.from(iconCache.keys())
    };
}

// Re-export getFileExtension from utils to avoid circular dependency
function getFileExtension(name) {
    const index = name.lastIndexOf('.');
    return index === -1 ? '' : name.slice(index + 1).toLowerCase();
}
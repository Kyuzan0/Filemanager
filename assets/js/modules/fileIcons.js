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

// SVG icons for each kind
export const itemTypeIcons = {
    folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 4l2 2h7a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h5zm11 6v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8h18z"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2zM8.5 11.5A2.5 2.5 0 1 0 8.5 6a2.5 2.5 0 0 0 0 5.5zM5 19l5.5-7 4 5 3-4L19 19H5z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path fill="currentColor" d="M14 2v6h6"/><path fill="currentColor" d="M7 14h2.5a1.5 1.5 0 0 0 0-3H7v3zm0 1v3h1.5v-1H10a2.5 2.5 0 1 0 0-5H7v3zm7.5-4H12v7h1.5v-2.5h1.4c1.38 0 2.6-1.12 2.6-2.5s-1.22-2-2.5-2z"/></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.4 16.6-1.4 1.4L2 12l6-6 1.4 1.4L4.8 12l4.6 4.6zm5.2 0 1.4 1.4 6-6-6-6-1.4 1.4L19.2 12l-4.6 4.6z"/></svg>',
    archive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 5.5l-2-2h-13l-2 2V9h17V5.5zM3.5 20.5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V10.5h-17v10zM11 6h2v2h-2V6z"/></svg>',
    text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm2 8h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm10 7H8V5h8v4zm0 2H8v2h8v-2zm0 4H8v4h8v-4z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path fill="currentColor" d="M14 2v6h6"/><path fill="currentColor" d="M7 12h10v2H7zm0 4h7v2H7z"/></svg>',
    ppt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18v14H3zM5 7h10v2H5zm0 4h8v2H5zm0 4h6v2H6zm12-6h3v8h-3z"/></svg>',
    audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
    video: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 10.5V6c0-1.1-.9-2-2-2H5C3.9 4 3 4.9 3 6v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4.5l4 4v-11l-4 4z"/></svg>',
};

// Get icon info { className, svg } for an item with caching
export function getItemIcon(item) {
    if (!item || !item.type) {
        return { className: 'file', svg: itemTypeIcons.file };
    }
    
    // Folders always use the same icon
    if (item.type === 'folder') {
        return { className: 'folder', svg: itemTypeIcons.folder };
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
    const svg = itemTypeIcons[kind] || itemTypeIcons.file;
    const result = { className: `file ${kind}`, svg };
    
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
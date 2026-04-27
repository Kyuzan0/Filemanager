/**
 * File Type Icons Module
 * Berisi fungsi-fungsi terkait icon untuk berbagai jenis file
 */

// Icon cache to avoid redundant lookups
const iconCache = new Map();

// Determine a file kind string from an extension
export function fileKindFromExtension(ext) {
    const e = (ext || '').toLowerCase();

    // Check if we have a specific icon for this extension
    const specificExtKey = e === 'pdf' ? 'pdf_ext' : e;
    if (itemTypeIcons[specificExtKey]) {
        return specificExtKey;
    }

    const images = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','ico','tiff','tif','avif']);
    const pdf = new Set(['pdf']);
    const code = new Set(['js','jsx','ts','tsx','php','html','htm','css','scss','less','json','xml','yml','yaml','py','rb','java','go','rs','c','cpp','cs','swift','kt','sql','sh','bash']);
    const text = new Set(['txt','md','markdown','log','ini','conf','cfg','env','csv']);
    const archives = new Set(['zip','rar','7z','tar','gz','bz2','tgz','xz']);
    const audio = new Set(['mp3','wav','flac','ogg','m4a','aac']);
    const video = new Set(['mp4','webm','mkv','mov','avi','m4v']);
    const sheets = new Set(['xls','xlsx','ods','csv']);
    const docs = new Set(['doc','docx','odt','rtf']);
    const ppts = new Set(['ppt','pptx','odp']);

    if (images.has(e)) {
        return 'image';
    }
    if (pdf.has(e)) {
        return 'pdf';
    }
    if (docs.has(e)) {
        return 'doc';
    }
    if (ppts.has(e)) {
        return 'ppt';
    }
    if (sheets.has(e)) {
        return 'sheet';
    }
    if (archives.has(e)) {
        return 'archive';
    }
    if (audio.has(e)) {
        return 'audio';
    }
    if (video.has(e)) {
        return 'video';
    }
    if (code.has(e)) {
        return 'code';
    }
    if (text.has(e)) {
        return 'text';
    }
    return 'file';
}

// CSS variable reader with theme-aware caching
let _cachedStyle = null;
let _cachedTheme = null;

function getCSSVar(name) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    if (!_cachedStyle || _cachedTheme !== currentTheme) {
        _cachedStyle = getComputedStyle(document.documentElement);
        _cachedTheme = currentTheme;
    }
    return _cachedStyle.getPropertyValue(name).trim();
}

// Helper to create an SVG element from path data (supports single or multiple paths)
function createSvg(viewBox, pathDs, fillColor = 'currentColor') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('style', 'width: 100%; height: 100%; display: block;');
    if (!Array.isArray(pathDs)) {
        pathDs = [pathDs];
    }
    pathDs.forEach(d => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', fillColor);
        path.setAttribute('d', d);
        svg.appendChild(path);
    });
    return svg;
}

// Factory function for distinctive file icons with an extension label
function createFileTypeIcon(label, foldColor, labelColor = '#ffffff') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('style', 'width: 100%; height: 100%; display: block;');

    // Base document shape (gray)
    const basePage = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    basePage.setAttribute('fill', getCSSVar('--icon-default-bg') || '#e2e8f0');
    basePage.setAttribute('d', 'M5 3C5 1.89543 5.89543 1 7 1H13.5858C14.1162 1 14.6249 1.21071 15 1.58579L19.4142 6C19.7893 6.37508 20 6.88378 20 7.41421V21C20 22.1046 19.1046 23 18 23H7C5.89543 23 5 22.1046 5 21V3Z');
    svg.appendChild(basePage);

    // Folded corner (accent color)
    const fold = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fold.setAttribute('fill', foldColor);
    fold.setAttribute('d', 'M13.5 1V7.5H20L13.5 1Z');
    fold.setAttribute('opacity', '0.8');
    svg.appendChild(fold);

    // Label badge rectangle (accent color)
    const badge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    badge.setAttribute('fill', foldColor);
    badge.setAttribute('d', 'M4 14C4 13.4477 4.44772 13 5 13H19C19.5523 13 20 13.4477 20 14V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V14Z');
    svg.appendChild(badge);

    // Text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '12');
    text.setAttribute('y', '18.5');
    text.setAttribute('fill', labelColor);
    text.setAttribute('font-size', label.length > 3 ? '5.5px' : '6.5px');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = label;
    svg.appendChild(text);

    return svg;
}

// SVG icons for each kind (return Element nodes via factory functions)
export const itemTypeIcons = {
    // Categories fallback
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
    
    // Specific Extensions
    'js': () => createFileTypeIcon('JS', '#F7DF1E', '#000000'),
    'jsx': () => createFileTypeIcon('JSX', '#61DAFB'),
    'ts': () => createFileTypeIcon('TS', '#3178C6'),
    'tsx': () => createFileTypeIcon('TSX', '#3178C6'),
    'php': () => createFileTypeIcon('PHP', '#777BB4'),
    'html': () => createFileTypeIcon('HTML', '#E34F26'),
    'htm': () => createFileTypeIcon('HTM', '#E34F26'),
    'css': () => createFileTypeIcon('CSS', '#1572B6'),
    'scss': () => createFileTypeIcon('SCSS', '#CD6799'),
    'less': () => createFileTypeIcon('LESS', '#1D365D'),
    'json': () => createFileTypeIcon('JSON', '#5B9A2F'),
    'xml': () => createFileTypeIcon('XML', '#0060AC'),
    'yml': () => createFileTypeIcon('YML', '#CB171E'),
    'yaml': () => createFileTypeIcon('YAML', '#CB171E'),
    'py': () => createFileTypeIcon('PY', '#3776AB'),
    'rb': () => createFileTypeIcon('RB', '#CC342D'),
    'java': () => createFileTypeIcon('JAVA', '#ED8B00'),
    'go': () => createFileTypeIcon('GO', '#00ADD8'),
    'rs': () => createFileTypeIcon('RS', '#DEA584'),
    'c': () => createFileTypeIcon('C', '#A8B9CC'),
    'cpp': () => createFileTypeIcon('C++', '#00599C'),
    'cs': () => createFileTypeIcon('C#', '#239120'),
    'swift': () => createFileTypeIcon('SWIFT', '#FA7343'),
    'kt': () => createFileTypeIcon('KT', '#7F52FF'),
    'sql': () => createFileTypeIcon('SQL', '#336791'),
    'sh': () => createFileTypeIcon('SH', '#4EAA25'),
    'bash': () => createFileTypeIcon('BASH', '#4EAA25'),
    'md': () => createFileTypeIcon('MD', '#083FA1'),
    'markdown': () => createFileTypeIcon('MD', '#083FA1'),
    'txt': () => createFileTypeIcon('TXT', '#6B7280'),
    'log': () => createFileTypeIcon('LOG', '#9CA3AF'),
    'ini': () => createFileTypeIcon('INI', '#6B7280'),
    'conf': () => createFileTypeIcon('CONF', '#6B7280'),
    'cfg': () => createFileTypeIcon('CFG', '#6B7280'),
    'env': () => createFileTypeIcon('ENV', '#ECD53F', '#000000'),
    'csv': () => createFileTypeIcon('CSV', '#217346'),
    'doc': () => createFileTypeIcon('DOC', '#2B579A'),
    'docx': () => createFileTypeIcon('DOCX', '#2B579A'),
    'xls': () => createFileTypeIcon('XLS', '#217346'),
    'xlsx': () => createFileTypeIcon('XLSX', '#217346'),
    'ppt': () => createFileTypeIcon('PPT', '#D24726'),
    'pptx': () => createFileTypeIcon('PPTX', '#D24726'),
    'pdf_ext': () => createFileTypeIcon('PDF', '#FF0000'),
    'zip': () => createFileTypeIcon('ZIP', '#F0C419', '#000000'),
    'rar': () => createFileTypeIcon('RAR', '#6C2D82'),
    '7z': () => createFileTypeIcon('7Z', '#4EAA25'),
    'tar': () => createFileTypeIcon('TAR', '#8B4513'),
    'gz': () => createFileTypeIcon('GZ', '#8B4513'),
    'bz2': () => createFileTypeIcon('BZ2', '#8B4513'),
    'tgz': () => createFileTypeIcon('TGZ', '#8B4513'),
    'xz': () => createFileTypeIcon('XZ', '#8B4513'),
    'mp3': () => createFileTypeIcon('MP3', '#FF6B9D'),
    'wav': () => createFileTypeIcon('WAV', '#4FC3F7', '#000000'),
    'flac': () => createFileTypeIcon('FLAC', '#FF9800'),
    'ogg': () => createFileTypeIcon('OGG', '#4CAF50'),
    'm4a': () => createFileTypeIcon('M4A', '#9C27B0'),
    'aac': () => createFileTypeIcon('AAC', '#F44336'),
    'mp4': () => createFileTypeIcon('MP4', '#9C27B0'),
    'webm': () => createFileTypeIcon('WEBM', '#4CAF50'),
    'mkv': () => createFileTypeIcon('MKV', '#2196F3'),
    'mov': () => createFileTypeIcon('MOV', '#607D8B'),
    'avi': () => createFileTypeIcon('AVI', '#FF5722'),
    'm4v': () => createFileTypeIcon('M4V', '#7B1FA2'),
    'png': () => createFileTypeIcon('PNG', '#0099E5'),
    'jpg': () => createFileTypeIcon('JPG', '#E91E63'),
    'jpeg': () => createFileTypeIcon('JPEG', '#E91E63'),
    'gif': () => createFileTypeIcon('GIF', '#4CAF50'),
    'webp': () => createFileTypeIcon('WEBP', '#00C853'),
    'svg': () => createFileTypeIcon('SVG', '#FFB13B', '#000000'),
    'bmp': () => createFileTypeIcon('BMP', '#42A5F5'),
    'ico': () => createFileTypeIcon('ICO', '#00BCD4'),
    'tiff': () => createFileTypeIcon('TIFF', '#78909C'),
    'tif': () => createFileTypeIcon('TIF', '#78909C'),
    'avif': () => createFileTypeIcon('AVIF', '#66BB6A'),
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
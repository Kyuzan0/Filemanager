/**
 * SVG Icons Module
 * Custom SVG icons for file types
 */

export const svgIcons = {
  folder: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 4l2 2h7a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h5zm11 6v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8h18z"></path></svg>`,
  
  file: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5"></path></svg>`,
  
  image: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2zM8.5 11.5A2.5 2.5 0 1 0 8.5 6a2.5 2.5 0 0 0 0 5.5zM5 19l5.5-7 4 5 3-4L19 19H5z"></path></svg>`,
  
  pdf: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 18H6V4h8v16zm-2-3h-2v-2h2v2zm0-4h-2V9h2v4zm4 4h-2v-2h2v2zm0-4h-2V9h2v4z"></path></svg>`,
  
  code: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.4 16.6L7.9 18 2 12l6-6 1.4 1.4L4.8 12l4.6 4.6zm5.2 0l1.4-1.4L22 12l-6-6-1.4 1.4 4.6 4.6-4.6 4.6z"></path></svg>`,
  
  archive: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-6-10h-2V9h2v4z"></path></svg>`,
  
  text: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-2 16H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V8h8v2z"></path></svg>`,
  
  sheet: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 9h2v2H7V9zm4 0h2v2h-2V9zm4 0h2v2h-2V9zM7 13h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"></path></svg>`,
  
  doc: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V8h8v2z"></path></svg>`,
  
  ppt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 9h-2V9h2v3zm4 0h-2V9h2v3zM9 9v3H7V9h2z"></path></svg>`,
  
  audio: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v9.28c-.47-.29-.99-.46-1.5-.46C9.01 11.82 7 13.79 7 16c0 2.21 2.01 4 4.5 4s4.5-1.79 4.5-4h1.5c0 3.04-2.69 5.5-6 5.5-3.31 0-6-2.46-6-5.5-.59-4.36 2.33-8.46 6.5-8.46 1.41 0 2.73.35 3.88.94V3h4V1h-6z"></path></svg>`,
  
  video: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg>`,
  
  markdown: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-2v2h-2v-2h-2v-2h2V9h2v2h2v2zm-8-2h2v6H9v-6z"></path></svg>`,
};

/**
 * Get SVG icon for file type
 * @param {string} filename - The filename
 * @param {string} type - The file type (folder or file)
 * @returns {string} SVG HTML string
 */
export function getSvgIcon(filename, type) {
  const ext = getFileExtension(filename);
  
  const iconMap = {
    // Folders
    'folder': 'folder',
    
    // Images
    'png': 'image', 'jpg': 'image', 'jpeg': 'image', 
    'gif': 'image', 'webp': 'image', 'svg': 'image',
    'bmp': 'image', 'ico': 'image',
    
    // Documents
    'pdf': 'pdf',
    'doc': 'doc', 'docx': 'doc',
    'xls': 'sheet', 'xlsx': 'sheet', 'csv': 'sheet', 'ods': 'sheet',
    'ppt': 'ppt', 'pptx': 'ppt', 'odp': 'ppt',
    
    // Text/Code
    'txt': 'text',
    'md': 'markdown', 'markdown': 'markdown',
    'html': 'code', 'htm': 'code',
    'css': 'code', 'scss': 'code', 'less': 'code',
    'js': 'code', 'jsx': 'code', 'ts': 'code', 'tsx': 'code',
    'php': 'code', 'py': 'code', 'java': 'code', 'c': 'code', 'cpp': 'code',
    'json': 'code', 'xml': 'code', 'yaml': 'code',
    'yml': 'code', 'conf': 'code', 'ini': 'code', 'env': 'code',
    
    // Archives
    'zip': 'archive', 'rar': 'archive', '7z': 'archive',
    'tar': 'archive', 'gz': 'archive', 'bz2': 'archive', 'tgz': 'archive',
    
    // Media
    'mp3': 'audio', 'wav': 'audio', 'flac': 'audio',
    'ogg': 'audio', 'm4a': 'audio', 'aac': 'audio',
    'mp4': 'video', 'webm': 'video', 'mkv': 'video',
    'mov': 'video', 'avi': 'video', 'm4v': 'video', 'flv': 'video',
  };
  
  const iconKey = iconMap[ext] || iconMap[type] || 'file';
  return svgIcons[iconKey] || svgIcons.file;
}

function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

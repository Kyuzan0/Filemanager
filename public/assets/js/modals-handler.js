/**
 * Modal Handlers - Menangani semua modal interactions
 * Includes: Preview, Confirm, Create, Rename, Move, Log, Settings
 */

// ============= Modal State =============
let _lastFocusedTriggerElement = null;

function rememberTriggerFocus() {
  _lastFocusedTriggerElement = document.activeElement;
}

function restoreTriggerFocus() {
  if (_lastFocusedTriggerElement && typeof _lastFocusedTriggerElement.focus === 'function') {
    try {
      _lastFocusedTriggerElement.focus();
    } catch (_) {}
  }
  _lastFocusedTriggerElement = null;
}

// Trap focus inside an overlay container
function trapFocus(overlayEl) {
  if (!overlayEl) return;
  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  overlayEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(overlayEl.querySelectorAll(focusableSelectors)).filter(el => !el.disabled && el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

let modalState = {
  preview: {
    currentFile: null,
    isDirty: false,
    originalContent: '',
    previewUrl: '',
    previewName: ''
  },
  move: {
    currentPath: '',
    selectedFolder: null,
    itemsToMove: []
  },
  confirm: {
    callback: null,
    items: []
  }
};

// ============= Preview/Editor Modal =============

// Store scroll handler reference for cleanup
let previewScrollHandler = null;

// File type detection helpers
const PREVIEW_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
  video: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
  pdf: ['pdf'],
  text: ['txt', 'html', 'css', 'js', 'json', 'xml', 'md', 'php', 'py', 'java', 'c', 'cpp', 'h', 'sh', 'bat', 'sql', 'yml', 'yaml', 'ini', 'conf', 'log', 'htaccess', 'gitignore', 'env', 'ts', 'tsx', 'jsx', 'vue', 'svelte']
};

function getFileExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ext === filename.toLowerCase() ? '' : ext;
}

// Truncate filename while preserving extension
// e.g., "Gemini_Generated_Image_egrvdhegrv.png" -> "Gemini_Generated_Im...png"
function truncateFilename(filename, maxLength = 30) {
  if (!filename || filename.length <= maxLength) return filename;

  const lastDot = filename.lastIndexOf('.');

  // No extension or extension is the whole name
  if (lastDot === -1 || lastDot === 0) {
    return filename.substring(0, maxLength - 3) + '...';
  }

  const name = filename.substring(0, lastDot);
  const ext = filename.substring(lastDot); // includes the dot

  // If extension is too long, just truncate everything
  if (ext.length >= maxLength - 3) {
    return filename.substring(0, maxLength - 3) + '...';
  }

  // Calculate how much of the name we can show
  const availableForName = maxLength - ext.length - 3; // 3 for "..."

  if (availableForName <= 0) {
    return filename.substring(0, maxLength - 3) + '...';
  }

  return name.substring(0, availableForName) + '...' + ext;
}

function getPreviewType(filename) {
  const ext = getFileExtension(filename);
  for (const [type, extensions] of Object.entries(PREVIEW_TYPES)) {
    if (extensions.includes(ext)) return type;
  }
  // Default to text for unknown extensions
  return 'text';
}

// ============= Image Zoom and Pan Functions =============
let currentZoom = 100;
const ZOOM_STEP = 25;
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

// Base scale to fit image in container at 100% zoom
let baseScale = 1;

// Image pan/drag state - using transform-based panning
let imagePanState = {
  isPanning: false,
  startX: 0,
  startY: 0,
  translateX: 0,
  translateY: 0,
  lastTranslateX: 0,
  lastTranslateY: 0
};

// ============= Image Gallery Navigation State =============
let galleryState = {
  images: [],       // Array of { path, name } for all images in current directory
  currentIndex: -1, // Index of currently viewed image
  keyHandler: null   // Reference to keyboard handler for cleanup
};

// ============= Markdown Preview State =============
let markdownState = {
  isRendered: false, // true = showing rendered HTML, false = showing CodeMirror
  rawContent: ''     // Cached raw markdown content
};

function updateZoomLevel() {
  const zoomLabel = document.getElementById('preview-zoom-level');
  if (zoomLabel) {
    zoomLabel.textContent = `${currentZoom}%`;
  }

  const img = document.getElementById('preview-image');
  const container = document.getElementById('preview-image-container');

  if (img) {
    // Apply both scale and translate transforms
    applyImageTransform(img);

    if (currentZoom === 100 && imagePanState.translateX === 0 && imagePanState.translateY === 0) {
      img.classList.remove('zoomed');
    } else {
      img.classList.add('zoomed');
    }

    // Update cursor based on new zoom level
    updateImageCursor();
  }
}

// Calculate base scale to fit image in container
function calculateBaseScale(container, img) {
  if (!container || !img || !img.naturalWidth || !img.naturalHeight) {
    return 1;
  }

  const containerRect = container.getBoundingClientRect();
  // Account for padding (smaller on mobile)
  const isMobile = window.innerWidth < 640;
  const padding = isMobile ? 16 : 32; // 0.5rem on mobile, 1rem on desktop
  const containerWidth = containerRect.width - padding;
  const containerHeight = containerRect.height - padding;

  const scaleX = containerWidth / img.naturalWidth;
  const scaleY = containerHeight / img.naturalHeight;

  // Use the smaller scale to ensure image fits entirely
  // On mobile, allow upscaling up to 1.5x to better use screen space
  // On desktop, cap at 1 to not upscale small images
  const fitScale = Math.min(scaleX, scaleY);
  const maxScale = isMobile ? 1.5 : 1;

  return Math.min(fitScale, maxScale);
}

// Apply combined transform (scale + translate) to image
function applyImageTransform(img) {
  if (!img) img = document.getElementById('preview-image');
  if (!img) return;

  // Calculate effective scale: baseScale * (zoom / 100)
  const effectiveScale = baseScale * (currentZoom / 100);
  const translateX = imagePanState.translateX;
  const translateY = imagePanState.translateY;

  img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${effectiveScale})`;
}

function zoomIn() {
  if (currentZoom < MAX_ZOOM) {
    currentZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
    updateZoomLevel();
  }
}

function zoomOut() {
  if (currentZoom > MIN_ZOOM) {
    currentZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
    updateZoomLevel();
  }
}

function resetImageZoom() {
  currentZoom = 100;

  // Reset pan state
  imagePanState = {
    isPanning: false,
    startX: 0,
    startY: 0,
    translateX: 0,
    translateY: 0,
    lastTranslateX: 0,
    lastTranslateY: 0
  };

  // Recalculate base scale
  const container = document.getElementById('preview-image-container');
  const img = document.getElementById('preview-image');
  if (container && img && img.naturalWidth) {
    baseScale = calculateBaseScale(container, img);
  }

  updateZoomLevel();

  // Remove pan classes
  if (container) {
    container.classList.remove('is-panning', 'can-pan');
  }
}

// Track initialization state to prevent duplicate event bindings
let zoomControlsInitialized = false;

// Initialize zoom controls and pan functionality
function initImageZoomControls() {
  // Prevent duplicate initialization
  if (zoomControlsInitialized) {

    return;
  }

  const zoomInBtn = document.getElementById('preview-zoom-in');
  const zoomOutBtn = document.getElementById('preview-zoom-out');
  const zoomResetBtn = document.getElementById('preview-zoom-reset');
  const imageContainer = document.getElementById('preview-image-container');
  const image = document.getElementById('preview-image');

  // Remove any existing listeners by cloning and replacing elements
  if (zoomInBtn) {
    const newZoomInBtn = zoomInBtn.cloneNode(true);
    zoomInBtn.parentNode.replaceChild(newZoomInBtn, zoomInBtn);
    newZoomInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      zoomIn();
    });
  }

  if (zoomOutBtn) {
    const newZoomOutBtn = zoomOutBtn.cloneNode(true);
    zoomOutBtn.parentNode.replaceChild(newZoomOutBtn, zoomOutBtn);
    newZoomOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      zoomOut();
    });
  }

  if (zoomResetBtn) {
    const newZoomResetBtn = zoomResetBtn.cloneNode(true);
    zoomResetBtn.parentNode.replaceChild(newZoomResetBtn, zoomResetBtn);
    newZoomResetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      resetImageZoom();
    });
  }

  // Mouse wheel zoom
  if (imageContainer) {
    imageContainer.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    }, { passive: false });

    // Initialize pan/drag functionality
    initImagePan(imageContainer, image);
  }

  zoomControlsInitialized = true;

}

function sharePreviewLink() {
  const shareUrl = modalState.preview.previewUrl;
  if (!shareUrl) return;

  const sharePayload = {
    title: modalState.preview.previewName || 'File Preview',
    url: shareUrl
  };

  if (navigator.share) {
    navigator.share(sharePayload).catch(() => showError('Gagal membuka dialog share'));
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl)
      .then(() => showSuccess('Link preview disalin ke clipboard'))
      .catch(() => showError('Gagal menyalin link'));
    return;
  }

  showSuccess('Salin tautan: ' + shareUrl);
}

function togglePreviewFullscreen() {
  const overlay = document.getElementById('preview-overlay');
  if (!overlay) return;

  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }

  if (overlay.requestFullscreen) {
    overlay.requestFullscreen().catch(() => showError('Tidak bisa masuk ke mode layar penuh'));
  }
}

function handlePreviewMore() {
  showSuccess('Lebih banyak tindakan akan segera hadir');
}

// Initialize image pan/drag functionality
function initImagePan(container, image) {
  if (!container || !image) return;

  // Mouse events for panning
  container.addEventListener('mousedown', handlePanStart);
  container.addEventListener('mousemove', handlePanMove);
  container.addEventListener('mouseup', handlePanEnd);
  container.addEventListener('mouseleave', handlePanEnd);

  // Touch events for mobile panning
  container.addEventListener('touchstart', handleTouchPanStart, { passive: false });
  container.addEventListener('touchmove', handleTouchPanMove, { passive: false });
  container.addEventListener('touchend', handleTouchPanEnd);
  container.addEventListener('touchcancel', handleTouchPanEnd);
}

// Mouse pan handlers - using transform-based panning
function handlePanStart(e) {
  const container = e.currentTarget;
  const image = document.getElementById('preview-image');

  // Always allow panning when zoomed (any level)
  if (currentZoom === 100) return;

  // Prevent default to avoid text selection
  e.preventDefault();

  imagePanState.isPanning = true;
  imagePanState.startX = e.clientX;
  imagePanState.startY = e.clientY;
  imagePanState.lastTranslateX = imagePanState.translateX;
  imagePanState.lastTranslateY = imagePanState.translateY;

  // Add panning class for visual feedback
  container.classList.add('is-panning');
  container.style.cursor = 'grabbing';
  if (image) image.style.cursor = 'grabbing';
}

function handlePanMove(e) {
  if (!imagePanState.isPanning) return;

  e.preventDefault();

  const image = document.getElementById('preview-image');
  const container = document.getElementById('preview-image-container');

  const deltaX = e.clientX - imagePanState.startX;
  const deltaY = e.clientY - imagePanState.startY;

  // Calculate new translate values
  let newTranslateX = imagePanState.lastTranslateX + deltaX;
  let newTranslateY = imagePanState.lastTranslateY + deltaY;

  // Apply boundary limits
  const bounds = getPanBounds(container, image);
  newTranslateX = Math.max(bounds.minX, Math.min(bounds.maxX, newTranslateX));
  newTranslateY = Math.max(bounds.minY, Math.min(bounds.maxY, newTranslateY));

  imagePanState.translateX = newTranslateX;
  imagePanState.translateY = newTranslateY;

  // Apply transform
  applyImageTransform(image);
}

function handlePanEnd(e) {
  if (!imagePanState.isPanning) return;

  imagePanState.isPanning = false;

  const container = e.currentTarget;
  const image = document.getElementById('preview-image');

  // Remove panning class
  container.classList.remove('is-panning');

  // Reset cursor based on pan availability
  const canPan = currentZoom !== 100;
  container.style.cursor = canPan ? 'grab' : '';
  if (image) {
    image.style.cursor = canPan ? 'grab' : 'default';
  }

  // Update container class
  if (canPan) {
    container.classList.add('can-pan');
  } else {
    container.classList.remove('can-pan');
  }
}

// Touch pan handlers - using transform-based panning
function handleTouchPanStart(e) {
  if (e.touches.length !== 1) return; // Only single touch for pan

  // Always allow panning when zoomed (any level)
  if (currentZoom === 100) return;

  const container = e.currentTarget;
  const touch = e.touches[0];

  imagePanState.isPanning = true;
  imagePanState.startX = touch.clientX;
  imagePanState.startY = touch.clientY;
  imagePanState.lastTranslateX = imagePanState.translateX;
  imagePanState.lastTranslateY = imagePanState.translateY;

  container.classList.add('is-panning');
}

function handleTouchPanMove(e) {
  if (!imagePanState.isPanning || e.touches.length !== 1) return;

  e.preventDefault(); // Prevent page scroll while panning

  const image = document.getElementById('preview-image');
  const container = document.getElementById('preview-image-container');
  const touch = e.touches[0];

  const deltaX = touch.clientX - imagePanState.startX;
  const deltaY = touch.clientY - imagePanState.startY;

  // Calculate new translate values
  let newTranslateX = imagePanState.lastTranslateX + deltaX;
  let newTranslateY = imagePanState.lastTranslateY + deltaY;

  // Apply boundary limits
  const bounds = getPanBounds(container, image);
  newTranslateX = Math.max(bounds.minX, Math.min(bounds.maxX, newTranslateX));
  newTranslateY = Math.max(bounds.minY, Math.min(bounds.maxY, newTranslateY));

  imagePanState.translateX = newTranslateX;
  imagePanState.translateY = newTranslateY;

  // Apply transform
  applyImageTransform(image);
}

function handleTouchPanEnd() {
  imagePanState.isPanning = false;

  const container = document.getElementById('preview-image-container');
  if (container) {
    container.classList.remove('is-panning');
  }
}

// Calculate pan boundaries based on zoom level and image/container sizes
function getPanBounds(container, image) {
  if (!container || !image) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  const containerRect = container.getBoundingClientRect();
  // Use effective scale (baseScale * zoom/100)
  const effectiveScale = baseScale * (currentZoom / 100);

  // Scaled image dimensions based on effective scale
  const scaledWidth = image.naturalWidth * effectiveScale;
  const scaledHeight = image.naturalHeight * effectiveScale;

  // Account for container padding
  const containerWidth = containerRect.width - 32;
  const containerHeight = containerRect.height - 32;

  // Calculate how much the image can move in each direction
  let maxX, minX, maxY, minY;

  if (scaledWidth > containerWidth) {
    // Image wider than container - allow panning horizontally
    const overflow = (scaledWidth - containerWidth) / 2;
    maxX = overflow;
    minX = -overflow;
  } else {
    // Image narrower than container - allow moving within container
    const slack = (containerWidth - scaledWidth) / 2;
    maxX = slack;
    minX = -slack;
  }

  if (scaledHeight > containerHeight) {
    // Image taller than container - allow panning vertically
    const overflow = (scaledHeight - containerHeight) / 2;
    maxY = overflow;
    minY = -overflow;
  } else {
    // Image shorter than container - allow moving within container
    const slack = (containerHeight - scaledHeight) / 2;
    maxY = slack;
    minY = -slack;
  }

  return { minX, maxX, minY, maxY };
}

// Check if panning should be enabled (for cursor display)
function shouldEnablePan(container, image) {
  // Enable pan whenever zoom is not 100%
  return currentZoom !== 100;
}

// Update cursor based on pan availability
function updateImageCursor() {
  const container = document.getElementById('preview-image-container');
  const image = document.getElementById('preview-image');

  if (!container || !image) return;

  const canPan = shouldEnablePan(container, image);

  if (canPan) {
    image.style.cursor = 'grab';
    container.style.cursor = 'grab';
    container.classList.add('can-pan');
  } else {
    image.style.cursor = 'default';
    container.style.cursor = 'default';
    container.classList.remove('can-pan');
  }
}

// ============= Gallery Navigation Functions =============

/**
 * Build gallery list from current directory items (accessed via window.getState)
 * Filters only image files from the current directory listing
 */
function buildGalleryList(currentFilePath) {
  galleryState.images = [];
  galleryState.currentIndex = -1;

  // Access state.items via window — set by appInitializer.js
  const items = (typeof window.getState === 'function')
    ? (window.getState().items || [])
    : [];

  // Filter image files only
  const imageExts = PREVIEW_TYPES.image;
  galleryState.images = items
    .filter(item => {
      if (item.type === 'folder' || item.type === 'directory') return false;
      const ext = getFileExtension(item.name);
      return imageExts.includes(ext);
    })
    .map(item => ({ path: item.path, name: item.name }));

  // Find current image index
  galleryState.currentIndex = galleryState.images.findIndex(
    img => img.path === currentFilePath
  );
}

/**
 * Update gallery UI: show/hide nav buttons, update counter
 */
function updateGalleryUI() {
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  const counter = document.getElementById('gallery-counter');

  const hasMultiple = galleryState.images.length > 1;

  if (prevBtn) {
    prevBtn.style.display = hasMultiple ? '' : 'none';
    prevBtn.disabled = galleryState.currentIndex <= 0;
  }
  if (nextBtn) {
    nextBtn.style.display = hasMultiple ? '' : 'none';
    nextBtn.disabled = galleryState.currentIndex >= galleryState.images.length - 1;
  }
  if (counter) {
    counter.style.display = hasMultiple ? '' : 'none';
    counter.textContent = `${galleryState.currentIndex + 1} / ${galleryState.images.length}`;
  }
}

/**
 * Navigate to a specific image in the gallery by index
 */
function navigateGallery(newIndex) {
  if (newIndex < 0 || newIndex >= galleryState.images.length) return;

  const target = galleryState.images[newIndex];
  galleryState.currentIndex = newIndex;

  // Update image source
  const img = document.getElementById('preview-image');
  const title = document.getElementById('preview-title');
  const meta = document.getElementById('preview-meta');
  const loader = document.getElementById('preview-loader');
  const openRaw = document.getElementById('preview-open-raw');
  const downloadBtn = document.getElementById('preview-download');
  const container = document.getElementById('preview-image-container');

  const rawUrl = `api.php?action=raw&path=${encodeURIComponent(target.path)}`;

  // Update modal state
  modalState.preview.currentFile = target.path;
  modalState.preview.previewUrl = rawUrl;
  modalState.preview.previewName = target.name;

  // Update title
  if (title) {
    title.textContent = truncateFilename(target.name, 35);
    title.title = target.name;
  }
  if (meta) meta.textContent = 'Memuat...';
  if (loader) loader.hidden = false;

  // Update links
  if (openRaw) openRaw.href = rawUrl;
  if (downloadBtn) {
    downloadBtn.href = rawUrl;
    downloadBtn.download = target.name;
  }

  // Reset zoom state
  currentZoom = 100;
  baseScale = 1;
  imagePanState = {
    isPanning: false, startX: 0, startY: 0,
    translateX: 0, translateY: 0,
    lastTranslateX: 0, lastTranslateY: 0
  };

  // Load new image
  if (img) {
    img.onload = function () {
      if (meta) meta.textContent = `${this.naturalWidth} × ${this.naturalHeight} piksel`;
      if (loader) loader.hidden = true;
      baseScale = calculateBaseScale(container, this);
      applyImageTransform(this);
      updateZoomLevel();
    };
    img.onerror = function () {
      if (meta) meta.textContent = 'Error: Gagal memuat gambar';
      if (loader) loader.hidden = true;
    };
    img.src = rawUrl;
  }

  updateGalleryUI();
}

function galleryPrev() {
  navigateGallery(galleryState.currentIndex - 1);
}

function galleryNext() {
  navigateGallery(galleryState.currentIndex + 1);
}

/**
 * Setup gallery keyboard navigation (arrow keys)
 */
function setupGalleryKeyboard() {
  // Remove previous handler if exists
  cleanupGalleryKeyboard();

  galleryState.keyHandler = function (e) {
    // Only handle when preview overlay is visible and showing an image
    const overlay = document.getElementById('preview-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (galleryState.images.length <= 1) return;

    // Don't intercept if user is typing in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      galleryPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      galleryNext();
    }
  };

  document.addEventListener('keydown', galleryState.keyHandler);
}

function cleanupGalleryKeyboard() {
  if (galleryState.keyHandler) {
    document.removeEventListener('keydown', galleryState.keyHandler);
    galleryState.keyHandler = null;
  }
}

// ============= Markdown Preview Functions =============

/**
 * Simple markdown to HTML converter (no external dependencies)
 * Handles: headings, bold, italic, code blocks, inline code, links, images,
 * lists (ordered/unordered), blockquotes, horizontal rules, tables
 */
function renderMarkdownToHtml(md) {
  let html = md;

  // Escape HTML entities first (but preserve code blocks)
  const codeBlocks = [];
  // Extract fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="md-code-block"><code class="md-lang-${lang || 'text'}">${escapeHtml(code.trimEnd())}</code></pre>`);
    return `%%CODEBLOCK_${idx}%%`;
  });

  // Extract inline code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="md-inline-code">${escapeHtml(code)}</code>`);
    return `%%INLINECODE_${idx}%%`;
  });

  // Now escape remaining HTML
  html = escapeHtml(html);

  // Restore code blocks and inline codes (they were already escaped)
  codeBlocks.forEach((block, i) => {
    html = html.replace(`%%CODEBLOCK_${i}%%`, block);
  });
  inlineCodes.forEach((code, i) => {
    html = html.replace(`%%INLINECODE_${i}%%`, code);
  });

  // Headings (must be at start of line)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^(---|\*\*\*|___)\s*$/gm, '<hr>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Images (before links to avoid conflict)
  // Sanitize src to allow only http://, https://, or relative paths (strictly block javascript:, data:, vbscript:)
  // Escape quotes in attributes
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    const cleanSrc = src.trim();
    if (/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(cleanSrc)) {
      const safeSrc = cleanSrc.replace(/"/g, '&quot;');
      const safeAlt = alt.replace(/"/g, '&quot;');
      return `<img src="${safeSrc}" alt="${safeAlt}" class="md-image">`;
    }
    return '';
  });

  // Links
  // Sanitize href to only allow http://, https://, mailto:, or relative URLs
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    const cleanHref = href.trim();
    if (/^(https?:\/\/|mailto:|\/|\.\/|\.\.\/|#)/i.test(cleanHref) && !/^(javascript|data|vbscript):/i.test(cleanHref)) {
      const safeHref = cleanHref.replace(/"/g, '&quot;');
      return `<a href="${safeHref}" target="_blank" rel="noopener">${text}</a>`;
    }
    return text;
  });

  // Blockquotes
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Unordered lists
  html = html.replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<oli>$1</oli>');
  html = html.replace(/((?:<oli>.*<\/oli>\n?)+)/g, (match) => {
    return '<ol>' + match.replace(/<\/?oli>/g, (tag) => tag.replace('oli', 'li')) + '</ol>';
  });

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)*)/gm, (match, header, separator, body) => {
    const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table class="md-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Paragraphs: wrap remaining text blocks
  html = html.replace(/^(?!<[a-z/])((?:.+\n?)+)/gm, (match) => {
    const trimmed = match.trim();
    if (!trimmed) return '';
    return `<p>${trimmed}</p>`;
  });

  // Clean up extra newlines
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/<br><\/p>/g, '</p>');
  html = html.replace(/<p><br>/g, '<p>');
  html = html.replace(/<br><h/g, '<h');
  html = html.replace(/<\/h([1-6])><br>/g, '</h$1>');
  html = html.replace(/<br><ul>/g, '<ul>');
  html = html.replace(/<\/ul><br>/g, '</ul>');
  html = html.replace(/<br><ol>/g, '<ol>');
  html = html.replace(/<\/ol><br>/g, '</ol>');
  html = html.replace(/<br><hr>/g, '<hr>');
  html = html.replace(/<hr><br>/g, '<hr>');
  html = html.replace(/<br><table/g, '<table');
  html = html.replace(/<\/table><br>/g, '</table>');
  html = html.replace(/<br><blockquote>/g, '<blockquote>');
  html = html.replace(/<\/blockquote><br>/g, '</blockquote>');
  html = html.replace(/<br><pre/g, '<pre');
  html = html.replace(/<\/pre><br>/g, '</pre>');

  return html;
}

/**
 * Toggle between CodeMirror raw editor and rendered markdown preview
 */
function toggleMarkdownPreview() {
  const editorWrapper = document.getElementById('preview-editor-wrapper');
  const mdWrapper = document.getElementById('preview-markdown-wrapper');
  const mdRendered = document.getElementById('markdown-rendered');
  const toggleBtn = document.getElementById('previewMdToggle');
  const toggleLabel = toggleBtn?.querySelector('.text-xs');

  if (!editorWrapper || !mdWrapper || !mdRendered) return;

  markdownState.isRendered = !markdownState.isRendered;

  if (markdownState.isRendered) {
    // Switch to rendered view
    let content = '';
    if (window.CodeMirrorEditor && window.CodeMirrorEditor.isInitialized()) {
      content = window.CodeMirrorEditor.getContent();
    } else {
      const editor = document.getElementById('preview-editor');
      content = editor ? editor.value : '';
    }

    mdRendered.innerHTML = renderMarkdownToHtml(content);
    editorWrapper.style.display = 'none';
    mdWrapper.style.display = 'flex';

    if (toggleBtn) toggleBtn.setAttribute('aria-pressed', 'true');
    if (toggleLabel) toggleLabel.textContent = 'Editor';
  } else {
    // Switch back to editor
    mdWrapper.style.display = 'none';
    editorWrapper.style.display = 'flex';

    if (toggleBtn) toggleBtn.setAttribute('aria-pressed', 'false');
    if (toggleLabel) toggleLabel.textContent = 'Preview';
  }
}

// ============= Enhanced Fullscreen =============

function togglePreviewFullscreenEnhanced() {
  const overlay = document.getElementById('preview-overlay');
  const expandIcon = document.getElementById('fullscreen-icon-expand');
  const collapseIcon = document.getElementById('fullscreen-icon-collapse');
  const btn = document.getElementById('previewFullscreen');

  if (!overlay) return;

  if (document.fullscreenElement) {
    document.exitFullscreen();
    if (expandIcon) expandIcon.style.display = '';
    if (collapseIcon) collapseIcon.style.display = 'none';
    if (btn) btn.setAttribute('aria-pressed', 'false');
    return;
  }

  if (overlay.requestFullscreen) {
    overlay.requestFullscreen().then(() => {
      if (expandIcon) expandIcon.style.display = 'none';
      if (collapseIcon) collapseIcon.style.display = '';
      if (btn) btn.setAttribute('aria-pressed', 'true');
    }).catch(() => showError('Tidak bisa masuk ke mode layar penuh'));
  }
}

function hideAllPreviewWrappers() {
  const wrappers = ['preview-editor-wrapper', 'preview-image-wrapper', 'preview-video-wrapper', 'preview-audio-wrapper', 'preview-pdf-wrapper', 'preview-markdown-wrapper'];
  wrappers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
    }
  });

  // Also hide image controls (now outside the wrapper)
  const imageControls = document.getElementById('preview-image-controls');
  if (imageControls) {
    imageControls.style.display = 'none';
  }
}

function showPreviewWrapper(type) {
  hideAllPreviewWrappers();
  const wrapperMap = {
    text: 'preview-editor-wrapper',
    image: 'preview-image-wrapper',
    video: 'preview-video-wrapper',
    audio: 'preview-audio-wrapper',
    pdf: 'preview-pdf-wrapper'
  };
  const wrapper = document.getElementById(wrapperMap[type]);
  if (wrapper) {
    wrapper.style.display = type === 'audio' ? 'flex' : (type === 'text' ? 'flex' : 'flex');
  }

  // Show image controls only for image preview
  const imageControls = document.getElementById('preview-image-controls');
  if (imageControls) {
    imageControls.style.display = type === 'image' ? 'flex' : 'none';
  }

  // Show word wrap button only for text/code preview
  const wordWrapBtn = document.getElementById('previewWordWrapToggle');
  if (wordWrapBtn) {
    wordWrapBtn.style.display = type === 'text' ? '' : 'none';
  }

  // Show markdown toggle only for .md files
  const mdToggle = document.getElementById('previewMdToggle');
  if (mdToggle) {
    const fileName = modalState.preview.previewName || '';
    const isMd = getFileExtension(fileName) === 'md';
    mdToggle.style.display = (type === 'text' && isMd) ? '' : 'none';
  }

  // Show fullscreen button for all types
  const fullscreenBtn = document.getElementById('previewFullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.style.display = '';
  }

  // Toggle audio mode class on dialog for compact size
  const dialog = document.querySelector('.preview-dialog');
  if (dialog) {
    if (type === 'audio') {
      dialog.classList.add('preview-audio-mode');
    } else {
      dialog.classList.remove('preview-audio-mode');
    }
  }
}

function openPreviewModal(filePath, fileName) {
  rememberTriggerFocus();
  document.body.classList.add('modal-open');
  const overlay = document.getElementById('preview-overlay');
  if (overlay && !overlay._focusTrapAttached) {
    trapFocus(overlay);
    overlay._focusTrapAttached = true;
  }
  const title = document.getElementById('preview-title');
  const meta = document.getElementById('preview-meta');
  const editor = document.getElementById('preview-editor');
  const saveBtn = document.getElementById('preview-save');
  const copyBtn = document.getElementById('preview-copy');
  const loader = document.getElementById('preview-loader');
  const openRaw = document.getElementById('preview-open-raw');
  const downloadBtn = document.getElementById('preview-download');
  const cmContainer = document.getElementById('codemirror-container');

  // Detect file type
  const previewType = getPreviewType(fileName);

  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');

  // Truncate long filenames while preserving extension
  title.textContent = truncateFilename(fileName, 35);
  title.title = fileName; // Full name on hover
  meta.textContent = 'Memuat...';
  loader.hidden = false;

  modalState.preview.currentFile = filePath;
  modalState.preview.isDirty = false;

  // Show/hide appropriate actions based on preview type
  const isEditable = previewType === 'text';
  if (saveBtn) saveBtn.style.display = isEditable ? '' : 'none';
  if (copyBtn) copyBtn.style.display = isEditable ? '' : 'none';

  // Set download link for all file types
  const downloadUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;
  if (downloadBtn) {
    downloadBtn.href = downloadUrl;
    downloadBtn.download = fileName;
  }

  modalState.preview.previewUrl = downloadUrl;
  modalState.preview.previewName = fileName;

  // Show appropriate wrapper
  showPreviewWrapper(previewType);

  if (previewType === 'text') {
    // Text/Code Editor Mode with CodeMirror
    if (editor) editor.value = '';
    if (saveBtn) saveBtn.disabled = true;

    // Clear CodeMirror container
    if (cmContainer) cmContainer.innerHTML = '';

    // Destroy existing CodeMirror instance
    if (window.CodeMirrorEditor && window.CodeMirrorEditor.isInitialized()) {
      window.CodeMirrorEditor.destroy();
    }

    // Load file content
    fetch(`${API_BASE}?action=content&path=${encodeURIComponent(filePath)}`)
      .then(res => res.json())
      .then(async data => {
        if (data.success) {
          const content = data.content || '';
          modalState.preview.originalContent = content;
          meta.textContent = `${formatSize(data.size)} • Terakhir diubah: ${formatDate(data.modified)}`;
          openRaw.href = `api.php?action=content&path=${encodeURIComponent(filePath)}`;

          // Store in hidden textarea for fallback
          if (editor) editor.value = content;

          // Initialize CodeMirror
          if (window.CodeMirrorEditor && cmContainer) {
            try {
              await window.CodeMirrorEditor.init(cmContainer, content, fileName, (newContent) => {
                // On change callback
                modalState.preview.isDirty = newContent !== modalState.preview.originalContent;
                if (saveBtn) saveBtn.disabled = !modalState.preview.isDirty;
                // Sync to hidden textarea
                if (editor) editor.value = newContent;
              });
            } catch (e) {
              console.warn('CodeMirror failed to load, using fallback:', e);
              // Show fallback textarea
              if (editor) {
                editor.style.display = 'block';
                cmContainer.style.display = 'none';
              }
            }
          } else {
            // Fallback to regular textarea
            if (editor) editor.style.display = 'block';
            if (cmContainer) cmContainer.style.display = 'none';
          }
        } else {
          throw new Error(data.error || 'Gagal memuat file');
        }
      })
      .catch(error => {
        meta.textContent = 'Error: ' + error.message;
        if (editor) editor.value = 'Gagal memuat konten file.';
      })
      .finally(() => {
        loader.hidden = true;
      });

  } else if (previewType === 'image') {
    // Image Preview Mode
    const img = document.getElementById('preview-image');
    const container = document.getElementById('preview-image-container');
    const rawUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;

    // Reset zoom state first
    currentZoom = 100;
    baseScale = 1;
    imagePanState = {
      isPanning: false,
      startX: 0,
      startY: 0,
      translateX: 0,
      translateY: 0,
      lastTranslateX: 0,
      lastTranslateY: 0
    };

    // Build gallery list and setup navigation
    buildGalleryList(filePath);
    updateGalleryUI();
    setupGalleryKeyboard();

    img.onload = function () {
      meta.textContent = `${this.naturalWidth} × ${this.naturalHeight} piksel`;
      loader.hidden = true;

      // Calculate base scale to fit image in container
      baseScale = calculateBaseScale(container, this);

      // Apply initial transform
      applyImageTransform(this);
      updateZoomLevel();
    };
    img.onerror = function () {
      meta.textContent = 'Error: Gagal memuat gambar';
      loader.hidden = true;
    };
    img.src = rawUrl;
    openRaw.href = rawUrl;

  } else if (previewType === 'video') {
    // Video Preview Mode
    const video = document.getElementById('preview-video');
    const rawUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;

    video.onloadedmetadata = function () {
      const duration = formatDuration(this.duration);
      meta.textContent = `${this.videoWidth} × ${this.videoHeight} • ${duration}`;
      loader.hidden = true;
    };
    video.onerror = function () {
      meta.textContent = 'Error: Gagal memuat video';
      loader.hidden = true;
    };
    video.src = rawUrl;
    openRaw.href = rawUrl;

  } else if (previewType === 'audio') {
    // Audio Preview Mode
    const audio = document.getElementById('preview-audio');
    const rawUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;

    audio.onloadedmetadata = function () {
      const duration = formatDuration(this.duration);
      meta.textContent = `Durasi: ${duration}`;
      loader.hidden = true;
    };
    audio.onerror = function () {
      meta.textContent = 'Error: Gagal memuat audio';
      loader.hidden = true;
    };
    audio.src = rawUrl;
    openRaw.href = rawUrl;

  } else if (previewType === 'pdf') {
    // PDF Preview Mode
    const iframe = document.getElementById('preview-pdf');
    const rawUrl = `api.php?action=raw&path=${encodeURIComponent(filePath)}`;

    iframe.onload = function () {
      meta.textContent = 'PDF Document';
      loader.hidden = true;
    };
    iframe.src = rawUrl;
    openRaw.href = rawUrl;
  }
}

// Helper function to format duration (for video/audio)
function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function closePreviewModal() {
  if (modalState.preview.isDirty) {
    openUnsavedModal();
    return;
  }

  if (document.fullscreenElement) {
    document.exitFullscreen();
  }

  const overlay = document.getElementById('preview-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');

  // Cleanup CodeMirror editor
  if (window.CodeMirrorEditor && window.CodeMirrorEditor.isInitialized()) {
    window.CodeMirrorEditor.destroy();
  }

  // Cleanup media elements to stop playback
  const video = document.getElementById('preview-video');
  const audio = document.getElementById('preview-audio');
  const image = document.getElementById('preview-image');
  const pdf = document.getElementById('preview-pdf');

  if (video) {
    video.pause();
    video.src = '';
    video.load();
  }
  if (audio) {
    audio.pause();
    audio.src = '';
    audio.load();
  }
  if (image) {
    image.src = '';
  }
  if (pdf) {
    pdf.src = '';
  }

  // Hide all wrappers
  hideAllPreviewWrappers();

  // Cleanup gallery state
  cleanupGalleryKeyboard();
  galleryState.images = [];
  galleryState.currentIndex = -1;

  // Reset gallery nav UI
  const galleryPrevBtn = document.getElementById('gallery-prev');
  const galleryNextBtn = document.getElementById('gallery-next');
  const galleryCounter = document.getElementById('gallery-counter');
  if (galleryPrevBtn) galleryPrevBtn.style.display = 'none';
  if (galleryNextBtn) galleryNextBtn.style.display = 'none';
  if (galleryCounter) galleryCounter.style.display = 'none';

  // Reset markdown state
  markdownState.isRendered = false;
  markdownState.rawContent = '';
  const mdToggle = document.getElementById('previewMdToggle');
  const mdLabel = mdToggle?.querySelector('.text-xs');
  if (mdToggle) mdToggle.setAttribute('aria-pressed', 'false');
  if (mdLabel) mdLabel.textContent = 'Preview';

  // Reset fullscreen icons
  const expandIcon = document.getElementById('fullscreen-icon-expand');
  const collapseIcon = document.getElementById('fullscreen-icon-collapse');
  if (expandIcon) expandIcon.style.display = '';
  if (collapseIcon) collapseIcon.style.display = 'none';

  modalState.preview.currentFile = null;
  modalState.preview.isDirty = false;
  modalState.preview.originalContent = '';
  modalState.preview.previewUrl = '';
  modalState.preview.previewName = '';

  document.body.classList.remove('modal-open');
  restoreTriggerFocus();
}

function attachOverlayBackdropDismiss(overlayId, closeHandler) {
  const overlay = document.getElementById(overlayId);
  if (!overlay || typeof closeHandler !== 'function') return;

  const handler = (event) => {
    if (event.target === overlay) {
      closeHandler();
    }
  };

  overlay.addEventListener('click', handler);
}

function savePreviewContent() {
  const saveBtn = document.getElementById('preview-save');
  const status = document.getElementById('preview-status');

  // Get content from CodeMirror or fallback textarea
  let content = '';
  if (window.CodeMirrorEditor && window.CodeMirrorEditor.isInitialized()) {
    content = window.CodeMirrorEditor.getContent();
  } else {
    const editor = document.getElementById('preview-editor');
    content = editor ? editor.value : '';
  }

  saveBtn.disabled = true;
  status.textContent = 'Menyimpan...';

  fetch(`${API_BASE}?action=save&path=${encodeURIComponent(modalState.preview.currentFile)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        modalState.preview.isDirty = false;
        modalState.preview.originalContent = content;
        status.textContent = 'Tersimpan • ' + new Date().toLocaleTimeString('id-ID');
        saveBtn.disabled = true;
        showSuccess('File berhasil disimpan');
      } else {
        throw new Error(data.error || 'Gagal menyimpan file');
      }
    })
    .catch(error => {
      status.textContent = 'Error: ' + error.message;
      showError(error.message);
      saveBtn.disabled = false;
    });
}

function updateLineNumbers() {
  // Use the global function from appInitializer.js if available
  if (typeof window.updateLineNumbers === 'function' && window.updateLineNumbers !== updateLineNumbers) {
    window.updateLineNumbers();
    return;
  }

  // Fallback: Direct implementation
  const editor = document.getElementById('preview-editor');
  const lineNumbersInner = document.getElementById('preview-line-numbers-inner');
  if (!editor || !lineNumbersInner) return;

  const value = editor.value || '';
  const lines = value.split('\n');
  const totalLines = lines.length || 1;

  // Get computed line height from editor
  const editorStyle = window.getComputedStyle(editor);
  const lineHeight = parseFloat(editorStyle.lineHeight) || 24;

  // Build line numbers
  let html = '';
  for (let i = 1; i <= totalLines; i++) {
    html += `<span style="display:block;height:${lineHeight}px;line-height:${lineHeight}px">${i}</span>`;
  }
  lineNumbersInner.innerHTML = html;

  // Sync scroll
  if (typeof window.syncLineNumbersScroll === 'function') {
    window.syncLineNumbersScroll(true);
  }
}

// ============= Confirm Modal =============

function openConfirmModal(title, message, items, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const descEl = document.getElementById('confirm-description');
  const listEl = document.getElementById('confirm-list');
  const confirmBtn = document.getElementById('confirm-confirm');

  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');

  titleEl.textContent = title;
  messageEl.textContent = message;
  descEl.textContent = items.length > 1 ? `${items.length} item akan dihapus:` : '';

  if (items.length > 1) {
    listEl.hidden = false;
    listEl.innerHTML = items.map(item => `<li>• ${item}</li>`).join('');
  } else {
    listEl.hidden = true;
  }

  modalState.confirm.callback = onConfirm;
  modalState.confirm.items = items;
}

function closeConfirmModal() {
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');

  modalState.confirm.callback = null;
  modalState.confirm.items = [];
}

function executeConfirm() {
  if (modalState.confirm.callback) {
    modalState.confirm.callback();
  }
  closeConfirmModal();
}

// ============= Create Modal =============

function openCreateModal() {
  const overlay = document.getElementById('create-overlay');
  const nameInput = document.getElementById('create-name');
  const nameGroup = document.getElementById('create-name-group');
  const fileRadio = document.getElementById('file-option');
  const folderRadio = document.getElementById('folder-option');

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  nameInput.value = '';
  nameGroup.style.display = 'none';
  fileRadio.checked = false;
  folderRadio.checked = false;
}

function closeCreateModal() {
  const overlay = document.getElementById('create-overlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

async function submitCreate() {
  const nameInput = document.getElementById('create-name');
  const fileRadio = document.getElementById('file-option');
  const folderRadio = document.getElementById('folder-option');

  const name = nameInput.value.trim();
  if (!name) {
    showError('Nama wajib diisi');
    return;
  }

  const type = fileRadio.checked ? 'file' : (folderRadio.checked ? 'folder' : '');
  if (!type) {
    showError('Pilih tipe item terlebih dahulu');
    return;
  }

  showLoader(true);
  try {
    // Get current path from enhanced-ui.js via window object
    const path = window.currentPath || '';

    // Include path in URL query parameter as API expects it there
    const response = await fetch(`${API_BASE}?action=create&path=${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        name: name,
        path: path
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Gagal membuat item');

    // Reload files using the global loadFiles function
    if (typeof window.loadFiles === 'function') {
      await window.loadFiles(path);
    }
    closeCreateModal();
    showSuccess(`${type === 'file' ? 'File' : 'Folder'} "${name}" berhasil dibuat`);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoader(false);
  }
}

// ============= Rename Modal =============

function openRenameModal(filePath, currentName) {
  const overlay = document.getElementById('rename-overlay');
  const subtitle = document.getElementById('rename-subtitle');
  const nameInput = document.getElementById('rename-name');

  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');

  subtitle.textContent = `Mengubah nama: ${currentName}`;
  nameInput.value = currentName;
  nameInput.focus();
  nameInput.select();

  modalState.rename = { path: filePath, oldName: currentName };
}

function closeRenameModal() {
  const overlay = document.getElementById('rename-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

async function submitRename(e) {
  if (e) e.preventDefault();

  const nameInput = document.getElementById('rename-name');
  const newName = nameInput.value.trim();

  if (!newName) {
    showError('Nama baru wajib diisi');
    return;
  }

  if (!modalState.rename || !modalState.rename.path) {
    showError('Data rename tidak valid');
    return;
  }

  await renameItem(modalState.rename.path, newName);
  closeRenameModal();
}

// ============= Move Modal =============

function openMoveModal(items) {
  const overlay = document.getElementById('move-overlay');
  const subtitle = document.getElementById('move-subtitle');
  const list = document.getElementById('move-list');

  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');

  modalState.move.itemsToMove = items;
  modalState.move.currentPath = '';
  modalState.move.selectedFolder = null;

  subtitle.textContent = `Memindahkan ${items.length} item`;

  loadMoveFolders('');
}

function closeMoveModal() {
  const overlay = document.getElementById('move-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');

  modalState.move = {
    currentPath: '',
    selectedFolder: null,
    itemsToMove: []
  };
}

async function loadMoveFolders(path) {
  const list = document.getElementById('move-list');
  const breadcrumbs = document.getElementById('move-breadcrumbs');
  const errorEl = document.getElementById('move-error');

  modalState.move.currentPath = path;
  list.innerHTML = '<li class="p-3 text-sm text-gray-500">Memuat...</li>';
  if (errorEl) errorEl.textContent = '';

  try {
    const response = await fetch(`${API_BASE}?action=list&path=${encodeURIComponent(path)}`);
    const data = await response.json();

    if (!data.success) throw new Error(data.error);

    const folders = data.items.filter(item => item.type === 'folder');

    // Update breadcrumbs
    breadcrumbs.innerHTML = path ?
      `<span class="text-blue-600 cursor-pointer" onclick="loadMoveFolders('')">Root</span> / ${path.split('/').join(' / ')}` :
      '<span>Root</span>';

    // Update list
    if (folders.length === 0) {
      list.innerHTML = '<li class="move-list-empty">Tidak ada folder di sini</li>';
    } else {
      list.innerHTML = folders.map(folder => `
        <li class="move-folder-item p-3 border-b hover:bg-gray-50 cursor-pointer flex items-center gap-2" data-path="${folder.path}">
          <span>📁</span>
          <span>${folder.name}</span>
        </li>
      `).join('');

      // Wire folder click events
      list.querySelectorAll('.move-folder-item').forEach(item => {
        item.addEventListener('click', () => {
          const folderPath = item.dataset.path;
          loadMoveFolders(folderPath);
        });

        item.addEventListener('dblclick', () => {
          modalState.move.selectedFolder = item.dataset.path;
          executeMoveItems();
        });
      });
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = err.message;
    list.innerHTML = '<li class="p-3 text-sm text-red-500">Gagal memuat folder</li>';
  }
}

async function executeMoveItems() {
  const destPath = modalState.move.selectedFolder || modalState.move.currentPath;
  const items = modalState.move.itemsToMove;

  if (items.length === 0) {
    showError('Tidak ada item yang akan dipindahkan');
    return;
  }

  closeMoveModal();
  await moveItems(items, destPath);
}

// ============= Unsaved Changes Modal =============

function openUnsavedModal() {
  const overlay = document.getElementById('unsaved-overlay');
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
}

function closeUnsavedModal() {
  const overlay = document.getElementById('unsaved-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

// ============= Settings Modal =============

// ============================================================================
// Upload Size Settings — Preset dropdown + custom input per file type
// ============================================================================

const UPLOAD_PRESETS = [
    { label: '5 MB', value: 5 },
    { label: '10 MB', value: 10 },
    { label: '25 MB', value: 25 },
    { label: '50 MB', value: 50 },
    { label: '100 MB', value: 100 },
    { label: '250 MB', value: 250 },
    { label: '500 MB', value: 500 },
    { label: '1 GB', value: 1024 },
    { label: '2 GB', value: 2048 },
];

const UPLOAD_FIELDS = [
    { key: 'maxSizeMB', label: 'Semua File', icon: '📁', defaultVal: 100 },
    { key: 'imageMaxMB', label: 'Gambar', icon: '🖼️', defaultVal: 100 },
    { key: 'videoMaxMB', label: 'Video', icon: '🎬', defaultVal: 2048 },
    { key: 'audioMaxMB', label: 'Audio', icon: '🎵', defaultVal: 100 },
    { key: 'documentMaxMB', label: 'Dokumen', icon: '📄', defaultVal: 100 },
    { key: 'archiveMaxMB', label: 'Arsip', icon: '📦', defaultVal: 100 },
    { key: 'codeMaxMB', label: 'Kode Sumber', icon: '💻', defaultVal: 100 },
];

function isCustomPreset(val) {
    return !UPLOAD_PRESETS.some(p => p.value === val);
}

function initUploadLimitsGrid() {
    const grid = document.getElementById('upload-limits-grid');
    if (!grid) return;

    grid.innerHTML = UPLOAD_FIELDS.map(f => {
        const options = UPLOAD_PRESETS.map(p =>
            `<option value="${p.value}">${p.label}</option>`
        ).join('');

        return `
            <div class="upload-limit-row" data-key="${f.key}">
                <span class="upload-limit-icon">${f.icon}</span>
                <span class="upload-limit-label">${f.label}</span>
                <div class="upload-limit-control">
                    <select class="settings-select upload-limit-select" data-key="${f.key}">
                        ${options}
                        <option value="custom">Kustom…</option>
                    </select>
                    <div class="upload-limit-custom hidden" data-key="${f.key}">
                        <input type="number" class="settings-input upload-limit-input" data-key="${f.key}"
                            min="1" max="2048" value="${f.defaultVal}">
                        <span class="upload-limit-unit">MB</span>
                    </div>
                </div>
            </div>`;
    }).join('');

    // Wire up select → toggle custom input
    grid.querySelectorAll('.upload-limit-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const row = e.target.closest('.upload-limit-row');
            const customWrap = row.querySelector('.upload-limit-custom');
            if (e.target.value === 'custom') {
                customWrap.classList.remove('hidden');
                customWrap.querySelector('input').focus();
            } else {
                customWrap.classList.add('hidden');
            }
        });
    });
}

function fillUploadLimitsGrid(settings) {
    const u = settings.upload || {};
    UPLOAD_FIELDS.forEach(f => {
        const val = u[f.key] ?? f.defaultVal;
        const sel = document.querySelector(`.upload-limit-select[data-key="${f.key}"]`);
        const inp = document.querySelector(`.upload-limit-input[data-key="${f.key}"]`);
        const wrap = document.querySelector(`.upload-limit-custom[data-key="${f.key}"]`);
        if (!sel) return;

        if (isCustomPreset(val)) {
            sel.value = 'custom';
            wrap.classList.remove('hidden');
            inp.value = val;
        } else {
            sel.value = String(val);
            wrap.classList.add('hidden');
            inp.value = val;
        }
    });
}

function collectUploadLimits() {
    const result = {};
    UPLOAD_FIELDS.forEach(f => {
        const sel = document.querySelector(`.upload-limit-select[data-key="${f.key}"]`);
        const inp = document.querySelector(`.upload-limit-input[data-key="${f.key}"]`);
        if (!sel) return;
        result[f.key] = sel.value === 'custom'
            ? (parseInt(inp.value, 10) || f.defaultVal)
            : parseInt(sel.value, 10);
    });
    return result;
}

// ============================================================================
// Settings Modal
// ============================================================================

function openSettingsModal() {
  rememberTriggerFocus();
  document.body.classList.add('modal-open');
  const overlay = document.getElementById('settings-overlay');
  if (overlay && !overlay._focusTrapAttached) {
    trapFocus(overlay);
    overlay._focusTrapAttached = true;
  }
  const debugToggle = document.getElementById('toggle-debug');

  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');

  debugToggle.checked = localStorage.getItem('fm-debug') === 'true';

  // Ensure grid is initialized
  initUploadLimitsGrid();
  // Load upload settings from server
  loadUploadSettings();
}

function closeSettingsModal() {
  const overlay = document.getElementById('settings-overlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  restoreTriggerFocus();
}

async function loadUploadSettings() {
  try {
    const res = await fetch('api.php?action=settings');
    const data = await res.json();
    if (data.success && data.settings) {
      fillUploadLimitsGrid(data.settings);

      // Show PHP limit
      const phpLimit = data.phpLimits?.uploadMax || '-';
      document.getElementById('settings-php-upload-limit').textContent = phpLimit;

      // Fill extension fields
      const u = data.settings.upload || {};
      document.getElementById('upload-extra-allowed').value = u.additionalAllowed || '';
      document.getElementById('upload-extra-blocked').value = u.additionalBlocked || '';

      // Update window.uploadConfig for security.js
      window.uploadConfig = {
        maxSizeMB: u.maxSizeMB ?? 100,
        imageMaxMB: u.imageMaxMB ?? 100,
        videoMaxMB: u.videoMaxMB ?? 2048,
        audioMaxMB: u.audioMaxMB ?? 100,
        documentMaxMB: u.documentMaxMB ?? 100,
        archiveMaxMB: u.archiveMaxMB ?? 100,
        codeMaxMB: u.codeMaxMB ?? 100,
        additionalAllowed: u.additionalAllowed || '',
        additionalBlocked: u.additionalBlocked || '',
      };

      // Apply extension overrides in security.js
      if (typeof applyExtensionOverrides === 'function') {
        applyExtensionOverrides();
      }
    }
  } catch (e) {
    console.warn('Failed to load upload settings:', e);
  }
}

async function saveSettings() {
  const debugToggle = document.getElementById('toggle-debug');
  localStorage.setItem('fm-debug', debugToggle.checked);

  // Collect upload settings from grid
  const uploadSettings = collectUploadLimits();
  uploadSettings.additionalAllowed = document.getElementById('upload-extra-allowed').value || '';
  uploadSettings.additionalBlocked = document.getElementById('upload-extra-blocked').value || '';

  try {
    const res = await fetch('api.php?action=settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        debug: debugToggle.checked,
        upload: uploadSettings,
      }),
    });
    const data = await res.json();

    if (data.success) {
      // Update window.uploadConfig for security.js
      window.uploadConfig = { ...uploadSettings };
      // Re-apply extension overrides
      if (typeof applyExtensionOverrides === 'function') {
        applyExtensionOverrides();
      }
      showSuccess('Pengaturan disimpan');
    } else {
      showError(data.error || 'Gagal menyimpan pengaturan');
    }
  } catch (e) {
    showError('Gagal menyimpan pengaturan: ' + e.message);
  }

  closeSettingsModal();
}

// ============= Event Listeners Setup =============

document.addEventListener('DOMContentLoaded', () => {
  // Initialize image zoom controls
  initImageZoomControls();

  // Preview Modal
  document.getElementById('preview-close')?.addEventListener('click', closePreviewModal);
  document.getElementById('preview-back')?.addEventListener('click', closePreviewModal);
  document.getElementById('preview-save')?.addEventListener('click', savePreviewContent);
  document.getElementById('preview-copy')?.addEventListener('click', () => {
    // Get content from CodeMirror or fallback textarea
    let content = '';
    if (window.CodeMirrorEditor && window.CodeMirrorEditor.isInitialized()) {
      content = window.CodeMirrorEditor.getContent();
    } else {
      const editor = document.getElementById('preview-editor');
      content = editor ? editor.value : '';
    }
    navigator.clipboard?.writeText(content);
    showSuccess('Konten disalin ke clipboard');
  });
  document.getElementById('preview-share')?.addEventListener('click', sharePreviewLink);
  document.getElementById('previewFullscreen')?.addEventListener('click', togglePreviewFullscreenEnhanced);
  document.getElementById('preview-fullscreen')?.addEventListener('click', togglePreviewFullscreenEnhanced);
  document.getElementById('preview-more')?.addEventListener('click', handlePreviewMore);

  // Markdown toggle button
  document.getElementById('previewMdToggle')?.addEventListener('click', toggleMarkdownPreview);

  // Gallery navigation buttons
  document.getElementById('gallery-prev')?.addEventListener('click', galleryPrev);
  document.getElementById('gallery-next')?.addEventListener('click', galleryNext);

  // Listen for fullscreen change to update icons
  document.addEventListener('fullscreenchange', () => {
    const expandIcon = document.getElementById('fullscreen-icon-expand');
    const collapseIcon = document.getElementById('fullscreen-icon-collapse');
    const btn = document.getElementById('previewFullscreen');
    if (document.fullscreenElement) {
      if (expandIcon) expandIcon.style.display = 'none';
      if (collapseIcon) collapseIcon.style.display = '';
      if (btn) btn.setAttribute('aria-pressed', 'true');
    } else {
      if (expandIcon) expandIcon.style.display = '';
      if (collapseIcon) collapseIcon.style.display = 'none';
      if (btn) btn.setAttribute('aria-pressed', 'false');
    }
  });
  attachOverlayBackdropDismiss('preview-overlay', closePreviewModal);

  // Fallback textarea input handler (when CodeMirror fails to load)
  document.getElementById('preview-editor')?.addEventListener('input', (e) => {
    // Only handle if CodeMirror is not initialized
    if (!window.CodeMirrorEditor || !window.CodeMirrorEditor.isInitialized()) {
      modalState.preview.isDirty = e.target.value !== modalState.preview.originalContent;
      document.getElementById('preview-save').disabled = !modalState.preview.isDirty;
    }
  });

  // Confirm Modal
  document.getElementById('confirm-cancel')?.addEventListener('click', closeConfirmModal);
  document.getElementById('confirm-confirm')?.addEventListener('click', executeConfirm);

  // Create Modal
  document.getElementById('create-cancel')?.addEventListener('click', closeCreateModal);
  document.getElementById('create-cancel-alt')?.addEventListener('click', closeCreateModal);
  document.getElementById('create-submit')?.addEventListener('click', submitCreate);

  // Show name input when type is selected and update placeholder
  document.querySelectorAll('input[name="create-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const nameGroup = document.getElementById('create-name-group');
      const nameInput = document.getElementById('create-name');

      nameGroup.style.display = 'block';

      // Update placeholder based on selected type
      if (e.target.value === 'file') {
        nameInput.placeholder = 'Misal: document.txt';
      } else if (e.target.value === 'folder') {
        nameInput.placeholder = 'Misal: My Documents';
      }

      nameInput.focus();
    });
  });

  // Rename Modal
  document.getElementById('rename-cancel')?.addEventListener('click', closeRenameModal);
  document.getElementById('rename-form')?.addEventListener('submit', submitRename);
  attachOverlayBackdropDismiss('rename-overlay', closeRenameModal);

  // Move Modal
  document.getElementById('move-cancel')?.addEventListener('click', closeMoveModal);
  document.getElementById('move-confirm')?.addEventListener('click', executeMoveItems);
  attachOverlayBackdropDismiss('move-overlay', closeMoveModal);

  // Unsaved Modal
  document.getElementById('unsaved-save')?.addEventListener('click', () => {
    closeUnsavedModal();
    savePreviewContent();
    setTimeout(closePreviewModal, 500);
  });
  document.getElementById('unsaved-discard')?.addEventListener('click', () => {
    closeUnsavedModal();
    modalState.preview.isDirty = false;
    closePreviewModal();
  });
  document.getElementById('unsaved-cancel')?.addEventListener('click', closeUnsavedModal);

  // Settings Modal
  document.getElementById('settings-close')?.addEventListener('click', closeSettingsModal);
  document.getElementById('settings-cancel')?.addEventListener('click', closeSettingsModal);
  document.getElementById('settings-save')?.addEventListener('click', saveSettings);
  attachOverlayBackdropDismiss('settings-overlay', closeSettingsModal);

  // Toggle switch styling
  document.getElementById('toggle-debug')?.addEventListener('change', function () {
    this.setAttribute('aria-checked', this.checked);
  });

  // Delete overlay event listeners
  document.getElementById('delete-cancel')?.addEventListener('click', closeDeleteOverlay);
  document.getElementById('delete-confirm')?.addEventListener('click', confirmDelete);
  document.getElementById('delete-overlay')?.addEventListener('click', function (e) {
    if (e.target === this) closeDeleteOverlay();
  });

  // Download overlay event listeners
  document.getElementById('download-cancel')?.addEventListener('click', closeDownloadOverlay);
  document.getElementById('download-confirm')?.addEventListener('click', confirmDownload);
  document.getElementById('download-overlay')?.addEventListener('click', function (e) {
    if (e.target === this) closeDownloadOverlay();
  });

  // Global keyboard handler for modals and shortcuts
  document.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName) ||
      activeElement.isContentEditable
    );

    if (e.key === 'Escape') {
      // Check which modal is open and close it
      const deleteOverlay = document.getElementById('delete-overlay');
      const downloadOverlay = document.getElementById('download-overlay');
      const createOverlay = document.getElementById('create-overlay');
      const renameOverlay = document.getElementById('rename-overlay');
      const moveOverlay = document.getElementById('move-overlay');
      const previewOverlay = document.getElementById('preview-overlay');

      if (deleteOverlay && !deleteOverlay.classList.contains('hidden')) {
        closeDeleteOverlay();
      } else if (downloadOverlay && !downloadOverlay.classList.contains('hidden')) {
        closeDownloadOverlay();
      } else if (createOverlay && !createOverlay.classList.contains('hidden')) {
        closeCreateModal();
      } else if (renameOverlay && !renameOverlay.classList.contains('hidden')) {
        closeRenameModal();
      } else if (moveOverlay && !moveOverlay.classList.contains('hidden')) {
        closeMoveModal();
      } else if (previewOverlay && !previewOverlay.classList.contains('hidden')) {
        closePreviewModal();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      if (!isInputActive) {
        e.preventDefault();
        e.stopPropagation();
        if (window.openCreateModal) {
          window.openCreateModal();
        }
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      if (!isInputActive) {
        e.preventDefault();
        e.stopPropagation();
        const searchInput = document.getElementById('search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    }
  });
});

// ============= Delete Overlay =============

let deleteState = {
  items: [],
  confirmCallback: null,
  cancelCallback: null
};

function openDeleteOverlay(items, onConfirm, onCancel = null) {
  const overlay = document.getElementById('delete-overlay');
  if (!overlay) return;

  const itemsArray = Array.isArray(items) ? items : [items];
  const itemCount = itemsArray.length;

  // Store state
  deleteState.items = itemsArray;
  deleteState.confirmCallback = onConfirm;
  deleteState.cancelCallback = onCancel;

  // Update title and subtitle
  const title = document.getElementById('delete-title');
  const subtitle = document.getElementById('delete-subtitle');
  const message = document.getElementById('delete-message');
  const itemsList = document.getElementById('delete-items-list');

  if (title) {
    title.textContent = itemCount > 1 ? `Hapus ${itemCount} Item` : 'Hapus Item';
  }

  if (subtitle) {
    subtitle.textContent = itemCount > 1
      ? `Konfirmasi penghapusan ${itemCount} item`
      : 'Konfirmasi penghapusan';
  }

  if (message) {
    message.textContent = itemCount > 1
      ? `Apakah Anda yakin ingin menghapus ${itemCount} item berikut?`
      : `Apakah Anda yakin ingin menghapus item ini?`;
  }

  // Populate items list
  if (itemsList) {
    itemsList.innerHTML = itemsArray.slice(0, 10).map(item => {
      const name = typeof item === 'string' ? item.split('/').pop() : (item.name || item.path?.split('/').pop() || 'Unknown');
      const isFolder = typeof item === 'object' && item.type === 'folder';
      const icon = isFolder
        ? '<svg viewBox="0 0 24 24" fill="currentColor" class="delete-item-icon w-4 h-4"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor" class="delete-item-icon w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>';
      return `<div class="delete-item flex items-center gap-2 py-1 px-2 text-xs rounded">${icon}<span class="delete-item-name flex-1 truncate">${escapeHtml(name)}</span></div>`;
    }).join('');

    if (itemCount > 10) {
      itemsList.innerHTML += `<div class="delete-item text-gray-500 py-1 px-2 text-xs">... dan ${itemCount - 10} item lainnya</div>`;
    }
  }

  // Show overlay
  overlay.hidden = false;
  overlay.classList.remove('hidden');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.style.display = 'flex';

  // Focus cancel button
  setTimeout(() => {
    document.getElementById('delete-cancel')?.focus();
  }, 100);
}

function closeDeleteOverlay() {
  const overlay = document.getElementById('delete-overlay');
  if (!overlay) return;

  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  overlay.style.display = 'none';

  // Clear items list
  const itemsList = document.getElementById('delete-items-list');
  if (itemsList) itemsList.innerHTML = '';

  // Clear state
  deleteState = { items: [], confirmCallback: null, cancelCallback: null };
}

async function confirmDelete() {
  if (typeof deleteState.confirmCallback === 'function') {
    try {
      await deleteState.confirmCallback(deleteState.items);
    } catch (e) {
      console.error('[modals-handler] Delete confirm error:', e);
    }
  }
  closeDeleteOverlay();
}

// ============= Download Overlay =============

let downloadState = {
  fileData: null,
  confirmCallback: null,
  cancelCallback: null
};

function openDownloadOverlay(fileData, onConfirm, onCancel = null) {
  const overlay = document.getElementById('download-overlay');
  if (!overlay) return;

  // Store state
  downloadState.fileData = fileData;
  downloadState.confirmCallback = onConfirm;
  downloadState.cancelCallback = onCancel;

  // Update file info
  const fileName = document.getElementById('download-file-name');
  const fileSize = document.getElementById('download-file-size');
  const fileIcon = document.getElementById('download-file-icon');
  const subtitle = document.getElementById('download-subtitle');

  if (fileName) {
    fileName.textContent = fileData.name || 'Unknown file';
  }

  if (fileSize) {
    const size = fileData.size || 0;
    fileSize.textContent = formatFileSize(size);
  }

  if (subtitle) {
    subtitle.textContent = `Unduh ${fileData.name || 'file'}`;
  }

  // Set appropriate icon based on file type
  if (fileIcon) {
    fileIcon.className = 'download-file-icon w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0';
    const ext = (fileData.name || '').split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      fileIcon.classList.add('image');
    } else if (['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'html', 'css', 'json', 'xml'].includes(ext)) {
      fileIcon.classList.add('code');
    } else if (['doc', 'docx', 'pdf', 'txt', 'md', 'rtf'].includes(ext)) {
      fileIcon.classList.add('document');
    } else if (fileData.type === 'folder') {
      fileIcon.classList.add('folder');
    }
  }

  // Show overlay
  overlay.hidden = false;
  overlay.classList.remove('hidden');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.style.display = 'flex';

  // Focus download button
  setTimeout(() => {
    document.getElementById('download-confirm')?.focus();
  }, 100);
}

function closeDownloadOverlay() {
  const overlay = document.getElementById('download-overlay');
  if (!overlay) return;

  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  overlay.style.display = 'none';

  // Clear state
  downloadState = { fileData: null, confirmCallback: null, cancelCallback: null };
}

async function confirmDownload() {
  if (typeof downloadState.confirmCallback === 'function') {
    try {
      await downloadState.confirmCallback(downloadState.fileData);
    } catch (e) {
      console.error('[modals-handler] Download confirm error:', e);
    }
  }
  closeDownloadOverlay();
}

// ============= Details Overlay =============

let detailsState = {
  item: null,
  actionCallback: null
};

/**
 * Format a unix timestamp to a readable Indonesian date string.
 * @param {number|string|null} timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(ts)) return '-';
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Populate the details overlay with extended metadata from the API.
 * @param {Object} details - Extended details from the API
 */
function populateExtendedDetails(details) {
  // MIME type
  const mimeEl = document.getElementById('details-mime');
  const mimeRow = document.getElementById('details-mime-row');
  if (mimeEl && details.mime) {
    mimeEl.textContent = details.mime;
  }
  if (mimeRow) {
    mimeRow.style.display = '';
  }

  // Created date
  const createdEl = document.getElementById('details-created');
  const createdRow = document.getElementById('details-created-row');
  if (createdEl) {
    createdEl.textContent = formatTimestamp(details.created);
  }
  if (createdRow) {
    createdRow.style.display = details.created ? '' : 'none';
  }

  // Permissions
  const permsEl = document.getElementById('details-permissions');
  const permsRow = document.getElementById('details-permissions-row');
  if (permsEl && details.permissions) {
    const p = details.permissions;
    const readBadge = p.readable
      ? '<span class="details-perm-badge details-perm-badge-ok">✓ Baca</span>'
      : '<span class="details-perm-badge details-perm-badge-no">✗ Baca</span>';
    const writeBadge = p.writable
      ? '<span class="details-perm-badge details-perm-badge-ok">✓ Tulis</span>'
      : '<span class="details-perm-badge details-perm-badge-no">✗ Tulis</span>';
    const octal = p.octal ? `<span class="details-perm-octal">(${p.octal})</span>` : '';
    permsEl.innerHTML = `<span class="details-permissions-badges">${readBadge}${writeBadge} ${octal}</span>`;
  }
  if (permsRow) {
    permsRow.style.display = details.permissions ? '' : 'none';
  }

  // Folder children count
  const childrenEl = document.getElementById('details-children');
  const childrenRow = document.getElementById('details-children-row');
  const folderSizeRow = document.getElementById('details-folder-size-row');
  if (details.type === 'folder' && details.children) {
    const c = details.children;
    if (childrenEl) {
      const parts = [];
      if (c.folders > 0) parts.push(`${c.folders} folder`);
      if (c.files > 0) parts.push(`${c.files} file`);
      childrenEl.textContent = parts.length > 0 ? parts.join(', ') : 'Kosong';
    }
    if (childrenRow) childrenRow.style.display = '';
    if (folderSizeRow) folderSizeRow.style.display = '';

    // Setup calculate size button
    setupCalcSizeButton(details.path);
  } else {
    if (childrenRow) childrenRow.style.display = 'none';
    if (folderSizeRow) folderSizeRow.style.display = 'none';
  }
}

/**
 * Setup the "Calculate Size" button for folders.
 * @param {string} folderPath
 */
function setupCalcSizeButton(folderPath) {
  const btn = document.getElementById('details-calc-size-btn');
  const sizeEl = document.getElementById('details-folder-size');
  if (!btn || !sizeEl) return;

  // Reset button state
  btn.disabled = false;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
    Hitung Ukuran`;

  // Remove old listener by cloning
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.id = 'details-calc-size-btn';

  newBtn.addEventListener('click', async () => {
    newBtn.disabled = true;
    newBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 details-calc-spinner">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      Menghitung...`;

    try {
      const response = await fetch(`api.php?action=details&path=${encodeURIComponent(folderPath)}&calculate_size=1`);
      const data = await response.json();
      if (data.success && data.details.folderSize) {
        const fs = data.details.folderSize;
        sizeEl.innerHTML = `<span class="details-folder-summary">${formatFileSize(fs.size)} <span class="details-perm-octal">(${fs.files} file, ${fs.folders} folder)</span></span>`;
      } else {
        sizeEl.innerHTML = '<span class="details-perm-octal">Gagal menghitung</span>';
      }
    } catch (err) {
      console.error('[details] Failed to calculate folder size:', err);
      sizeEl.innerHTML = '<span class="details-perm-octal">Error</span>';
    }
  });
}

function openDetailsOverlay(item, onAction = null) {

  const overlay = document.getElementById('details-overlay');

  if (!overlay) {
    console.error('[modals-handler] details-overlay element not found!');
    return;
  }

  // Store state
  detailsState.item = item;
  detailsState.actionCallback = onAction;

  // Update details info with basic data first (instant)
  const nameEl = document.getElementById('details-name');
  const typeEl = document.getElementById('details-type');
  const modifiedEl = document.getElementById('details-modified');
  const sizeEl = document.getElementById('details-size');
  const pathEl = document.getElementById('details-path');
  const subtitleEl = document.getElementById('details-subtitle');
  const iconEl = document.getElementById('details-icon');

  if (nameEl) nameEl.textContent = item.name || '-';

  if (typeEl) {
    if (item.type === 'folder') {
      typeEl.textContent = 'Folder';
    } else {
      const ext = item.name?.split('.').pop()?.toUpperCase() || '-';
      typeEl.textContent = ext + ' File';
    }
  }

  if (modifiedEl) {
    modifiedEl.textContent = formatTimestamp(item.modified || item.date || item.mtime);
  }

  if (sizeEl) {
    if (item.type === 'folder') {
      sizeEl.textContent = '-';
    } else {
      const sizeValue = item.size || item.sizeBytes || 0;
      if (typeof sizeValue === 'number') {
        sizeEl.textContent = formatFileSize(sizeValue);
      } else {
        sizeEl.textContent = sizeValue;
      }
    }
  }

  if (pathEl) {
    const path = item.path || '-';
    pathEl.textContent = path;
    pathEl.title = path;
  }

  if (subtitleEl) {
    subtitleEl.textContent = item.name || 'Informasi lengkap';
  }

  // Update icon based on type
  if (iconEl) {
    if (item.type === 'folder') {
      iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" class="details-icon-svg">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>`;
      iconEl.classList.add('details-icon-folder');
      iconEl.classList.remove('details-icon-file');
    } else {
      iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" class="details-icon-svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
        <path d="M14 2v6h6"/>
      </svg>`;
      iconEl.classList.add('details-icon-file');
      iconEl.classList.remove('details-icon-folder');
    }
  }

  // Reset extended fields to loading state
  const mimeEl = document.getElementById('details-mime');
  const createdEl = document.getElementById('details-created');
  const permsEl = document.getElementById('details-permissions');
  const childrenRow = document.getElementById('details-children-row');
  const folderSizeRow = document.getElementById('details-folder-size-row');
  if (mimeEl) mimeEl.textContent = '...';
  if (createdEl) createdEl.textContent = '...';
  if (permsEl) permsEl.textContent = '...';
  if (childrenRow) childrenRow.style.display = 'none';
  if (folderSizeRow) folderSizeRow.style.display = 'none';

  // Show overlay immediately with basic data
  overlay.hidden = false;
  overlay.classList.remove('hidden');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.style.display = 'flex';

  // Focus close button
  setTimeout(() => {
    document.getElementById('details-close-btn')?.focus();
  }, 100);

  // Fetch extended details from API (async, fills in after overlay is visible)
  if (item.path) {
    fetch(`api.php?action=details&path=${encodeURIComponent(item.path)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.details) {
          populateExtendedDetails(data.details);
        }
      })
      .catch(err => {
        console.warn('[details] Failed to fetch extended details:', err);
        if (mimeEl) mimeEl.textContent = '-';
        if (createdEl) createdEl.textContent = '-';
        if (permsEl) permsEl.textContent = '-';
      });
  }
}

function closeDetailsOverlay() {
  const overlay = document.getElementById('details-overlay');
  if (!overlay) return;

  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  overlay.style.display = 'none';

  // Clear state
  detailsState = { item: null, actionCallback: null };
}

function handleDetailsAction(action) {
  const item = detailsState.item;
  if (!item) return;

  closeDetailsOverlay();

  switch (action) {
    case 'details-open':
      if (item.type === 'folder') {
        // Navigate to folder using loadFiles if available
        if (typeof window.loadFiles === 'function') {
          window.loadFiles(item.path);
        } else {
          window.location.hash = item.path || '';
        }
      } else {
        // Open file in preview modal
        if (typeof window.openPreviewModal === 'function') {
          window.openPreviewModal(item.path, item.name);
        } else {
          // Fallback - open in new tab
          const baseUrl = window.location.origin + window.location.pathname.replace('index.php', '');
          window.open(baseUrl + 'api.php?action=raw&path=' + encodeURIComponent(item.path), '_blank');
        }
      }
      break;
    case 'details-rename':
      if (typeof window.openRenameModal === 'function') {
        window.openRenameModal(item.path, item.name);
      } else if (typeof window.openRenameOverlay === 'function') {
        window.openRenameOverlay(item);
      }
      break;
    case 'details-move':
      if (typeof window.openMoveModal === 'function') {
        window.openMoveModal([item.path]);
      } else if (typeof window.openMoveOverlay === 'function') {
        window.openMoveOverlay([item.path]);
      }
      break;
    case 'details-delete':
      if (typeof window.openDeleteOverlay === 'function') {
        window.openDeleteOverlay([item], async (items) => {
          // Delete handler - use deleteItems from enhanced-ui
          if (typeof window.deleteItems === 'function') {
            const paths = items.map(i => i.path || i);
            await window.deleteItems(paths);
          }
        });
      }
      break;
  }
}

// Setup details overlay event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Close button
  document.getElementById('details-close-btn')?.addEventListener('click', closeDetailsOverlay);

  // Click outside to close
  document.getElementById('details-overlay')?.addEventListener('click', function (e) {
    if (e.target === this) closeDetailsOverlay();
  });

  // Action buttons
  ['details-open', 'details-rename', 'details-move', 'details-delete'].forEach(action => {
    document.getElementById(action)?.addEventListener('click', () => handleDetailsAction(action));
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const detailsOverlay = document.getElementById('details-overlay');
      if (detailsOverlay && !detailsOverlay.classList.contains('hidden')) {
        closeDetailsOverlay();
      }
    }
  });
});

// ============= Helper Functions =============

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper functions for notifications - delegate to toast system
function showError(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast('error', msg);
  } else {
    console.error(msg);
    alert(`Error: ${msg}`);
  }
}

function showSuccess(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast('success', msg);
  } else {

  }
}

// Export functions for use in other scripts
window.openPreviewModal = openPreviewModal;
window.openConfirmModal = openConfirmModal;
window.openCreateModal = openCreateModal;
window.openRenameModal = openRenameModal;
window.openMoveModal = openMoveModal;
window.openSettingsModal = openSettingsModal;
window.loadMoveFolders = loadMoveFolders;
window.openDeleteOverlay = openDeleteOverlay;
window.closeDeleteOverlay = closeDeleteOverlay;
window.confirmDelete = confirmDelete;
window.openDownloadOverlay = openDownloadOverlay;
window.closeDownloadOverlay = closeDownloadOverlay;
window.confirmDownload = confirmDownload;
window.openDetailsOverlay = openDetailsOverlay;
window.closeDetailsOverlay = closeDetailsOverlay;
window.galleryPrev = galleryPrev;
window.galleryNext = galleryNext;
window.toggleMarkdownPreview = toggleMarkdownPreview;
window.togglePreviewFullscreen = togglePreviewFullscreenEnhanced;
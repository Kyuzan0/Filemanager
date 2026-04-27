<?php
// Partial: overlays (preview, confirm, create, rename, unsaved, move, log, context menu, settings)
// Intended to be included in index.php. JS wiring points (functions/IDs) are noted in comments.
// Enhanced with ARIA attributes for accessibility (Phase 3)
?>

<!-- Keyboard shortcuts help modal -->
<div class="shortcuts-help-overlay hidden"
    id="shortcuts-help-overlay" aria-hidden="true">
    <div class="shortcuts-help-dialog"
        role="dialog" aria-modal="true" aria-labelledby="shortcuts-help-title">
        <header class="shortcuts-help-header">
            <h2 class="shortcuts-help-title" id="shortcuts-help-title">
                Keyboard Shortcuts
            </h2>
            <button type="button" id="shortcuts-help-close" class="shortcuts-help-close-btn"
                aria-label="Close keyboard shortcuts help">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" aria-hidden="true">
                    <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </button>
        </header>
        <div class="shortcuts-help-body" id="shortcuts-help-content">
            <!-- Content will be dynamically inserted by keyboardShortcuts.js -->
        </div>
        <footer class="shortcuts-help-footer">
            <p class="text-xs text-muted">
                Press <kbd class="shortcut-key">Ctrl</kbd> + <kbd class="shortcut-key">/</kbd> to toggle this help
            </p>
        </footer>
    </div>
</div>

<div class="preview-overlay hidden"
    id="preview-overlay" aria-hidden="true" data-action="preview" data-open="preview">
    <div class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title"
        aria-describedby="preview-meta">
        <header class="preview-header mb-4 flex-shrink-0">
            <div class="preview-title-group">
                <span class="preview-label text-sm text-muted" id="preview-label">Editor</span>
                <h2 class="preview-title text-lg font-semibold" id="preview-title">
                    Pratinjau</h2>
            </div>
            <div class="preview-controls d-flex items-center gap-2">
                <button class="btn-word-wrap" id="previewWordWrapToggle" title="Toggle Word Wrap"
                    aria-label="Toggle word wrap in editor" aria-pressed="false">
                    <i class="ri-text-wrap" aria-hidden="true"></i>
                    <span class="d-none sm\:d-inline text-xs">Wrap</span>
                </button>
            </div>
            <p class="preview-meta text-sm text-muted" id="preview-meta"></p>
        </header>
        <div class="preview-body">
            <!-- Text Editor View (CodeMirror 6) -->
            <div class="preview-editor-wrapper" id="preview-editor-wrapper">
                <!-- CodeMirror container - editor will be initialized here -->
                <div class="codemirror-container" id="codemirror-container"></div>
                <!-- Fallback textarea (hidden, used for copy/legacy support) -->
                <textarea class="preview-editor preview-editor-hidden" id="preview-editor" spellcheck="false"
                    style="display:none;"></textarea>
            </div>
            <!-- Image Preview View -->
            <div class="preview-image-wrapper" id="preview-image-wrapper" style="display: none;">
                <div class="preview-image-container" id="preview-image-container">
                    <img id="preview-image" src="" alt="Preview" />
                </div>
            </div>
            <!-- Video Preview View -->
            <div class="preview-video-wrapper" id="preview-video-wrapper" style="display: none;">
                <video id="preview-video" controls>
                    Your browser does not support the video tag.
                </video>
            </div>
            <!-- Audio Preview View -->
            <div class="preview-audio-wrapper" id="preview-audio-wrapper" style="display: none;">
                <div class="audio-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3v10.55c-.5-.3-1-.5-1.5-.5-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                </div>
                <audio id="preview-audio" controls>
                    Your browser does not support the audio element.
                </audio>
            </div>
            <!-- PDF Preview View -->
            <div class="preview-pdf-wrapper" id="preview-pdf-wrapper" style="display: none;">
                <iframe id="preview-pdf" src="" title="PDF Preview"></iframe>
            </div>
        </div>
        <!-- Image zoom controls (shown only for images) -->
        <div class="preview-image-controls" id="preview-image-controls" role="toolbar" aria-label="Image zoom controls"
            style="display: none;">
            <button type="button" class="preview-zoom-btn" id="preview-zoom-out" title="Zoom Out"
                aria-label="Zoom out image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
            </button>
            <span class="preview-zoom-level" id="preview-zoom-level" aria-live="polite" aria-atomic="true">100%</span>
            <button type="button" class="preview-zoom-btn" id="preview-zoom-in" title="Zoom In"
                aria-label="Zoom in image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
            </button>
            <button type="button" class="preview-zoom-btn" id="preview-zoom-reset" title="Reset Zoom"
                aria-label="Reset zoom to 100%">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                </svg>
            </button>
        </div>
        <footer class="preview-footer">
            <div class="preview-footer-status">
                <span class="preview-status"
                    id="preview-status"></span>
                <span class="preview-loader" id="preview-loader" hidden>Memuat
                    konten...</span>
            </div>
            <div class="preview-footer-actions" role="group" aria-label="File actions">
                <a id="preview-open-raw" href="#" target="_blank" rel="noopener"
                    class="preview-action-btn preview-action-btn--primary" data-tooltip="Buka file asli di tab baru"
                    aria-label="Open original file in new tab">
                    <svg class="preview-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                    <span class="preview-action-label">Buka</span>
                </a>
                <a id="preview-download" href="#" download class="preview-action-btn preview-action-btn--success"
                    data-tooltip="Unduh file ke perangkat" aria-label="Download file">
                    <svg class="preview-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span class="preview-action-label">Unduh</span>
                </a>
                <button type="button" id="preview-copy" data-action="preview-copy"
                    class="preview-action-btn preview-action-btn--secondary" data-tooltip="Salin konten ke clipboard"
                    aria-label="Copy content to clipboard">
                    <svg class="preview-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span class="preview-action-label">Salin</span>
                </button>
                <button type="button" id="preview-save" data-action="preview-save" disabled
                    class="preview-action-btn preview-action-btn--save" data-tooltip="Simpan perubahan (Ctrl+S)"
                    aria-disabled="true" aria-label="Save changes to file">
                    <svg class="preview-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" aria-hidden="true">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span class="preview-action-label">Simpan</span>
                </button>
                <button type="button" id="preview-close" data-action="preview-close"
                    class="preview-action-btn preview-action-btn--close" data-tooltip="Tutup pratinjau (Esc)"
                    aria-label="Close preview (Escape)">
                    <svg class="preview-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span class="preview-action-label">Tutup</span>
                </button>
            </div>
        </footer>
    </div>
</div>

<div class="confirm-overlay hidden"
    id="confirm-overlay" aria-hidden="true" data-action="confirm" data-open="confirm">
    <div class="confirm-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <header class="confirm-header">
            <div class="confirm-icon mx-auto"
                aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" fill="currentColor" class="w-6 h-6">
                    <path
                        d="M11.99 2a10 10 0 1 0 .02 20.02A10 10 0 0 0 11.99 2Zm0 3a1.1 1.1 0 1 1-.01 2.2 1.1 1.1 0 0 1 .01-2.2Zm1.75 13h-3.5v-2h1v-4h-1v-2h2.5v6h1v2Z" />
                </svg>
            </div>
            <div class="confirm-title-group">
                <h2 class="confirm-title" id="confirm-title">Konfirmasi</h2>
                <p class="confirm-message" id="confirm-message"></p>
            </div>
        </header>
        <div class="confirm-body">
            <p class="confirm-description" id="confirm-description"></p>
            <ul class="confirm-list" id="confirm-list" hidden></ul>
        </div>
        <div class="confirm-actions" role="group"
            aria-label="Confirmation actions">
            <button type="button"
                class="confirm-button outline"
                id="confirm-cancel" data-action="confirm-cancel" aria-label="Cancel action">Batal</button>
            <button type="button"
                class="confirm-button danger"
                id="confirm-confirm" data-action="confirm-confirm" aria-label="Confirm deletion">Hapus</button>
        </div>
    </div>
</div>

<!-- Modal Add Item -->
<div class="modal-backdrop-add-item hidden" id="create-overlay" aria-hidden="true" data-action="create"
    data-open="create">
    <div class="modal-add-item" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <div class="modal-add-item-header">
            <button type="button" class="close-button-add-item" id="create-cancel" data-action="create-cancel"
                aria-label="Tutup">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="feather feather-x">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <h3 class="modal-add-item-title" id="create-title">Add New Item</h3>
        </div>

        <!-- Hidden elements for JavaScript compatibility -->
        <div id="create-subtitle" style="display: none;"></div>
        <div id="create-label" style="display: none;"></div>
        <div id="create-hint" style="display: none;"></div>
        <form id="create-form" style="display: none;"></form>

        <div class="form-group-add-item">
            <label for="create-type-select" class="label-add-item">Item Type</label>
            <div class="radio-slide-container-add-item">
                <input type="radio" id="file-option" name="create-type" value="file" class="radio-input-add-item">
                <label for="file-option" class="radio-label-add-item">File</label>

                <input type="radio" id="folder-option" name="create-type" value="folder" class="radio-input-add-item">
                <label for="folder-option" class="radio-label-add-item">Folder</label>

                <span class="radio-slider-add-item"></span>
            </div>
        </div>

        <div class="form-group-add-item" id="create-name-group" style="display: none;">
            <label for="create-name" class="label-add-item">Name</label>
            <input type="text" id="create-name" name="create-name" placeholder="Misal: document.txt"
                class="input-text-add-item" autocomplete="off" required>
        </div>

        <div class="modal-actions-add-item">
            <button type="button" class="button-secondary-add-item" id="create-cancel-alt"
                data-action="create-cancel">Cancel</button>
            <button type="button" class="button-primary-add-item" id="create-submit"
                data-action="create-submit">Save</button>
        </div>
    </div>
</div>


<div class="rename-overlay hidden"
    id="rename-overlay" aria-hidden="true" data-action="rename" data-open="rename">
    <div class="rename-dialog" role="dialog" aria-modal="true"
        aria-labelledby="rename-title">
        <header class="rename-header">
            <div class="rename-icon"
                aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15 4.25l3.75 3.75 1.96-1.96z" />
                </svg>
            </div>
            <div class="rename-title-group">
                <h2 class="rename-title" id="rename-title">Rename Item</h2>
                <p class="rename-subtitle" id="rename-subtitle"></p>
            </div>
        </header>
        <form class="rename-form" id="rename-form">
            <div class="form-field">
                <label for="rename-name" id="rename-label">Nama Baru</label>
                <input type="text" id="rename-name" name="rename-name" autocomplete="off" required
                    class="rename-input" />
                <p class="form-hint" id="rename-hint">Gunakan huruf, angka, titik, atau garis bawah.</p>
            </div>
        </form>
        <footer class="rename-actions" role="group" aria-label="Rename actions">
            <button type="button"
                class="rename-button outline"
                id="rename-cancel" data-action="rename-cancel" aria-label="Cancel rename">Batal</button>
            <button type="submit" form="rename-form"
                class="rename-button primary"
                id="rename-submit" data-action="rename-submit" aria-label="Confirm rename">Rename</button>
        </footer>
    </div>
</div>

<div class="unsaved-overlay hidden"
    id="unsaved-overlay" aria-hidden="true" data-action="unsaved" data-open="unsaved">
    <div class="unsaved-dialog" role="dialog" aria-modal="true"
        aria-labelledby="unsaved-title">
        <div class="unsaved-header">
            <div class="unsaved-icon mx-auto" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" fill="currentColor">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
            </div>
            <div class="unsaved-title-group text-center">
                <h2 class="unsaved-title" id="unsaved-title">Perubahan Belum Disimpan
                </h2>
                <p class="unsaved-message" id="unsaved-message">Anda memiliki perubahan yang
                    belum disimpan. Apa yang ingin Anda lakukan?</p>
            </div>
        </div>
        <div class="unsaved-actions" role="group"
            aria-label="Unsaved changes actions">
            <button type="button"
                class="unsaved-button outline"
                id="unsaved-save" data-action="unsaved-save" aria-label="Save changes before closing">Simpan
                Perubahan</button>
            <button type="button"
                class="unsaved-button outline"
                id="unsaved-discard" data-action="unsaved-discard" aria-label="Discard changes and close">Tutup Tanpa
                Simpan</button>
            <button type="button"
                class="unsaved-button primary"
                id="unsaved-cancel" data-action="unsaved-cancel" aria-label="Cancel and return to editor">Batal</button>
        </div>
    </div>
</div>

<!-- Delete confirmation overlay modal -->
<div class="delete-overlay hidden"
    id="delete-overlay" aria-hidden="true">
    <div class="delete-dialog" role="dialog" aria-modal="true"
        aria-labelledby="delete-title">
        <header class="delete-header">
            <div class="delete-icon"
                aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
            </div>
            <div class="delete-title-group">
                <h2 class="delete-title" id="delete-title">Hapus Item</h2>
                <p class="delete-subtitle" id="delete-subtitle">Konfirmasi penghapusan</p>
            </div>
        </header>
        <div class="delete-body">
            <p class="delete-message" id="delete-message">Apakah Anda yakin ingin menghapus item ini?</p>
            <div class="delete-items-list" id="delete-items-list"></div>
            <p class="delete-warning" id="delete-warning">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 flex-shrink-0">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span>Tindakan ini tidak dapat dibatalkan.</span>
            </p>
        </div>
        <footer class="delete-actions" role="group"
            aria-label="Delete confirmation actions">
            <button type="button"
                class="delete-button outline"
                id="delete-cancel" data-action="delete-cancel" aria-label="Cancel deletion">Batal</button>
            <button type="button"
                class="delete-button danger"
                id="delete-confirm" data-action="delete-confirm" aria-label="Confirm deletion">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                Hapus
            </button>
        </footer>
    </div>
</div>

<!-- Download confirmation overlay modal -->
<div class="download-overlay hidden"
    id="download-overlay" aria-hidden="true">
    <div class="download-dialog" role="dialog" aria-modal="true"
        aria-labelledby="download-title">
        <header class="download-header">
            <div class="download-icon"
                aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
            </div>
            <div class="download-title-group">
                <h2 class="download-title" id="download-title">Unduh File</h2>
                <p class="download-subtitle" id="download-subtitle">Konfirmasi unduhan</p>
            </div>
        </header>
        <div class="download-body">
            <div class="download-file-info" id="download-file-info">
                <div class="download-file-icon"
                    id="download-file-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                </div>
                <div class="download-file-details">
                    <p class="download-file-name" id="download-file-name">filename.txt</p>
                    <p class="download-file-size" id="download-file-size">0 KB</p>
                </div>
            </div>
            <p class="download-message" id="download-message">File akan diunduh ke folder unduhan default Anda.
            </p>
        </div>
        <footer class="download-actions" role="group"
            aria-label="Download confirmation actions">
            <button type="button"
                class="download-button outline"
                id="download-cancel" data-action="download-cancel" aria-label="Cancel download">Batal</button>
            <button type="button"
                class="download-button primary"
                id="download-confirm" data-action="download-confirm" aria-label="Confirm download">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Unduh
            </button>
        </footer>
    </div>
</div>

<!-- Move overlay modal -->
<div class="move-overlay hidden" id="move-overlay"
    aria-hidden="true">
    <div class="move-dialog"
        role="dialog" aria-modal="true" aria-labelledby="move-title">
        <header class="move-header">
            <div class="move-icon mx-auto" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z" />
                </svg>
            </div>
            <div class="move-title-group text-center">
                <h2 class="move-title" id="move-title">Pindah Item</h2>
                <p class="move-subtitle" id="move-subtitle">Pilih folder tujuan untuk memindahkan item.</p>
            </div>
        </header>
        <div class="move-body">
            <nav class="move-breadcrumbs" id="move-breadcrumbs" aria-label="Lokasi tujuan"></nav>
            <div class="move-tools">
                <div class="move-search">
                    <input type="search" id="move-search" class="move-search-input"
                        placeholder="Cari folder di lokasi ini" autocomplete="off" />
                </div>
            </div>
            <div class="move-recents" id="move-recents" aria-label="Tujuan terakhir"></div>
            <ul class="move-list" id="move-list" aria-label="Daftar folder tujuan"></ul>
            <p class="move-error" id="move-error" role="alert"></p>
        </div>
        <footer class="move-actions"
            role="group" aria-label="Move actions">
            <div class="move-actions-spacer"></div>
            <button type="button"
                class="move-button outline"
                id="move-cancel" aria-label="Cancel move operation">Batal</button>
            <button type="button"
                class="move-button primary"
                id="move-confirm" aria-label="Confirm move to selected folder">Pindahkan</button>
        </footer>
    </div>
</div>

<div class="log-overlay hidden" id="log-overlay"
    aria-hidden="true">
    <div class="log-dialog"
        role="dialog" aria-modal="true" aria-labelledby="log-title">
        <header class="log-header">
            <div class="log-icon"
                aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
            </div>
            <div class="log-title-group">
                <h2 class="log-title" id="log-title">Log
                    Aktivitas</h2>
                <p class="log-subtitle" id="log-subtitle">Riwayat
                    aktivitas file manager</p>
            </div>
            <button type="button" id="log-close-top" aria-label="Tutup"
                class="log-close-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                    <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </button>
        </header>
        <div class="log-body">
            <div class="log-filter-bar">
                <div class="filter-primary">
                    <div class="filter-search-main pos-relative">
                        <svg viewBox="0 0 24 24" aria-hidden="true"
                            class="search-icon">
                            <path fill="currentColor"
                                d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79l4.5 4.5a1 1 0 0 0 1.41-1.41L15.5 14zm-6 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                        </svg>
                        <input type="text" id="log-path-search"
                            class="filter-search-input"
                            placeholder="Cari aktivitas...">
                    </div>

                    <div class="filter-quick-actions">
                        <select id="log-filter"
                            class="filter-select-compact">
                            <option value="">Semua Aktivitas</option>
                            <option value="create">Buat</option>
                            <option value="delete">Hapus</option>
                            <option value="move">Pindah</option>
                            <option value="rename">Ubah Nama</option>
                            <option value="upload">Unggah</option>
                            <option value="download">Unduh</option>
                        </select>

                        <select id="log-target-type"
                            class="filter-select-compact">
                            <option value="">Semua Tipe</option>
                            <option value="file">File</option>
                            <option value="folder">Folder</option>
                        </select>
                    </div>
                </div>

                <div id="active-filters-display" class="active-filters-minimal" style="display: none;">
                    <span
                        class="active-filters-label">Aktif:</span>
                    <div class="active-filters-tags" id="active-filters-tags"></div>
                </div>
            </div>

            <div class="log-table-wrapper">
                <table class="log-table">
                    <thead class="sticky-top">
                        <tr>
                            <th class="log-table-th">Waktu
                            </th>
                            <th class="log-table-th">Nama
                                File</th>
                            <th class="log-table-th">Aksi
                            </th>
                            <th
                                class="log-table-th d-none sm\:table-cell">
                                IP Address</th>
                            <th
                                class="log-table-th d-none md\:table-cell">
                                User Agent</th>
                        </tr>
                    </thead>
                    <tbody id="log-table-body">
                        <tr>
                            <td colspan="5" class="log-loading">
                                Memuat data log...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div
                class="log-controls-bottom">
                <div class="log-pagination" id="log-pagination-container">
                    <button id="log-prev" type="button"
                        class="log-pagination-btn"
                        title="Halaman sebelumnya">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                            <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                        </svg>
                    </button>
                    <div id="log-page-numbers" class="log-page-numbers">
                        <!-- Page numbers will be rendered here by JavaScript -->
                    </div>
                    <button id="log-next" type="button"
                        class="log-pagination-btn"
                        title="Halaman berikutnya">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                            <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                    </button>
                    <span id="log-page-info"
                        class="log-page-info"></span>
                </div>

                <div class="log-actions-group">
                    <div class="log-auto-refresh">
                        <label for="log-auto-refresh"
                            class="checkbox-label">
                            <input type="checkbox" id="log-auto-refresh"
                                class="log-checkbox">
                            <span>Auto-refresh (30s)</span>
                        </label>
                    </div>

                    <div class="log-export-dropdown pos-relative">
                        <button type="button" id="log-export-toggle"
                            class="log-button outline"
                            aria-expanded="false" aria-controls="log-export-menu">
                            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                                <path fill="currentColor"
                                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                            </svg>
                            <span>Export</span>
                            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                                <path fill="currentColor" d="M7 10l5 5 5-5z" />
                            </svg>
                        </button>
                        <div class="log-export-menu"
                            id="log-export-menu" aria-hidden="true" hidden>
                            <button type="button" id="log-export-csv"
                                class="log-export-option">
                                <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                                    <path fill="currentColor"
                                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                </svg>
                                <span>Export CSV</span>
                            </button>
                            <button type="button" id="log-export-json"
                                class="log-export-option">
                                <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                                    <path fill="currentColor"
                                        d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 4v2h2V7h-2zm0 4v2h2v-2h-2zm0 4v2h2v-2h-2z" />
                                </svg>
                                <span>Export JSON</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="log-error" id="log-error" role="alert" hidden></div>
        </div>
        <footer class="log-actions">
            <div class="log-actions-left">
                <div class="log-cleanup-group">
                    <select id="log-cleanup-days"
                        class="log-cleanup-select">
                        <option value="1">1 hari</option>
                        <option value="7">7 hari</option>
                        <option value="14">14 hari</option>
                        <option value="30" selected>30 hari</option>
                        <option value="60">60 hari</option>
                        <option value="90">90 hari</option>
                        <option value="0">Hapus semua</option>
                    </select>
                    <button type="button"
                        class="log-button danger"
                        id="log-cleanup">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                            <path fill="currentColor"
                                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                        <span>Cleanup</span>
                    </button>
                </div>
            </div>
            <div class="log-actions-right">
                <button type="button"
                    class="log-button outline"
                    id="log-refresh">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                        <path fill="currentColor"
                            d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <span>Refresh</span>
                </button>
                <button type="button"
                    class="log-button primary"
                    id="log-close">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                        <path fill="currentColor"
                            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                    <span>Tutup</span>
                </button>
            </div>
        </footer>
    </div>
</div>

<!-- Details overlay modal -->
<div class="details-overlay hidden"
    id="details-overlay" aria-hidden="true">
    <div class="details-dialog" role="dialog" aria-modal="true"
        aria-labelledby="details-title">
        <header class="details-header">
            <div class="details-icon"
                id="details-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
            </div>
            <div class="details-title-group">
                <h2 class="details-title" id="details-title">Detail Item</h2>
                <p class="details-subtitle" id="details-subtitle">Informasi lengkap</p>
            </div>
            <button type="button" class="details-close-btn" id="details-close-btn" data-action="details-close"
                aria-label="Tutup">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </header>
        <div class="details-body">
            <div class="details-info-list">
                <div class="details-info-item">
                    <span class="details-info-label">Nama</span>
                    <span class="details-info-value" id="details-name">-</span>
                </div>
                <div class="details-info-item">
                    <span class="details-info-label">Tipe</span>
                    <span class="details-info-value" id="details-type">-</span>
                </div>
                <div class="details-info-item">
                    <span class="details-info-label">Terakhir Diubah</span>
                    <span class="details-info-value" id="details-modified">-</span>
                </div>
                <div class="details-info-item">
                    <span class="details-info-label">Ukuran</span>
                    <span class="details-info-value" id="details-size">-</span>
                </div>
                <div class="details-info-item">
                    <span class="details-info-label">Lokasi</span>
                    <span class="details-info-value details-path" id="details-path">-</span>
                </div>
            </div>
        </div>
        <footer class="details-actions">
            <div class="details-actions-grid">
                <button type="button" class="details-action-btn" id="details-open" data-action="details-open">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                        <path
                            d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                    </svg>
                    <span>Buka</span>
                </button>
                <button type="button" class="details-action-btn" id="details-rename" data-action="details-rename">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                        <path
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    <span>Rename</span>
                </button>
                <button type="button" class="details-action-btn" id="details-move" data-action="details-move">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                        <path
                            d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12l-4-4h3V10h2v4h3l-4 4z" />
                    </svg>
                    <span>Pindahkan</span>
                </button>
                <button type="button" class="details-action-btn details-action-btn-danger" id="details-delete"
                    data-action="details-delete">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    <span>Hapus</span>
                </button>
            </div>
        </footer>
    </div>
</div>

<div class="context-menu hidden" id="context-menu" aria-hidden="true" role="menu" aria-label="File actions menu">
    <div class="context-menu-inner">
        <button type="button"
            class="context-menu-item"
            data-action="open" role="menuitem" aria-label="Open file or folder">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0">
                <path fill="currentColor"
                    d="M10 4h4l2 2h5v2H3V6h5zm-5 4h18v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zm10 2v8h2v-8z" />
            </svg>
            <span>Buka</span>
        </button>
        <button type="button"
            class="context-menu-item"
            data-action="download" role="menuitem" aria-label="Download file">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0">
                <path fill="currentColor" d="M5 20h14v-2H5zm7-16l5 5h-3v4h-4v-4H7z" />
            </svg>
            <span>Download</span>
        </button>
        <button type="button"
            class="context-menu-item"
            data-action="rename" role="menuitem" aria-label="Rename file or folder (F2)">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0">
                <path fill="currentColor"
                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15 4.25l3.75 3.75 1.96-1.96z" />
            </svg>
            <span>Rename</span>
        </button>
        <button type="button"
            class="context-menu-item"
            data-action="move" role="menuitem" aria-label="Move file or folder">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0">
                <path fill="currentColor" d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z" />
            </svg>
            <span>Pindah</span>
        </button>
        <div class="context-menu-separator" role="separator" aria-hidden="true"></div>
        <button type="button"
            class="context-menu-item danger"
            data-action="delete" role="menuitem" aria-label="Delete file or folder (Delete key)">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0">
                <path fill="currentColor" d="M6 7h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zm3 2v9h2V9H9zm4 0v9h2V9h-2z" />
                <path fill="currentColor" d="M15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
            <span>Hapus</span>
        </button>
    </div>
</div>

<!-- Mobile Search Modal -->
<div class="search-modal hidden" id="search-modal"
    aria-hidden="true">
    <div class="search-dialog" role="dialog" aria-modal="true"
        aria-labelledby="search-title">
        <header class="search-header">
            <h2 id="search-title" class="search-title">Cari File atau Folder</h2>
            <button type="button" id="search-close" aria-label="Tutup pencarian"
                class="search-close-btn">✕</button>
        </header>
        <div class="search-body">
            <input id="search-modal-input" type="search" placeholder="Masukkan nama file atau folder" autocomplete="off"
                class="search-input" />
        </div>
        <footer class="search-footer">
            <button type="button" id="search-clear"
                class="search-button outline">Hapus</button>
            <button type="button" id="search-apply"
                class="search-button primary">Cari</button>
        </footer>
    </div>
</div>



<!-- Mobile Actions Floating Context Menu -->
<div class="mobile-actions-menu hidden" id="mobile-actions-menu" aria-hidden="true">
    <button type="button" id="mobile-actions-view"
        class="mobile-actions-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span>Lihat</span>
    </button>
    <button type="button" id="mobile-actions-edit"
        class="mobile-actions-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>Rename</span>
    </button>
    <button type="button" id="mobile-actions-move"
        class="mobile-actions-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z" />
        </svg>
        <span>Pindah</span>
    </button>
    <button type="button" id="mobile-actions-delete"
        class="mobile-actions-item mobile-actions-item-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
        <span>Hapus</span>
    </button>
</div>

<?php
// Include enhanced settings modal with System Requirements tab
include __DIR__ . '/settings-modal.php';
?>
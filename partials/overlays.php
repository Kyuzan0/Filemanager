<?php
// Partial: overlays (preview, confirm, create, rename, unsaved, move, log, context menu, settings)
// Intended to be included in index.php. JS wiring points (functions/IDs) are noted in comments.
?>

<div class="preview-overlay fixed inset-0 flex items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden" id="preview-overlay" aria-hidden="true" data-action="preview" data-open="preview">
    <div class="preview-dialog bg-white rounded-lg p-4 md:p-6 w-full max-w-3xl shadow-lg max-h-[90vh] md:max-h-[85vh]" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <header class="preview-header mb-4">
            <div class="preview-title-group">
                <span class="preview-label text-sm text-gray-600">Editor</span>
                <h2 class="preview-title text-lg md:text-xl font-semibold" id="preview-title">Pratinjau</h2>
            </div>
            <p class="preview-meta text-sm text-gray-500" id="preview-meta"></p>
        </header>
        <div class="preview-body mb-4">
            <div class="preview-editor-wrapper flex flex-col md:flex-row">
                <div class="preview-line-numbers hidden md:block" id="preview-line-numbers">
                    <div class="preview-line-numbers-inner" id="preview-line-numbers-inner"><span>1</span></div>
                </div>
                <textarea class="preview-editor block w-full bg-slate-50 border rounded-md p-3 text-sm md:text-base" id="preview-editor" spellcheck="false"></textarea>
            </div>
        </div>
        <footer class="preview-footer">
            <div class="preview-footer-status mb-3">
                <span class="preview-status text-sm text-gray-600" id="preview-status"></span>
                <span class="preview-loader text-sm text-blue-600" id="preview-loader" hidden>Memuat konten...</span>
            </div>
            <div class="preview-footer-actions flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <a id="preview-open-raw" href="#" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline focus:outline-none px-3 py-2 border border-blue-200 rounded-md">Buka Asli</a>
                <button type="button" id="preview-copy" data-action="preview-copy" class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Salin</button>
                <button type="button" id="preview-save" data-action="preview-save" disabled class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-blue-600 text-white opacity-60 cursor-not-allowed" aria-disabled="true">Simpan</button>
                <button type="button" id="preview-close" data-action="preview-close" class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none">Tutup</button>
            </div>
        </footer>
    </div>
</div>

<div class="confirm-overlay fixed inset-0 flex items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden" id="confirm-overlay" aria-hidden="true" data-action="confirm" data-open="confirm">
    <div class="confirm-dialog bg-white rounded-lg p-4 md:p-6 w-full max-w-md shadow-lg" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="confirm-header mb-4">
            <div class="confirm-icon mx-auto mb-3 w-12 h-12 text-blue-600" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" fill="currentColor">
                    <path d="M11.99 2a10 10 0 1 0 .02 20.02A10 10 0 0 0 11.99 2Zm0 3a1.1 1.1 0 1 1-.01 2.2 1.1 1.1 0 0 1 .01-2.2Zm1.75 13h-3.5v-2h1v-4h-1v-2h2.5v6h1v2Z"/>
                </svg>
            </div>
            <div class="confirm-title-group text-center">
                <h2 class="confirm-title text-lg md:text-xl font-semibold" id="confirm-title">Konfirmasi</h2>
                <p class="confirm-message text-sm text-gray-600 mt-1" id="confirm-message"></p>
            </div>
        </div>
        <div class="confirm-body mb-4">
            <p class="confirm-description text-sm text-gray-700" id="confirm-description"></p>
            <ul class="confirm-list text-sm text-gray-700 mt-2" id="confirm-list" hidden></ul>
        </div>
        <div class="confirm-actions flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <button type="button" class="confirm-button outline inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" id="confirm-cancel" data-action="confirm-cancel">Batal</button>
            <button type="button" class="confirm-button danger inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" id="confirm-confirm" data-action="confirm-confirm">Hapus</button>
        </div>
    </div>
</div>

<!-- Mockup Modal Add Item -->
<div class="modal-backdrop-mockup hidden" id="create-overlay" aria-hidden="true" data-action="create" data-open="create">
  <div class="modal-content-mockup" role="dialog" aria-modal="true" aria-labelledby="create-title">
    <div class="modal-header-mockup">
      <button type="button" class="close-button-mockup" id="create-cancel" data-action="create-cancel" aria-label="Tutup">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <h3 class="modal-title-mockup" id="create-title">Add New Item</h3>
    </div>

    <!-- Hidden elements for JavaScript compatibility -->
    <div id="create-subtitle" style="display: none;"></div>
    <div id="create-label" style="display: none;"></div>
    <div id="create-hint" style="display: none;"></div>
    <form id="create-form" style="display: none;"></form>

    <div class="form-group-mockup">
      <label for="create-type-select" class="label-mockup">Item Type</label>
      <div class="radio-slide-container-mockup">
        <input type="radio" id="file-option" name="create-type" value="file" checked class="radio-input-mockup">
        <label for="file-option" class="radio-label-mockup">File</label>

        <input type="radio" id="folder-option" name="create-type" value="folder" class="radio-input-mockup">
        <label for="folder-option" class="radio-label-mockup">Folder</label>

        <span class="radio-slider-mockup"></span>
      </div>
    </div>

    <div class="form-group-mockup">
      <label for="create-name" class="label-mockup">Name</label>
      <input type="text" id="create-name" name="create-name" placeholder="Enter file or folder name" class="input-text-mockup" autocomplete="off" required>
    </div>

    <div class="modal-actions-mockup">
      <button type="button" class="button-secondary-mockup" id="create-cancel-alt" data-action="create-cancel">Cancel</button>
      <button type="button" class="button-primary-mockup" id="create-submit" data-action="create-submit">Save</button>
    </div>
  </div>
</div>

<style>
  /* Base Mockup Styling */
  .modal-backdrop-mockup {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4); /* Darker, slightly blurred backdrop */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; /* Modern sans-serif font */
  }

  .modal-backdrop-mockup.hidden {
    display: none !important;
  }

  .modal-content-mockup {
    background-color: #ffffff;
    border-radius: 12px; /* Rounded corners */
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); /* Softer, larger shadow */
    padding: 30px;
    width: 380px;
    max-width: 90%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    position: relative;
  }

  .modal-header-mockup {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 10px;
  }

  .close-button-mockup {
    position: absolute;
    left: 0; /* Align to the left */
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    color: #666;
    transition: color 0.2s ease;
  }

  .close-button-mockup:hover {
    color: #333;
  }

  .modal-title-mockup {
    margin: 0;
    font-size: 1.4em;
    font-weight: 600; /* Slightly bolder */
    color: #333;
    flex-grow: 1;
    text-align: center;
  }

  .form-group-mockup {
    margin-bottom: 0; /* Adjusted for overall gap */
  }

  .label-mockup {
    display: block;
    font-size: 0.9em;
    font-weight: 500;
    color: #555;
    margin-bottom: 8px;
  }

  /* Radio Button Slide Mockup */
  .radio-slide-container-mockup {
    position: relative;
    display: flex;
    background-color: #f0f2f5; /* Light gray background */
    border-radius: 8px;
    overflow: hidden;
    height: 44px;
    width: 100%;
    padding: 4px; /* Internal padding for the slide effect */
    box-sizing: border-box;
  }

  .radio-input-mockup {
    display: none;
  }

  .radio-label-mockup {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 15px;
    cursor: pointer;
    z-index: 1;
    transition: color 0.3s ease;
    font-weight: 500;
    font-size: 0.9em;
    color: #666;
    user-select: none;
  }

  .radio-input-mockup:checked + .radio-label-mockup {
    color: #333; /* Darker text when selected */
  }

  .radio-slider-mockup {
    position: absolute;
    top: 4px; /* Match padding */
    left: 4px; /* Match padding */
    width: calc(50% - 4px); /* Half width minus padding */
    height: calc(100% - 8px); /* Full height minus padding */
    background-color: #e2eafc; /* Light blue accent */
    border-radius: 6px; /* Slightly less rounded than container */
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* Smooth animation */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08); /* Subtle shadow for depth */
  }

  .radio-input-mockup:nth-child(3):checked ~ .radio-slider-mockup { /* For the second radio button (folder) */
    left: calc(50% + 4px);
  }

  .input-text-mockup {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #dde1e6; /* Light gray border */
    border-radius: 8px;
    font-size: 1em;
    color: #333;
    background-color: #fcfcfc;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    box-sizing: border-box; /* Include padding in width */
  }

  .input-text-mockup::placeholder {
    color: #999;
  }

  .input-text-mockup:focus {
    outline: none;
    border-color: #007bff; /* Blue focus indicator */
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
  }

  .modal-actions-mockup {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 10px;
  }

  .button-primary-mockup,
  .button-secondary-mockup {
    padding: 12px 25px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
    transition: background-color 0.2s ease, box-shadow 0.2s ease;
  }

  .button-primary-mockup {
    background-color: #007bff; /* Primary blue */
    color: white;
  }

  .button-primary-mockup:hover {
    background-color: #0056b3;
    box-shadow: 0 4px 10px rgba(0, 123, 255, 0.2);
  }

  .button-secondary-mockup {
    background-color: #e9ecef; /* Light gray */
    color: #495057;
  }

  .button-secondary-mockup:hover {
    background-color: #dae0e5;
  }
</style>

<div class="rename-overlay fixed inset-0 flex items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden" id="rename-overlay" aria-hidden="true" data-action="rename" data-open="rename">
    <div class="rename-dialog bg-white rounded-lg p-4 md:p-6 w-full max-w-md shadow-lg" role="dialog" aria-modal="true" aria-labelledby="rename-title">
        <header class="rename-header mb-4">
            <div class="rename-icon mx-auto mb-3 w-12 h-12 text-blue-600" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15 4.25l3.75 3.75 1.96-1.96z"/></svg>
            </div>
            <div class="rename-title-group text-center">
                <h2 class="rename-title text-lg md:text-xl font-semibold" id="rename-title">Rename Item</h2>
                <p class="rename-subtitle text-sm text-gray-600 mt-1" id="rename-subtitle"></p>
            </div>
        </header>
        <form class="rename-form" id="rename-form">
            <div class="form-field mb-4">
                <label for="rename-name" id="rename-label" class="text-sm font-medium text-slate-700 block mb-1">Nama Baru</label>
                <input type="text" id="rename-name" name="rename-name" autocomplete="off" required class="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" />
                <p class="form-hint text-sm text-slate-500 mt-1" id="rename-hint"></p>
            </div>
        </form>
        <footer class="rename-actions flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <button type="button" class="rename-button outline inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" id="rename-cancel" data-action="rename-cancel">Batal</button>
            <button type="submit" form="rename-form" class="rename-button primary inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" id="rename-submit" data-action="rename-submit">Rename</button>
        </footer>
    </div>
</div>

<div class="unsaved-overlay fixed inset-0 flex items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden" id="unsaved-overlay" aria-hidden="true" data-action="unsaved" data-open="unsaved">
    <div class="unsaved-dialog bg-white rounded-lg p-4 md:p-6 w-full max-w-md shadow-lg" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
        <div class="unsaved-header mb-4">
            <div class="unsaved-icon mx-auto mb-3 w-12 h-12 text-yellow-600" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
            </div>
            <div class="unsaved-title-group text-center">
                <h2 class="unsaved-title text-lg md:text-xl font-semibold" id="unsaved-title">Perubahan Belum Disimpan</h2>
                <p class="unsaved-message text-sm text-gray-600 mt-1" id="unsaved-message">Anda memiliki perubahan yang belum disimpan. Apa yang ingin Anda lakukan?</p>
            </div>
        </div>
        <div class="unsaved-actions flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <button type="button" class="unsaved-button outline inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" id="unsaved-save" data-action="unsaved-save">Simpan Perubahan</button>
            <button type="button" class="unsaved-button outline inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none" id="unsaved-discard" data-action="unsaved-discard">Tutup Tanpa Simpan</button>
            <button type="button" class="unsaved-button primary inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" id="unsaved-cancel" data-action="unsaved-cancel">Batal</button>
        </div>
    </div>
</div>

<!-- Move overlay modal -->
<div class="move-overlay fixed inset-0 flex items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden" id="move-overlay" aria-hidden="true">
    <div class="move-dialog bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl shadow-lg max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="move-title">
        <header class="move-header mb-4 flex-shrink-0">
            <div class="move-icon mx-auto mb-3 w-12 h-12 text-blue-600" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z"/>
                </svg>
            </div>
            <div class="move-title-group text-center">
                <h2 class="move-title text-lg md:text-xl font-semibold" id="move-title">Pindah Item</h2>
                <p class="move-subtitle text-sm text-gray-600 mt-1" id="move-subtitle">Pilih folder tujuan untuk memindahkan item.</p>
            </div>
        </header>
        <div class="move-body flex-1 overflow-hidden flex flex-col">
            <nav class="move-breadcrumbs mb-3 text-sm" id="move-breadcrumbs" aria-label="Lokasi tujuan"></nav>
            <div class="move-tools mb-3 flex flex-col md:flex-row gap-2">
                <div class="move-shortcuts flex flex-wrap gap-2">
                    <button type="button" class="move-chip inline-flex items-center gap-2 px-2 py-1 rounded-md bg-gray-100 text-sm" id="move-root-shortcut" title="Ke Root">Root</button>
                    <button type="button" class="move-chip inline-flex items-center gap-2 px-2 py-1 rounded-md bg-gray-100 text-sm" id="move-current-shortcut" title="Ke folder saat ini">Folder saat ini</button>
                </div>
                <div class="move-search">
                    <input type="search" id="move-search" class="move-search-input w-full border rounded-md px-3 py-2 text-sm" placeholder="Cari folder di lokasi ini" autocomplete="off" />
                </div>
            </div>
            <div class="move-recents mb-3" id="move-recents" aria-label="Tujuan terakhir"></div>
            <ul class="move-list flex-1 overflow-y-auto" id="move-list" aria-label="Daftar folder tujuan"></ul>
            <p class="move-error text-sm text-red-600 mt-2" id="move-error" role="alert"></p>
        </div>
        <footer class="move-actions flex flex-col sm:flex-row items-stretch sm:items-end gap-2 mt-4 flex-shrink-0">
            <button type="button" class="move-button outline inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none" id="move-select-here">Pilih di sini</button>
            <div class="move-actions-spacer flex-1"></div>
            <button type="button" class="move-button outline inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none" id="move-cancel">Batal</button>
            <button type="button" class="move-button primary inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-blue-600 text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" id="move-confirm" disabled>Pindahkan</button>
        </footer>
    </div>
</div>

<div class="log-overlay fixed inset-0 flex items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden" id="log-overlay" aria-hidden="true">
    <div class="log-dialog bg-white rounded-lg p-4 md:p-6 w-full max-w-4xl shadow-lg max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="log-title">
        <header class="log-header mb-4 flex-shrink-0">
            <div class="log-icon mx-auto mb-3 w-12 h-12 text-blue-600" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            </div>
            <div class="log-title-group text-center">
                <h2 class="log-title text-lg md:text-xl font-semibold" id="log-title">Log Aktivitas</h2>
                <p class="log-subtitle text-sm text-gray-600 mt-1" id="log-subtitle">Riwayat aktivitas file manager</p>
            </div>
        </header>
        <div class="log-body flex-1 overflow-hidden flex flex-col">
            <div class="log-filter-bar mb-4 flex-shrink-0">
                <div class="filter-primary flex flex-col md:flex-row gap-2">
                    <div class="filter-search-main relative">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="search-icon absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79l4.5 4.5a1 1 0 0 0 1.41-1.41L15.5 14zm-6 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
                        </svg>
                        <input type="text" id="log-path-search" class="filter-search-input pl-10 pr-3 py-2 border rounded-md w-full text-sm" placeholder="Cari aktivitas...">
                    </div>
                    
                    <div class="filter-quick-actions flex flex-col sm:flex-row gap-2">
                        <select id="log-filter" class="filter-select-compact border rounded-md px-3 py-2 text-sm">
                            <option value="">Semua Aktivitas</option>
                            <option value="create">Buat</option>
                            <option value="delete">Hapus</option>
                            <option value="move">Pindah</option>
                            <option value="rename">Ubah Nama</option>
                            <option value="upload">Unggah</option>
                            <option value="download">Unduh</option>
                        </select>
                        
                        <select id="log-target-type" class="filter-select-compact border rounded-md px-3 py-2 text-sm">
                            <option value="">Semua Tipe</option>
                            <option value="file">File</option>
                            <option value="folder">Folder</option>
                        </select>
                        
                    </div>
                </div>
                
                <div id="active-filters-display" class="active-filters-minimal mt-2" style="display: none;">
                    <span class="active-filters-label text-sm text-gray-600">Aktif:</span>
                    <div class="active-filters-tags flex flex-wrap gap-1 mt-1" id="active-filters-tags"></div>
                </div>
            </div>
            
            <div class="log-table-wrapper flex-1 overflow-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table class="log-table min-w-[600px] w-full text-sm">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-2 text-left">Waktu</th>
                            <th class="px-2 py-2 text-left">Aksi</th>
                            <th class="px-2 py-2 text-left">Target</th>
                            <th class="px-2 py-2 text-left hidden sm:table-cell">Tipe</th>
                            <th class="px-2 py-2 text-left hidden md:table-cell">IP Address</th>
                        </tr>
                    </thead>
                    <tbody id="log-table-body">
                        <tr>
                            <td colspan="5" class="log-loading px-2 py-4 text-center">Memuat data log...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="log-controls-bottom flex flex-col sm:flex-row justify-between items-center gap-2 mt-4 flex-shrink-0">
                <div class="log-pagination flex items-center gap-2">
                    <button id="log-prev" type="button" class="log-pagination-btn p-2 border rounded-md text-sm disabled:opacity-50" disabled>
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </button>
                    <span id="log-page-info" class="text-sm">Halaman 1</span>
                    <button id="log-next" type="button" class="log-pagination-btn p-2 border rounded-md text-sm disabled:opacity-50" disabled>
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </button>
                </div>
                
                <div class="log-actions-group flex flex-col sm:flex-row gap-2">
                    <div class="log-auto-refresh">
                        <label for="log-auto-refresh" class="checkbox-label flex items-center gap-2 text-sm">
                            <input type="checkbox" id="log-auto-refresh" class="rounded">
                            <span>Auto-refresh (30s)</span>
                        </label>
                    </div>
                    
                    <div class="log-export-dropdown relative">
                        <button type="button" id="log-export-toggle" class="log-button outline inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none" aria-expanded="false" aria-controls="log-export-menu">
                            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                            <span>Export</span>
                            <svg viewBox="0 0 24 24" aria-hidden="true" class="dropdown-arrow w-4 h-4"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
                        </button>
                        <div class="log-export-menu absolute right-0 mt-1 w-40 bg-white border rounded-md shadow-lg z-10" id="log-export-menu" aria-hidden="true" hidden>
                            <button type="button" id="log-export-csv" class="log-export-option px-3 py-2 text-sm w-full text-left hover:bg-gray-50 focus:outline-none">
                                <svg viewBox="0 0 24 24" aria-hidden="true" class="inline-block w-4 h-4 mr-2"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                                <span>Export CSV</span>
                            </button>
                            <button type="button" id="log-export-json" class="log-export-option px-3 py-2 text-sm w-full text-left hover:bg-gray-50 focus:outline-none">
                                <svg viewBox="0 0 24 24" aria-hidden="true" class="inline-block w-4 h-4 mr-2"><path fill="currentColor" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 4v2h2V7h-2zm0 4v2h2v-2h-2zm0 4v2h2v-2h-2z"/></svg>
                                <span>Export JSON</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="log-error text-sm text-red-600 mt-2" id="log-error" role="alert" hidden></div>
        </div>
        <footer class="log-actions flex flex-col sm:flex-row justify-between gap-4 mt-4 flex-shrink-0">
            <div class="log-actions-left">
                <div class="log-cleanup-group flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select id="log-cleanup-days" class="log-cleanup-select border rounded-md px-3 py-2 text-sm">
                        <option value="7">7 hari</option>
                        <option value="30" selected>30 hari</option>
                    </select>
                    <button type="button" class="log-button danger px-3 py-2 rounded-md text-sm bg-red-600 text-white inline-flex items-center justify-center gap-2" id="log-cleanup">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        <span>Cleanup</span>
                    </button>
                </div>
            </div>
            <div class="log-actions-right flex flex-col sm:flex-row gap-2">
                <button type="button" class="log-button outline px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 inline-flex items-center justify-center gap-2" id="log-refresh">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/></svg>
                    <span>Refresh</span>
                </button>
                <button type="button" class="log-button primary px-3 py-2 rounded-md text-sm bg-blue-600 text-white" id="log-close">Tutup</button>
            </div>
        </footer>
    </div>
</div>

<div class="context-menu absolute bg-white rounded-md shadow-lg z-50 hidden min-w-[180px] max-w-[280px]" id="context-menu" aria-hidden="true">
    <div class="context-menu-inner" role="menu">
        <button type="button" class="context-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-action="open" role="menuitem">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0"><path fill="currentColor" d="M10 4h4l2 2h5v2H3V6h5zm-5 4h18v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zm10 2v8h2v-8z"/></svg>
            <span>Buka</span>
        </button>
        <button type="button" class="context-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-action="download" role="menuitem">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0"><path fill="currentColor" d="M5 20h14v-2H5zm7-16l5 5h-3v4h-4v-4H7z"/></svg>
            <span>Download</span>
        </button>
        <button type="button" class="context-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-action="rename" role="menuitem">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15 4.25l3.75 3.75 1.96-1.96z"/></svg>
            <span>Rename</span>
        </button>
        <button type="button" class="context-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-action="move" role="menuitem">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0"><path fill="currentColor" d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z"/></svg>
            <span>Pindah</span>
        </button>
        <div class="context-menu-separator border-t border-gray-200 my-1" role="separator"></div>
        <button type="button" class="context-menu-item danger w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600" data-action="delete" role="menuitem">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0"><path fill="currentColor" d="M6 7h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zm3 2v9h2V9H9zm4 0v9h2V9h-2z"/><path fill="currentColor" d="M15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            <span>Hapus</span>
        </button>
    </div>
</div>

<!-- Settings overlay -->
<div class="settings-overlay fixed inset-0 flex items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden" id="settings-overlay" aria-hidden="true" data-action="settings" data-open="settings">
    <div class="settings-dialog bg-white rounded-lg p-4 md:p-6 w-full max-w-xl shadow-lg" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header class="settings-header mb-4 flex items-center justify-between">
            <h2 id="settings-title" class="text-lg md:text-xl font-semibold">Pengaturan</h2>
            <button type="button" id="settings-close" data-action="settings-close" aria-label="Tutup pengaturan" class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">✕</button>
        </header>
        <div class="settings-body mb-4">
            <div class="setting-row">
                <label for="toggle-debug" class="toggle flex items-center gap-3 cursor-pointer" aria-hidden="false">
                    <input type="checkbox" id="toggle-debug" class="toggle-input sr-only" role="switch" aria-checked="false">
                    <span class="toggle-switch relative inline-block w-12 h-6 bg-gray-200 rounded-full transition-colors" aria-hidden="true">
                        <span class="toggle-switch-dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></span>
                    </span>
                    <span class="toggle-label text-sm font-medium">Aktifkan debug logging (console)</span>
                </label>
                <p class="setting-hint text-sm text-gray-500 mt-2">Matikan untuk menghilangkan pesan debug dari konsol.</p>
            </div>
        </div>
        <footer class="settings-footer flex flex-col sm:flex-row gap-2">
            <button type="button" id="settings-save" data-action="settings-save" class="settings-button primary px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Simpan</button>
            <button type="button" id="settings-cancel" data-action="settings-cancel" class="settings-button outline px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Batal</button>
        </footer>
    </div>
</div>
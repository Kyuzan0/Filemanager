<?php
// Partial: action bar (buttons, upload, add split menu)
?>
<section class="action-bar container mx-auto px-4 py-2 md:py-4 flex flex-wrap items-center justify-between gap-4 md:flex-row md:justify-between md:gap-4">
    <!-- MOBILE VERSION -->
    <div class="action-bar-mobile flex gap-1.5 p-1.5 items-center justify-center md:hidden">
        <!-- Hidden checkbox untuk track select-all state -->
        <input type="checkbox" id="select-all-mobile" class="hidden" aria-label="Pilih semua item">
        
        <button id="btn-select-all-mobile" type="button" class="action-btn-mobile p-1.5 bg-indigo-500 text-white rounded-md flex items-center justify-center" title="Pilih semua">
            <i class="ri-checkbox-multiple-line text-base"></i>
        </button>

        <div class="relative">
            <button id="btn-upload" data-action="upload" type="button" class="action-btn-mobile p-1.5 bg-blue-500 text-white rounded-md flex items-center justify-center" title="Upload File">
                <i class="ri-upload-cloud-line text-base"></i>
            </button>
            <input id="upload-input" type="file" class="hidden" multiple>
        </div>

        <div class="relative">
            <button id="btn-upload-folder" data-action="upload-folder" type="button" class="action-btn-mobile p-1.5 bg-cyan-500 text-white rounded-md flex items-center justify-center" title="Upload Folder">
                <i class="ri-folder-upload-line text-base"></i>
            </button>
            <input id="upload-folder-input" type="file" class="hidden" webkitdirectory directory multiple>
        </div>

        <button type="button" class="action-btn-mobile p-1.5 bg-green-500 text-white rounded-md flex items-center justify-center" data-action="add-modal" data-kind="folder" title="Folder Baru">
            <i class="ri-folder-add-line text-base"></i>
        </button>

        <button id="btn-search-mobile" type="button" class="action-btn-mobile p-1.5 bg-purple-500 text-white rounded-md flex items-center justify-center" title="Cari">
            <i class="ri-search-line text-base"></i>
        </button>

        <button id="btn-delete-selected" data-action="delete-selected" type="button" class="action-btn-mobile p-1.5 bg-red-500 text-white rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled title="Hapus">
            <i class="ri-delete-bin-line text-base"></i>
        </button>

        <button id="btn-settings-mobile" type="button" data-action="settings" class="action-btn-mobile p-1.5 bg-gray-500 text-white rounded-md flex items-center justify-center" title="Pengaturan">
            <i class="ri-settings-line text-base"></i>
        </button>
    </div>

    <!-- Floating Selected Count Badge for Mobile - Compact -->
    <div id="mobile-selected-count" class="fixed bottom-3 right-3 bg-blue-500 text-white rounded-full px-2 py-1.5 shadow-md items-center gap-1.5 z-40 hidden">
        <i class="ri-checkbox-multiple-line text-xs"></i>
        <span class="selected-count-text text-xs font-semibold">0 dipilih</span>
        <button id="mobile-clear-selection" class="text-white hover:bg-blue-600 rounded-full p-0.5 transition-colors" title="Hapus pilihan">
            <i class="ri-close-line text-xs"></i>
        </button>
    </div>

    <!-- DESKTOP VERSION -->
    <div class="hidden md:flex gap-3 p-3">
        <div class="relative">
            <button id="btn-upload-desktop" data-action="upload" type="button" class="px-4 py-2 bg-blue-500 text-white rounded flex items-center gap-2" title="Unggah file">
                <i class="ri-upload-cloud-line"></i>
                <span>Upload File</span>
            </button>
            <input id="upload-input-desktop" type="file" class="hidden" multiple>
        </div>

        <div class="relative">
            <button id="btn-upload-folder-desktop" data-action="upload-folder" type="button" class="px-4 py-2 bg-cyan-500 text-white rounded flex items-center gap-2" title="Unggah folder">
                <i class="ri-folder-upload-line"></i>
                <span>Upload Folder</span>
            </button>
            <input id="upload-folder-input-desktop" type="file" class="hidden" webkitdirectory directory multiple>
        </div>

        <button type="button" class="px-4 py-2 bg-green-500 text-white rounded flex items-center gap-2" data-action="add-modal" data-kind="folder" title="Folder Baru">
            <i class="ri-folder-add-line"></i>
            <span>Folder Baru</span>
        </button>

        <button id="btn-delete-selected-desktop" data-action="delete-selected" type="button" class="px-4 py-2 bg-red-500 text-white rounded flex items-center gap-2 disabled:opacity-60" disabled title="Hapus Terpilih">
            <i class="ri-delete-bin-line"></i>
            <span>Hapus Terpilih</span>
        </button>

        <!-- Additional desktop buttons -->
        <button id="btn-settings" type="button" data-action="settings" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-gray-50" title="Pengaturan">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3.5l-1.06-.17a7.96 7.96 0 0 0-.66-1.6l.6-1.02-1.5-1.5-.99.6a7.96 7.96 0 0 0-1.6-.66l-.17-1.06H9.5l-.17 1.06a7.96 7.96 0 0 0-1.6.66l-.99-.6-1.5 1.5.6 1.02c-.26.5-.45 1.04-.66 1.6l-1.06.17v2l1.06.17c.21.56.4 1.1.66 1.6l-.6 1.02 1.5 1.5.99-.6c.5.26 1.04.45 1.6.66l.17 1.06h2l.17-1.06c.56-.21 1.1-.4 1.6-.66l.99.6 1.5-1.5-.6-1.02c.26-.5.45-1.04.66-1.6l1.06-.17v-2z"/></svg>
            <span>Pengaturan</span>
        </button>

        <button id="btn-move-selected" data-action="move-selected" type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm disabled:opacity-60" disabled title="Pindahkan item terpilih">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z"/></svg>
            <span>Pindah</span>
        </button>
    </div>
</section>
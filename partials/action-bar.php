<?php
// Partial: action bar (buttons, upload, add split menu)
?>
<section class="action-bar container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4 md:flex-row md:justify-between md:gap-4">
    <div class="flex items-center gap-2 md:gap-2">
        <button id="btn-up" type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0" title="Naik Level">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path d="M12 5l7 7-1.41 1.41L13 9.83V19h-2V9.83l-4.59 4.58L5 12z"/></svg>
            <span class="md:inline">Naik Level</span>
        </button>
        <button id="btn-refresh" type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0" title="Muat Ulang">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/></svg>
            <span class="md:inline">Muat Ulang</span>
        </button>
    </div>

    <div class="flex items-center gap-2 md:gap-2 overflow-x-auto pb-1 md:pb-0">
        <div class="relative">
            <button id="btn-upload" data-action="upload" type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0" title="Unggah file">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                <span class="md:inline">Upload</span>
            </button>
            <input id="upload-input" type="file" class="hidden" multiple>
        </div>

        <button id="btn-logs" type="button" data-action="logs" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-gray-50 min-h-[44px] md:min-h-0" title="Log Aktivitas">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            <span class="md:inline">Log Aktivitas</span>
        </button>

        <button id="btn-settings" type="button" data-action="settings" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-gray-50 min-h-[44px] md:min-h-0" title="Pengaturan">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3.5l-1.06-.17a7.96 7.96 0 0 0-.66-1.6l.6-1.02-1.5-1.5-.99.6a7.96 7.96 0 0 0-1.6-.66l-.17-1.06H9.5l-.17 1.06a7.96 7.96 0 0 0-1.6.66l-.99-.6-1.5 1.5.6 1.02c-.26.5-.45 1.04-.66 1.6l-1.06.17v2l1.06.17c.21.56.4 1.1.66 1.6l-.6 1.02 1.5 1.5.99-.6c.5.26 1.04.45 1.6.66l.17 1.06h2l.17-1.06c.56-.21 1.1-.4 1.6-.66l.99.6 1.5-1.5-.6-1.02c.26-.5.45-1.04.66-1.6l1.06-.17v-2z"/></svg>
            <span class="md:inline">Pengaturan</span>
        </button>

        <div class="relative inline-flex items-center">
            <button type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] md:min-h-0" title="Tambah File" data-action="add-file">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <span class="md:inline">Tambah</span>
            </button>
            <button type="button" class="ml-1 inline-flex items-center px-2 py-2 rounded-full text-sm bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-gray-50 min-h-[44px] md:min-h-0" aria-haspopup="true" aria-expanded="false" title="Lihat opsi tambah">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4 flex-shrink-0"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
            </button>

            <div class="split-menu origin-top-right absolute right-0 mt-10 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden z-50" role="menu" aria-hidden="true">
                <div class="py-1" role="none">
                    <button type="button" role="menuitem" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100" data-action="add-modal" data-kind="file" tabindex="-1">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="inline-block w-4 h-4 mr-2"><path d="M5 3h14a2 2 0 0 1 2 2v3H3V5a2 2 0 0 1 2-2zm0 18h14a2 2 0 0 0 2-2v-9H3v9a2 2 0 0 0 2 2z"/></svg>
                        Tambah File
                    </button>
                    <button type="button" role="menuitem" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100" data-action="add-modal" data-kind="folder" tabindex="-1">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="inline-block w-4 h-4 mr-2"><path d="M4 10h16v2H4zm0 4h10v2H4zm0-8h16v2H4z"/></svg>
                        Tambah Folder
                    </button>
                </div>
            </div>
        </div>

        <button type="button" data-action="download" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm opacity-60 cursor-not-allowed min-h-[44px] md:min-h-0" disabled title="Fitur segera hadir">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path d="M5 20h14v-2H5zm7-16l5 5h-3v4h-4v-4H7z"/></svg>
            <span class="md:inline">Download</span>
        </button>

        <button id="btn-move-selected" data-action="move-selected" type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white border border-gray-200 text-slate-700 shadow-sm disabled:opacity-60 min-h-[44px] md:min-h-0" disabled title="Pindahkan item terpilih">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z"/></svg>
            <span class="md:inline">Pindah</span>
        </button>

        <button id="btn-delete-selected" data-action="delete-selected" type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 min-h-[44px] md:min-h-0" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 flex-shrink-0"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            <span class="md:inline">Hapus</span>
        </button>
    </div>
</section>
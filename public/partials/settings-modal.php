<?php
// Partial: Settings Modal with System Requirements Tab
// This modal includes General settings and System Requirements check
?>

<!-- Settings overlay -->
<div class="settings-overlay fixed inset-0 items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden"
    id="settings-overlay" aria-hidden="true" data-action="settings" data-open="settings">
    <div class="settings-dialog bg-white dark:bg-[#1a2332] rounded-lg p-4 md:p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header class="settings-header mb-4 flex items-center justify-between flex-shrink-0">
            <h2 id="settings-title" class="text-lg md:text-xl font-semibold dark:text-slate-200">Pengaturan</h2>
            <button type="button" id="settings-close" data-action="settings-close" aria-label="Tutup pengaturan"
                class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 focus:outline-none transition-colors">✕</button>
        </header>

        <!-- Tabs Navigation -->
        <nav class="settings-tabs flex border-b border-gray-200 dark:border-white/10 mb-4 flex-shrink-0" role="tablist">
            <button type="button"
                class="settings-tab px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 border-b-2 border-transparent hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none transition-colors active"
                id="settings-tab-general" data-tab="general" role="tab" aria-selected="true"
                aria-controls="settings-panel-general">
                <svg class="w-4 h-4 inline-block mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path
                        d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                </svg>
                Umum
            </button>
            <button type="button"
                class="settings-tab px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 border-b-2 border-transparent hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none transition-colors"
                id="settings-tab-system" data-tab="system" role="tab" aria-selected="false"
                aria-controls="settings-panel-system">
                <svg class="w-4 h-4 inline-block mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path
                        d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
                </svg>
                System Requirements
            </button>
        </nav>

        <div class="settings-body flex-1 overflow-y-auto">
            <!-- General Settings Panel -->
            <div class="settings-panel" id="settings-panel-general" role="tabpanel"
                aria-labelledby="settings-tab-general">
                <div class="setting-row mb-4">
                    <label for="toggle-debug" class="toggle flex items-center gap-3 cursor-pointer" aria-hidden="false">
                        <input type="checkbox" id="toggle-debug" class="toggle-input sr-only" role="switch"
                            aria-checked="false">
                        <span
                            class="toggle-switch relative inline-block w-12 h-6 bg-gray-200 dark:bg-white/20 rounded-full transition-colors"
                            aria-hidden="true">
                            <span
                                class="toggle-switch-dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></span>
                        </span>
                        <span class="toggle-label text-sm font-medium dark:text-slate-200">Aktifkan debug logging
                            (console)</span>
                    </label>
                    <p class="setting-hint text-sm text-gray-500 dark:text-slate-400 mt-2 ml-15">Matikan untuk
                        menghilangkan pesan debug dari konsol.</p>
                </div>
            </div>

            <!-- System Requirements Panel -->
            <div class="settings-panel hidden" id="settings-panel-system" role="tabpanel"
                aria-labelledby="settings-tab-system">
                <div class="system-requirements-header mb-4">
                    <p class="text-sm text-gray-600 dark:text-slate-400">Periksa status dependency dan konfigurasi
                        sistem.</p>
                    <button type="button" id="system-req-refresh"
                        class="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 focus:outline-none transition-colors">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path
                                d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z" />
                        </svg>
                        Refresh Status
                    </button>
                </div>

                <div class="system-req-loading text-center py-8 hidden" id="system-req-loading">
                    <svg class="animate-spin w-8 h-8 mx-auto text-blue-500" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z">
                        </path>
                    </svg>
                    <p class="text-sm text-gray-500 dark:text-slate-400 mt-2">Memeriksa sistem...</p>
                </div>

                <div class="system-req-content" id="system-req-content">
                    <div class="space-y-3">
                        <!-- PHP Version -->
                        <div class="req-item flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20"
                            id="req-php">
                            <div class="req-icon w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200 dark:bg-white/20"
                                id="req-php-icon">
                                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path
                                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
                                </svg>
                            </div>
                            <div class="req-info flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="req-name text-sm font-medium dark:text-slate-200">PHP Version</span>
                                    <span
                                        class="req-status text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/20 text-gray-600 dark:text-slate-400"
                                        id="req-php-status">Checking...</span>
                                </div>
                                <p class="req-detail text-xs text-gray-500 dark:text-slate-400 mt-1"
                                    id="req-php-detail">Minimal PHP 7.4</p>
                            </div>
                        </div>

                        <!-- PHP Extensions -->
                        <div class="req-item flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20"
                            id="req-extensions">
                            <div class="req-icon w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200 dark:bg-white/20"
                                id="req-ext-icon">
                                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path
                                        d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
                                </svg>
                            </div>
                            <div class="req-info flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="req-name text-sm font-medium dark:text-slate-200">PHP Extensions</span>
                                    <span
                                        class="req-status text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/20 text-gray-600 dark:text-slate-400"
                                        id="req-ext-status">Checking...</span>
                                </div>
                                <p class="req-detail text-xs text-gray-500 dark:text-slate-400 mt-1"
                                    id="req-ext-detail">zip, json, fileinfo, mbstring</p>
                            </div>
                        </div>

                        <!-- 7-Zip -->
                        <div class="req-item flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20"
                            id="req-7zip">
                            <div class="req-icon w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200 dark:bg-white/20"
                                id="req-7zip-icon">
                                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path
                                        d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 6h-2v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v2h2v2z" />
                                </svg>
                            </div>
                            <div class="req-info flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="req-name text-sm font-medium dark:text-slate-200">7-Zip / p7zip</span>
                                    <span
                                        class="req-status text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/20 text-gray-600 dark:text-slate-400"
                                        id="req-7zip-status">Checking...</span>
                                </div>
                                <p class="req-detail text-xs text-gray-500 dark:text-slate-400 mt-1"
                                    id="req-7zip-detail">Untuk ekstraksi .7z, .rar, .tar.gz</p>
                            </div>
                        </div>

                        <!-- File Permissions -->
                        <div class="req-item flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20"
                            id="req-perms">
                            <div class="req-icon w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200 dark:bg-white/20"
                                id="req-perms-icon">
                                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path
                                        d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                                </svg>
                            </div>
                            <div class="req-info flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="req-name text-sm font-medium dark:text-slate-200">Directory
                                        Permissions</span>
                                    <span
                                        class="req-status text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/20 text-gray-600 dark:text-slate-400"
                                        id="req-perms-status">Checking...</span>
                                </div>
                                <p class="req-detail text-xs text-gray-500 dark:text-slate-400 mt-1"
                                    id="req-perms-detail">file/, logs/, .trash/</p>
                            </div>
                        </div>

                        <!-- Server Info -->
                        <div class="req-item flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20"
                            id="req-server">
                            <div class="req-icon w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200 dark:bg-white/20"
                                id="req-server-icon">
                                <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path
                                        d="M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM20 3H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                                </svg>
                            </div>
                            <div class="req-info flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="req-name text-sm font-medium dark:text-slate-200">Server
                                        Information</span>
                                    <span
                                        class="req-status text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                        id="req-server-status">Info</span>
                                </div>
                                <p class="req-detail text-xs text-gray-500 dark:text-slate-400 mt-1"
                                    id="req-server-detail">Loading...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer
            class="settings-footer flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
            <button type="button" id="settings-save" data-action="settings-save"
                class="settings-button primary px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none transition-colors">Simpan</button>
            <button type="button" id="settings-cancel" data-action="settings-cancel"
                class="settings-button outline px-3 py-2 rounded-md text-sm bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 focus:outline-none transition-colors">Tutup</button>
        </footer>
    </div>
</div>
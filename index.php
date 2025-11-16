<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Manager</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="app-shell">
        <header class="app-header" id="debug-app-header">
            <div class="brand">
                <h1>File Manager</h1>
                <p>Pantau dan kelola direktori kerja Anda dengan cepat dan nyaman.</p>
            </div>
        </header>

        <main class="app-main">
            <section class="meta-bar">
                <div class="breadcrumbs" id="breadcrumbs"></div>
                <div class="meta-actions">
                    <!-- Settings button -->
                    <button id="btn-settings" type="button" class="action-pill" title="Pengaturan" aria-haspopup="dialog" aria-controls="settings-overlay">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8.59A3.41 3.41 0 1 0 15.41 12 3.41 3.41 0 0 0 12 8.59zm8.94 2.06l1.02-1.77-2.12-3.67-2.01.35a7.9 7.9 0 0 0-1.3-.76L16 2h-4l-.53 2.79c-.45.18-.88.42-1.3.7L7.62 5.3 5.5 8l1.02 1.77c-.05.33-.07.67-.07 1.03s.02.7.07 1.03L5.5 13l2.12 2.7 2.01-.35c.41.28.85.52 1.3.7L12 22h4l.53-2.79c.45-.18.88-.42 1.3-.7l2.01.35L21.96 14.65l-1.02-1.77c.05-.33.07-.67.07-1.03s-.02-.7-.07-1.03z"/></svg>
                        <span>Pengaturan</span>
                    </button>
                </div>
            </section>

            <section class="action-bar">
                <div class="action-group">
                    <button id="btn-up" type="button" class="action-pill">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 7-1.41 1.41L13 9.83V19h-2V9.83l-4.59 4.58L5 12z"/></svg>
                        <span>Naik Level</span>
                    </button>
                    <button id="btn-refresh" type="button" class="action-pill">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/></svg>
                        <span>Muat Ulang</span>
                    </button>
                </div>
                <div class="action-group">
                    <button id="btn-upload" type="button" class="action-pill" title="Unggah file">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                        <span>Upload</span>
                    </button>
                    <button id="btn-logs" type="button" class="action-pill" title="Log Aktivitas" data-action="logs">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                        <span>Log Aktivitas</span>
                    </button>
                    <input id="upload-input" type="file" hidden multiple>
                    <div class="split-action" role="group" aria-label="Tambah">
                        <button type="button" class="action-pill split-main" title="Tambah File" data-action="add-file">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                            <span>Tambah</span>
                        </button>
                        <button type="button" class="split-toggle" aria-haspopup="true" aria-expanded="false" title="Lihat opsi tambah">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
                        </button>
                        <div class="split-menu" role="menu" aria-hidden="true">
                            <button type="button" role="menuitem" class="split-menu-option" data-action="add-modal" data-kind="file" tabindex="-1">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v3H3V5a2 2 0 0 1 2-2zm0 18h14a2 2 0 0 0 2-2v-9H3v9a2 2 0 0 0 2 2z"/></svg>
                                <span>Tambah File</span>
                            </button>
                            <button type="button" role="menuitem" class="split-menu-option" data-action="add-modal" data-kind="folder" tabindex="-1">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v2H4zm0 4h10v2H4zm0-8h16v2H4z"/></svg>
                                <span>Tambah Folder</span>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="action-pill" disabled title="Fitur segera hadir">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14v-2H5zm7-16l5 5h-3v4h-4v-4H7z"/></svg>
                        <span>Download</span>
                    </button>
                    <button id="btn-move-selected" type="button" class="action-pill" disabled title="Pindahkan item terpilih">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z"/></svg>
                        <span>Pindah</span>
                    </button>
                    <button id="btn-delete-selected" type="button" class="action-pill danger" disabled>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        <span>Hapus</span>
                    </button>
                </div>
            </section>

            <section class="file-card">
                <div class="file-card-header">
                    <div class="alert error" id="error-banner" role="alert"></div>
                    <div class="search-field">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79l4.5 4.5a1 1 0 0 0 1.41-1.41L15.5 14zm-6 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>
                        <input id="filter-input" type="search" placeholder="Cari file atau folder" autocomplete="off">
                        <button type="button" class="clear-search" id="clear-search" aria-label="Bersihkan pencarian" hidden>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                </div>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col" class="selection-column">
                                    <input type="checkbox" id="select-all" aria-label="Pilih semua item" disabled>
                                </th>
                                <th scope="col" class="sortable" data-sort-key="name" aria-sort="none">
                                    <span class="column-header">Nama</span>
                                </th>
                                <th scope="col" class="sortable" data-sort-key="modified" aria-sort="none">
                                    <span class="column-header">Diubah</span>
                                </th>
                                <th scope="col" class="actions-column">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="file-table"></tbody>
                    </table>
                </div>

                <div class="empty-state" id="empty-state" hidden>Tidak ada file atau folder di direktori ini.</div>

                <div class="status-bar">
                    <span id="status-info">Menunggu data...</span>
                    <span id="status-filter" hidden></span>
                    <span id="status-sort" hidden></span>
                    <span id="status-time"></span>
                </div>
            </section>

            <div class="loader" id="loader-overlay">
                <div class="loader-spinner"></div>
                <span>Memuat data...</span>
            </div>
        </main>
    </div>

    <div class="preview-overlay" id="preview-overlay" aria-hidden="true" hidden>
        <div class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title">
            <header class="preview-header">
                <div class="preview-title-group">
                    <span class="preview-label">Editor</span>
                    <h2 class="preview-title" id="preview-title">Pratinjau</h2>
                </div>
                <p class="preview-meta" id="preview-meta"></p>
            </header>
            <div class="preview-body">
                <div class="preview-editor-wrapper">
                    <div class="preview-line-numbers" id="preview-line-numbers">
                        <div class="preview-line-numbers-inner" id="preview-line-numbers-inner"><span>1</span></div>
                    </div>
                    <textarea class="preview-editor" id="preview-editor" spellcheck="false"></textarea>
                </div>
            </div>
            <footer class="preview-footer">
                <div class="preview-footer-status">
                    <span class="preview-status" id="preview-status"></span>
                    <span class="preview-loader" id="preview-loader" hidden>Memuat konten...</span>
                </div>
                <div class="preview-footer-actions">
                    <a id="preview-open-raw" href="#" target="_blank" rel="noopener">Buka Asli</a>
                    <button type="button" id="preview-copy">Salin</button>
                    <button type="button" id="preview-save" disabled>Simpan</button>
                    <button type="button" id="preview-close">Tutup</button>
                </div>
            </footer>
        </div>
    </div>

    <div class="confirm-overlay" id="confirm-overlay" aria-hidden="true" hidden>
        <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div class="confirm-header">
                <div class="confirm-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M11.99 2a10 10 0 1 0 .02 20.02A10 10 0 0 0 11.99 2Zm0 3a1.1 1.1 0 1 1-.01 2.2 1.1 1.1 0 0 1 .01-2.2Zm1.75 13h-3.5v-2h1v-4h-1v-2h2.5v6h1v2Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="confirm-title-group">
                    <h2 class="confirm-title" id="confirm-title">Konfirmasi</h2>
                    <p class="confirm-message" id="confirm-message"></p>
                </div>
            </div>
            <div class="confirm-body">
                <p class="confirm-description" id="confirm-description"></p>
                <ul class="confirm-list" id="confirm-list" hidden></ul>
            </div>
            <div class="confirm-actions">
                <button type="button" class="confirm-button outline" id="confirm-cancel">Batal</button>
                <button type="button" class="confirm-button danger" id="confirm-confirm">Hapus</button>
            </div>
        </div>
    </div>

    <div class="create-overlay" id="create-overlay" aria-hidden="true" hidden>
        <div class="create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-title">
            <header class="create-header">
                <div class="create-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <div class="create-title-group">
                    <h2 class="create-title" id="create-title">Tambah Item</h2>
                    <p class="create-subtitle" id="create-subtitle"></p>
                </div>
            </header>
            <form class="create-form" id="create-form">
                <div class="form-field">
                    <label for="create-name" id="create-label">Nama</label>
                    <input type="text" id="create-name" name="create-name" autocomplete="off" required>
                    <p class="form-hint" id="create-hint"></p>
                </div>
            </form>
            <footer class="create-actions">
                <button type="button" class="create-button outline" id="create-cancel">Batal</button>
                <button type="submit" form="create-form" class="create-button primary" id="create-submit">Simpan</button>
            </footer>
        </div>
    </div>

    <div class="rename-overlay" id="rename-overlay" aria-hidden="true" hidden>
        <div class="rename-dialog" role="dialog" aria-modal="true" aria-labelledby="rename-title">
            <header class="rename-header">
                <div class="rename-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15 4.25l3.75 3.75 1.96-1.96z"/></svg>
                </div>
                <div class="rename-title-group">
                    <h2 class="rename-title" id="rename-title">Rename Item</h2>
                    <p class="rename-subtitle" id="rename-subtitle"></p>
                </div>
            </header>
            <form class="rename-form" id="rename-form">
                <div class="form-field">
                    <label for="rename-name" id="rename-label">Nama Baru</label>
                    <input type="text" id="rename-name" name="rename-name" autocomplete="off" required>
                    <p class="form-hint" id="rename-hint"></p>
                </div>
            </form>
            <footer class="rename-actions">
                <button type="button" class="rename-button outline" id="rename-cancel">Batal</button>
                <button type="submit" form="rename-form" class="rename-button primary" id="rename-submit">Rename</button>
            </footer>
        </div>
    </div>

    <div class="unsaved-overlay" id="unsaved-overlay" aria-hidden="true" hidden>
        <div class="unsaved-dialog" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
            <div class="unsaved-header">
                <div class="unsaved-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="unsaved-title-group">
                    <h2 class="unsaved-title" id="unsaved-title">Perubahan Belum Disimpan</h2>
                    <p class="unsaved-message" id="unsaved-message">Anda memiliki perubahan yang belum disimpan. Apa yang ingin Anda lakukan?</p>
                </div>
            </div>
            <div class="unsaved-actions">
                <button type="button" class="unsaved-button outline" id="unsaved-save">Simpan Perubahan</button>
                <button type="button" class="unsaved-button outline" id="unsaved-discard">Tutup Tanpa Simpan</button>
                <button type="button" class="unsaved-button primary" id="unsaved-cancel">Batal</button>
            </div>
        </div>
    </div>

    <!-- Move overlay modal -->
    <div class="move-overlay" id="move-overlay" aria-hidden="true" hidden>
        <div class="move-dialog" role="dialog" aria-modal="true" aria-labelledby="move-title">
            <header class="move-header">
                <div class="move-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z"/>
                    </svg>
                </div>
                <div class="move-title-group">
                    <h2 class="move-title" id="move-title">Pindah Item</h2>
                    <p class="move-subtitle" id="move-subtitle">Pilih folder tujuan untuk memindahkan item.</p>
                </div>
            </header>
            <div class="move-body">
                <nav class="move-breadcrumbs" id="move-breadcrumbs" aria-label="Lokasi tujuan"></nav>
                <div class="move-tools">
                    <div class="move-shortcuts">
                        <button type="button" class="move-chip" id="move-root-shortcut" title="Ke Root">Root</button>
                        <button type="button" class="move-chip" id="move-current-shortcut" title="Ke folder saat ini">Folder saat ini</button>
                    </div>
                    <div class="move-search">
                        <input type="search" id="move-search" class="move-search-input" placeholder="Cari folder di lokasi ini" autocomplete="off" />
                    </div>
                </div>
                <div class="move-recents" id="move-recents" aria-label="Tujuan terakhir"></div>
                <ul class="move-list" id="move-list" aria-label="Daftar folder tujuan"></ul>
                <p class="move-error" id="move-error" role="alert"></p>
            </div>
            <footer class="move-actions">
                <button type="button" class="move-button outline" id="move-select-here">Pilih di sini</button>
                <div class="move-actions-spacer"></div>
                <button type="button" class="move-button outline" id="move-cancel">Batal</button>
                <button type="button" class="move-button primary" id="move-confirm" disabled>Pindahkan</button>
            </footer>
        </div>
    </div>

    <div class="log-overlay" id="log-overlay" aria-hidden="true" hidden>
        <div class="log-dialog" role="dialog" aria-modal="true" aria-labelledby="log-title">
            <header class="log-header">
                <div class="log-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                </div>
                <div class="log-title-group">
                    <h2 class="log-title" id="log-title">Log Aktivitas</h2>
                    <p class="log-subtitle" id="log-subtitle">Riwayat aktivitas file manager</p>
                </div>
            </header>
            <div class="log-body">
                <!-- Minimalist Filter Bar -->
                <div class="log-filter-bar">
                    <!-- Primary Filter Row -->
                    <div class="filter-primary">
                        <div class="filter-search-main">
                            <svg viewBox="0 0 24 24" aria-hidden="true" class="search-icon">
                                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79l4.5 4.5a1 1 0 0 0 1.41-1.41L15.5 14zm-6 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
                            </svg>
                            <input type="text" id="log-path-search" class="filter-search-input" placeholder="Cari aktivitas...">
                        </div>
                        
                        <div class="filter-quick-actions">
                            <select id="log-filter" class="filter-select-compact">
                                <option value="">Semua Aktivitas</option>
                                <option value="create">Buat</option>
                                <option value="delete">Hapus</option>
                                <option value="move">Pindah</option>
                                <option value="rename">Ubah Nama</option>
                                <option value="upload">Unggah</option>
                                <option value="download">Unduh</option>
                            </select>
                            
                            <select id="log-target-type" class="filter-select-compact">
                                <option value="">Semua Tipe</option>
                                <option value="file">File</option>
                                <option value="folder">Folder</option>
                            </select>
                            
                        </div>
                    </div>
                    
                    <!-- Active Filters Display -->
                    <div id="active-filters-display" class="active-filters-minimal" style="display: none;">
                        <span class="active-filters-label">Aktif:</span>
                        <div class="active-filters-tags" id="active-filters-tags"></div>
                    </div>
                </div>
                
                <div class="log-table-wrapper">
                    <table class="log-table">
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Aksi</th>
                                <th>Target</th>
                                <th>Tipe</th>
                                <th>IP Address</th>
                            </tr>
                        </thead>
                        <tbody id="log-table-body">
                            <tr>
                                <td colspan="5" class="log-loading">Memuat data log...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="log-controls-bottom">
                    <div class="log-pagination">
                        <button id="log-prev" type="button" class="log-pagination-btn" disabled>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        </button>
                        <span id="log-page-info">Halaman 1</span>
                        <button id="log-next" type="button" class="log-pagination-btn" disabled>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                        </button>
                    </div>
                    
                    <div class="log-actions-group">
                        <div class="log-auto-refresh">
                            <label for="log-auto-refresh" class="checkbox-label">
                                <input type="checkbox" id="log-auto-refresh">
                                <span class="checkbox-custom"></span>
                                Auto-refresh (30s)
                            </label>
                        </div>
                        
                        <!-- Export Dropdown -->
                        <div class="log-export-dropdown">
                            <button type="button" id="log-export-toggle" class="log-button outline">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                                <span>Export</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true" class="dropdown-arrow"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
                            </button>
                            <div class="log-export-menu" id="log-export-menu" aria-hidden="true" hidden>
                                <button type="button" id="log-export-csv" class="log-export-option">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>
                                    <span>Export CSV</span>
                                </button>
                                <button type="button" id="log-export-json" class="log-export-option">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 4v2h2V7h-2zm0 4v2h2v-2h-2zm0 4v2h2v-2h-2z"/></svg>
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
                        <select id="log-cleanup-days" class="log-cleanup-select">
                            <option value="7">7 hari</option>
                            <option value="30" selected>30 hari</option>
                        </select>
                        <button type="button" class="log-button danger" id="log-cleanup">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            <span>Cleanup</span>
                        </button>
                    </div>
                </div>
                <div class="log-actions-right">
                    <button type="button" class="log-button outline" id="log-refresh">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/></svg>
                        <span>Refresh</span>
                    </button>
                    <button type="button" class="log-button primary" id="log-close">Tutup</button>
                </div>
            </footer>
        </div>
    </div>

    <div class="context-menu" id="context-menu" aria-hidden="true" hidden>
        <div class="context-menu-inner" role="menu">
            <button type="button" class="context-menu-item" data-action="open" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 4h4l2 2h5v2H3V6h5zm-5 4h18v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zm10 2v8h2v-8z"/></svg>
                <span>Buka</span>
            </button>
            <button type="button" class="context-menu-item" data-action="download" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 20h14v-2H5zm7-16l5 5h-3v4h-4v-4H7z"/></svg>
                <span>Download</span>
            </button>
            <button type="button" class="context-menu-item" data-action="rename" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15 4.25l3.75 3.75 1.96-1.96z"/></svg>
                <span>Rename</span>
            </button>
            <button type="button" class="context-menu-item" data-action="move" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 9h2v6H5zm12-4h2v14h-2zm-6 8h2v6h-2z"/></svg>
                <span>Pindah</span>
            </button>
            <div class="context-menu-separator" role="separator"></div>
            <button type="button" class="context-menu-item danger" data-action="delete" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 7h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zm3 2v9h2V9H9zm4 0v9h2V9h-2z"/><path fill="currentColor" d="M15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                <span>Hapus</span>
            </button>
        </div>
    </div>

    <!-- Settings overlay -->
    <div class="settings-overlay" id="settings-overlay" aria-hidden="true" hidden>
        <div class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <header class="settings-header">
                <h2 id="settings-title">Pengaturan</h2>
                <button type="button" id="settings-close" aria-label="Tutup pengaturan">✕</button>
            </header>
            <div class="settings-body">
                <div class="setting-row">
                    <label for="toggle-debug" class="toggle" aria-hidden="false">
                        <input type="checkbox" id="toggle-debug" class="toggle-input" role="switch" aria-checked="true">
                        <span class="toggle-switch" aria-hidden="true"></span>
                        <span class="toggle-label">Aktifkan debug logging (console)</span>
                    </label>
                    <p class="setting-hint">Matikan untuk menghilangkan pesan debug dari konsol.</p>
                </div>
            </div>
            <footer class="settings-footer">
                <button type="button" id="settings-save" class="primary">Simpan</button>
                <button type="button" id="settings-cancel" class="outline">Batal</button>
            </footer>
        </div>
    </div>

    <script type="module" src="assets/js/index.js"></script>
</body>
</html>


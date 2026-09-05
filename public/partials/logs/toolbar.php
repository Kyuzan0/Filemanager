<!-- Logs Toolbar -->
<div class="log-toolbar">
    <!-- Left Group: Mobile Toggle, Search, Filters -->
    <div class="toolbar-left">
        <!-- Mobile Menu Toggle -->
        <button class="btn btn-icon md:d-none toolbar-menu-toggle" id="mobile-menu-toggle" title="Menu">
            <i class="ri-menu-line text-base text-muted"></i>
        </button>
        <div class="search-box">
            <i class="ri-search-line" aria-hidden="true"></i>
            <input type="text" id="log-search" placeholder="Cari..." aria-label="Cari log">
        </div>
        <select id="filter-action" class="filter-select" aria-label="Filter aksi">
            <option value="">Semua Aksi</option>
            <option value="upload">Upload</option>
            <option value="bulk_upload">Upload Massal</option>
            <option value="download">Download</option>
            <option value="delete">Delete</option>
            <option value="trash">Hapus</option>
            <option value="bulk_trash">Hapus Massal</option>
            <option value="restore">Pulihkan</option>
            <option value="permanent_delete">Hapus Permanen</option>
            <option value="create">Create</option>
            <option value="rename">Rename</option>
            <option value="move">Move</option>
        </select>
        <select id="filter-type" class="filter-select" aria-label="Filter tipe">
            <option value="">Semua Tipe</option>
            <option value="file">File</option>
            <option value="folder">Folder</option>
        </select>
    </div>
    
    <!-- Right Group: Action Buttons -->
    <div class="toolbar-right">
        <button class="btn btn-icon" id="btn-refresh" title="Refresh">
            <i class="ri-refresh-line"></i>
        </button>
        <button class="btn" id="btn-export" title="Export CSV">
            <i class="ri-download-2-line"></i>
            <span class="btn-text">Export</span>
        </button>
        <button class="btn btn-danger" id="btn-cleanup" title="Hapus log lama">
            <i class="ri-delete-bin-line"></i>
            <span class="btn-text">Cleanup</span>
        </button>
    </div>
</div>

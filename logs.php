<?php
/**
 * Log Aktivitas Page - Compact Version
 * Halaman terpisah untuk menampilkan riwayat aktivitas file manager
 */
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <!-- Anti-flash: Set theme before anything else -->
    <script>
        (function() {
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            if (theme === 'dark') {
                document.documentElement.style.backgroundColor = '#0f172a';
                document.documentElement.style.colorScheme = 'dark';
            }
        })();
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Aktivitas - File Manager</title>
    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: ['class', '[data-theme="dark"]'],
        }
    </script>
    <!-- Modular CSS untuk sidebar -->
    <link rel="stylesheet" href="assets/css/main.css">
    <link rel="stylesheet" href="assets/css/pages/logs.css">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body class="bg-slate-50 text-slate-900 dark:bg-[#0f172a] dark:text-slate-300 overflow-hidden">
    <div class="app h-screen flex overflow-hidden" id="app">
        <?php $activePage = 'logs';
        include 'partials/sidebar.php'; ?>
        
        <div class="log-container">
        
        <!-- Toolbar -->
        <div class="log-toolbar">
            <!-- Left Group: Mobile Toggle, Search, Filters -->
            <div class="toolbar-left">
                <!-- Mobile Menu Toggle -->
                <button class="btn btn-icon md:hidden p-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex-shrink-0" id="mobile-menu-toggle" title="Menu">
                    <i class="ri-menu-line text-base text-slate-600 dark:text-gray-400"></i>
                </button>
                <div class="search-box">
                    <i class="ri-search-line"></i>
                    <input type="text" id="log-search" placeholder="Cari...">
                </div>
                <select id="filter-action" class="filter-select">
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
                <select id="filter-type" class="filter-select">
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
                <button class="btn btn-icon" id="theme-toggle" title="Toggle tema">
                    <i class="ri-moon-line"></i>
                </button>
            </div>
        </div>
        
        <!-- Table Card -->
        <div class="log-card">
            <div class="table-wrapper">
                <table class="log-table">
                    <thead>
                        <tr>
                            <th class="col-time">Waktu</th>
                            <th class="col-action">Aksi</th>
                            <th class="col-file">File / Folder</th>
                            <th class="col-browser">Browser</th>
                            <th class="col-ip">IP</th>
                        </tr>
                    </thead>
                    <tbody id="log-tbody">
                        <tr><td colspan="5"><div class="table-message"><i class="ri-loader-4-line spin"></i><span>Memuat...</span></div></td></tr>
                    </tbody>
                </table>
            </div>
            <div class="log-footer">
                <div class="footer-info" id="footer-info">-</div>
                <div class="pagination" id="pagination"></div>
            </div>
        </div>
    </div>
    </div><!-- End app wrapper -->
    
    <!-- Detail Modal -->
    <div class="modal-overlay" id="modal">
        <div class="modal-dialog" style="max-width: 800px; width: 90%;">
            <div class="modal-header">
                <h3><i class="ri-information-line"></i> Detail Aktivitas</h3>
                <button class="modal-close" id="modal-close"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-body">
                <div class="detail-row"><span class="detail-label">File</span><span class="detail-value" id="d-file">-</span></div>
                <div class="detail-row"><span class="detail-label">Aksi</span><span class="detail-value" id="d-action">-</span></div>
                <div class="detail-row"><span class="detail-label">Tipe</span><span class="detail-value" id="d-type">-</span></div>
                <div class="detail-row"><span class="detail-label">Path</span><span class="detail-value" id="d-path">-</span></div>
                <div class="detail-row"><span class="detail-label">IP</span><span class="detail-value" id="d-ip">-</span></div>
                <div class="detail-row"><span class="detail-label">Browser</span><span class="detail-value" id="d-browser">-</span></div>
                <div class="detail-row"><span class="detail-label">Waktu</span><span class="detail-value" id="d-time">-</span></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" id="modal-close-btn">Tutup</button>
            </div>
        </div>
    </div>

    <script>
    const state = { logs: [], page: 1, perPage: 15, total: 0, totalPages: 1, search: '', action: '', type: '', loading: false };
    const $ = id => document.getElementById(id);
    
    // Theme
    function initTheme() {
        const t = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        $('theme-toggle').querySelector('i').className = t === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
    }
    
    function toggleTheme() {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        $('theme-toggle').querySelector('i').className = next === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
    }
    
    // Helpers
    const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
    const formatTime = ts => { const d = new Date(ts * 1000); return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
    const formatFull = ts => { const d = new Date(ts * 1000); return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; };
    const getBrowser = ua => { if (!ua) return '-'; if (ua.includes('Edg')) return 'Edge'; if (ua.includes('Chrome')) return 'Chrome'; if (ua.includes('Firefox')) return 'Firefox'; if (ua.includes('Safari')) return 'Safari'; return 'Other'; };
    const truncate = (s, n=35) => s && s.length > n ? s.slice(0, n-2) + '...' : (s || '-');
    
    // Load logs
    async function loadLogs() {
        if (state.loading) return;
        state.loading = true;
        $('log-tbody').innerHTML = '<tr><td colspan="5"><div class="table-message"><i class="ri-loader-4-line spin"></i><span>Memuat...</span></div></td></tr>';
        
        try {
            const p = new URLSearchParams({ action: 'logs', page: state.page, limit: state.perPage });
            if (state.search) p.append('search', state.search);
            if (state.action) p.append('filterAction', state.action);
            if (state.type) p.append('filterType', state.type);
            
            const res = await fetch('api.php?' + p);
            const data = await res.json();
            
            if (!data.success) throw new Error(data.error || 'Error');
            
            state.logs = data.logs || [];
            state.totalPages = data.pagination?.totalPages || 1;
            state.total = data.pagination?.total || 0;
            
            render();
        } catch (e) {
            $('log-tbody').innerHTML = `<tr><td colspan="5"><div class="table-message"><i class="ri-error-warning-line"></i><span>${esc(e.message)}</span></div></td></tr>`;
        } finally {
            state.loading = false;
        }
    }
    
    function render() {
        const tbody = $('log-tbody');
        
        if (!state.logs.length) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="table-message"><i class="ri-file-list-3-line"></i><span>Tidak ada log</span></div></td></tr>';
            $('footer-info').textContent = '0 log';
            $('pagination').innerHTML = '';
            return;
        }
        
        tbody.innerHTML = state.logs.map((log, i) => {
            // Handle bulk action display
            let actionDisplay = log.action;
            let fileDisplay = log.filename || log.target || '';
            let tooltipText = fileDisplay;
            
            if (log.action === 'bulk_trash') {
                actionDisplay = 'Hapus Massal';
                // For bulk actions, show the summary instead of individual filename
                fileDisplay = log.filename || `${log.count || 0} item`;
                
                // Create detailed tooltip with item names - check multiple possible field names
                let itemsArray = null;
                if (log.items && Array.isArray(log.items)) {
                    itemsArray = log.items;
                } else if (log.all_items && Array.isArray(log.all_items)) {
                    itemsArray = log.all_items;
                }
                
                if (itemsArray && itemsArray.length > 0) {
                    const itemsList = itemsArray.join('\n');
                    tooltipText = `${fileDisplay}\n\nItems yang dihapus:\n${itemsList}`;
                }
            } else if (log.action === 'bulk_upload') {
                actionDisplay = 'Upload Massal';
                // For bulk upload, show summary instead of individual filename
                fileDisplay = log.filename || `${log.count || 0} file`;
                
                // Create detailed tooltip with item names - check multiple possible field names
                let itemsArray = null;
                if (log.items && Array.isArray(log.items)) {
                    itemsArray = log.items;
                } else if (log.all_items && Array.isArray(log.all_items)) {
                    itemsArray = log.all_items;
                }
                
                if (itemsArray && itemsArray.length > 0) {
                    const itemsList = itemsArray.join('\n');
                    tooltipText = `${fileDisplay}\n\nItems yang diupload:\n${itemsList}`;
                }
            }
            
            return `
            <tr data-i="${i}">
                <td class="time-cell">${formatTime(log.timestamp)}</td>
                <td><span class="action-badge ${log.action}">${actionDisplay}</span></td>
                <td class="file-cell" title="${esc(tooltipText)}">${esc(truncate(fileDisplay))}</td>
                <td class="browser-cell">${getBrowser(log.userAgent)}</td>
                <td class="ip-cell">${esc(log.ip || '-')}</td>
            </tr>
        `}).join('');
        
        // Click handlers
        tbody.querySelectorAll('tr[data-i]').forEach(tr => {
            tr.onclick = () => showDetail(state.logs[+tr.dataset.i]);
        });
        
        // Footer
        const start = (state.page - 1) * state.perPage + 1;
        const end = Math.min(state.page * state.perPage, state.total);
        $('footer-info').textContent = `${start}-${end} dari ${state.total}`;
        
        // Pagination
        let pages = '';
        pages += `<button class="page-btn" ${state.page <= 1 ? 'disabled' : ''} data-p="${state.page - 1}"><i class="ri-arrow-left-s-line"></i></button>`;
        
        const pArr = genPages();
        pArr.forEach(p => {
            if (p === '...') pages += '<span class="page-btn" style="border:none;cursor:default">...</span>';
            else pages += `<button class="page-btn ${p === state.page ? 'active' : ''}" data-p="${p}">${p}</button>`;
        });
        
        pages += `<button class="page-btn" ${state.page >= state.totalPages ? 'disabled' : ''} data-p="${state.page + 1}"><i class="ri-arrow-right-s-line"></i></button>`;
        
        $('pagination').innerHTML = pages;
        $('pagination').querySelectorAll('button[data-p]').forEach(b => {
            b.onclick = () => { const p = +b.dataset.p; if (p >= 1 && p <= state.totalPages && p !== state.page) { state.page = p; loadLogs(); } };
        });
    }
    
    function genPages() {
        const t = state.totalPages, c = state.page, arr = [];
        if (t <= 5) { for (let i = 1; i <= t; i++) arr.push(i); }
        else {
            arr.push(1);
            if (c > 3) arr.push('...');
            for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) arr.push(i);
            if (c < t - 2) arr.push('...');
            arr.push(t);
        }
        return arr;
    }
    
    function showDetail(log) {
        // Handle bulk action details
        let fileDisplay = log.filename || log.target || '-';
        let actionDisplay = log.action;
        
        if (log.action === 'bulk_trash') {
            fileDisplay = log.filename || `${log.count || 0} item`;
            actionDisplay = 'Hapus Massal';
            
            // Show additional details for bulk actions
            const details = [];
            if (log.fileCount > 0) details.push(`${log.fileCount} file`);
            if (log.folderCount > 0) details.push(`${log.folderCount} folder`);
            
            if (details.length > 0) {
                fileDisplay += ` (${details.join(', ')})`;
            }
            
            // Show list of items if available - check multiple possible field names
            let itemsArray = null;
            if (log.items && Array.isArray(log.items)) {
                itemsArray = log.items;
            } else if (log.all_items && Array.isArray(log.all_items)) {
                itemsArray = log.all_items;
            }
            
            if (itemsArray && itemsArray.length > 0) {
                // Create a more detailed display with item names - show all items in scrollable container
                const itemsList = itemsArray.join(', ');
                fileDisplay = `${log.count} items (${details.join(', ')})<br><div style="max-height: 200px; overflow-y: auto; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; margin-top: 4px; line-height: 1.5;"><small class="text-gray-500">${itemsList}</small></div>`;
            }
        } else if (log.action === 'bulk_upload') {
            fileDisplay = log.filename || `${log.count || 0} file`;
            actionDisplay = 'Upload Massal';
            
            // Show additional details for bulk upload
            const details = [];
            if (log.fileCount > 0) details.push(`${log.fileCount} file`);
            
            if (details.length > 0) {
                fileDisplay += ` (${details.join(', ')})`;
            }
            
            // Show list of items if available - check multiple possible field names
            let itemsArray = null;
            if (log.items && Array.isArray(log.items)) {
                itemsArray = log.items;
            } else if (log.all_items && Array.isArray(log.all_items)) {
                itemsArray = log.all_items;
            }
            
            if (itemsArray && itemsArray.length > 0) {
                // Create a more detailed display with item names - show all items in scrollable container
                const itemsList = itemsArray.join(', ');
                fileDisplay = `${log.count} files (${details.join(', ')})<br><div style="max-height: 200px; overflow-y: auto; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; margin-top: 4px; line-height: 1.5;"><small class="text-gray-500">${itemsList}</small></div>`;
            }
        }
        
        $('d-file').innerHTML = fileDisplay;
        $('d-action').innerHTML = `<span class="action-badge ${log.action}">${actionDisplay}</span>`;
        $('d-type').textContent = log.targetType || log.type || '-';
        $('d-path').textContent = log.path || '-';
        $('d-ip').textContent = log.ip || '-';
        $('d-browser').textContent = getBrowser(log.userAgent);
        $('d-time').textContent = formatFull(log.timestamp);
        $('modal').classList.add('active');
    }
    
    function hideModal() { $('modal').classList.remove('active'); }
    
    async function exportCSV() {
        try {
            const p = new URLSearchParams({ action: 'logs', page: 1, limit: 10000 });
            if (state.search) p.append('search', state.search);
            if (state.action) p.append('filterAction', state.action);
            
            const res = await fetch('api.php?' + p);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            
            const rows = [['Waktu', 'Aksi', 'File', 'Tipe', 'Path', 'IP', 'Browser']];
            (data.logs || []).forEach(l => {
                let fileDisplay = l.filename || l.target || '';
                let actionDisplay = l.action;
                
                if (l.action === 'bulk_trash') {
                    actionDisplay = 'Hapus Massal';
                    fileDisplay = l.filename || `${l.count || 0} item`;
                    
                    // Add item names to CSV if available - check multiple possible field names
                    let itemsArray = null;
                    if (l.items && Array.isArray(l.items)) {
                        itemsArray = l.items;
                    } else if (l.all_items && Array.isArray(l.all_items)) {
                        itemsArray = l.all_items;
                    }
                    
                    if (itemsArray && itemsArray.length > 0) {
                        const itemsList = itemsArray.join(', ');
                        fileDisplay += ` (${itemsList})`;
                    }
                } else if (l.action === 'bulk_upload') {
                    actionDisplay = 'Upload Massal';
                    fileDisplay = l.filename || `${l.count || 0} file`;
                    
                    // Add item names to CSV if available - check multiple possible field names
                    let itemsArray = null;
                    if (l.items && Array.isArray(l.items)) {
                        itemsArray = l.items;
                    } else if (l.all_items && Array.isArray(l.all_items)) {
                        itemsArray = l.all_items;
                    }
                    
                    if (itemsArray && itemsArray.length > 0) {
                        const itemsList = itemsArray.join(', ');
                        fileDisplay += ` (${itemsList})`;
                    }
                }
                
                rows.push([formatFull(l.timestamp), actionDisplay, fileDisplay, l.targetType || '', l.path || '', l.ip || '', getBrowser(l.userAgent)]);
            });
            
            const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `log-${new Date().toISOString().slice(0,10)}.csv`; a.click();
        } catch (e) { alert('Export gagal: ' + e.message); }
    }
    
    async function cleanup() {
        if (!confirm('Hapus log lebih dari 30 hari?')) return;
        try {
            const res = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cleanup_logs', days: 30 }) });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            alert(`${data.deleted || 0} log dihapus`);
            state.page = 1; loadLogs();
        } catch (e) { alert('Cleanup gagal: ' + e.message); }
    }
    
    // Debounce
    let searchTimeout;
    function onSearch(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; loadLogs(); }, 300);
    }
    
    // Init
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        loadLogs();
        
        $('log-search').addEventListener('input', onSearch);
        $('filter-action').addEventListener('change', e => { state.action = e.target.value; state.page = 1; loadLogs(); });
        $('filter-type').addEventListener('change', e => { state.type = e.target.value; state.page = 1; loadLogs(); });
        $('btn-refresh').addEventListener('click', loadLogs);
        $('btn-export').addEventListener('click', exportCSV);
        $('btn-cleanup').addEventListener('click', cleanup);
        $('theme-toggle').addEventListener('click', toggleTheme);
        $('modal-close').addEventListener('click', hideModal);
        $('modal-close-btn').addEventListener('click', hideModal);
        $('modal').addEventListener('click', e => { if (e.target === $('modal')) hideModal(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });
    });
    </script>

    <!-- Mobile sidebar fallback: ensure menu button opens sidebar if main script didn't attach -->
    <script>
    (function(){
        function bindMobileToggleFallback(){
            const toggle = document.getElementById('mobile-menu-toggle');
            if (!toggle) return;

            // Avoid double-binding
            if (toggle.__mobileFallbackBound) return;
            toggle.__mobileFallbackBound = true;

            toggle.addEventListener('click', function(e){
                // Prevent normal behavior if any
                e && e.preventDefault && e.preventDefault();

                // If sidebar script exposed the function, call it
                if (window.openSidebar && typeof window.openSidebar === 'function') {
                    try { window.openSidebar(); } catch (err) { console.debug('openSidebar error', err); }
                    return;
                }

                // Retry for a short period while the main script attaches
                let attempts = 0;
                const max = 12; // ~1.2s total
                const id = setInterval(() => {
                    attempts++;
                    if (window.openSidebar && typeof window.openSidebar === 'function') {
                        try { window.openSidebar(); } catch (err) { console.debug('openSidebar error', err); }
                        clearInterval(id);
                        return;
                    }
                    if (attempts >= max) {
                        clearInterval(id);
                        console.debug('Mobile sidebar fallback: openSidebar not available');
                    }
                }, 100);
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindMobileToggleFallback);
        } else {
            bindMobileToggleFallback();
        }
    })();
    </script>
</body>
</html>


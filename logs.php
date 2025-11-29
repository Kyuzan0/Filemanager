<?php
/**
 * Log Aktivitas Page - Compact Version
 * Halaman terpisah untuk menampilkan riwayat aktivitas file manager
 */
?>
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Aktivitas - File Manager</title>
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --bg: #f1f5f9;
            --card: #ffffff;
            --border: #e2e8f0;
            --muted: #64748b;
            --text: #1e293b;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --success: #22c55e;
            --warning: #f59e0b;
            --danger: #ef4444;
            --row-hover: #f8fafc;
        }
        
        [data-theme="dark"] {
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --muted: #94a3b8;
            --text: #f1f5f9;
            --row-hover: #1e293b;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        html, body {
            height: 100%;
            overflow: hidden;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            font-size: 13px;
        }
        
        .log-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            max-width: 1600px;
            margin: 0 auto;
            padding: 0.75rem 1rem;
        }
        
        /* Header */
        .log-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 0.75rem;
            flex-shrink: 0;
        }
        
        .log-header-left {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .back-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--card);
            color: var(--muted);
            text-decoration: none;
            transition: all 0.15s;
        }
        
        .back-btn:hover {
            color: var(--accent);
            border-color: var(--accent);
        }
        
        .log-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text);
        }
        
        .log-title i {
            color: var(--accent);
            margin-right: 0.375rem;
        }
        
        .log-subtitle {
            font-size: 0.75rem;
            color: var(--muted);
        }
        
        .header-actions {
            display: flex;
            gap: 0.375rem;
        }
        
        /* Toolbar */
        .log-toolbar {
            display: flex;
            gap: 0.5rem;
            padding-bottom: 0.75rem;
            flex-shrink: 0;
            flex-wrap: wrap;
        }
        
        .search-box {
            position: relative;
            flex: 1;
            min-width: 180px;
            max-width: 280px;
        }
        
        .search-box i {
            position: absolute;
            left: 0.625rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--muted);
            font-size: 14px;
        }
        
        .search-box input {
            width: 100%;
            height: 32px;
            padding: 0 0.625rem 0 2rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--card);
            color: var(--text);
            font-size: 12px;
            outline: none;
        }
        
        .search-box input:focus {
            border-color: var(--accent);
        }
        
        .filter-select {
            height: 32px;
            padding: 0 1.75rem 0 0.625rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--card);
            color: var(--text);
            font-size: 12px;
            cursor: pointer;
            outline: none;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.5rem center;
        }
        
        .toolbar-spacer { flex: 1; }
        
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            height: 32px;
            padding: 0 0.75rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--card);
            color: var(--text);
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
            white-space: nowrap;
        }
        
        .btn:hover { background: var(--bg); }
        .btn i { font-size: 14px; }
        
        .btn-icon {
            width: 32px;
            padding: 0;
        }
        
        .btn-danger {
            color: var(--danger);
            border-color: rgba(239, 68, 68, 0.3);
        }
        .btn-danger:hover {
            background: rgba(239, 68, 68, 0.1);
        }
        
        /* Table Card */
        .log-card {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            min-height: 0;
        }
        
        .table-wrapper {
            flex: 1;
            overflow: auto;
        }
        
        .log-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .log-table th {
            position: sticky;
            top: 0;
            text-align: left;
            padding: 0.625rem 0.75rem;
            background: var(--bg);
            color: var(--muted);
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            border-bottom: 1px solid var(--border);
            white-space: nowrap;
            z-index: 1;
        }
        
        .log-table td {
            padding: 0.5rem 0.75rem;
            border-bottom: 1px solid var(--border);
            color: var(--text);
            vertical-align: middle;
        }
        
        .log-table tbody tr {
            cursor: pointer;
            transition: background-color 0.15s ease;
        }
        
        .log-table tbody tr:hover {
            background: var(--row-hover);
        }
        
        .log-table tbody tr:hover td {
            color: var(--accent);
        }
        
        .log-table tbody tr:hover .time-cell {
            color: var(--text);
        }
        
        .log-table tbody tr:hover .ip-cell {
            color: var(--text);
        }
        
        .log-table tbody tr:active {
            background: var(--border);
        }
        
        .log-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        /* Column widths */
        .col-time { width: 110px; }
        .col-action { width: 90px; }
        .col-browser { width: 80px; }
        .col-ip { width: 100px; }
        
        .time-cell {
            color: var(--muted);
            font-size: 11px;
            white-space: nowrap;
        }
        
        .action-badge {
            display: inline-block;
            padding: 0.125rem 0.5rem;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .action-badge.upload { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
        .action-badge.download { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
        .action-badge.delete { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
        .action-badge.create { background: rgba(168, 85, 247, 0.15); color: #9333ea; }
        .action-badge.rename { background: rgba(245, 158, 11, 0.15); color: #d97706; }
        .action-badge.move { background: rgba(6, 182, 212, 0.15); color: #0891b2; }
        .action-badge.view { background: rgba(100, 116, 139, 0.15); color: #475569; }
        
        [data-theme="dark"] .action-badge.upload { background: rgba(34, 197, 94, 0.25); color: #4ade80; }
        [data-theme="dark"] .action-badge.download { background: rgba(59, 130, 246, 0.25); color: #60a5fa; }
        [data-theme="dark"] .action-badge.delete { background: rgba(239, 68, 68, 0.25); color: #f87171; }
        [data-theme="dark"] .action-badge.create { background: rgba(168, 85, 247, 0.25); color: #c084fc; }
        [data-theme="dark"] .action-badge.rename { background: rgba(245, 158, 11, 0.25); color: #fbbf24; }
        [data-theme="dark"] .action-badge.move { background: rgba(6, 182, 212, 0.25); color: #22d3ee; }
        [data-theme="dark"] .action-badge.view { background: rgba(100, 116, 139, 0.25); color: #94a3b8; }
        
        .file-cell {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .browser-cell {
            color: var(--muted);
            font-size: 11px;
        }
        
        .ip-cell {
            color: var(--muted);
            font-size: 11px;
            font-family: monospace;
        }
        
        /* Footer */
        .log-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem 0.75rem;
            border-top: 1px solid var(--border);
            background: var(--card);
            flex-shrink: 0;
        }
        
        .footer-info {
            color: var(--muted);
            font-size: 11px;
        }
        
        .pagination {
            display: flex;
            gap: 0.25rem;
        }
        
        .page-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
            height: 28px;
            padding: 0 0.375rem;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--card);
            color: var(--text);
            font-size: 11px;
            cursor: pointer;
            transition: all 0.1s;
        }
        
        .page-btn:hover:not(:disabled) { background: var(--bg); }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .page-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
        
        /* Empty & Loading */
        .table-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: var(--muted);
            text-align: center;
        }
        
        .table-message i {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            opacity: 0.5;
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        
        /* Detail Modal */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 100;
            padding: 1rem;
            backdrop-filter: blur(2px);
        }
        
        .modal-overlay.active { display: flex; }
        
        .modal-dialog {
            background: var(--card);
            border-radius: 10px;
            width: 100%;
            max-width: 380px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            animation: modalIn 0.15s ease-out;
        }
        
        @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(-10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .modal-header {
            padding: 0.875rem 1rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .modal-header h3 {
            font-size: 0.9375rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.375rem;
        }
        
        .modal-header h3 i { color: var(--accent); }
        
        .modal-close {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
            color: var(--muted);
            cursor: pointer;
            border-radius: 4px;
        }
        
        .modal-close:hover { background: var(--bg); color: var(--text); }
        
        .modal-body { padding: 0.75rem 1rem; }
        
        .detail-row {
            display: flex;
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--border);
            font-size: 12px;
        }
        
        .detail-row:last-child { border-bottom: none; }
        
        .detail-label {
            width: 80px;
            flex-shrink: 0;
            color: var(--muted);
        }
        
        .detail-value {
            flex: 1;
            color: var(--text);
            word-break: break-word;
        }
        
        .modal-footer {
            padding: 0.75rem 1rem;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: flex-end;
        }
        
        .btn-primary {
            background: var(--accent);
            border-color: var(--accent);
            color: white;
        }
        .btn-primary:hover { background: var(--accent-hover); }
        
        /* Responsive */
        @media (max-width: 768px) {
            .log-container { padding: 0.5rem; }
            .log-title { font-size: 1rem; }
            .log-subtitle { display: none; }
            .search-box { max-width: none; }
            .btn-text { display: none; }
            .file-cell { max-width: 180px; }
        }
        
        @media (max-width: 480px) {
            .col-time { width: 80px; }
            .time-cell { font-size: 10px; }
            .file-cell { max-width: 120px; }
        }
    </style>
</head>
<body>
    <div class="log-container">
        <!-- Header -->
        <div class="log-header">
            <div class="log-header-left">
                <a href="index.php" class="back-btn" title="Kembali">
                    <i class="ri-arrow-left-line"></i>
                </a>
                <div>
                    <div class="log-title"><i class="ri-history-line"></i>Log Aktivitas</div>
                    <div class="log-subtitle">Riwayat aktivitas file manager</div>
                </div>
            </div>
            <div class="header-actions">
                <button class="btn btn-icon" id="theme-toggle" title="Toggle tema">
                    <i class="ri-moon-line"></i>
                </button>
            </div>
        </div>
        
        <!-- Toolbar -->
        <div class="log-toolbar">
            <div class="search-box">
                <i class="ri-search-line"></i>
                <input type="text" id="log-search" placeholder="Cari...">
            </div>
            <select id="filter-action" class="filter-select">
                <option value="">Semua Aksi</option>
                <option value="upload">Upload</option>
                <option value="download">Download</option>
                <option value="delete">Delete</option>
                <option value="create">Create</option>
                <option value="rename">Rename</option>
                <option value="move">Move</option>
            </select>
            <select id="filter-type" class="filter-select">
                <option value="">Semua Tipe</option>
                <option value="file">File</option>
                <option value="folder">Folder</option>
            </select>
            <div class="toolbar-spacer"></div>
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
    
    <!-- Detail Modal -->
    <div class="modal-overlay" id="modal">
        <div class="modal-dialog">
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
    const state = { logs: [], page: 1, perPage: 20, total: 0, totalPages: 1, search: '', action: '', type: '', loading: false };
    const $ = id => document.getElementById(id);
    
    // Theme
    function initTheme() {
        const t = localStorage.getItem('theme') || 'light';
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
        
        tbody.innerHTML = state.logs.map((log, i) => `
            <tr data-i="${i}">
                <td class="time-cell">${formatTime(log.timestamp)}</td>
                <td><span class="action-badge ${log.action}">${log.action}</span></td>
                <td class="file-cell" title="${esc(log.filename || log.target || '')}">${esc(truncate(log.filename || log.target))}</td>
                <td class="browser-cell">${getBrowser(log.userAgent)}</td>
                <td class="ip-cell">${esc(log.ip || '-')}</td>
            </tr>
        `).join('');
        
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
        $('d-file').textContent = log.filename || log.target || '-';
        $('d-action').innerHTML = `<span class="action-badge ${log.action}">${log.action}</span>`;
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
            (data.logs || []).forEach(l => rows.push([formatFull(l.timestamp), l.action, l.filename || l.target || '', l.targetType || '', l.path || '', l.ip || '', getBrowser(l.userAgent)]));
            
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
</body>
</html>

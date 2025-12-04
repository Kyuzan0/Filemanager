/**
 * Logs Page Handler
 * Mengelola semua fungsi untuk halaman log aktivitas
 */

const LogsHandler = (function() {
    'use strict';

    // State
    const state = {
        logs: [],
        page: 1,
        perPage: 15,
        total: 0,
        totalPages: 1,
        search: '',
        action: '',
        type: '',
        loading: false
    };

    // DOM helper
    const $ = id => document.getElementById(id);

    // ===== THEME FUNCTIONS =====
    function initTheme() {
        const t = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        const icon = $('theme-toggle')?.querySelector('i');
        if (icon) {
            icon.className = t === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
        }
    }

    function toggleTheme() {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        const icon = $('theme-toggle')?.querySelector('i');
        if (icon) {
            icon.className = next === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
        }
    }

    // ===== HELPER FUNCTIONS =====
    const esc = s => {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    };

    const formatTime = ts => {
        const d = new Date(ts * 1000);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const formatFull = ts => {
        const d = new Date(ts * 1000);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    };

    const getBrowser = ua => {
        if (!ua) return '-';
        if (ua.includes('Edg')) return 'Edge';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        return 'Other';
    };

    const truncate = (s, n = 35) => s && s.length > n ? s.slice(0, n - 2) + '...' : (s || '-');

    // ===== DATA LOADING =====
    async function loadLogs() {
        if (state.loading) return;
        state.loading = true;

        const tbody = $('log-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="table-message"><i class="ri-loader-4-line spin"></i><span>Memuat...</span></div></td></tr>';
        }

        try {
            const p = new URLSearchParams({
                action: 'logs',
                page: state.page,
                limit: state.perPage
            });
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
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5"><div class="table-message"><i class="ri-error-warning-line"></i><span>${esc(e.message)}</span></div></td></tr>`;
            }
        } finally {
            state.loading = false;
        }
    }

    // ===== RENDERING =====
    function render() {
        const tbody = $('log-tbody');
        if (!tbody) return;

        if (!state.logs.length) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="table-message"><i class="ri-file-list-3-line"></i><span>Tidak ada log</span></div></td></tr>';
            const footerInfo = $('footer-info');
            if (footerInfo) footerInfo.textContent = '0 log';
            const pagination = $('pagination');
            if (pagination) pagination.innerHTML = '';
            return;
        }

        tbody.innerHTML = state.logs.map((log, i) => {
            // Handle bulk action display
            let actionDisplay = log.action;
            let fileDisplay = log.filename || log.target || '';
            let tooltipText = fileDisplay;

            if (log.action === 'bulk_trash') {
                actionDisplay = 'Hapus Massal';
                fileDisplay = log.filename || `${log.count || 0} item`;

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
                fileDisplay = log.filename || `${log.count || 0} file`;

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
        `;
        }).join('');

        // Click handlers
        tbody.querySelectorAll('tr[data-i]').forEach(tr => {
            tr.onclick = () => showDetail(state.logs[+tr.dataset.i]);
        });

        // Footer
        const start = (state.page - 1) * state.perPage + 1;
        const end = Math.min(state.page * state.perPage, state.total);
        const footerInfo = $('footer-info');
        if (footerInfo) footerInfo.textContent = `${start}-${end} dari ${state.total}`;

        // Pagination
        renderPagination();
    }

    function genPages() {
        const t = state.totalPages;
        const c = state.page;
        const arr = [];

        if (t <= 5) {
            for (let i = 1; i <= t; i++) arr.push(i);
        } else {
            arr.push(1);
            if (c > 3) arr.push('...');
            for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) arr.push(i);
            if (c < t - 2) arr.push('...');
            arr.push(t);
        }
        return arr;
    }

    function renderPagination() {
        const paginationEl = $('pagination');
        if (!paginationEl) return;

        let pages = '';
        pages += `<button class="page-btn" ${state.page <= 1 ? 'disabled' : ''} data-p="${state.page - 1}"><i class="ri-arrow-left-s-line"></i></button>`;

        const pArr = genPages();
        pArr.forEach(p => {
            if (p === '...') {
                pages += '<span class="page-btn" style="border:none;cursor:default">...</span>';
            } else {
                pages += `<button class="page-btn ${p === state.page ? 'active' : ''}" data-p="${p}">${p}</button>`;
            }
        });

        pages += `<button class="page-btn" ${state.page >= state.totalPages ? 'disabled' : ''} data-p="${state.page + 1}"><i class="ri-arrow-right-s-line"></i></button>`;

        paginationEl.innerHTML = pages;
        paginationEl.querySelectorAll('button[data-p]').forEach(b => {
            b.onclick = () => {
                const p = +b.dataset.p;
                if (p >= 1 && p <= state.totalPages && p !== state.page) {
                    state.page = p;
                    loadLogs();
                }
            };
        });
    }

    // ===== DETAIL MODAL =====
    function showDetail(log) {
        let fileDisplay = log.filename || log.target || '-';
        let actionDisplay = log.action;

        if (log.action === 'bulk_trash') {
            fileDisplay = log.filename || `${log.count || 0} item`;
            actionDisplay = 'Hapus Massal';

            const details = [];
            if (log.fileCount > 0) details.push(`${log.fileCount} file`);
            if (log.folderCount > 0) details.push(`${log.folderCount} folder`);

            if (details.length > 0) {
                fileDisplay += ` (${details.join(', ')})`;
            }

            let itemsArray = null;
            if (log.items && Array.isArray(log.items)) {
                itemsArray = log.items;
            } else if (log.all_items && Array.isArray(log.all_items)) {
                itemsArray = log.all_items;
            }

            if (itemsArray && itemsArray.length > 0) {
                const itemsList = itemsArray.join(', ');
                fileDisplay = `${log.count} items (${details.join(', ')})<br><div style="max-height: 200px; overflow-y: auto; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; margin-top: 4px; line-height: 1.5;"><small class="text-gray-500">${itemsList}</small></div>`;
            }
        } else if (log.action === 'bulk_upload') {
            fileDisplay = log.filename || `${log.count || 0} file`;
            actionDisplay = 'Upload Massal';

            const details = [];
            if (log.fileCount > 0) details.push(`${log.fileCount} file`);

            if (details.length > 0) {
                fileDisplay += ` (${details.join(', ')})`;
            }

            let itemsArray = null;
            if (log.items && Array.isArray(log.items)) {
                itemsArray = log.items;
            } else if (log.all_items && Array.isArray(log.all_items)) {
                itemsArray = log.all_items;
            }

            if (itemsArray && itemsArray.length > 0) {
                const itemsList = itemsArray.join(', ');
                fileDisplay = `${log.count} files (${details.join(', ')})<br><div style="max-height: 200px; overflow-y: auto; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; margin-top: 4px; line-height: 1.5;"><small class="text-gray-500">${itemsList}</small></div>`;
            }
        }

        const dFile = $('d-file');
        if (dFile) dFile.innerHTML = fileDisplay;

        const dAction = $('d-action');
        if (dAction) dAction.innerHTML = `<span class="action-badge ${log.action}">${actionDisplay}</span>`;

        const dType = $('d-type');
        if (dType) dType.textContent = log.targetType || log.type || '-';

        const dPath = $('d-path');
        if (dPath) dPath.textContent = log.path || '-';

        const dIp = $('d-ip');
        if (dIp) dIp.textContent = log.ip || '-';

        const dBrowser = $('d-browser');
        if (dBrowser) dBrowser.textContent = getBrowser(log.userAgent);

        const dTime = $('d-time');
        if (dTime) dTime.textContent = formatFull(log.timestamp);

        const modal = $('modal');
        if (modal) modal.classList.add('active');
    }

    function hideModal() {
        const modal = $('modal');
        if (modal) modal.classList.remove('active');
    }

    // ===== EXPORT & CLEANUP =====
    async function exportCSV() {
        try {
            const p = new URLSearchParams({ action: 'logs-export', format: 'csv' });
            if (state.search) p.append('search', state.search);
            if (state.action) p.append('filterAction', state.action);
            if (state.type) p.append('filterType', state.type);

            const url = 'api.php?' + p;
            const a = document.createElement('a');
            a.href = url;
            a.download = `log-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
        } catch (e) {
            alert('Export gagal: ' + e.message);
        }
    }

    async function cleanup() {
        if (!confirm('Hapus log lebih dari 30 hari?')) return;
        try {
            const res = await fetch('api.php?action=logs-cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 30 })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            alert(`${data.deleted || 0} log dihapus`);
            state.page = 1;
            loadLogs();
        } catch (e) {
            alert('Cleanup gagal: ' + e.message);
        }
    }

    // ===== SEARCH =====
    let searchTimeout;
    function onSearch(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page = 1;
            loadLogs();
        }, 300);
    }

    // ===== MOBILE SIDEBAR =====
    function bindMobileToggle() {
        const toggle = $('mobile-menu-toggle');
        if (!toggle) return;
        if (toggle.__mobileFallbackBound) return;
        toggle.__mobileFallbackBound = true;

        toggle.addEventListener('click', function(e) {
            e && e.preventDefault && e.preventDefault();

            if (window.openSidebar && typeof window.openSidebar === 'function') {
                try { window.openSidebar(); } catch (err) { console.debug('openSidebar error', err); }
                return;
            }

            let attempts = 0;
            const max = 12;
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

    // ===== INITIALIZATION =====
    function init() {
        initTheme();
        loadLogs();

        // Event listeners
        const logSearch = $('log-search');
        if (logSearch) logSearch.addEventListener('input', onSearch);

        const filterAction = $('filter-action');
        if (filterAction) {
            filterAction.addEventListener('change', e => {
                state.action = e.target.value;
                state.page = 1;
                loadLogs();
            });
        }

        const filterType = $('filter-type');
        if (filterType) {
            filterType.addEventListener('change', e => {
                state.type = e.target.value;
                state.page = 1;
                loadLogs();
            });
        }

        const btnRefresh = $('btn-refresh');
        if (btnRefresh) btnRefresh.addEventListener('click', loadLogs);

        const btnExport = $('btn-export');
        if (btnExport) btnExport.addEventListener('click', exportCSV);

        const btnCleanup = $('btn-cleanup');
        if (btnCleanup) btnCleanup.addEventListener('click', cleanup);

        const themeToggle = $('theme-toggle');
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

        const modalClose = $('modal-close');
        if (modalClose) modalClose.addEventListener('click', hideModal);

        const modalCloseBtn = $('modal-close-btn');
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', hideModal);

        const modal = $('modal');
        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === modal) hideModal();
            });
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') hideModal();
        });

        // Mobile sidebar
        bindMobileToggle();
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        loadLogs,
        toggleTheme,
        exportCSV,
        cleanup,
        hideModal
    };
})();

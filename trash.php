<?php
/**
 * Trash Page - Recycle Bin
 * Halaman untuk menampilkan dan mengelola file/folder yang dihapus
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
    <title>Trash - File Manager</title>
    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: ['class', '[data-theme="dark"]'],
        }
    </script>
    <!-- Modular CSS -->
    <link rel="stylesheet" href="assets/css/main.css">
    <link rel="stylesheet" href="assets/css/pages/logs.css">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        .trash-actions {
            display: flex;
            gap: 0.5rem;
        }
        .action-btn {
            padding: 0.25rem 0.5rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }
        .action-btn.restore {
            background: #10b981;
            color: white;
        }
        .action-btn.restore:hover {
            background: #059669;
        }
        .action-btn.delete {
            background: #ef4444;
            color: white;
        }
        .action-btn.delete:hover {
            background: #dc2626;
        }
        .trash-empty {
            text-align: center;
            padding: 3rem 1rem;
            color: #94a3b8;
        }
        .trash-empty i {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 dark:bg-[#0f172a] dark:text-slate-300 overflow-hidden">
    <div class="app h-screen flex overflow-hidden" id="app">
        <?php $activePage = 'trash';
        include 'partials/sidebar.php'; ?>
        
        <div class="log-container">
        
        <!-- Toolbar -->
        <div class="log-toolbar">
            <!-- Left Group: Mobile Toggle, Title -->
            <div class="toolbar-left">
                <!-- Mobile Menu Toggle -->
                <button class="btn btn-icon md:hidden p-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex-shrink-0" id="mobile-menu-toggle" title="Menu">
                    <i class="ri-menu-line text-base text-slate-600 dark:text-gray-400"></i>
                </button>
                <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    <i class="ri-delete-bin-line"></i> Trash
                </h2>
            </div>
            
            <!-- Right Group: Action Buttons -->
            <div class="toolbar-right">
                <button class="btn btn-icon" id="btn-refresh" title="Refresh">
                    <i class="ri-refresh-line"></i>
                </button>
                <button class="btn btn-warning" id="btn-cleanup" title="Hapus item lama (>30 hari)">
                    <i class="ri-time-line"></i>
                    <span class="btn-text">Cleanup Old</span>
                </button>
                <button class="btn btn-danger" id="btn-empty" title="Kosongkan semua trash">
                    <i class="ri-delete-bin-2-line"></i>
                    <span class="btn-text">Empty Trash</span>
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
                            <th class="col-file">Item</th>
                            <th class="col-action">Type</th>
                            <th class="col-time">Deleted</th>
                            <th class="col-file">Original Path</th>
                            <th style="width: 140px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="trash-tbody">
                        <tr><td colspan="5"><div class="table-message"><i class="ri-loader-4-line spin"></i><span>Memuat...</span></div></td></tr>
                    </tbody>
                </table>
            </div>
            <div class="log-footer">
                <div class="footer-info" id="footer-info">-</div>
            </div>
        </div>
    </div>
    </div><!-- End app wrapper -->
    
    <!-- Detail Modal -->
    <div class="modal-overlay" id="detail-modal">
        <div class="modal-dialog" style="max-width: 500px;">
            <div class="modal-header">
                <h3 id="detail-modal-title"><i class="ri-information-line"></i> Detail Item</h3>
                <button class="modal-close" id="detail-modal-close"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-body">
                <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                    <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Nama</span>
                    <span class="detail-value" id="detail-name" style="flex: 1; font-weight: 500;">-</span>
                </div>
                <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                    <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Tipe</span>
                    <span class="detail-value" id="detail-type" style="flex: 1;">-</span>
                </div>
                <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                    <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Path Asli</span>
                    <span class="detail-value" id="detail-path" style="flex: 1; word-break: break-all;">-</span>
                </div>
                <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                    <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Ukuran</span>
                    <span class="detail-value" id="detail-size" style="flex: 1;">-</span>
                </div>
                <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                    <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Dihapus</span>
                    <span class="detail-value" id="detail-deleted" style="flex: 1;">-</span>
                </div>
                <div class="detail-row" style="display: flex; margin-bottom: 0;">
                    <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Dihapus Oleh</span>
                    <span class="detail-value" id="detail-by" style="flex: 1;">-</span>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="btn" id="detail-cancel" style="background: #475569; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;">Tutup</button>
                <button class="btn" id="detail-restore" style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;"><i class="ri-arrow-go-back-line"></i> Restore</button>
                <button class="btn" id="detail-delete" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;"><i class="ri-delete-bin-line"></i> Hapus Permanen</button>
            </div>
        </div>
    </div>
    
    <!-- Confirm Modal -->
    <div class="modal-overlay" id="modal">
        <div class="modal-dialog">
            <div class="modal-header">
                <h3 id="modal-title"><i class="ri-information-line"></i> Konfirmasi</h3>
                <button class="modal-close" id="modal-close"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-body">
                <p id="modal-message">-</p>
            </div>
            <div class="modal-footer">
                <button class="btn" id="modal-cancel">Batal</button>
                <button class="btn btn-danger" id="modal-confirm" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;">Hapus</button>
            </div>
        </div>
    </div>

    <script>
    const state = { items: [], loading: false, confirmCallback: null, selectedItem: null };
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
    const formatTime = ts => {
        const d = new Date(ts * 1000);
        return `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };
    const truncate = (s, n=40) => s && s.length > n ? s.slice(0, n-2) + '...' : (s || '-');
    const formatSize = bytes => {
        if (!bytes || bytes === 0) return '-';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    };
    
    // Load trash items
    async function loadTrash() {
        if (state.loading) return;
        state.loading = true;
        $('trash-tbody').innerHTML = '<tr><td colspan="5"><div class="table-message"><i class="ri-loader-4-line spin"></i><span>Memuat...</span></div></td></tr>';
        
        try {
            const res = await fetch('api.php?action=trash-list');
            const data = await res.json();
            
            if (!data.success) throw new Error(data.error || 'Error loading trash');
            
            state.items = data.items || [];
            render();
        } catch (e) {
            $('trash-tbody').innerHTML = `<tr><td colspan="5"><div class="table-message"><i class="ri-error-warning-line"></i><span>${esc(e.message)}</span></div></td></tr>`;
        } finally {
            state.loading = false;
        }
    }
    
    function render() {
        const tbody = $('trash-tbody');
        
        if (!state.items.length) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="trash-empty"><i class="ri-delete-bin-line"></i><p>Trash kosong</p></div></td></tr>';
            $('footer-info').textContent = '0 items';
            return;
        }
        
        tbody.innerHTML = state.items.map((item, index) => `
            <tr data-index="${index}" style="cursor: pointer;">
                <td class="file-cell" title="${esc(item.originalName || '')}">
                    <i class="ri-${item.type === 'folder' ? 'folder' : 'file'}-line"></i>
                    ${esc(truncate(item.originalName))}
                </td>
                <td><span class="action-badge ${item.type}">${item.type}</span></td>
                <td class="time-cell">${formatTime(item.deletedAt)}</td>
                <td class="file-cell" title="${esc(item.originalPath || '')}">${esc(truncate(item.originalPath))}</td>
                <td>
                    <div class="trash-actions">
                        <button class="action-btn restore" data-id="${esc(item.id)}" title="Restore">
                            <i class="ri-arrow-go-back-line"></i> Restore
                        </button>
                        <button class="action-btn delete" data-id="${esc(item.id)}" title="Delete permanently">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Attach event listeners for row clicks (open detail modal)
        tbody.querySelectorAll('tr[data-index]').forEach(row => {
            row.onclick = (e) => {
                // Don't open detail modal if clicking on action buttons
                if (e.target.closest('.action-btn')) return;
                const index = parseInt(row.dataset.index);
                showDetailModal(state.items[index]);
            };
        });
        
        // Attach event listeners for action buttons
        tbody.querySelectorAll('.action-btn.restore').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                restoreItem(btn.dataset.id);
            };
        });
        
        tbody.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                deleteItemPermanently(btn.dataset.id);
            };
        });
        
        $('footer-info').textContent = `${state.items.length} item${state.items.length !== 1 ? 's' : ''}`;
    }
    
    // Restore item
    async function restoreItem(id) {
        try {
            const res = await fetch('api.php?action=trash-restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            
            if (!data.success) throw new Error(data.error || 'Restore failed');
            
            showToast('Item berhasil direstore', 'success');
            loadTrash();
        } catch (e) {
            showToast('Restore gagal: ' + e.message, 'error');
        }
    }
    
    // Delete permanently
    function deleteItemPermanently(id) {
        const item = state.items.find(i => i.id === id);
        showConfirm(
            'Hapus Permanen',
            `Yakin ingin menghapus "${item?.originalName || 'item ini'}" secara permanen? Aksi ini tidak dapat dibatalkan.`,
            async () => {
                try {
                    const res = await fetch('api.php?action=trash-delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    const data = await res.json();
                    
                    if (!data.success) throw new Error(data.error || 'Delete failed');
                    
                    showToast('Item berhasil dihapus permanen', 'success');
                    loadTrash();
                } catch (e) {
                    showToast('Hapus gagal: ' + e.message, 'error');
                }
            }
        );
    }
    
    // Empty trash
    function emptyTrash() {
        showConfirm(
            'Kosongkan Trash',
            `Yakin ingin menghapus semua ${state.items.length} item di trash secara permanen? Aksi ini tidak dapat dibatalkan.`,
            async () => {
                try {
                    const res = await fetch('api.php?action=trash-empty', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    
                    if (!data.success) throw new Error(data.error || 'Empty trash failed');
                    
                    showToast(`${data.count || 0} item dihapus permanen`, 'success');
                    loadTrash();
                } catch (e) {
                    showToast('Empty trash gagal: ' + e.message, 'error');
                }
            }
        );
    }
    
    // Cleanup old items
    function cleanupOld() {
        showConfirm(
            'Cleanup Item Lama',
            'Hapus semua item yang sudah berada di trash lebih dari 30 hari?',
            async () => {
                try {
                    const res = await fetch('api.php?action=trash-cleanup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ days: 30 })
                    });
                    const data = await res.json();
                    
                    if (!data.success) throw new Error(data.error || 'Cleanup failed');
                    
                    showToast(`${data.count || 0} item dihapus`, 'success');
                    loadTrash();
                } catch (e) {
                    showToast('Cleanup gagal: ' + e.message, 'error');
                }
            }
        );
    }
    
    // Detail Modal helpers
    function showDetailModal(item) {
        state.selectedItem = item;
        $('detail-modal-title').innerHTML = `<i class="ri-${item.type === 'folder' ? 'folder' : 'file'}-line"></i> Detail Item`;
        $('detail-name').textContent = item.originalName || '-';
        $('detail-type').innerHTML = `<span class="action-badge ${item.type}">${item.type}</span>`;
        $('detail-path').textContent = item.originalPath || '-';
        $('detail-size').textContent = item.type === 'folder' ? '-' : formatSize(item.size);
        $('detail-deleted').textContent = formatTime(item.deletedAt);
        $('detail-by').textContent = item.deletedBy || '-';
        $('detail-modal').classList.add('active');
    }
    
    function hideDetailModal() {
        $('detail-modal').classList.remove('active');
        state.selectedItem = null;
    }
    
    function handleDetailRestore() {
        if (state.selectedItem) {
            hideDetailModal();
            restoreItem(state.selectedItem.id);
        }
    }
    
    function handleDetailDelete() {
        if (state.selectedItem) {
            const item = state.selectedItem;
            hideDetailModal();
            deleteItemPermanently(item.id);
        }
    }
    
    // Confirm Modal helpers
    function showConfirm(title, message, callback) {
        $('modal-title').innerHTML = `<i class="ri-question-line"></i> ${esc(title)}`;
        $('modal-message').textContent = message;
        state.confirmCallback = callback;
        $('modal').classList.add('active');
    }
    
    function hideModal() {
        $('modal').classList.remove('active');
        state.confirmCallback = null;
    }
    
    function handleConfirm() {
        if (state.confirmCallback) {
            state.confirmCallback();
        }
        hideModal();
    }
    
    // Toast notification
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = 'position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: 0.5rem; color: white; z-index: 9999; animation: slideIn 0.3s ease;';
        
        if (type === 'success') toast.style.background = '#10b981';
        else if (type === 'error') toast.style.background = '#ef4444';
        else toast.style.background = '#3b82f6';
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Init
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        loadTrash();
        
        // Toolbar buttons
        $('btn-refresh').addEventListener('click', loadTrash);
        $('btn-empty').addEventListener('click', emptyTrash);
        $('btn-cleanup').addEventListener('click', cleanupOld);
        $('theme-toggle').addEventListener('click', toggleTheme);
        
        // Detail modal
        $('detail-modal-close').addEventListener('click', hideDetailModal);
        $('detail-cancel').addEventListener('click', hideDetailModal);
        $('detail-restore').addEventListener('click', handleDetailRestore);
        $('detail-delete').addEventListener('click', handleDetailDelete);
        $('detail-modal').addEventListener('click', e => { if (e.target === $('detail-modal')) hideDetailModal(); });
        
        // Confirm modal
        $('modal-close').addEventListener('click', hideModal);
        $('modal-cancel').addEventListener('click', hideModal);
        $('modal-confirm').addEventListener('click', handleConfirm);
        $('modal').addEventListener('click', e => { if (e.target === $('modal')) hideModal(); });
        
        // Escape key closes modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                hideDetailModal();
                hideModal();
            }
        });
    });
    </script>

    <!-- Mobile sidebar fallback -->
    <script>
    (function(){
        function bindMobileToggleFallback(){
            const toggle = document.getElementById('mobile-menu-toggle');
            if (!toggle) return;

            if (toggle.__mobileFallbackBound) return;
            toggle.__mobileFallbackBound = true;

            toggle.addEventListener('click', function(e){
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

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindMobileToggleFallback);
        } else {
            bindMobileToggleFallback();
        }
    })();
    </script>
    
    <style>
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    </style>
</body>
</html>
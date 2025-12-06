/**
 * Trash Page Handler
 * Mengelola semua fungsi untuk halaman trash/recycle bin
 */

const TrashHandler = (function() {
    'use strict';

    // State
    const state = {
        items: [],
        loading: false,
        confirmCallback: null,
        selectedItem: null
    };

    // DOM helper
    const $ = id => document.getElementById(id);

    // ===== THEME FUNCTIONS =====
    const syncSidebarThemeSwitch = theme => {
        const sidebarSwitch = document.getElementById('toggleTheme');
        if (!sidebarSwitch) return;
        sidebarSwitch.classList.toggle('is-dark', theme === 'dark');
        sidebarSwitch.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    };

    function initTheme() {
        const t = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        const appShell = document.getElementById('app');
        if (appShell) appShell.setAttribute('data-theme', t);
        const icon = $('theme-toggle')?.querySelector('i');
        if (icon) {
            icon.className = t === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
        }
        syncSidebarThemeSwitch(t);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        const appShell = document.getElementById('app');
        if (appShell) appShell.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        const icon = $('theme-toggle')?.querySelector('i');
        if (icon) {
            icon.className = next === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
        }
        syncSidebarThemeSwitch(next);
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
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const truncate = (s, n = 40) => s && s.length > n ? s.slice(0, n - 2) + '...' : (s || '-');

    const formatSize = bytes => {
        if (!bytes || bytes === 0) return '-';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    };

    // ===== DATA LOADING =====
    async function loadTrash() {
        if (state.loading) return;
        state.loading = true;

        const tbody = $('trash-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="table-message"><i class="ri-loader-4-line spin"></i><span>Memuat...</span></div></td></tr>';
        }

        try {
            const res = await fetch('api.php?action=trash-list');
            const data = await res.json();

            if (!data.success) throw new Error(data.error || 'Error loading trash');

            state.items = data.items || [];
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
        const tbody = $('trash-tbody');
        if (!tbody) return;

        if (!state.items.length) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="trash-empty"><i class="ri-delete-bin-line"></i><p>Trash kosong</p></div></td></tr>';
            const footerInfo = $('footer-info');
            if (footerInfo) footerInfo.textContent = '0 items';
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

        const footerInfo = $('footer-info');
        if (footerInfo) {
            footerInfo.textContent = `${state.items.length} item${state.items.length !== 1 ? 's' : ''}`;
        }
    }

    // ===== ITEM ACTIONS =====
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

    // ===== DETAIL MODAL =====
    function showDetailModal(item) {
        state.selectedItem = item;

        const detailTitle = $('detail-modal-title');
        if (detailTitle) {
            detailTitle.innerHTML = `<i class="ri-${item.type === 'folder' ? 'folder' : 'file'}-line"></i> Detail Item`;
        }

        const detailName = $('detail-name');
        if (detailName) detailName.textContent = item.originalName || '-';

        const detailType = $('detail-type');
        if (detailType) detailType.innerHTML = `<span class="action-badge ${item.type}">${item.type}</span>`;

        const detailPath = $('detail-path');
        if (detailPath) detailPath.textContent = item.originalPath || '-';

        const detailSize = $('detail-size');
        if (detailSize) detailSize.textContent = item.type === 'folder' ? '-' : formatSize(item.size);

        const detailDeleted = $('detail-deleted');
        if (detailDeleted) detailDeleted.textContent = formatTime(item.deletedAt);

        const detailBy = $('detail-by');
        if (detailBy) detailBy.textContent = item.deletedBy || '-';

        const detailModal = $('detail-modal');
        if (detailModal) detailModal.classList.add('active');
    }

    function hideDetailModal() {
        const detailModal = $('detail-modal');
        if (detailModal) detailModal.classList.remove('active');
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

    // ===== CONFIRM MODAL =====
    function showConfirm(title, message, callback) {
        const modalTitle = $('modal-title');
        if (modalTitle) modalTitle.innerHTML = `<i class="ri-question-line"></i> ${esc(title)}`;

        const modalMessage = $('modal-message');
        if (modalMessage) modalMessage.textContent = message;

        state.confirmCallback = callback;

        const modal = $('modal');
        if (modal) modal.classList.add('active');
    }

    function hideModal() {
        const modal = $('modal');
        if (modal) modal.classList.remove('active');
        state.confirmCallback = null;
    }

    function handleConfirm() {
        if (state.confirmCallback) {
            state.confirmCallback();
        }
        hideModal();
    }

    // ===== TOAST NOTIFICATION =====
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
        loadTrash();

        // Toolbar buttons
        const btnRefresh = $('btn-refresh');
        if (btnRefresh) btnRefresh.addEventListener('click', loadTrash);

        const btnEmpty = $('btn-empty');
        if (btnEmpty) btnEmpty.addEventListener('click', emptyTrash);

        const btnCleanup = $('btn-cleanup');
        if (btnCleanup) btnCleanup.addEventListener('click', cleanupOld);

        const themeToggle = $('theme-toggle');
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

        const sidebarThemeToggle = document.getElementById('toggleTheme');
        if (sidebarThemeToggle) sidebarThemeToggle.addEventListener('click', toggleTheme);

        // Detail modal
        const detailModalClose = $('detail-modal-close');
        if (detailModalClose) detailModalClose.addEventListener('click', hideDetailModal);

        const detailCancel = $('detail-cancel');
        if (detailCancel) detailCancel.addEventListener('click', hideDetailModal);

        const detailRestore = $('detail-restore');
        if (detailRestore) detailRestore.addEventListener('click', handleDetailRestore);

        const detailDelete = $('detail-delete');
        if (detailDelete) detailDelete.addEventListener('click', handleDetailDelete);

        const detailModal = $('detail-modal');
        if (detailModal) {
            detailModal.addEventListener('click', e => {
                if (e.target === detailModal) hideDetailModal();
            });
        }

        // Confirm modal
        const modalClose = $('modal-close');
        if (modalClose) modalClose.addEventListener('click', hideModal);

        const modalCancel = $('modal-cancel');
        if (modalCancel) modalCancel.addEventListener('click', hideModal);

        const modalConfirm = $('modal-confirm');
        if (modalConfirm) modalConfirm.addEventListener('click', handleConfirm);

        const modal = $('modal');
        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === modal) hideModal();
            });
        }

        // Escape key closes modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                hideDetailModal();
                hideModal();
            }
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
        loadTrash,
        toggleTheme,
        restoreItem,
        deleteItemPermanently,
        emptyTrash,
        cleanupOld,
        showToast,
        hideModal,
        hideDetailModal
    };
})();

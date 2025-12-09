<!-- Trash Overlay Modal -->
<div class="trash-overlay fixed inset-0 items-center justify-center bg-black/45 p-2 md:p-4 z-50 hidden"
    id="trash-overlay" aria-hidden="true">
    <div class="trash-dialog bg-white dark:bg-[#1a2332] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog" aria-modal="true" aria-labelledby="trash-title">
        <header
            class="trash-header bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/30 dark:to-red-900/20 border-b border-gray-100 dark:border-white/10 px-6 py-4 flex items-center gap-4 flex-shrink-0">
            <div class="trash-icon w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0"
                aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
            </div>
            <div class="trash-title-group">
                <h2 class="trash-title text-base font-semibold text-gray-900 dark:text-slate-200" id="trash-title">Trash
                    Bin</h2>
                <p class="trash-subtitle text-xs text-gray-600 dark:text-slate-400 mt-0.5" id="trash-subtitle">Item yang
                    dihapus dapat dipulihkan</p>
            </div>
            <button type="button" id="trash-close-top" aria-label="Tutup"
                class="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                    <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </button>
        </header>
        <div class="trash-body flex-1 overflow-hidden flex flex-col px-6 py-4">
            <div
                class="trash-table-wrapper flex-1 overflow-auto border border-gray-200 dark:border-white/10 rounded-md">
                <table class="trash-table w-full text-xs">
                    <thead class="bg-gray-50 dark:bg-black/30 sticky top-0">
                        <tr>
                            <th class="px-3 py-2 text-left font-medium text-gray-700 dark:text-slate-400 text-xs">Item
                            </th>
                            <th class="px-3 py-2 text-left font-medium text-gray-700 dark:text-slate-400 text-xs">Type
                            </th>
                            <th class="px-3 py-2 text-left font-medium text-gray-700 dark:text-slate-400 text-xs">
                                Deleted</th>
                            <th
                                class="px-3 py-2 text-left font-medium text-gray-700 dark:text-slate-400 text-xs hidden sm:table-cell">
                                Original Path</th>
                            <th class="px-3 py-2 text-center font-medium text-gray-700 dark:text-slate-400 text-xs"
                                style="width: 140px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="trash-table-body" class="dark:text-slate-200">
                        <tr>
                            <td colspan="5"
                                class="trash-loading px-3 py-4 text-center text-gray-500 dark:text-slate-400">
                                Memuat data trash...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="trash-empty-state text-center py-8" id="trash-empty-state" style="display: none;">
                <svg viewBox="0 0 24 24" fill="currentColor"
                    class="w-16 h-16 mx-auto text-gray-300 dark:text-slate-600 mb-4">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                <p class="text-gray-500 dark:text-slate-400 text-sm">Trash kosong</p>
                <p class="text-gray-400 dark:text-slate-500 text-xs mt-1">Item yang dihapus akan muncul di sini</p>
            </div>
            <div class="trash-error text-xs text-red-600 dark:text-red-400 mt-2" id="trash-error" role="alert" hidden>
            </div>
        </div>
        <footer
            class="trash-actions flex flex-col sm:flex-row justify-between gap-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 px-6 py-3 rounded-b-lg flex-shrink-0">
            <div class="trash-actions-left flex flex-col sm:flex-row gap-2">
                <button type="button"
                    class="trash-button danger px-3 py-2 rounded-md text-xs font-medium bg-red-600 text-white inline-flex items-center justify-center gap-2 hover:bg-red-700 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    id="trash-empty-btn">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                        <path fill="currentColor"
                            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    <span>Empty Trash</span>
                </button>
                <button type="button"
                    class="trash-button warning px-3 py-2 rounded-md text-xs font-medium bg-yellow-500 text-white inline-flex items-center justify-center gap-2 hover:bg-yellow-600 focus:outline-none transition-colors"
                    id="trash-cleanup-btn">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                        <path fill="currentColor"
                            d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                    <span>Cleanup Old</span>
                </button>
            </div>
            <div class="trash-actions-right flex flex-col sm:flex-row gap-2">
                <button type="button"
                    class="trash-button outline px-3 py-2 rounded-md text-xs font-medium bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 inline-flex items-center justify-center gap-2 focus:outline-none transition-colors"
                    id="trash-refresh">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                        <path fill="currentColor"
                            d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <span>Refresh</span>
                </button>
                <button type="button"
                    class="trash-button primary px-3 py-2 rounded-md text-xs font-medium bg-blue-600 text-white inline-flex items-center justify-center gap-2 hover:bg-blue-700 focus:outline-none transition-colors"
                    id="trash-close">Tutup</button>
            </div>
        </footer>
    </div>
</div>

<script>
    /**
     * Trash Overlay Handler
     */
    (function () {
        'use strict';

        const trashOverlay = document.getElementById('trash-overlay');
        const trashTableBody = document.getElementById('trash-table-body');
        const trashEmptyState = document.getElementById('trash-empty-state');
        const trashError = document.getElementById('trash-error');

        // Close buttons
        const closeButtons = [
            document.getElementById('trash-close'),
            document.getElementById('trash-close-top')
        ];

        closeButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', closeTrashOverlay);
            }
        });

        // Refresh button
        const refreshBtn = document.getElementById('trash-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadTrashItems);
        }

        // Empty trash button
        const emptyBtn = document.getElementById('trash-empty-btn');
        if (emptyBtn) {
            emptyBtn.addEventListener('click', emptyTrash);
        }

        // Cleanup button
        const cleanupBtn = document.getElementById('trash-cleanup-btn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', cleanupOldItems);
        }

        // Close on overlay click
        if (trashOverlay) {
            trashOverlay.addEventListener('click', (e) => {
                if (e.target === trashOverlay) {
                    closeTrashOverlay();
                }
            });
        }

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && trashOverlay && !trashOverlay.classList.contains('hidden')) {
                closeTrashOverlay();
            }
        });

        function closeTrashOverlay() {
            if (trashOverlay) {
                trashOverlay.classList.add('hidden');
                trashOverlay.style.display = 'none';
                trashOverlay.setAttribute('aria-hidden', 'true');
            }
        }

        async function loadTrashItems() {
            if (!trashTableBody) return;

            trashTableBody.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-gray-500 dark:text-slate-400">Memuat data...</td></tr>';
            if (trashEmptyState) trashEmptyState.style.display = 'none';
            if (trashError) trashError.hidden = true;

            try {
                const response = await fetch('api.php?action=trash-list');
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to load trash items');
                }

                const items = data.items || [];

                if (items.length === 0) {
                    trashTableBody.innerHTML = '';
                    if (trashEmptyState) trashEmptyState.style.display = 'block';
                    return;
                }

                trashTableBody.innerHTML = items.map(item => `
                <tr class="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                    <td class="px-3 py-2">
                        <div class="flex items-center gap-2">
                            <i class="${item.type === 'folder' ? 'ri-folder-line text-yellow-500' : 'ri-file-line text-blue-500'}"></i>
                            <span class="truncate max-w-[150px]" title="${escapeHtml(item.originalName)}">${escapeHtml(item.originalName)}</span>
                        </div>
                    </td>
                    <td class="px-3 py-2">${item.type}</td>
                    <td class="px-3 py-2">${formatDate(item.deletedAt)}</td>
                    <td class="px-3 py-2 hidden sm:table-cell">
                        <span class="truncate max-w-[150px] block" title="${escapeHtml(item.originalPath)}">${escapeHtml(item.originalPath)}</span>
                    </td>
                    <td class="px-3 py-2 text-center">
                        <div class="flex items-center justify-center gap-1">
                            <button type="button" class="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400" 
                                    onclick="restoreTrashItem('${item.id}')" title="Restore">
                                <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
                                    <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/>
                                </svg>
                            </button>
                            <button type="button" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400" 
                                    onclick="deleteTrashItem('${item.id}')" title="Delete Permanently">
                                <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            } catch (err) {
                console.error('Error loading trash:', err);
                if (trashError) {
                    trashError.textContent = err.message;
                    trashError.hidden = false;
                }
                trashTableBody.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-red-500">Error loading trash items</td></tr>';
            }
        }

        async function emptyTrash() {
            if (!confirm('Yakin ingin mengosongkan semua item di trash? Tindakan ini tidak dapat dibatalkan.')) {
                return;
            }

            try {
                const response = await fetch('api.php?action=trash-empty', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();

                if (data.success) {
                    loadTrashItems();
                } else {
                    alert(data.error || 'Failed to empty trash');
                }
            } catch (err) {
                console.error('Error emptying trash:', err);
                alert('Error: ' + err.message);
            }
        }

        async function cleanupOldItems() {
            if (!confirm('Hapus item yang sudah lebih dari 30 hari di trash?')) {
                return;
            }

            try {
                const response = await fetch('api.php?action=trash-cleanup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ days: 30 })
                });
                const data = await response.json();

                if (data.success) {
                    loadTrashItems();
                } else {
                    alert(data.error || 'Failed to cleanup trash');
                }
            } catch (err) {
                console.error('Error cleaning up trash:', err);
                alert('Error: ' + err.message);
            }
        }

        // Global functions for inline onclick
        window.restoreTrashItem = async function (id) {
            try {
                const response = await fetch('api.php?action=trash-restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: [id] })
                });
                const data = await response.json();

                if (data.success) {
                    loadTrashItems();
                    // Reload main file list if available
                    if (typeof window.loadPath === 'function') {
                        window.loadPath('');
                    }
                } else {
                    alert(data.error || 'Failed to restore item');
                }
            } catch (err) {
                console.error('Error restoring item:', err);
                alert('Error: ' + err.message);
            }
        };

        window.deleteTrashItem = async function (id) {
            if (!confirm('Hapus item ini secara permanen?')) {
                return;
            }

            try {
                const response = await fetch('api.php?action=trash-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: [id] })
                });
                const data = await response.json();

                if (data.success) {
                    loadTrashItems();
                } else {
                    alert(data.error || 'Failed to delete item');
                }
            } catch (err) {
                console.error('Error deleting item:', err);
                alert('Error: ' + err.message);
            }
        };

        // Expose loadTrash function globally
        window.loadTrash = loadTrashItems;

        // Helper functions
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(timestamp) {
            if (!timestamp) return '-';
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    })();
</script>
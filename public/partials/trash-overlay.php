<!-- Trash Overlay Modal -->
<div class="trash-overlay hidden"
    id="trash-overlay" aria-hidden="true">
    <div class="trash-dialog d-flex flex-col"
        role="dialog" aria-modal="true" aria-labelledby="trash-title">
        <header
            class="trash-header flex-shrink-0">
            <div class="trash-icon"
                aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
            </div>
            <div class="trash-title-group">
                <h2 class="trash-title" id="trash-title">Trash
                    Bin</h2>
                <p class="trash-subtitle" id="trash-subtitle">Item yang
                    dihapus dapat dipulihkan</p>
            </div>
            <button type="button" id="trash-close-top" aria-label="Tutup"
                class="trash-close-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                    <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </button>
        </header>
        <div class="trash-body flex-1 overflow-hidden d-flex flex-col px-6 py-4">
            <div
                class="trash-table-wrapper flex-1 overflow-auto border rounded-md">
                <table class="trash-table w-full text-xs">
                    <thead class="trash-table-head">
                        <tr>
                            <th class="px-3 py-2 text-left font-medium text-xs">Item
                            </th>
                            <th class="px-3 py-2 text-left font-medium text-xs">Type
                            </th>
                            <th class="px-3 py-2 text-left font-medium text-xs">
                                Deleted</th>
                            <th
                                class="px-3 py-2 text-left font-medium text-xs md\:table-cell">
                                Original Path</th>
                            <th class="px-3 py-2 text-center font-medium text-xs"
                                style="width: 140px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="trash-table-body">
                        <tr>
                            <td colspan="5"
                                class="trash-loading px-3 py-4 text-center text-muted">
                                Memuat data trash...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="trash-empty-state text-center py-8" id="trash-empty-state" style="display: none;">
                <svg viewBox="0 0 24 24" fill="currentColor"
                    class="trash-empty-icon">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                <p class="text-muted text-sm">Trash kosong</p>
                <p class="text-muted text-xs mt-1">Item yang dihapus akan muncul di sini</p>
            </div>
            <div class="trash-error text-xs mt-2" id="trash-error" role="alert" hidden>
            </div>
        </div>
        <footer
            class="trash-actions flex-shrink-0">
            <div class="trash-actions-left">
                <button type="button"
                    class="trash-button danger"
                    id="trash-empty-btn">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                        <path fill="currentColor"
                            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    <span>Empty Trash</span>
                </button>
                <button type="button"
                    class="trash-button warning"
                    id="trash-cleanup-btn">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                        <path fill="currentColor"
                            d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                    <span>Cleanup Old</span>
                </button>
            </div>
            <div class="trash-actions-right">
                <button type="button"
                    class="trash-button outline"
                    id="trash-refresh">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4">
                        <path fill="currentColor"
                            d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <span>Refresh</span>
                </button>
                <button type="button"
                    class="trash-button primary"
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

            trashTableBody.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-muted">Memuat data...</td></tr>';
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
                <tr class="trash-table-row">
                    <td class="px-3 py-2">
                        <div class="d-flex items-center gap-2">
                            <i class="${item.type === 'folder' ? 'ri-folder-line' : 'ri-file-line'}"></i>
                            <span class="text-truncate" style="max-width: 150px;" title="${escapeHtml(item.originalName)}">${escapeHtml(item.originalName)}</span>
                        </div>
                    </td>
                    <td class="px-3 py-2">${item.type}</td>
                    <td class="px-3 py-2">${formatDate(item.deletedAt)}</td>
                    <td class="px-3 py-2 md\:table-cell">
                        <span class="text-truncate d-block" style="max-width: 150px;" title="${escapeHtml(item.originalPath)}">${escapeHtml(item.originalPath)}</span>
                    </td>
                    <td class="px-3 py-2 text-center">
                        <div class="d-flex items-center justify-center gap-1">
                            <button type="button" class="trash-action-btn trash-action-restore" 
                                    onclick="restoreTrashItem('${item.id}')" title="Restore">
                                <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
                                    <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/>
                                </svg>
                            </button>
                            <button type="button" class="trash-action-btn trash-action-delete" 
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
                trashTableBody.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center">Error loading trash items</td></tr>';
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
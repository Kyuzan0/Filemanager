/**
 * Share Modal Module
 * ==================
 * Create and manage shareable links for files/folders.
 * - Password protection
 * - Expiry time
 * - Max downloads limit
 * - Copy share URL
 * - List/delete existing shares
 *
 * @module shareModal
 */

// ── State ──
let backdropEl = null;
let isOpen = false;
let currentItem = null;

/**
 * Open the share modal for a file/folder
 * @param {Object} item - File/folder item { name, path, type }
 */
export function openShareModal(item) {
    if (isOpen) return;
    if (!item || !item.path) return;

    isOpen = true;
    currentItem = item;

    buildModal(item);
    loadExistingShares(item.path);
}

/**
 * Close the share modal
 */
export function closeShareModal() {
    if (!isOpen) return;
    isOpen = false;
    currentItem = null;

    if (backdropEl) {
        backdropEl.remove();
        backdropEl = null;
    }
}

/**
 * Check if share modal is open
 */
export function isShareModalOpen() {
    return isOpen;
}

// ── Build Modal DOM ──

function buildModal(item) {
    backdropEl = document.createElement('div');
    backdropEl.className = 'share-backdrop';

    const isFolder = item.type === 'folder';
    const icon = isFolder ? '📁' : '📄';

    backdropEl.innerHTML = `
        <div class="share-modal" role="dialog" aria-modal="true" aria-label="Bagikan file">
            <div class="share-modal__header">
                <span class="share-modal__header-icon">${icon}</span>
                <div class="share-modal__header-text">
                    <h2 class="share-modal__title">Bagikan</h2>
                    <p class="share-modal__subtitle" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</p>
                </div>
                <button class="share-modal__close" aria-label="Tutup" id="share-close-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <div class="share-modal__body">
                <!-- Create form -->
                <div id="share-create-form">
                    <div class="share-field">
                        <label class="share-label">Password (opsional)</label>
                        <input type="password" class="share-input" id="share-password" placeholder="Kosongkan jika tidak perlu password" autocomplete="new-password">
                    </div>

                    <div class="share-row">
                        <div class="share-field">
                            <label class="share-label">Kedaluwarsa</label>
                            <select class="share-select" id="share-expiry">
                                <option value="0">Tidak ada</option>
                                <option value="1">1 jam</option>
                                <option value="6">6 jam</option>
                                <option value="24" selected>24 jam</option>
                                <option value="168">7 hari</option>
                                <option value="720">30 hari</option>
                            </select>
                        </div>
                        <div class="share-field">
                            <label class="share-label">Maks. unduhan</label>
                            <input type="number" class="share-input" id="share-max-downloads" placeholder="Tanpa batas" min="1" max="9999">
                        </div>
                    </div>

                    <div class="share-field">
                        <label class="share-label">Izin</label>
                        <div class="share-options">
                            <label class="share-checkbox">
                                <input type="checkbox" id="share-can-download" checked>
                                Izinkan unduh
                            </label>
                            <label class="share-checkbox">
                                <input type="checkbox" id="share-can-preview" checked>
                                Izinkan pratinjau
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Share URL (shown after creation) -->
                <div id="share-url-section" style="display: none;"></div>

                <!-- Existing shares -->
                <div class="share-existing" id="share-existing">
                    <div class="share-existing__title">Link Aktif</div>
                    <div class="share-existing__list" id="share-existing-list">
                        <div class="share-existing__empty">Memuat...</div>
                    </div>
                </div>
            </div>

            <div class="share-modal__footer">
                <button class="share-btn-cancel" id="share-cancel-btn">Tutup</button>
                <button class="share-btn-create" id="share-create-btn">Buat Link</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdropEl);
    wireEvents();
}

function wireEvents() {
    const closeBtn = document.getElementById('share-close-btn');
    const cancelBtn = document.getElementById('share-cancel-btn');
    const createBtn = document.getElementById('share-create-btn');

    closeBtn.addEventListener('click', closeShareModal);
    cancelBtn.addEventListener('click', closeShareModal);
    createBtn.addEventListener('click', handleCreate);

    // Backdrop click
    backdropEl.addEventListener('click', (e) => {
        if (e.target === backdropEl) closeShareModal();
    });

    // Escape key
    const keyHandler = (e) => {
        if (e.key === 'Escape') {
            closeShareModal();
            document.removeEventListener('keydown', keyHandler);
        }
    };
    document.addEventListener('keydown', keyHandler);

    // Focus first input
    setTimeout(() => {
        const pwInput = document.getElementById('share-password');
        if (pwInput) pwInput.focus();
    }, 100);
}

// ── Create Share ──

async function handleCreate() {
    const createBtn = document.getElementById('share-create-btn');
    if (!currentItem || createBtn.disabled) return;

    const password = document.getElementById('share-password').value;
    const expiresIn = parseInt(document.getElementById('share-expiry').value, 10);
    const maxDownloadsVal = document.getElementById('share-max-downloads').value;
    const canDownload = document.getElementById('share-can-download').checked;
    const canPreview = document.getElementById('share-can-preview').checked;

    const payload = {
        path: currentItem.path,
        canDownload: canDownload ? 1 : 0,
        canPreview: canPreview ? 1 : 0,
    };

    if (password) payload.password = password;
    if (expiresIn > 0) payload.expiresIn = expiresIn;
    if (maxDownloadsVal) payload.maxDownloads = parseInt(maxDownloadsVal, 10);

    createBtn.disabled = true;
    createBtn.textContent = 'Membuat...';

    try {
        const resp = await fetch('api.php?action=share-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await resp.json();

        if (!data.success) {
            window.showError?.(data.error || 'Gagal membuat link berbagi.');
            createBtn.disabled = false;
            createBtn.textContent = 'Buat Link';
            return;
        }

        // Show URL section
        showShareUrl(data.share);

        // Refresh existing shares list
        loadExistingShares(currentItem.path);

        window.showSuccess?.('Link berbagi berhasil dibuat!');
    } catch (err) {
        window.showError?.('Gagal membuat link berbagi.');
        createBtn.disabled = false;
        createBtn.textContent = 'Buat Link';
    }
}

function showShareUrl(share) {
    const urlSection = document.getElementById('share-url-section');
    const createForm = document.getElementById('share-create-form');
    const createBtn = document.getElementById('share-create-btn');

    // Hide create form, show URL
    createForm.style.display = 'none';
    createBtn.style.display = 'none';

    urlSection.innerHTML = `
        <div class="share-url-section">
            <div class="share-url-label">Link Berbagi</div>
            <div class="share-url-wrapper">
                <input type="text" class="share-url-input" id="share-url-value" value="${escapeAttr(share.url)}" readonly>
                <button class="share-url-copy" id="share-url-copy-btn">📋 Salin</button>
            </div>
        </div>
    `;
    urlSection.style.display = '';

    // Copy button handler
    document.getElementById('share-url-copy-btn').addEventListener('click', () => {
        const input = document.getElementById('share-url-value');
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
            const btn = document.getElementById('share-url-copy-btn');
            btn.textContent = '✓ Tersalin!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋 Salin';
                btn.classList.remove('copied');
            }, 2000);
        });
    });

    // Add "Buat Link Baru" button
    const cancelBtn = document.getElementById('share-cancel-btn');
    cancelBtn.textContent = 'Tutup';

    // Insert "new link" button before cancel
    const footer = backdropEl.querySelector('.share-modal__footer');
    const newBtn = document.createElement('button');
    newBtn.className = 'share-btn-create';
    newBtn.textContent = 'Buat Link Baru';
    newBtn.addEventListener('click', () => {
        urlSection.style.display = 'none';
        urlSection.innerHTML = '';
        createForm.style.display = '';
        createBtn.style.display = '';
        createBtn.disabled = false;
        createBtn.textContent = 'Buat Link';
        newBtn.remove();

        // Reset form
        document.getElementById('share-password').value = '';
        document.getElementById('share-max-downloads').value = '';
    });
    footer.insertBefore(newBtn, cancelBtn);
}

// ── Existing Shares ──

async function loadExistingShares(filePath) {
    const listEl = document.getElementById('share-existing-list');
    if (!listEl) return;

    try {
        const resp = await fetch(`api.php?action=share-list&path=${encodeURIComponent(filePath)}`);
        const data = await resp.json();

        if (!data.success || !data.shares || data.shares.length === 0) {
            listEl.innerHTML = '<div class="share-existing__empty">Belum ada link berbagi untuk file ini.</div>';
            return;
        }

        listEl.innerHTML = '';
        data.shares.forEach(share => {
            const item = document.createElement('div');
            item.className = 'share-existing__item';

            const now = new Date();
            const isExpired = share.expires_at && new Date(share.expires_at + 'Z') < now;
            const isExhausted = share.max_downloads !== null && share.download_count >= share.max_downloads;

            let badges = '';
            if (isExpired || isExhausted) {
                badges += '<span class="share-existing__badge share-existing__badge--expired">Kedaluwarsa</span>';
            } else {
                badges += '<span class="share-existing__badge share-existing__badge--active">Aktif</span>';
            }
            if (share.has_password) {
                badges += '<span class="share-existing__badge share-existing__badge--password">🔒</span>';
            }

            let meta = '';
            if (share.expires_at) {
                meta += `<span>⏱ ${formatDate(share.expires_at)}</span>`;
            }
            if (share.max_downloads !== null) {
                meta += `<span>📥 ${share.download_count}/${share.max_downloads}</span>`;
            } else {
                meta += `<span>📥 ${share.download_count}</span>`;
            }

            item.innerHTML = `
                <div class="share-existing__info">
                    <div class="share-existing__token">${badges} ${share.token.substring(0, 12)}...</div>
                    <div class="share-existing__meta">${meta}</div>
                </div>
                <button class="share-url-copy" data-url="${escapeAttr(getShareUrl(share.token))}" title="Salin link">📋</button>
                <button class="share-existing__delete" data-id="${share.id}" title="Hapus link">🗑️</button>
            `;

            // Copy handler
            item.querySelector('.share-url-copy').addEventListener('click', (e) => {
                const url = e.currentTarget.dataset.url;
                navigator.clipboard.writeText(url).then(() => {
                    e.currentTarget.textContent = '✓';
                    setTimeout(() => { e.currentTarget.textContent = '📋'; }, 1500);
                });
            });

            // Delete handler
            item.querySelector('.share-existing__delete').addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id, 10);
                await deleteShare(id);
                loadExistingShares(filePath);
            });

            listEl.appendChild(item);
        });
    } catch (err) {
        listEl.innerHTML = '<div class="share-existing__empty">Gagal memuat daftar share.</div>';
    }
}

async function deleteShare(id) {
    try {
        const resp = await fetch('api.php?action=share-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        const data = await resp.json();
        if (data.success) {
            window.showSuccess?.('Link berbagi berhasil dihapus.');
        } else {
            window.showError?.(data.error || 'Gagal menghapus link.');
        }
    } catch (err) {
        window.showError?.('Gagal menghapus link.');
    }
}

// ── Helpers ──

function getShareUrl(token) {
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    return `${base}/share.php?token=${token}`;
}

function formatDate(dateStr) {
    try {
        const d = new Date(dateStr + 'Z');
        const now = new Date();
        const diff = d - now;

        if (diff < 0) return 'Kedaluwarsa';
        if (diff < 3600000) return `${Math.ceil(diff / 60000)} menit lagi`;
        if (diff < 86400000) return `${Math.ceil(diff / 3600000)} jam lagi`;
        return `${Math.ceil(diff / 86400000)} hari lagi`;
    } catch {
        return dateStr;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

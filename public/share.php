<?php
/**
 * Public Share Access Page
 * Allows unauthenticated users to access shared files via token
 * 
 * @version 1.0.0
 */

require_once dirname(__DIR__) . '/bootstrap.php';

// Auto-migrate if needed (no auth required)
if (!\App\Core\Database::isInitialized()) {
    \App\Core\Database::migrate();
}

$token = $_GET['token'] ?? '';
$baseUrl = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
?>
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Berbagi — Filemanager</title>
    <link rel="stylesheet" href="assets/css/core/variables.css">
    <link rel="stylesheet" href="assets/css/core/reset.css">
    <link rel="stylesheet" href="assets/css/pages/auth.css">
    <style>
        .share-info { margin-bottom: 1.5rem; }
        .share-file-icon {
            width: 64px; height: 64px; margin: 0 auto 1rem;
            background: var(--accent-light, #e0edff);
            border-radius: 16px; display: flex; align-items: center; justify-content: center;
            font-size: 28px;
        }
        .share-file-name {
            font-size: 1.1rem; font-weight: 600; color: var(--text-primary);
            word-break: break-all; margin-bottom: 0.25rem;
        }
        .share-file-meta {
            font-size: 0.85rem; color: var(--text-secondary);
            display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;
        }
        .share-file-meta span { display: flex; align-items: center; gap: 0.25rem; }
        .share-actions { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
        .share-btn {
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.95rem;
            font-weight: 600; cursor: pointer; border: none; transition: all 0.2s;
            text-decoration: none;
        }
        .share-btn-primary {
            background: var(--accent, #3b82f6); color: #fff;
        }
        .share-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .share-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .share-btn-secondary {
            background: var(--bg-secondary, #f1f5f9); color: var(--text-primary);
            border: 1px solid var(--border-light, #e2e8f0);
        }
        .share-btn-secondary:hover { background: var(--bg-tertiary, #e2e8f0); }
        .share-password-form { margin-top: 1rem; }
        .share-expired {
            text-align: center; padding: 2rem 1rem;
            color: var(--text-secondary);
        }
        .share-expired-icon { font-size: 48px; margin-bottom: 1rem; }
        .share-expired-title { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
        .share-shared-by {
            font-size: 0.8rem; color: var(--text-tertiary, #94a3b8);
            margin-top: 1rem; text-align: center;
        }
        .share-counter {
            font-size: 0.8rem; color: var(--text-tertiary, #94a3b8);
            text-align: center; margin-top: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-card" id="share-card">
            <!-- Brand -->
            <div class="auth-brand">
                <div class="auth-brand-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                </div>
                <h1 class="auth-title">File Berbagi</h1>
                <p class="auth-subtitle" id="share-subtitle">Memuat informasi file...</p>
            </div>

            <!-- Loading state -->
            <div id="share-loading" style="text-align: center; padding: 2rem 0;">
                <div class="auth-spinner"></div>
            </div>

            <!-- Content (hidden until loaded) -->
            <div id="share-content" style="display: none;"></div>

            <!-- Error state -->
            <div id="share-error" style="display: none;"></div>
        </div>
    </div>

    <script>
    (function() {
        const token = <?php echo json_encode($token); ?>;
        const baseApiUrl = <?php echo json_encode($baseUrl); ?>;
        const loadingEl = document.getElementById('share-loading');
        const contentEl = document.getElementById('share-content');
        const errorEl = document.getElementById('share-error');
        const subtitleEl = document.getElementById('share-subtitle');

        // Theme detection
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        if (!token) {
            showError('Link tidak valid', 'Token berbagi tidak ditemukan di URL.');
            return;
        }

        let sharePassword = '';

        loadShareInfo();

        async function loadShareInfo() {
            loadingEl.style.display = '';
            contentEl.style.display = 'none';
            errorEl.style.display = 'none';

            try {
                let url = `${baseApiUrl}/api.php?action=share-access&token=${encodeURIComponent(token)}`;
                if (sharePassword) {
                    url += `&password=${encodeURIComponent(sharePassword)}`;
                }

                const resp = await fetch(url);
                const data = await resp.json();

                loadingEl.style.display = 'none';

                if (data.requiresPassword) {
                    showPasswordForm(data.file_name || 'File');
                    return;
                }

                if (!data.success) {
                    showError('Tidak Dapat Diakses', data.error || 'Link berbagi tidak valid.');
                    return;
                }

                showFileInfo(data.file);
            } catch (err) {
                loadingEl.style.display = 'none';
                showError('Kesalahan', 'Gagal memuat informasi file. Coba lagi nanti.');
            }
        }

        function showFileInfo(file) {
            subtitleEl.textContent = 'File siap diakses';

            const icon = getFileIcon(file.extension, file.type);
            const size = file.type === 'folder' ? 'Folder' : formatSize(file.size);

            let html = `
                <div class="share-info">
                    <div class="share-file-icon">${icon}</div>
                    <div class="share-file-name">${escapeHtml(file.name)}</div>
                    <div class="share-file-meta">
                        <span>${size}</span>
                        <span>${file.mime || file.type}</span>
                    </div>
                </div>
                <div class="share-actions">
            `;

            if (file.can_download && file.type !== 'folder') {
                let downloadUrl = `${baseApiUrl}/api.php?action=share-download&token=${encodeURIComponent(token)}`;
                if (sharePassword) {
                    downloadUrl += `&password=${encodeURIComponent(sharePassword)}`;
                }
                html += `<a href="${downloadUrl}" class="share-btn share-btn-primary" id="download-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Unduh File
                </a>`;
            }

            html += `</div>`;

            if (file.max_downloads !== null) {
                const remaining = file.max_downloads - file.download_count;
                html += `<div class="share-counter">Sisa unduhan: ${remaining} dari ${file.max_downloads}</div>`;
            }

            html += `<div class="share-shared-by">Dibagikan oleh ${escapeHtml(file.shared_by)}</div>`;

            contentEl.innerHTML = html;
            contentEl.style.display = '';
        }

        function showPasswordForm(fileName) {
            subtitleEl.textContent = 'File ini dilindungi password';

            contentEl.innerHTML = `
                <div class="share-info">
                    <div class="share-file-icon">🔒</div>
                    <div class="share-file-name">${escapeHtml(fileName)}</div>
                </div>
                <form class="share-password-form" id="password-form">
                    <div class="auth-field">
                        <label class="auth-label" for="share-password">Password</label>
                        <div class="auth-input-wrapper">
                            <span class="auth-input-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </span>
                            <input type="password" id="share-password" class="auth-input" placeholder="Masukkan password" required autofocus>
                        </div>
                    </div>
                    <div id="password-error" class="auth-error" style="display: none;"></div>
                    <div class="share-actions">
                        <button type="submit" class="share-btn share-btn-primary" id="password-submit">
                            Buka File
                        </button>
                    </div>
                </form>
            `;
            contentEl.style.display = '';

            document.getElementById('password-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const pwInput = document.getElementById('share-password');
                const errEl = document.getElementById('password-error');
                const btn = document.getElementById('password-submit');

                sharePassword = pwInput.value;
                btn.disabled = true;
                btn.textContent = 'Memverifikasi...';
                errEl.style.display = 'none';

                try {
                    const url = `${baseApiUrl}/api.php?action=share-access&token=${encodeURIComponent(token)}&password=${encodeURIComponent(sharePassword)}`;
                    const resp = await fetch(url);
                    const data = await resp.json();

                    if (!data.success) {
                        errEl.textContent = data.error || 'Password salah.';
                        errEl.style.display = '';
                        btn.disabled = false;
                        btn.textContent = 'Buka File';
                        sharePassword = '';
                        return;
                    }

                    showFileInfo(data.file);
                } catch (err) {
                    errEl.textContent = 'Gagal memverifikasi. Coba lagi.';
                    errEl.style.display = '';
                    btn.disabled = false;
                    btn.textContent = 'Buka File';
                    sharePassword = '';
                }
            });
        }

        function showError(title, message) {
            loadingEl.style.display = 'none';
            contentEl.style.display = 'none';
            subtitleEl.textContent = '';

            errorEl.innerHTML = `
                <div class="share-expired">
                    <div class="share-expired-icon">⚠️</div>
                    <div class="share-expired-title">${escapeHtml(title)}</div>
                    <p>${escapeHtml(message)}</p>
                </div>
            `;
            errorEl.style.display = '';
        }

        function getFileIcon(ext, type) {
            if (type === 'folder') return '📁';
            const icons = {
                pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
                ppt: '📙', pptx: '📙', zip: '📦', rar: '📦', '7z': '📦',
                jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
                mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬',
                mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
                js: '📜', ts: '📜', php: '📜', py: '📜', html: '📜', css: '📜',
                txt: '📄', md: '📄', json: '📄', xml: '📄', csv: '📄',
            };
            return icons[ext] || '📄';
        }

        function formatSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    })();
    </script>
</body>
</html>

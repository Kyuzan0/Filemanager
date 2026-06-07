<?php
/**
 * File Manager - First-Time Setup Wizard
 * Creates the initial admin account.
 * @version 1.0.0
 */

require_once dirname(__DIR__) . '/bootstrap.php';

// Initialize database if needed
if (!\App\Core\Database::isInitialized()) {
    \App\Core\Database::migrate();
}

// If admin already exists, redirect to login
$db = \App\Core\Database::getConnection();
$stmt = $db->query("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'");
if ($stmt->fetch()['cnt'] > 0) {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="id">

<head>
    <script>
        (function () {
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            if (theme === 'dark') {
                document.documentElement.style.backgroundColor = '#2d2b38';
                document.documentElement.style.colorScheme = 'dark';
            }
        })();
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup — File Manager</title>
    <link rel="stylesheet" href="assets/css/core/variables.css?v=<?= @md5_file(__DIR__ . '/assets/css/core/variables.css') ?: time() ?>">
    <link rel="stylesheet" href="assets/css/core/reset.css?v=<?= @md5_file(__DIR__ . '/assets/css/core/reset.css') ?: time() ?>">
    <link rel="stylesheet" href="assets/css/pages/auth.css?v=<?= @md5_file(__DIR__ . '/assets/css/pages/auth.css') ?: time() ?>">
</head>

<body class="auth-body">
    <div class="auth-container">
        <!-- Branding -->
        <div class="auth-brand">
            <div class="auth-brand__icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
            </div>
            <h1 class="auth-brand__title">File Manager</h1>
            <p class="auth-brand__subtitle">Pengaturan Awal — Buat Akun Administrator</p>
        </div>

        <!-- Setup Form -->
        <form id="setup-form" class="auth-form" autocomplete="on" novalidate>
            <div class="auth-field">
                <label class="auth-label" for="setup-username">Username</label>
                <div class="auth-input-wrap">
                    <svg class="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input
                        type="text"
                        id="setup-username"
                        name="username"
                        class="auth-input"
                        placeholder="Masukkan username"
                        autocomplete="username"
                        required
                        autofocus
                        minlength="3"
                        maxlength="50"
                    >
                </div>
            </div>

            <div class="auth-field">
                <label class="auth-label" for="setup-password">Password</label>
                <div class="auth-input-wrap">
                    <svg class="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                        type="password"
                        id="setup-password"
                        name="password"
                        class="auth-input"
                        placeholder="Masukkan password (min. 8 karakter)"
                        autocomplete="new-password"
                        required
                        minlength="8"
                    >
                    <button type="button" class="auth-toggle-pw" id="toggle-password" aria-label="Tampilkan password">
                        <svg class="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <svg class="eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="auth-field">
                <label class="auth-label" for="setup-password-confirm">Konfirmasi Password</label>
                <div class="auth-input-wrap">
                    <svg class="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                        type="password"
                        id="setup-password-confirm"
                        name="password_confirm"
                        class="auth-input"
                        placeholder="Ulangi password"
                        autocomplete="new-password"
                        required
                    >
                </div>
            </div>

            <!-- Error message -->
            <div id="setup-error" class="auth-error" style="display: none;"></div>

            <button type="submit" class="auth-submit" id="setup-submit">
                <span class="auth-submit__text">Buat Akun Admin</span>
                <svg class="auth-submit__spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
            </button>
        </form>

        <!-- Footer -->
        <div class="auth-footer">
            <p>Akun ini akan menjadi administrator sistem.</p>
        </div>
    </div>

    <script>
        (function () {
            const form = document.getElementById('setup-form');
            const usernameInput = document.getElementById('setup-username');
            const passwordInput = document.getElementById('setup-password');
            const confirmInput = document.getElementById('setup-password-confirm');
            const errorDiv = document.getElementById('setup-error');
            const submitBtn = document.getElementById('setup-submit');
            const submitText = submitBtn.querySelector('.auth-submit__text');
            const submitSpinner = submitBtn.querySelector('.auth-submit__spinner');
            const togglePw = document.getElementById('toggle-password');

            // Toggle password visibility
            togglePw.addEventListener('click', function () {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                confirmInput.type = isPassword ? 'text' : 'password';
                togglePw.querySelector('.eye-open').style.display = isPassword ? 'none' : '';
                togglePw.querySelector('.eye-closed').style.display = isPassword ? '' : 'none';
            });

            // Handle form submit
            form.addEventListener('submit', async function (e) {
                e.preventDefault();

                const username = usernameInput.value.trim();
                const password = passwordInput.value;
                const confirm = confirmInput.value;

                if (!username || !password) {
                    showError('Username dan password wajib diisi.');
                    return;
                }

                if (username.length < 3) {
                    showError('Username minimal 3 karakter.');
                    return;
                }

                if (password.length < 8) {
                    showError('Password minimal 8 karakter.');
                    return;
                }

                if (password !== confirm) {
                    showError('Konfirmasi password tidak cocok.');
                    return;
                }

                setLoading(true);
                hideError();

                try {
                    const response = await fetch('api.php?action=auth-setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: username,
                            password: password,
                            role: 'admin'
                        }),
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Redirect to login page
                        window.location.href = 'login.php';
                    } else {
                        showError(data.error || 'Setup gagal.');
                        setLoading(false);
                    }
                } catch (err) {
                    showError('Koneksi gagal. Coba lagi.');
                    setLoading(false);
                }
            });

            function showError(msg) {
                errorDiv.textContent = msg;
                errorDiv.style.display = 'block';
                // Shake animation
                form.classList.remove('shake');
                void form.offsetWidth;
                form.classList.add('shake');
            }

            function hideError() {
                errorDiv.style.display = 'none';
            }

            function setLoading(loading) {
                submitBtn.disabled = loading;
                submitText.textContent = loading ? 'Memproses...' : 'Buat Akun Admin';
                submitSpinner.style.display = loading ? '' : 'none';
                usernameInput.disabled = loading;
                passwordInput.disabled = loading;
                confirmInput.disabled = loading;
            }
        })();
    </script>
</body>

</html>

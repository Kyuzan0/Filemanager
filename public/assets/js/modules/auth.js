/**
 * Auth Module
 * 
 * Handles frontend authentication state, user menu, logout,
 * and 401 response interception.
 * 
 * @module auth
 * @version 1.0.0
 */

let currentUser = null;
let userMenuElement = null;

/**
 * Initialize auth module
 * @param {Object} options
 * @param {Object} options.user - Current user data from server
 */
export function initAuth({ user }) {
    currentUser = user;
    createUserMenu();
    setupAuthInterceptor();
}

/**
 * Get current user
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Check if current user is admin
 */
export function isAdmin() {
    return currentUser?.role === 'admin';
}

/**
 * Check if current user can write
 */
export function canWrite() {
    return currentUser?.role === 'admin' || currentUser?.role === 'editor';
}

/**
 * Create user menu in the action bar
 */
function createUserMenu() {
    if (!currentUser) return;

    // Find the action bar to append user menu
    const actionBar = document.querySelector('.header-actions');
    if (!actionBar) return;

    // Create user menu button
    const menuWrapper = document.createElement('div');
    menuWrapper.className = 'user-menu';
    menuWrapper.innerHTML = `
        <button class="user-menu__trigger" id="user-menu-trigger" aria-label="Menu pengguna" aria-expanded="false">
            <span class="user-menu__avatar">${getInitials(currentUser.display_name || currentUser.username)}</span>
            <span class="user-menu__name">${escapeHtml(currentUser.display_name || currentUser.username)}</span>
            <svg class="user-menu__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
        </button>
        <div class="user-menu__dropdown" id="user-menu-dropdown">
            <div class="user-menu__header">
                <span class="user-menu__header-name">${escapeHtml(currentUser.display_name || currentUser.username)}</span>
                <span class="user-menu__header-role">${currentUser.role}</span>
            </div>
            <div class="user-menu__divider"></div>
            ${currentUser.role === 'admin' ? `
            <button class="user-menu__item" data-action="manage-users">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Kelola User
            </button>
            ` : ''}
            <button class="user-menu__item" data-action="change-password">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Ubah Password
            </button>
            <div class="user-menu__divider"></div>
            <button class="user-menu__item user-menu__item--danger" data-action="logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
            </button>
        </div>
    `;

    actionBar.appendChild(menuWrapper);
    userMenuElement = menuWrapper;

    // Wire events
    const trigger = menuWrapper.querySelector('#user-menu-trigger');
    const dropdown = menuWrapper.querySelector('#user-menu-dropdown');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen);
    });

    // Close on outside click
    document.addEventListener('click', () => {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    });

    // Handle menu actions
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('[data-action]');
        if (!item) return;

        const action = item.dataset.action;
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');

        switch (action) {
            case 'logout':
                handleLogout();
                break;
            case 'change-password':
                handleChangePassword();
                break;
            case 'manage-users':
                handleManageUsers();
                break;
        }
    });
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await fetch('api.php?action=auth-logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        });
    } catch {
        // Ignore errors — redirect anyway
    }
    window.location.href = 'login.php';
}

/**
 * Handle change password (simple prompt)
 */
async function handleChangePassword() {
    const newPassword = prompt('Masukkan password baru (min. 6 karakter):');
    if (!newPassword) return;

    if (newPassword.length < 6) {
        window.showError?.('Password minimal 6 karakter.') || alert('Password minimal 6 karakter.');
        return;
    }

    try {
        const response = await fetch('api.php?action=auth-update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                password: newPassword,
            }),
        });

        const data = await response.json();
        if (data.success) {
            window.showSuccess?.('Password berhasil diubah.') || alert('Password berhasil diubah.');
        } else {
            window.showError?.(data.error) || alert(data.error);
        }
    } catch {
        window.showError?.('Gagal mengubah password.') || alert('Gagal mengubah password.');
    }
}

/**
 * Handle manage users (placeholder — opens user management)
 */
function handleManageUsers() {
    // For now, show a simple alert. Full user management UI can be added later.
    window.showInfo?.('Fitur kelola user akan segera hadir.') || alert('Fitur kelola user akan segera hadir.');
}

/**
 * Setup 401 response interceptor
 * Overrides fetch to detect auth failures and redirect to login
 */
function setupAuthInterceptor() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        if (response.status === 401) {
            // Check if it's our API
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
            if (url.includes('api.php')) {
                try {
                    const clone = response.clone();
                    const data = await clone.json();
                    if (data.code === 'AUTH_REQUIRED') {
                        window.location.href = 'login.php';
                        return response;
                    }
                } catch {
                    // Not JSON, ignore
                }
            }
        }

        return response;
    };
}

/**
 * Get initials from name
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Escape HTML
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

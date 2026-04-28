<?php

/**
 * Auth Handler
 * 
 * API handler functions for authentication endpoints.
 * 
 * @version 1.0.0
 */

use App\Core\Auth;
use App\Core\Database;

/**
 * Handle login action
 * POST: { username, password }
 */
function handle_auth_login_action(string $method): void
{
    if ($method !== 'POST') {
        json_error('Method not allowed.', 405);
    }

    $payload = get_json_payload();
    $username = $payload['username'] ?? '';
    $password = $payload['password'] ?? '';

    if (empty($username) || empty($password)) {
        json_error('Username dan password wajib diisi.');
    }

    $result = Auth::login($username, $password);

    if ($result['success']) {
        json_success('login', ['user' => $result['user']]);
    } else {
        json_error($result['error'], 401);
    }
}

/**
 * Handle logout action
 * POST: {}
 */
function handle_auth_logout_action(string $method): void
{
    if ($method !== 'POST') {
        json_error('Method not allowed.', 405);
    }

    Auth::logout();
    json_success('logout', ['message' => 'Berhasil logout.']);
}

/**
 * Handle get current user action
 * GET: returns current user info
 */
function handle_auth_me_action(): void
{
    Auth::requireAuth();

    $user = Auth::getCurrentUser();
    json_success('user', ['user' => $user]);
}

/**
 * Handle user registration (admin only)
 * POST: { username, password, role?, email?, display_name? }
 */
function handle_auth_register_action(string $method): void
{
    if ($method !== 'POST') {
        json_error('Method not allowed.', 405);
    }

    Auth::requireRole('admin');

    $payload = get_json_payload();
    $username = $payload['username'] ?? '';
    $password = $payload['password'] ?? '';
    $role = $payload['role'] ?? 'viewer';
    $email = $payload['email'] ?? '';
    $displayName = $payload['display_name'] ?? '';

    if (empty($username) || empty($password)) {
        json_error('Username dan password wajib diisi.');
    }

    $result = Auth::register($username, $password, $role, $email, $displayName);

    if ($result['success']) {
        json_success('register', ['user' => $result['user']]);
    } else {
        json_error($result['error']);
    }
}

/**
 * Handle list users (admin only)
 * GET: returns all users
 */
function handle_auth_users_action(string $method): void
{
    Auth::requireRole('admin');

    if ($method === 'GET') {
        $users = Auth::listUsers();
        json_success('users', ['users' => $users]);
    }

    json_error('Method not allowed.', 405);
}

/**
 * Handle update user (admin or self)
 * PUT: { user_id, display_name?, email?, role?, password?, is_active? }
 */
function handle_auth_update_user_action(string $method): void
{
    if ($method !== 'POST' && $method !== 'PUT') {
        json_error('Method not allowed.', 405);
    }

    Auth::requireAuth();

    $payload = get_json_payload();
    $targetUserId = (int) ($payload['user_id'] ?? 0);
    $currentUser = Auth::getCurrentUser();

    if (!$targetUserId) {
        json_error('user_id wajib diisi.');
    }

    // Non-admin can only update themselves (display_name, email, password)
    if (!Auth::isAdmin()) {
        if ($targetUserId !== (int) $currentUser['id']) {
            json_error('Akses ditolak.', 403);
        }
        // Restrict fields for non-admin
        $allowed = ['display_name', 'email', 'password'];
        $data = array_intersect_key($payload, array_flip($allowed));
    } else {
        // Admin can update everything except their own role (safety)
        $data = $payload;
        unset($data['user_id']);

        // Prevent admin from demoting themselves
        if ($targetUserId === (int) $currentUser['id'] && isset($data['role']) && $data['role'] !== 'admin') {
            json_error('Tidak bisa mengubah role sendiri.');
        }
    }

    $result = Auth::updateUser($targetUserId, $data);

    if ($result['success']) {
        json_success('user-updated', ['message' => 'User berhasil diperbarui.']);
    } else {
        json_error($result['error']);
    }
}

/**
 * Handle delete user (admin only)
 * POST: { user_id }
 */
function handle_auth_delete_user_action(string $method): void
{
    if ($method !== 'POST' && $method !== 'DELETE') {
        json_error('Method not allowed.', 405);
    }

    Auth::requireRole('admin');

    $payload = get_json_payload();
    $targetUserId = (int) ($payload['user_id'] ?? 0);
    $currentUser = Auth::getCurrentUser();

    if (!$targetUserId) {
        json_error('user_id wajib diisi.');
    }

    // Prevent self-deletion
    if ($targetUserId === (int) $currentUser['id']) {
        json_error('Tidak bisa menghapus akun sendiri.');
    }

    $result = Auth::deleteUser($targetUserId);

    if ($result['success']) {
        json_success('user-deleted', ['message' => 'User berhasil dihapus.']);
    } else {
        json_error($result['error']);
    }
}

/**
 * Handle folder permissions (admin only)
 * GET: list permissions for user_id
 * POST: set permission { user_id, folder_path, can_read, can_write, can_delete }
 * DELETE: remove permission { permission_id }
 */
function handle_auth_permissions_action(string $method): void
{
    Auth::requireRole('admin');

    if ($method === 'GET') {
        $userId = (int) ($_GET['user_id'] ?? 0);
        if (!$userId) {
            json_error('user_id wajib diisi.');
        }
        $permissions = Auth::getFolderPermissions($userId);
        json_success('permissions', ['permissions' => $permissions]);
    }

    if ($method === 'POST') {
        $payload = get_json_payload();
        $userId = (int) ($payload['user_id'] ?? 0);
        $folderPath = $payload['folder_path'] ?? '';
        $canRead = (bool) ($payload['can_read'] ?? true);
        $canWrite = (bool) ($payload['can_write'] ?? false);
        $canDelete = (bool) ($payload['can_delete'] ?? false);

        if (!$userId || $folderPath === '') {
            json_error('user_id dan folder_path wajib diisi.');
        }

        Auth::setFolderPermission($userId, $folderPath, $canRead, $canWrite, $canDelete);
        json_success('permission-set', ['message' => 'Permission berhasil disimpan.']);
    }

    if ($method === 'DELETE' || ($method === 'POST' && isset($payload['_action']) && $payload['_action'] === 'delete')) {
        $payload = $payload ?? get_json_payload();
        $permissionId = (int) ($payload['permission_id'] ?? 0);
        if (!$permissionId) {
            json_error('permission_id wajib diisi.');
        }
        Auth::deleteFolderPermission($permissionId);
        json_success('permission-deleted', ['message' => 'Permission berhasil dihapus.']);
    }

    json_error('Method not allowed.', 405);
}

/**
 * Handle database initialization / migration
 * POST: runs migrations (first-time setup or admin)
 */
function handle_auth_setup_action(string $method): void
{
    if ($method !== 'POST') {
        json_error('Method not allowed.', 405);
    }

    // Allow setup if DB not initialized yet, otherwise require admin
    if (Database::isInitialized()) {
        Auth::requireRole('admin');
    }

    Database::migrate();

    json_success('setup', ['message' => 'Database berhasil diinisialisasi.']);
}

<?php

/**
 * Auth
 * 
 * Handles user authentication, session management, and RBAC.
 * Uses bcrypt for password hashing and PHP sessions for state.
 * 
 * @version 1.0.0
 */

namespace App\Core;

use PDO;

class Auth
{
    private static ?array $currentUser = null;

    // =========================================================================
    // SESSION VALIDATION
    // =========================================================================

    /**
     * Check if current request is authenticated
     */
    public static function check(): bool
    {
        return self::getCurrentUser() !== null;
    }

    /**
     * Get current authenticated user (cached per request)
     */
    public static function getCurrentUser(): ?array
    {
        if (self::$currentUser !== null) {
            return self::$currentUser;
        }

        if (empty($_SESSION['user_id'])) {
            return null;
        }

        $db = Database::getConnection();

        // Validate session exists in DB and is not expired (24h)
        $stmt = $db->prepare('
            SELECT us.user_id, us.last_activity
            FROM user_sessions us
            WHERE us.id = ? AND us.user_id = ?
        ');
        $stmt->execute([session_id(), $_SESSION['user_id']]);
        $session = $stmt->fetch();

        if (!$session) {
            self::clearSession();
            return null;
        }

        // Check session expiry (24 hours)
        $lastActivity = strtotime($session['last_activity']);
        if (time() - $lastActivity > 86400) {
            self::destroySession($session['user_id']);
            return null;
        }

        // Load user
        $stmt = $db->prepare('
            SELECT id, username, email, display_name, role, is_active, last_login, created_at
            FROM users WHERE id = ? AND is_active = 1
        ');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            self::clearSession();
            return null;
        }

        // Touch session activity
        $stmt = $db->prepare('UPDATE user_sessions SET last_activity = datetime("now") WHERE id = ?');
        $stmt->execute([session_id()]);

        self::$currentUser = $user;
        return $user;
    }

    // =========================================================================
    // LOGIN / LOGOUT
    // =========================================================================

    /**
     * Attempt login with username and password
     * 
     * @return array{success: bool, user?: array, error?: string}
     */
    public static function login(string $username, string $password): array
    {
        $db = Database::getConnection();
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        // Rate limiting: max 5 failed attempts per IP in 15 minutes
        if (self::isRateLimited($ip)) {
            return [
                'success' => false,
                'error' => 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
            ];
        }

        // Find user
        $stmt = $db->prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
        $stmt->execute([trim($username)]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            self::recordLoginAttempt($ip, $username, false);
            return [
                'success' => false,
                'error' => 'Username atau password salah.',
            ];
        }

        if (!$user['is_active']) {
            return [
                'success' => false,
                'error' => 'Akun dinonaktifkan. Hubungi administrator.',
            ];
        }

        // Regenerate session ID to prevent fixation
        session_regenerate_id(true);

        // Store user in session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];

        // Create DB session record
        $stmt = $db->prepare('
            INSERT OR REPLACE INTO user_sessions (id, user_id, ip_address, user_agent)
            VALUES (?, ?, ?, ?)
        ');
        $stmt->execute([
            session_id(),
            $user['id'],
            $ip,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
        ]);

        // Update last login
        $stmt = $db->prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?');
        $stmt->execute([$user['id']]);

        // Record successful attempt
        self::recordLoginAttempt($ip, $username, true);

        // Clear cached user
        self::$currentUser = null;

        $safeUser = self::sanitizeUser($user);

        return [
            'success' => true,
            'user' => $safeUser,
        ];
    }

    /**
     * Logout current user
     */
    public static function logout(): void
    {
        $userId = $_SESSION['user_id'] ?? null;

        if ($userId) {
            self::destroySession($userId);
        }

        self::clearSession();
        self::$currentUser = null;
    }

    // =========================================================================
    // USER MANAGEMENT
    // =========================================================================

    /**
     * Register a new user (admin only)
     * 
     * @return array{success: bool, user?: array, error?: string}
     */
    public static function register(
        string $username,
        string $password,
        string $role = 'viewer',
        string $email = '',
        string $displayName = ''
    ): array {
        $db = Database::getConnection();

        // Validate username
        $username = trim($username);
        if (strlen($username) < 3 || strlen($username) > 50) {
            return ['success' => false, 'error' => 'Username harus 3-50 karakter.'];
        }
        if (!preg_match('/^[a-zA-Z0-9_.-]+$/', $username)) {
            return ['success' => false, 'error' => 'Username hanya boleh huruf, angka, titik, underscore, dan dash.'];
        }

        // Validate password
        if (strlen($password) < 6) {
            return ['success' => false, 'error' => 'Password minimal 6 karakter.'];
        }

        // Validate role
        $validRoles = ['admin', 'editor', 'viewer'];
        if (!in_array($role, $validRoles)) {
            return ['success' => false, 'error' => 'Role tidak valid.'];
        }

        // Check duplicate username
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            return ['success' => false, 'error' => 'Username sudah digunakan.'];
        }

        // Check duplicate email
        if (!empty($email)) {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'error' => 'Format email tidak valid.'];
            }
            $stmt = $db->prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE');
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                return ['success' => false, 'error' => 'Email sudah digunakan.'];
            }
        }

        // Create user
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        $stmt = $db->prepare('
            INSERT INTO users (username, email, password_hash, display_name, role)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $username,
            $email ?: null,
            $hash,
            $displayName ?: $username,
            $role,
        ]);

        $userId = (int) $db->lastInsertId();

        return [
            'success' => true,
            'user' => [
                'id' => $userId,
                'username' => $username,
                'email' => $email,
                'display_name' => $displayName ?: $username,
                'role' => $role,
            ],
        ];
    }

    /**
     * Update user profile
     * 
     * @return array{success: bool, error?: string}
     */
    public static function updateUser(int $userId, array $data): array
    {
        $db = Database::getConnection();

        $fields = [];
        $params = [];

        if (isset($data['display_name'])) {
            $fields[] = 'display_name = ?';
            $params[] = trim($data['display_name']);
        }

        if (isset($data['email'])) {
            $email = trim($data['email']);
            if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'error' => 'Format email tidak valid.'];
            }
            // Check duplicate
            $stmt = $db->prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?');
            $stmt->execute([$email, $userId]);
            if ($stmt->fetch()) {
                return ['success' => false, 'error' => 'Email sudah digunakan.'];
            }
            $fields[] = 'email = ?';
            $params[] = $email ?: null;
        }

        if (isset($data['role'])) {
            $validRoles = ['admin', 'editor', 'viewer'];
            if (!in_array($data['role'], $validRoles)) {
                return ['success' => false, 'error' => 'Role tidak valid.'];
            }
            $fields[] = 'role = ?';
            $params[] = $data['role'];
        }

        if (isset($data['is_active'])) {
            $fields[] = 'is_active = ?';
            $params[] = $data['is_active'] ? 1 : 0;
        }

        if (isset($data['password'])) {
            if (strlen($data['password']) < 6) {
                return ['success' => false, 'error' => 'Password minimal 6 karakter.'];
            }
            $fields[] = 'password_hash = ?';
            $params[] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }

        if (empty($fields)) {
            return ['success' => false, 'error' => 'Tidak ada data yang diubah.'];
        }

        $fields[] = 'updated_at = datetime("now")';
        $params[] = $userId;

        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return ['success' => true];
    }

    /**
     * Delete a user
     */
    public static function deleteUser(int $userId): array
    {
        $db = Database::getConnection();

        // Prevent deleting the last admin
        $stmt = $db->prepare('SELECT role FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            return ['success' => false, 'error' => 'User tidak ditemukan.'];
        }

        if ($user['role'] === 'admin') {
            $stmt = $db->query('SELECT COUNT(*) as cnt FROM users WHERE role = "admin" AND is_active = 1');
            $count = $stmt->fetch()['cnt'];
            if ($count <= 1) {
                return ['success' => false, 'error' => 'Tidak bisa menghapus admin terakhir.'];
            }
        }

        $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$userId]);

        return ['success' => true];
    }

    /**
     * List all users
     */
    public static function listUsers(): array
    {
        $db = Database::getConnection();
        $stmt = $db->query('
            SELECT id, username, email, display_name, role, is_active, last_login, created_at, updated_at
            FROM users ORDER BY created_at ASC
        ');
        return $stmt->fetchAll();
    }

    /**
     * Get single user by ID
     */
    public static function getUser(int $userId): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT id, username, email, display_name, role, is_active, last_login, created_at, updated_at
            FROM users WHERE id = ?
        ');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    // =========================================================================
    // RBAC (Role-Based Access Control)
    // =========================================================================

    /**
     * Check if current user has a specific role
     */
    public static function hasRole(string $role): bool
    {
        $user = self::getCurrentUser();
        if (!$user) return false;
        return $user['role'] === $role;
    }

    /**
     * Check if current user can perform write operations
     * admin and editor can write, viewer cannot
     */
    public static function canWrite(): bool
    {
        $user = self::getCurrentUser();
        if (!$user) return false;
        return in_array($user['role'], ['admin', 'editor']);
    }

    /**
     * Check if current user is admin
     */
    public static function isAdmin(): bool
    {
        return self::hasRole('admin');
    }

    /**
     * Require authentication — redirect or return 401
     */
    public static function requireAuth(): void
    {
        if (!self::check()) {
            $isApi = isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'api.php') !== false;

            if ($isApi) {
                http_response_code(401);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'success' => false,
                    'error' => 'Autentikasi diperlukan.',
                    'code' => 'AUTH_REQUIRED',
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Redirect to login page
            header('Location: login.php');
            exit;
        }
    }

    /**
     * Require specific role — return 403 if insufficient
     */
    public static function requireRole(string $role): void
    {
        self::requireAuth();

        if (!self::hasRole($role)) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error' => 'Akses ditolak. Role "' . $role . '" diperlukan.',
                'code' => 'INSUFFICIENT_ROLE',
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    /**
     * Require write permission — return 403 if viewer
     */
    public static function requireWrite(): void
    {
        self::requireAuth();

        if (!self::canWrite()) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error' => 'Akses ditolak. Anda tidak memiliki izin tulis.',
                'code' => 'WRITE_DENIED',
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    // =========================================================================
    // FOLDER PERMISSIONS
    // =========================================================================

    /**
     * Check if user can access a folder path
     */
    public static function canAccessFolder(string $folderPath, string $permission = 'read'): bool
    {
        $user = self::getCurrentUser();
        if (!$user) return false;

        // Admin has full access
        if ($user['role'] === 'admin') return true;

        $db = Database::getConnection();

        // Check explicit folder permissions (most specific path first)
        $pathParts = explode('/', trim($folderPath, '/'));
        $checkPaths = [''];

        $current = '';
        foreach ($pathParts as $part) {
            $current .= ($current ? '/' : '') . $part;
            $checkPaths[] = $current;
        }

        // Check from most specific to least specific
        $checkPaths = array_reverse($checkPaths);

        foreach ($checkPaths as $path) {
            $stmt = $db->prepare('
                SELECT can_read, can_write, can_delete
                FROM folder_permissions
                WHERE user_id = ? AND folder_path = ?
            ');
            $stmt->execute([$user['id'], $path]);
            $perm = $stmt->fetch();

            if ($perm) {
                switch ($permission) {
                    case 'read':
                        return (bool) $perm['can_read'];
                    case 'write':
                        return (bool) $perm['can_write'];
                    case 'delete':
                        return (bool) $perm['can_delete'];
                }
            }
        }

        // Default: editors can read/write, viewers can only read
        switch ($permission) {
            case 'read':
                return true;
            case 'write':
                return $user['role'] === 'editor';
            case 'delete':
                return $user['role'] === 'editor';
            default:
                return false;
        }
    }

    /**
     * Set folder permission for a user
     */
    public static function setFolderPermission(
        int $userId,
        string $folderPath,
        bool $canRead = true,
        bool $canWrite = false,
        bool $canDelete = false
    ): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT OR REPLACE INTO folder_permissions (user_id, folder_path, can_read, can_write, can_delete)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([$userId, $folderPath, (int) $canRead, (int) $canWrite, (int) $canDelete]);
    }

    /**
     * Get folder permissions for a user
     */
    public static function getFolderPermissions(int $userId): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT * FROM folder_permissions WHERE user_id = ? ORDER BY folder_path');
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Delete folder permission
     */
    public static function deleteFolderPermission(int $permissionId): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM folder_permissions WHERE id = ?');
        $stmt->execute([$permissionId]);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Check if IP is rate limited
     */
    private static function isRateLimited(string $ip): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT COUNT(*) as cnt FROM login_attempts
            WHERE ip_address = ? AND success = 0
            AND attempted_at > datetime("now", "-15 minutes")
        ');
        $stmt->execute([$ip]);
        $result = $stmt->fetch();
        return ($result['cnt'] ?? 0) >= 5;
    }

    /**
     * Record a login attempt
     */
    private static function recordLoginAttempt(string $ip, string $username, bool $success): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            INSERT INTO login_attempts (ip_address, username, success)
            VALUES (?, ?, ?)
        ');
        $stmt->execute([$ip, $username, $success ? 1 : 0]);

        // Cleanup old attempts (older than 24h)
        $db->exec('DELETE FROM login_attempts WHERE attempted_at < datetime("now", "-24 hours")');
    }

    /**
     * Destroy user session from DB
     */
    private static function destroySession(int $userId): void
    {
        $db = Database::getConnection();
        $stmt = $db->prepare('DELETE FROM user_sessions WHERE id = ? AND user_id = ?');
        $stmt->execute([session_id(), $userId]);
    }

    /**
     * Clear PHP session data
     */
    private static function clearSession(): void
    {
        unset($_SESSION['user_id'], $_SESSION['user_role']);
        self::$currentUser = null;
    }

    /**
     * Remove sensitive fields from user array
     */
    private static function sanitizeUser(array $user): array
    {
        unset($user['password_hash']);
        return $user;
    }
}

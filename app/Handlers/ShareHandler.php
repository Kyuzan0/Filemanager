<?php

/**
 * Share Handler
 * Handles file sharing operations: create, list, delete, access, download
 * 
 * @version 1.0.0
 */

use App\Core\Auth;
use App\Core\Database;

/**
 * Create a new share link
 * 
 * @param string $root Root directory path
 * @param string $method HTTP method
 */
function handle_share_create_action(string $root, string $method): void
{
    if ($method !== 'POST') {
        json_error('Method not allowed', 405);
        return;
    }

    Auth::requireAuth();
    Auth::requireWrite();

    $payload = get_json_payload();
    $path = $payload['path'] ?? '';

    if (empty($path)) {
        json_error('Path file wajib diisi.', 400);
        return;
    }

    // Sanitize and validate path
    $sanitized = sanitize_relative_path($path);
    $fullPath = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitized);
    $realPath = realpath($fullPath);

    if ($realPath === false || strpos($realPath, $root) !== 0) {
        json_error('File atau folder tidak ditemukan.', 404);
        return;
    }

    if (!file_exists($realPath)) {
        json_error('File atau folder tidak ditemukan.', 404);
        return;
    }

    // Generate secure token
    $token = bin2hex(random_bytes(16));

    // Optional parameters
    $password = $payload['password'] ?? null;
    $expiresIn = $payload['expiresIn'] ?? null; // hours
    $maxDownloads = $payload['maxDownloads'] ?? null;
    $canDownload = isset($payload['canDownload']) ? (int) $payload['canDownload'] : 1;
    $canPreview = isset($payload['canPreview']) ? (int) $payload['canPreview'] : 1;

    // Hash password if provided
    $passwordHash = null;
    if (!empty($password)) {
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    }

    // Calculate expiry
    $expiresAt = null;
    if ($expiresIn !== null && $expiresIn > 0) {
        $expiresAt = date('Y-m-d H:i:s', time() + ((int) $expiresIn * 3600));
    }

    // Validate max downloads
    if ($maxDownloads !== null) {
        $maxDownloads = max(1, (int) $maxDownloads);
    }

    $user = Auth::getCurrentUser();
    $db = Database::getConnection();

    try {
        $stmt = $db->prepare('
            INSERT INTO shares (token, file_path, created_by, password_hash, expires_at, max_downloads, can_download, can_preview)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $token,
            $sanitized,
            $user['id'],
            $passwordHash,
            $expiresAt,
            $maxDownloads,
            $canDownload,
            $canPreview,
        ]);

        $shareId = $db->lastInsertId();

        // Build share URL
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $basePath = dirname($_SERVER['SCRIPT_NAME']);
        $shareUrl = $protocol . '://' . $host . $basePath . '/share.php?token=' . $token;

        $isFolder = is_dir($realPath);

        json_response([
            'success' => true,
            'share' => [
                'id' => (int) $shareId,
                'token' => $token,
                'url' => $shareUrl,
                'file_path' => $sanitized,
                'file_name' => basename($sanitized),
                'is_folder' => $isFolder,
                'has_password' => !empty($passwordHash),
                'expires_at' => $expiresAt,
                'max_downloads' => $maxDownloads,
                'can_download' => (bool) $canDownload,
                'can_preview' => (bool) $canPreview,
                'created_at' => date('Y-m-d H:i:s'),
            ],
        ]);
    } catch (PDOException $e) {
        json_error('Gagal membuat link berbagi: ' . $e->getMessage(), 500);
    }
}

/**
 * List shares (own shares for non-admin, all for admin)
 * 
 * @param string $root Root directory path
 * @param string $method HTTP method
 */
function handle_share_list_action(string $root, string $method): void
{
    if ($method !== 'GET') {
        json_error('Method not allowed', 405);
        return;
    }

    Auth::requireAuth();

    $user = Auth::getCurrentUser();
    $db = Database::getConnection();

    // Optional filter by file path
    $filterPath = $_GET['path'] ?? null;

    try {
        $sql = '
            SELECT s.*, u.username as created_by_name
            FROM shares s
            LEFT JOIN users u ON s.created_by = u.id
        ';
        $params = [];
        $conditions = [];

        // Non-admin only sees own shares
        if ($user['role'] !== 'admin') {
            $conditions[] = 's.created_by = ?';
            $params[] = $user['id'];
        }

        // Filter by path if provided
        if ($filterPath !== null && $filterPath !== '') {
            $conditions[] = 's.file_path = ?';
            $params[] = sanitize_relative_path($filterPath);
        }

        if (!empty($conditions)) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $sql .= ' ORDER BY s.created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $shares = $stmt->fetchAll();

        $now = date('Y-m-d H:i:s');
        $result = [];

        foreach ($shares as $share) {
            $isExpired = $share['expires_at'] !== null && $share['expires_at'] < $now;
            $isExhausted = $share['max_downloads'] !== null && $share['download_count'] >= $share['max_downloads'];

            $fullPath = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $share['file_path']);
            $isFolder = is_dir($fullPath);
            $fileExists = file_exists($fullPath);

            $result[] = [
                'id' => (int) $share['id'],
                'token' => $share['token'],
                'file_path' => $share['file_path'],
                'file_name' => basename($share['file_path']),
                'is_folder' => $isFolder,
                'file_exists' => $fileExists,
                'has_password' => !empty($share['password_hash']),
                'expires_at' => $share['expires_at'],
                'is_expired' => $isExpired,
                'max_downloads' => $share['max_downloads'] !== null ? (int) $share['max_downloads'] : null,
                'download_count' => (int) $share['download_count'],
                'is_exhausted' => $isExhausted,
                'can_download' => (bool) $share['can_download'],
                'can_preview' => (bool) $share['can_preview'],
                'is_active' => (bool) $share['is_active'],
                'created_at' => $share['created_at'],
                'created_by_name' => $share['created_by_name'] ?? 'Unknown',
            ];
        }

        json_response([
            'success' => true,
            'shares' => $result,
        ]);
    } catch (PDOException $e) {
        json_error('Gagal mengambil daftar share: ' . $e->getMessage(), 500);
    }
}

/**
 * Delete share(s)
 * 
 * @param string $method HTTP method
 */
function handle_share_delete_action(string $method): void
{
    if ($method !== 'POST') {
        json_error('Method not allowed', 405);
        return;
    }

    Auth::requireAuth();

    $payload = get_json_payload();
    $user = Auth::getCurrentUser();
    $db = Database::getConnection();

    // Support single id or array of ids
    $ids = [];
    if (isset($payload['ids']) && is_array($payload['ids'])) {
        $ids = array_map('intval', $payload['ids']);
    } elseif (isset($payload['id'])) {
        $ids = [(int) $payload['id']];
    }

    if (empty($ids)) {
        json_error('ID share wajib diisi.', 400);
        return;
    }

    try {
        $deleted = 0;
        $errors = [];

        foreach ($ids as $id) {
            // Check ownership (admin can delete any)
            if ($user['role'] !== 'admin') {
                $stmt = $db->prepare('SELECT id FROM shares WHERE id = ? AND created_by = ?');
                $stmt->execute([$id, $user['id']]);
                if (!$stmt->fetch()) {
                    $errors[] = "Share #{$id}: tidak ditemukan atau tidak memiliki akses.";
                    continue;
                }
            }

            $stmt = $db->prepare('DELETE FROM shares WHERE id = ?');
            $stmt->execute([$id]);
            if ($stmt->rowCount() > 0) {
                $deleted++;
            }
        }

        $statusCode = (!empty($errors) && $deleted > 0) ? 207 : ($deleted > 0 ? 200 : 400);
        http_response_code($statusCode);

        json_response([
            'success' => $deleted > 0,
            'deleted' => $deleted,
            'errors' => $errors,
        ]);
    } catch (PDOException $e) {
        json_error('Gagal menghapus share: ' . $e->getMessage(), 500);
    }
}

/**
 * Check if IP is rate-limited for share access.
 * Max 20 requests per minute per IP+token combination.
 */
function check_share_rate_limit(string $ip, string $token): bool
{
    $db = Database::getConnection();
    $stmt = $db->prepare('
        SELECT COUNT(*) as cnt FROM share_access_log
        WHERE ip_address = ? AND token = ?
        AND accessed_at > datetime("now", "-1 minute")
    ');
    $stmt->execute([$ip, $token]);
    $result = $stmt->fetch();
    return ($result['cnt'] ?? 0) < 20;
}

/**
 * Log a share access attempt.
 */
function log_share_access(string $ip, string $token, string $userAgent): void
{
    $db = Database::getConnection();
    $stmt = $db->prepare('
        INSERT INTO share_access_log (ip_address, token, user_agent)
        VALUES (?, ?, ?)
    ');
    $stmt->execute([$ip, $token, substr($userAgent, 0, 500)]);

    // Cleanup old entries (older than 1 hour)
    $db->exec("DELETE FROM share_access_log WHERE accessed_at < datetime('now', '-1 hour')");
}

/**
 * Access a shared file (public, no auth required)
 * Validates token and returns file metadata
 * 
 * @param string $root Root directory path
 */
function handle_share_access_action(string $root): void
{
    $token = $_GET['token'] ?? '';

    if (empty($token)) {
        json_error('Token wajib diisi.', 400);
        return;
    }

    // Rate limit check
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if (!check_share_rate_limit($ip, $token)) {
        http_response_code(429);
        json_error('Terlalu banyak permintaan. Coba lagi dalam beberapa menit.', 429);
        return;
    }
    log_share_access($ip, $token, $_SERVER['HTTP_USER_AGENT'] ?? '');

    $db = Database::getConnection();

    try {
        $stmt = $db->prepare('
            SELECT s.*, u.username as created_by_name
            FROM shares s
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.token = ?
        ');
        $stmt->execute([$token]);
        $share = $stmt->fetch();

        if (!$share) {
            json_error('Link berbagi tidak ditemukan.', 404);
            return;
        }

        // Check if active
        if (!$share['is_active']) {
            json_error('Link berbagi sudah dinonaktifkan.', 403);
            return;
        }

        // Check expiry
        if ($share['expires_at'] !== null && $share['expires_at'] < date('Y-m-d H:i:s')) {
            json_error('Link berbagi sudah kedaluwarsa.', 410);
            return;
        }

        // Check max downloads
        if ($share['max_downloads'] !== null && $share['download_count'] >= $share['max_downloads']) {
            json_error('Batas unduhan sudah tercapai.', 410);
            return;
        }

        // Check password — accept from POST body only (never from URL)
        if (!empty($share['password_hash'])) {
            $payload = get_json_payload();
            $password = $payload['password'] ?? '';
            if (empty($password)) {
                json_response([
                    'success' => false,
                    'requiresPassword' => true,
                    'file_name' => basename($share['file_path']),
                ]);
                return;
            }

            if (!password_verify($password, $share['password_hash'])) {
                json_error('Password salah.', 401);
                return;
            }

            // Store validated token in session for download
            $_SESSION['share_access_' . $token] = [
                'validated' => true,
                'expires' => time() + 3600, // 1 hour
            ];
        }

        // Validate file still exists
        $fullPath = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $share['file_path']);
        $realPath = realpath($fullPath);

        if ($realPath === false || !file_exists($realPath)) {
            json_error('File tidak lagi tersedia.', 404);
            return;
        }

        $isFolder = is_dir($realPath);
        $fileSize = $isFolder ? 0 : filesize($realPath);
        $ext = strtolower(pathinfo($realPath, PATHINFO_EXTENSION));

        // Get MIME type
        $mimeTypes = function_exists('get_mime_types') ? get_mime_types() : [];
        $mimeType = $mimeTypes[$ext] ?? 'application/octet-stream';

        json_response([
            'success' => true,
            'file' => [
                'name' => basename($share['file_path']),
                'path' => $share['file_path'],
                'type' => $isFolder ? 'folder' : 'file',
                'size' => $fileSize,
                'mime' => $mimeType,
                'extension' => $ext,
                'can_download' => (bool) $share['can_download'],
                'can_preview' => (bool) $share['can_preview'],
                'download_count' => (int) $share['download_count'],
                'max_downloads' => $share['max_downloads'] !== null ? (int) $share['max_downloads'] : null,
                'shared_by' => $share['created_by_name'] ?? 'Unknown',
            ],
        ]);
    } catch (PDOException $e) {
        json_error('Gagal mengakses share: ' . $e->getMessage(), 500);
    }
}

/**
 * Download a shared file (public, no auth required)
 * Validates token and streams file
 * 
 * @param string $root Root directory path
 */
function handle_share_download_action(string $root): void
{
    $token = $_GET['token'] ?? '';

    if (empty($token)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Token wajib diisi.']);
        exit;
    }

    // Rate limit check
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if (!check_share_rate_limit($ip, $token)) {
        http_response_code(429);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Terlalu banyak permintaan. Coba lagi dalam beberapa menit.']);
        exit;
    }
    log_share_access($ip, $token, $_SERVER['HTTP_USER_AGENT'] ?? '');

    $db = Database::getConnection();

    try {
        $stmt = $db->prepare('SELECT * FROM shares WHERE token = ?');
        $stmt->execute([$token]);
        $share = $stmt->fetch();

        if (!$share) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'Link berbagi tidak ditemukan.']);
            exit;
        }

        // Validate share
        if (!$share['is_active']) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'Link berbagi sudah dinonaktifkan.']);
            exit;
        }

        if ($share['expires_at'] !== null && $share['expires_at'] < date('Y-m-d H:i:s')) {
            http_response_code(410);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'Link berbagi sudah kedaluwarsa.']);
            exit;
        }

        if ($share['max_downloads'] !== null && $share['download_count'] >= $share['max_downloads']) {
            http_response_code(410);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'Batas unduhan sudah tercapai.']);
            exit;
        }

        if (!$share['can_download']) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'Unduhan tidak diizinkan untuk link ini.']);
            exit;
        }

        // Check password — use session validation from previous access
        if (!empty($share['password_hash'])) {
            $sessionKey = 'share_access_' . $token;
            $sessionData = $_SESSION[$sessionKey] ?? null;

            if (!$sessionData || !$sessionData['validated'] || $sessionData['expires'] < time()) {
                http_response_code(401);
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'error' => 'Password belum divalidasi. Silakan akses link lagi.']);
                exit;
            }
        }

        // Validate file
        $fullPath = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $share['file_path']);
        $realPath = realpath($fullPath);

        if ($realPath === false || strpos($realPath, $root) !== 0 || !is_file($realPath)) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'File tidak lagi tersedia.']);
            exit;
        }

        // Increment download count
        $stmt = $db->prepare('UPDATE shares SET download_count = download_count + 1 WHERE id = ?');
        $stmt->execute([$share['id']]);

        // Stream file
        $mimeTypes = function_exists('get_mime_types') ? get_mime_types() : [];
        $ext = strtolower(pathinfo($realPath, PATHINFO_EXTENSION));
        $mimeType = $mimeTypes[$ext] ?? 'application/octet-stream';
        $fileSize = filesize($realPath);

        if (ob_get_level()) {
            ob_end_clean();
        }

        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . $fileSize);
        header('Content-Disposition: attachment; filename="' . basename($realPath) . '"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Accept-Ranges: bytes');

        // Handle range requests
        $start = 0;
        $end = $fileSize - 1;

        if (isset($_SERVER['HTTP_RANGE'])) {
            $range = $_SERVER['HTTP_RANGE'];
            if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
                $start = (int) $matches[1];
                if (!empty($matches[2])) {
                    $end = (int) $matches[2];
                }

                if ($start > $end || $start >= $fileSize) {
                    http_response_code(416);
                    header('Content-Range: bytes */' . $fileSize);
                    exit;
                }

                http_response_code(206);
                header('Content-Range: bytes ' . $start . '-' . $end . '/' . $fileSize);
                header('Content-Length: ' . ($end - $start + 1));
            }
        }

        stream_file_content($realPath, $start, $end);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Gagal mengunduh file.']);
        exit;
    }
}

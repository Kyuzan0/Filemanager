<?php
require_once __DIR__ . '/lib/file_manager.php';

header('Content-Type: application/json; charset=utf-8');

$root = realpath(__DIR__ . '/file');
if ($root === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Root directory tidak ditemukan.',
    ]);
    exit;
}

$requestedPath = $_GET['path'] ?? '';
if (!is_string($requestedPath)) {
    $requestedPath = '';
}
$sanitizedPath = sanitize_relative_path(rawurldecode($requestedPath));
$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$editableExtensions = get_editable_extensions();

try {
    // =========================================================================
    // RAW FILE ENDPOINT (for media preview)
    // =========================================================================
    
    if ($action === 'raw') {
        if ($sanitizedPath === '') {
            throw new RuntimeException('Path file wajib diisi.');
        }
        
        $fullPath = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedPath);
        $realFile = realpath($fullPath);
        
        if ($realFile === false || strpos($realFile, $root) !== 0 || !is_file($realFile)) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'File tidak ditemukan.']);
            exit;
        }
        
        // MIME type detection
        $mimeTypes = [
            // Images
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            // Video
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'ogg' => 'video/ogg',
            'mov' => 'video/quicktime',
            'avi' => 'video/x-msvideo',
            'mkv' => 'video/x-matroska',
            // Audio
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'flac' => 'audio/flac',
            'aac' => 'audio/aac',
            'm4a' => 'audio/mp4',
            'wma' => 'audio/x-ms-wma',
            // Documents
            'pdf' => 'application/pdf',
            // Archives
            'zip' => 'application/zip',
            'rar' => 'application/x-rar-compressed',
            '7z' => 'application/x-7z-compressed',
            'tar' => 'application/x-tar',
            'gz' => 'application/gzip',
        ];
        
        $ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
        $mimeType = isset($mimeTypes[$ext]) ? $mimeTypes[$ext] : 'application/octet-stream';
        
        // Determine if file should be downloaded as attachment (not displayed inline)
        $forceDownload = in_array($ext, ['zip', 'rar', '7z', 'tar', 'gz', 'exe', 'msi', 'dmg', 'iso']);
        $disposition = $forceDownload ? 'attachment' : 'inline';
        
        // Clear any previous output
        if (ob_get_level()) {
            ob_end_clean();
        }
        
        // Set appropriate headers
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($realFile));
        header('Content-Disposition: ' . $disposition . '; filename="' . basename($realFile) . '"');
        header('Cache-Control: public, max-age=3600');
        header('Accept-Ranges: bytes');
        
        // Handle range requests for video/audio seeking
        $fileSize = filesize($realFile);
        $start = 0;
        $end = $fileSize - 1;
        
        if (isset($_SERVER['HTTP_RANGE'])) {
            $range = $_SERVER['HTTP_RANGE'];
            if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
                $start = (int)$matches[1];
                if (!empty($matches[2])) {
                    $end = (int)$matches[2];
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
        
        // Output file content
        $fp = fopen($realFile, 'rb');
        if ($fp) {
            fseek($fp, $start);
            $remaining = $end - $start + 1;
            $bufferSize = 8192;
            
            while ($remaining > 0 && !feof($fp)) {
                $readLength = min($bufferSize, $remaining);
                echo fread($fp, $readLength);
                $remaining -= $readLength;
                flush();
            }
            fclose($fp);
        }
        exit;
    }
    
    // =========================================================================
    // LOGS API ENDPOINTS
    // =========================================================================
    
    if ($action === 'logs') {
        // Get activity logs with optional filtering and pagination
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;
        
        $filters = [];
        if (isset($_GET['filterAction']) && $_GET['filterAction'] !== '') {
            $filters['action'] = $_GET['filterAction'];
        }
        if (isset($_GET['filterFilename']) && $_GET['filterFilename'] !== '') {
            $filters['filename'] = $_GET['filterFilename'];
        }
        if (isset($_GET['search']) && $_GET['search'] !== '') {
            $filters['search'] = $_GET['search'];
        }
        if (isset($_GET['startDate']) && $_GET['startDate'] !== '') {
            $filters['startDate'] = $_GET['startDate'];
        }
        if (isset($_GET['endDate']) && $_GET['endDate'] !== '') {
            $filters['endDate'] = $_GET['endDate'];
        }
        
        $result = read_activity_logs($limit, $offset, $filters);
        
        $totalPages = $limit > 0 ? ceil($result['filtered'] / $limit) : 1;
        
        echo json_encode([
            'success' => true,
            'type' => 'logs',
            'logs' => $result['logs'],
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $result['total'],
                'filtered' => $result['filtered'],
                'totalPages' => $totalPages
            ],
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($action === 'logs-cleanup') {
        if (strtoupper($method) !== 'POST') {
            throw new RuntimeException('Metode HTTP tidak diizinkan.');
        }
        
        $rawBody = file_get_contents('php://input');
        $payload = json_decode($rawBody, true);
        
        // Allow days = 0 for "delete all", otherwise minimum 1 day
        $days = isset($payload['days']) ? max(0, (int)$payload['days']) : 30;
        
        $deletedCount = cleanup_activity_logs($days);
        
        // Log the cleanup action itself (only if not deleting all logs)
        if ($days > 0 || $deletedCount > 0) {
            write_activity_log('cleanup', 'activity_logs', 'system', '', [
                'days' => $days,
                'deleted' => $deletedCount,
                'type' => $days === 0 ? 'all' : 'by_age'
            ]);
        }
        
        echo json_encode([
            'success' => true,
            'type' => 'logs-cleanup',
            'deleted' => $deletedCount,
            'days' => $days,
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($action === 'logs-export') {
        $format = isset($_GET['format']) ? strtolower($_GET['format']) : 'json';
        
        $filters = [];
        if (isset($_GET['filterAction']) && $_GET['filterAction'] !== '') {
            $filters['action'] = $_GET['filterAction'];
        }
        if (isset($_GET['filterType']) && $_GET['filterType'] !== '') {
            $filters['targetType'] = $_GET['filterType'];
        }
        if (isset($_GET['search']) && $_GET['search'] !== '') {
            $filters['search'] = $_GET['search'];
        }
        
        if ($format === 'csv') {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="activity_logs_' . date('Y-m-d_His') . '.csv"');
            echo export_logs_csv($filters);
        } else {
            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="activity_logs_' . date('Y-m-d_His') . '.json"');
            echo export_logs_json($filters);
        }
        exit;
    }
    
    // =========================================================================
    // FILE MANAGER API ENDPOINTS
    // =========================================================================

    if ($action === 'create') {
        if (strtoupper($method) !== 'POST') {
            throw new RuntimeException('Metode HTTP tidak diizinkan.');
        }

        $rawBody = file_get_contents('php://input');
        if ($rawBody === false) {
            throw new RuntimeException('Payload tidak dapat dibaca.');
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            throw new RuntimeException('Payload tidak valid.');
        }

        $type = isset($payload['type']) && is_string($payload['type']) ? strtolower($payload['type']) : '';
        $name = isset($payload['name']) && is_string($payload['name']) ? trim($payload['name']) : '';

        if ($type === '' || !in_array($type, ['file', 'folder'], true)) {
            throw new RuntimeException('Tipe tidak valid.');
        }

        if ($name === '') {
            throw new RuntimeException('Nama wajib diisi.');
        }

        $targetPath = $sanitizedPath === '' ? $name : $sanitizedPath . '/' . $name;

        if ($type === 'folder') {
            $created = create_folder($root, $targetPath);
        } else {
            $content = isset($payload['content']) && is_string($payload['content']) ? $payload['content'] : '';
            $created = create_file($root, $targetPath, $content);
        }

        // Log activity
        write_activity_log('create', $name, $type, $sanitizedPath);

        echo json_encode([
            'success' => true,
            'type' => 'create',
            'item' => $created,
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'upload') {
        if (strtoupper($method) !== 'POST') {
            throw new RuntimeException('Metode HTTP tidak diizinkan.');
        }

        $targetPath = $sanitizedPath;
        if (isset($_POST['path']) && is_string($_POST['path'])) {
            $targetPath = sanitize_relative_path(rawurldecode($_POST['path']));
        }

        // Support chunked uploads: client sends field 'file' (single chunk), plus
        // 'chunkIndex' (0-based) and 'totalChunks'. 'originalName' must contain the original filename.
        if (isset($_FILES['file']) && isset($_POST['chunkIndex'])) {
            $originalName = '';
            if (isset($_POST['originalName']) && is_string($_POST['originalName'])) {
                $originalName = $_POST['originalName'];
            } elseif (isset($_POST['name']) && is_string($_POST['name'])) {
                $originalName = $_POST['name'];
            }

            $chunkIndex = isset($_POST['chunkIndex']) ? (int) $_POST['chunkIndex'] : 0;
            $totalChunks = isset($_POST['totalChunks']) ? (int) $_POST['totalChunks'] : 1;
            $fileEntry = $_FILES['file'];

            $result = upload_chunk($root, $targetPath, $fileEntry, $originalName, $chunkIndex, $totalChunks);

            $hasErrors = !empty($result['errors'] ?? []);
            if ($hasErrors) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'type' => 'upload',
                    'uploaded' => $result['uploaded'] ?? [],
                    'errors' => $result['errors'],
                    'finished' => $result['finished'] ?? false,
                    'generated_at' => time(),
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Log activity when upload is finished
            if (!empty($result['finished']) && !empty($result['uploaded'])) {
                foreach ($result['uploaded'] as $uploaded) {
                    write_activity_log('upload', $uploaded['name'] ?? $originalName, 'file', $targetPath, [
                        'size' => $uploaded['size'] ?? 0
                    ]);
                }
            }

            echo json_encode([
                'success' => true,
                'type' => 'upload',
                'uploaded' => $result['uploaded'] ?? [],
                'errors' => $result['errors'] ?? [],
                'finished' => $result['finished'] ?? false,
                'generated_at' => time(),
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Legacy / non-chunked upload (multiple files)
        if (!isset($_FILES['files'])) {
            throw new RuntimeException('Tidak ada file yang diunggah.');
        }

        $result = upload_files($root, $targetPath, $_FILES['files']);
        $hasUploads = !empty($result['uploaded']);
        $hasErrors = !empty($result['errors']);

        // Log activity for successful uploads
        if ($hasUploads) {
            foreach ($result['uploaded'] as $uploaded) {
                write_activity_log('upload', $uploaded['name'] ?? 'unknown', 'file', $targetPath, [
                    'size' => $uploaded['size'] ?? 0
                ]);
            }
        }

        if (!$hasUploads && $hasErrors) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'type' => 'upload',
                'uploaded' => [],
                'errors' => $result['errors'],
                'generated_at' => time(),
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($hasErrors) {
            http_response_code(207);
        }

        echo json_encode([
            'success' => true,
            'type' => 'upload',
            'uploaded' => $result['uploaded'],
            'errors' => $result['errors'],
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'content') {
        if ($sanitizedPath === '') {
            throw new RuntimeException('Path file wajib diisi.');
        }

    $file = read_text_file($root, $sanitizedPath, $editableExtensions);

        echo json_encode([
            'success' => true,
            'type' => 'content',
            'path' => $file['path'],
            'name' => $file['name'],
            'size' => $file['size'],
            'modified' => $file['modified'],
            'content' => $file['content'],
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'save') {
        if ($sanitizedPath === '') {
            throw new RuntimeException('Path file wajib diisi.');
        }

        if (strtoupper($method) !== 'POST') {
            throw new RuntimeException('Metode HTTP tidak diizinkan.');
        }

        $rawBody = file_get_contents('php://input');
        if ($rawBody === false) {
            throw new RuntimeException('Payload tidak dapat dibaca.');
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload) || !array_key_exists('content', $payload)) {
            throw new RuntimeException('Payload tidak valid.');
        }

        if (!is_string($payload['content'])) {
            throw new RuntimeException('Konten wajib berupa string.');
        }

        $content = $payload['content'];
    $file = write_text_file($root, $sanitizedPath, $content, $editableExtensions);

        // Log activity
        write_activity_log('save', $file['name'], 'file', $sanitizedPath, [
            'size' => $file['size']
        ]);

        echo json_encode([
            'success' => true,
            'type' => 'save',
            'path' => $file['path'],
            'name' => $file['name'],
            'size' => $file['size'],
            'modified' => $file['modified'],
            'characters' => function_exists('mb_strlen') ? mb_strlen($content, 'UTF-8') : strlen($content),
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'delete') {
        // Debug logging
        error_log('[DEBUG] Delete action triggered');
        
        if (strtoupper($method) !== 'POST') {
            error_log('[DEBUG] Invalid method: ' . $method);
            throw new RuntimeException('Metode HTTP tidak diizinkan.');
        }

        $rawBody = file_get_contents('php://input');
        if ($rawBody === false) {
            error_log('[DEBUG] Failed to read payload');
            throw new RuntimeException('Payload tidak dapat dibaca.');
        }

        error_log('[DEBUG] Raw payload: ' . $rawBody);

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            error_log('[DEBUG] Invalid payload format');
            throw new RuntimeException('Payload tidak valid.');
        }

        $paths = [];

        if (isset($payload['paths'])) {
            if (!is_array($payload['paths'])) {
                error_log('[DEBUG] Paths is not an array');
                throw new RuntimeException('Daftar path harus berupa array.');
            }

            $paths = array_values(array_filter(array_map(static function ($value) {
                if (!is_string($value)) {
                    return '';
                }
                return sanitize_relative_path(rawurldecode($value));
            }, $payload['paths']), static function ($value) {
                return $value !== '';
            }));
            
            error_log('[DEBUG] Processed paths from payload: ' . implode(', ', $paths));
        } elseif (isset($payload['path'])) {
            if (!is_string($payload['path'])) {
                error_log('[DEBUG] Single path is not a string');
                throw new RuntimeException('Path wajib berupa string.');
            }
            $single = sanitize_relative_path(rawurldecode($payload['path']));
            if ($single !== '') {
                $paths[] = $single;
                error_log('[DEBUG] Processed single path: ' . $single);
            }
        } elseif ($sanitizedPath !== '') {
            $paths[] = $sanitizedPath;
            error_log('[DEBUG] Using sanitized path: ' . $sanitizedPath);
        }

        if (empty($paths)) {
            error_log('[DEBUG] No paths to delete');
            throw new RuntimeException('Path yang akan dihapus wajib diisi.');
        }

        error_log('[DEBUG] Calling delete_paths with paths: ' . implode(', ', $paths));
        $result = delete_paths($root, $paths);
        error_log('[DEBUG] Delete result: ' . json_encode($result));

        // Log activity for successful deletions
        if (!empty($result['deleted'])) {
            foreach ($result['deleted'] as $deleted) {
                write_activity_log('delete', $deleted['name'] ?? basename($deleted['path'] ?? ''), $deleted['type'] ?? 'file', $deleted['path'] ?? '');
            }
        }
        
        $success = count($result['errors']) === 0;

        if (!$success) {
            http_response_code(207);
        }

        echo json_encode([
            'success' => $success,
            'type' => 'delete',
            'deleted' => $result['deleted'],
            'failed' => $result['errors'],
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'rename') {
        if (strtoupper($method) !== 'POST') {
            throw new RuntimeException('Metode HTTP tidak diizinkan.');
        }

        if ($sanitizedPath === '') {
            throw new RuntimeException('Path item wajib diisi.');
        }

        $rawBody = file_get_contents('php://input');
        if ($rawBody === false) {
            throw new RuntimeException('Payload tidak dapat dibaca.');
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            throw new RuntimeException('Payload tidak valid.');
        }

        $newName = isset($payload['newName']) && is_string($payload['newName']) ? trim($payload['newName']) : '';
        $newPath = isset($payload['newPath']) && is_string($payload['newPath']) ? trim($payload['newPath']) : '';

        if ($newName === '') {
            throw new RuntimeException('Nama baru wajib diisi.');
        }

        if ($newPath === '') {
            throw new RuntimeException('Path baru wajib diisi.');
        }

        $sanitizedNewPath = sanitize_relative_path(rawurldecode($newPath));
        if ($sanitizedNewPath === '') {
            throw new RuntimeException('Path baru tidak valid.');
        }

        $renamed = rename_item($root, $sanitizedPath, $sanitizedNewPath);

        // Log activity
        write_activity_log('rename', $renamed['name'], $renamed['type'], $sanitizedNewPath, [
            'oldPath' => $sanitizedPath,
            'oldName' => basename($sanitizedPath)
        ]);

        echo json_encode([
            'success' => true,
            'type' => 'rename',
            'item' => $renamed,
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'move') {
        error_log('[DEBUG] Move action triggered');
        
        if (strtoupper($method) !== 'POST') {
            error_log('[DEBUG] Invalid method: ' . $method);
            throw new RuntimeException('Metode HTTP tidak diizinkan.');
        }

        $rawBody = file_get_contents('php://input');
        if ($rawBody === false) {
            error_log('[DEBUG] Failed to read payload');
            throw new RuntimeException('Payload tidak dapat dibaca.');
        }

        error_log('[DEBUG] Raw payload: ' . $rawBody);

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            error_log('[DEBUG] Invalid payload format');
            throw new RuntimeException('Payload tidak valid.');
        }

        $sourcePath = isset($payload['sourcePath']) && is_string($payload['sourcePath']) ? trim($payload['sourcePath']) : '';
        $targetPath = isset($payload['targetPath']) && is_string($payload['targetPath']) ? trim($payload['targetPath']) : '';

        error_log('[DEBUG] Source path: "' . $sourcePath . '"');
        error_log('[DEBUG] Target path: "' . $targetPath . '"');

        if ($sourcePath === '') {
            error_log('[DEBUG] Empty source path');
            throw new RuntimeException('Path sumber wajib diisi.');
        }

        // Allow empty target path (means move to root)
        // But we need to handle it properly in the move_item function
        error_log('[DEBUG] Target path validation passed');

        $sanitizedSourcePath = sanitize_relative_path(rawurldecode($sourcePath));
        $sanitizedTargetPath = sanitize_relative_path(rawurldecode($targetPath));

        error_log('[DEBUG] Sanitized source path: "' . $sanitizedSourcePath . '"');
        error_log('[DEBUG] Sanitized target path: "' . $sanitizedTargetPath . '"');

        if ($sanitizedSourcePath === '') {
            throw new RuntimeException('Path sumber tidak valid.');
        }

        // Extract the filename from source path
        $sourceSegments = explode('/', $sanitizedSourcePath);
        $fileName = end($sourceSegments);
        
        // Build the new full path
        // If target path is empty, it means move to root
        $newPath = $sanitizedTargetPath === '' ? $fileName : $sanitizedTargetPath . '/' . $fileName;
        
        error_log('[DEBUG] Final new path: "' . $newPath . '"');

        $moved = move_item($root, $sanitizedSourcePath, $newPath);

        // Log activity
        write_activity_log('move', $moved['name'], $moved['type'], $moved['path'], [
            'oldPath' => $sanitizedSourcePath,
            'newPath' => $moved['path']
        ]);

        echo json_encode([
            'success' => true,
            'type' => 'move',
            'item' => $moved,
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $items = list_directory($root, $sanitizedPath);
    $breadcrumbs = build_breadcrumbs($sanitizedPath, 'Root');

    $parent = null;
    if ($sanitizedPath !== '') {
        $segments = explode('/', $sanitizedPath);
        array_pop($segments);
        $parent = implode('/', $segments);
    }

    echo json_encode([
        'success' => true,
        'path' => $sanitizedPath,
        'parent' => $parent,
        'breadcrumbs' => $breadcrumbs,
        'items' => $items,
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}

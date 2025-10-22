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

        if (!isset($_FILES['files'])) {
            throw new RuntimeException('Tidak ada file yang diunggah.');
        }

        $targetPath = $sanitizedPath;
        if (isset($_POST['path']) && is_string($_POST['path'])) {
            $targetPath = sanitize_relative_path(rawurldecode($_POST['path']));
        }

        $result = upload_files($root, $targetPath, $_FILES['files']);
        $hasUploads = !empty($result['uploaded']);
        $hasErrors = !empty($result['errors']);

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

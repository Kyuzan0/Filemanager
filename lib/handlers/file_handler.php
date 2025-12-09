<?php

/**
 * File Handler
 * Handles file and folder CRUD operations
 */

/**
 * Handle create file/folder action
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath Current path
 * @param string $method HTTP request method
 * @return void
 */
function handle_create_action(string $root, string $sanitizedPath, string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();

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

/**
 * Handle file upload action
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath Current path
 * @param string $method HTTP request method
 * @return void
 */
function handle_upload_action(string $root, string $sanitizedPath, string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $targetPath = $sanitizedPath;
    if (isset($_POST['path']) && is_string($_POST['path'])) {
        $targetPath = sanitize_relative_path(rawurldecode($_POST['path']));
    }

    // Support chunked uploads
    if (isset($_FILES['file']) && isset($_POST['chunkIndex'])) {
        handle_chunked_upload($root, $targetPath);
        return;
    }

    // Legacy / non-chunked upload (multiple files)
    if (!isset($_FILES['files'])) {
        throw new RuntimeException('Tidak ada file yang diunggah.');
    }

    handle_standard_upload($root, $targetPath);
}

/**
 * Handle chunked file upload
 * 
 * @param string $root Root directory path
 * @param string $targetPath Target path
 * @return void
 */
function handle_chunked_upload(string $root, string $targetPath): void
{
    $originalName = '';
    if (isset($_POST['originalName']) && is_string($_POST['originalName'])) {
        $originalName = $_POST['originalName'];
    } elseif (isset($_POST['name']) && is_string($_POST['name'])) {
        $originalName = $_POST['name'];
    }

    $chunkIndex = isset($_POST['chunkIndex']) ? (int) $_POST['chunkIndex'] : 0;
    $totalChunks = isset($_POST['totalChunks']) ? (int) $_POST['totalChunks'] : 1;
    $fileEntry = $_FILES['file'];

    // Check if this is a folder upload with relative path
    $isFolderUpload = isset($_POST['folderUpload']) && $_POST['folderUpload'] === 'true';
    $relativePath = '';
    if ($isFolderUpload && isset($_POST['relativePath']) && is_string($_POST['relativePath'])) {
        $relativePath = $_POST['relativePath'];
    }

    if ($isFolderUpload && !empty($relativePath)) {
        $result = upload_chunk_with_folder($root, $targetPath, $fileEntry, $originalName, $chunkIndex, $totalChunks, $relativePath);
    } else {
        $result = upload_chunk($root, $targetPath, $fileEntry, $originalName, $chunkIndex, $totalChunks);
    }

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
        log_upload_activity($result['uploaded'], $targetPath, $originalName);
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

/**
 * Handle standard (non-chunked) file upload
 * 
 * @param string $root Root directory path
 * @param string $targetPath Target path
 * @return void
 */
function handle_standard_upload(string $root, string $targetPath): void
{
    // Check if this is a folder upload with relative paths
    $isFolderUpload = isset($_POST['folderUpload']) && $_POST['folderUpload'] === 'true';
    $relativePaths = [];
    if ($isFolderUpload && isset($_POST['relativePaths'])) {
        // Handle both JSON string and array format
        if (is_string($_POST['relativePaths'])) {
            $decoded = json_decode($_POST['relativePaths'], true);
            if (is_array($decoded)) {
                $relativePaths = $decoded;
            }
        } elseif (is_array($_POST['relativePaths'])) {
            $relativePaths = $_POST['relativePaths'];
        }
    }

    if ($isFolderUpload && !empty($relativePaths)) {
        // Folder upload: use upload_files_with_folders
        $result = upload_files_with_folders($root, $targetPath, $_FILES['files'], $relativePaths);
    } else {
        // Regular file upload
        $result = upload_files($root, $targetPath, $_FILES['files']);
    }

    $hasUploads = !empty($result['uploaded']);
    $hasErrors = !empty($result['errors']);

    // Log activity for successful uploads
    if ($hasUploads) {
        log_upload_activity($result['uploaded'], $targetPath);
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

/**
 * Log upload activity
 * 
 * @param array $uploaded Uploaded files
 * @param string $targetPath Target path
 * @param string|null $originalName Original file name (for chunked uploads)
 * @return void
 */
function log_upload_activity(array $uploaded, string $targetPath, ?string $originalName = null): void
{
    $uploadedCount = count($uploaded);

    if ($uploadedCount === 1) {
        // Single file upload - log individually
        $uploadedItem = $uploaded[0];
        write_activity_log('upload', $uploadedItem['name'] ?? $originalName ?? 'unknown', 'file', $targetPath, [
            'size' => $uploadedItem['size'] ?? 0
        ]);
    } else {
        // Multiple files upload - log as bulk action
        $totalSize = array_sum(array_column($uploaded, 'size'));
        $fileNames = array_column($uploaded, 'name');

        $bulkFilename = $uploadedCount . ' files';
        write_activity_log('bulk_upload', $bulkFilename, 'bulk', $targetPath, [
            'count' => $uploadedCount,
            'fileCount' => $uploadedCount,
            'totalSize' => $totalSize,
            'items' => $fileNames
        ]);
    }
}

/**
 * Handle file content read action
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath File path
 * @param array $editableExtensions Allowed editable extensions
 * @return void
 */
function handle_content_action(string $root, string $sanitizedPath, array $editableExtensions): void
{
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

/**
 * Handle file save action
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath File path
 * @param string $method HTTP request method
 * @param array $editableExtensions Allowed editable extensions
 * @return void
 */
function handle_save_action(string $root, string $sanitizedPath, string $method, array $editableExtensions): void
{
    if ($sanitizedPath === '') {
        throw new RuntimeException('Path file wajib diisi.');
    }

    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();

    if (!array_key_exists('content', $payload)) {
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

/**
 * Handle delete action (move to trash)
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath Current path
 * @param string $method HTTP request method
 * @return void
 */
function handle_delete_action(string $root, string $sanitizedPath, string $method): void
{
    // Debug logging
    fm_debug_log('Delete action triggered');

    if (strtoupper($method) !== 'POST') {
        fm_debug_log('Invalid method: ' . $method);
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();
    fm_debug_log('Raw payload received');

    $paths = extract_delete_paths($payload, $sanitizedPath);

    if (empty($paths)) {
        fm_debug_log('No paths to delete');
        throw new RuntimeException('Path yang akan dihapus wajib diisi.');
    }

    fm_debug_log('Moving items to trash: ' . implode(', ', $paths));
    $result = move_to_trash($root, $paths);
    fm_debug_log('Trash result: ' . json_encode($result));

    $success = count($result['errors']) === 0;

    if (!$success) {
        http_response_code(207);
    }

    echo json_encode([
        'success' => $success,
        'type' => 'delete',
        'deleted' => $result['trashed'],
        'failed' => $result['errors'],
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Extract paths for deletion from payload
 * 
 * @param array $payload Request payload
 * @param string $sanitizedPath Fallback path
 * @return array
 */
function extract_delete_paths(array $payload, string $sanitizedPath): array
{
    $paths = [];

    if (isset($payload['paths'])) {
        if (!is_array($payload['paths'])) {
            fm_debug_log('Paths is not an array');
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

        fm_debug_log('Processed paths from payload: ' . implode(', ', $paths));
    } elseif (isset($payload['path'])) {
        if (!is_string($payload['path'])) {
            fm_debug_log('Single path is not a string');
            throw new RuntimeException('Path wajib berupa string.');
        }
        $single = sanitize_relative_path(rawurldecode($payload['path']));
        if ($single !== '') {
            $paths[] = $single;
            fm_debug_log('Processed single path: ' . $single);
        }
    } elseif ($sanitizedPath !== '') {
        $paths[] = $sanitizedPath;
        fm_debug_log('Using sanitized path: ' . $sanitizedPath);
    }

    return $paths;
}

/**
 * Handle rename action
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath Item path
 * @param string $method HTTP request method
 * @return void
 */
function handle_rename_action(string $root, string $sanitizedPath, string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    if ($sanitizedPath === '') {
        throw new RuntimeException('Path item wajib diisi.');
    }

    $payload = get_json_payload();

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

/**
 * Handle move action
 * 
 * @param string $root Root directory path
 * @param string $method HTTP request method
 * @return void
 */
function handle_move_action(string $root, string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();

    $targetPath = isset($payload['targetPath']) && is_string($payload['targetPath']) ? trim($payload['targetPath']) : '';

    // Support both single path and multiple paths
    $sourcePaths = [];

    if (isset($payload['sourcePaths']) && is_array($payload['sourcePaths'])) {
        // New format: multiple paths
        $sourcePaths = array_filter(array_map(function ($path) {
            if (!is_string($path))
                return '';
            return sanitize_relative_path(rawurldecode(trim($path)));
        }, $payload['sourcePaths']), function ($path) {
            return $path !== '';
        });
    } elseif (isset($payload['sourcePath']) && is_string($payload['sourcePath'])) {
        // Legacy format: single path
        $sanitizedPath = sanitize_relative_path(rawurldecode(trim($payload['sourcePath'])));
        if ($sanitizedPath !== '') {
            $sourcePaths = [$sanitizedPath];
        }
    }

    if (empty($sourcePaths)) {
        throw new RuntimeException('Path sumber wajib diisi.');
    }

    // Sanitize target path
    $sanitizedTargetPath = sanitize_relative_path(rawurldecode($targetPath));

    // Move items
    $result = move_items($root, $sourcePaths, $sanitizedTargetPath);

    $success = count($result['errors']) === 0;

    if (!$success) {
        http_response_code(207); // Multi-Status for partial success
    }

    echo json_encode([
        'success' => $success,
        'type' => 'move',
        'moved' => $result['moved'],
        'errors' => $result['errors'],
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle directory listing action
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath Current path
 * @return void
 */
function handle_list_action(string $root, string $sanitizedPath): void
{
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
    exit;
}

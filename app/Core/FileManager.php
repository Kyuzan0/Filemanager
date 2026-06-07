<?php

// Debug mode - set to true during development, false in production
if (!defined('FM_DEBUG')) {
    define('FM_DEBUG', false);
}

/**
 * Log debug message only when FM_DEBUG is enabled
 */
function fm_debug_log(string $message): void
{
    if (FM_DEBUG) {
        error_log('[DEBUG] ' . $message);
    }
}

// Path functions (sanitize_relative_path, build_breadcrumbs, resolve_path,
// assert_writable_directory, get_editable_extensions) moved to PathResolver.php

function read_text_file(string $root, string $relativePath, array $allowedExtensions, int $maxBytes = 262144): array
{
    [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath] = resolve_path($root, $relativePath);

    if (!is_file($realTargetPath) || !is_readable($realTargetPath)) {
        throw new RuntimeException('File tidak dapat diakses.');
    }

    $extension = strtolower(pathinfo($realTargetPath, PATHINFO_EXTENSION));
    if (!in_array($extension, $allowedExtensions, true)) {
        throw new RuntimeException('Tipe file tidak didukung untuk pratinjau.');
    }

    $size = filesize($realTargetPath);
    if ($size === false) {
        throw new RuntimeException('Ukuran file tidak dapat ditentukan.');
    }

    if ($size > $maxBytes) {
        throw new RuntimeException('File terlalu besar untuk pratinjau.');
    }

    $content = file_get_contents($realTargetPath);
    if ($content === false) {
        throw new RuntimeException('Gagal membaca file.');
    }

    if (function_exists('mb_detect_encoding')) {
        $encoding = mb_detect_encoding($content, ['UTF-8', 'UTF-16', 'UTF-32', 'ISO-8859-1'], true) ?: 'UTF-8';
        if ($encoding !== 'UTF-8' && function_exists('mb_convert_encoding')) {
            $content = mb_convert_encoding($content, 'UTF-8', $encoding);
        }
    }

    return [
        'name' => basename($realTargetPath),
        'path' => $sanitizedRelativeUrl,
        'size' => $size,
        'modified' => filemtime($realTargetPath) ?: null,
        'content' => $content,
    ];
}

function write_text_file(string $root, string $relativePath, string $content, array $allowedExtensions, int $maxBytes = 262144): array
{
    [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath] = resolve_path($root, $relativePath);

    if (!is_file($realTargetPath)) {
        throw new RuntimeException('File tidak dapat diubah.');
    }

    $isWritable = is_writable($realTargetPath);
    $handle = null;

    if (!$isWritable) {
        $handle = @fopen($realTargetPath, 'r+');
        if ($handle === false) {
            throw new RuntimeException('File tidak dapat diubah. Periksa izin akses.');
        }
        fclose($handle);
    }

    $extension = strtolower(pathinfo($realTargetPath, PATHINFO_EXTENSION));
    if (!in_array($extension, $allowedExtensions, true)) {
        throw new RuntimeException('Tipe file tidak didukung untuk penyuntingan.');
    }

    if (strlen($content) > $maxBytes) {
        throw new RuntimeException('Konten terlalu besar untuk disimpan.');
    }

    $writeResult = @file_put_contents($realTargetPath, $content, LOCK_EX);
    if ($writeResult === false) {
        $error = error_get_last();
        $message = $error['message'] ?? 'Gagal menyimpan file.';
        throw new RuntimeException($message);
    }

    clearstatcache(true, $realTargetPath);
    $size = filesize($realTargetPath);
    $modified = filemtime($realTargetPath) ?: null;

    return [
        'name' => basename($realTargetPath),
        'path' => $sanitizedRelativeUrl,
        'size' => $size === false ? null : $size,
        'modified' => $modified,
    ];
}

function delete_single_path(string $root, string $relativePath): array
{
    fm_debug_log('delete_single_path called with root: ' . $root . ' and relative path: ' . $relativePath);

    [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath] = resolve_path($root, $relativePath);

    fm_debug_log('Resolved paths - normalizedRoot: ' . $normalizedRoot . ', sanitizedRelativeUrl: ' . $sanitizedRelativeUrl . ', realTargetPath: ' . $realTargetPath);

    if ($sanitizedRelativeUrl === '') {
        fm_debug_log('Attempted to delete root directory');
        throw new RuntimeException('Tidak dapat menghapus direktori root.');
    }

    if (!file_exists($realTargetPath)) {
        fm_debug_log('Path does not exist: ' . $realTargetPath);
        throw new RuntimeException('Path tidak ditemukan.');
    }

    $isDir = is_dir($realTargetPath);
    fm_debug_log('Path is directory: ' . ($isDir ? 'true' : 'false'));

    if ($isDir) {
        fm_debug_log('Deleting directory recursively');
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $realTargetPath,
                FilesystemIterator::SKIP_DOTS | FilesystemIterator::CURRENT_AS_FILEINFO
            ),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            /** @var SplFileInfo $item */
            $pathName = $item->getPathname();
            if ($item->isDir()) {
                fm_debug_log('Deleting subdirectory: ' . $pathName);
                if (!@rmdir($pathName)) {
                    $error = error_get_last();
                    $message = $error['message'] ?? 'Gagal menghapus direktori.';
                    fm_debug_log('Failed to delete subdirectory: ' . $pathName . ' with error: ' . $message);
                    throw new RuntimeException($message);
                }
            } else {
                fm_debug_log('Deleting file: ' . $pathName);
                if (!@unlink($pathName)) {
                    $error = error_get_last();
                    $message = $error['message'] ?? 'Gagal menghapus file.';
                    fm_debug_log('Failed to delete file: ' . $pathName . ' with error: ' . $message);
                    throw new RuntimeException($message);
                }
            }
        }

        fm_debug_log('Deleting main directory: ' . $realTargetPath);
        if (!@rmdir($realTargetPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal menghapus direktori.';
            fm_debug_log('Failed to delete main directory: ' . $realTargetPath . ' with error: ' . $message);
            throw new RuntimeException($message);
        }
    } else {
        fm_debug_log('Deleting file: ' . $realTargetPath);
        if (!@unlink($realTargetPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal menghapus file.';
            fm_debug_log('Failed to delete file: ' . $realTargetPath . ' with error: ' . $message);
            throw new RuntimeException($message);
        }
    }

    $result = [
        'name' => basename($realTargetPath),
        'path' => $sanitizedRelativeUrl,
        'type' => $isDir ? 'folder' : 'file',
    ];

    fm_debug_log('Successfully deleted item: ' . json_encode($result));
    return $result;
}

function delete_paths(string $root, array $relativePaths): array
{
    fm_debug_log('delete_paths called with root: ' . $root . ' and paths: ' . implode(', ', $relativePaths));

    $deleted = [];
    $errors = [];

    $uniquePaths = [];
    foreach ($relativePaths as $path) {
        if (!is_string($path)) {
            fm_debug_log('Skipping non-string path: ' . print_r($path, true));
            continue;
        }

        $sanitized = sanitize_relative_path($path);
        if ($sanitized === '' || isset($uniquePaths[$sanitized])) {
            fm_debug_log('Skipping empty or duplicate path: ' . $sanitized);
            continue;
        }

        $uniquePaths[$sanitized] = $sanitized;
        fm_debug_log('Added unique path: ' . $sanitized);
    }

    foreach ($uniquePaths as $sanitized) {
        try {
            fm_debug_log('Attempting to delete path: ' . $sanitized);
            $result = delete_single_path($root, $sanitized);
            $deleted[] = $result;

            fm_debug_log('Successfully deleted path: ' . $sanitized);
        } catch (Throwable $e) {
            fm_debug_log('Failed to delete path: ' . $sanitized . ' with error: ' . $e->getMessage());

            $errors[] = [
                'path' => $sanitized,
                'error' => $e->getMessage(),
            ];
        }
    }

    $result = [
        'deleted' => $deleted,
        'errors' => $errors,
    ];

    fm_debug_log('delete_paths result: ' . json_encode($result));
    return $result;
}

function prepare_creation_target(string $root, string $relativePath): array
{
    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    $sanitized = sanitize_relative_path($relativePath);
    if ($sanitized === '') {
        throw new RuntimeException('Nama wajib diisi.');
    }

    $segments = explode('/', $sanitized);
    $name = array_pop($segments);

    if ($name === null || $name === '') {
        throw new RuntimeException('Nama wajib diisi.');
    }

    if (preg_match('/[\\\\\/]/', $name)) {
        throw new RuntimeException('Nama tidak valid.');
    }

    $parentRelative = implode('/', array_filter($segments, static fn($value) => $value !== ''));
    $parentPath = $normalizedRoot;

    if ($parentRelative !== '') {
        [, , $parentPath] = resolve_path($root, $parentRelative);
    }

    if (!is_dir($parentPath)) {
        throw new RuntimeException('Direktori induk tidak ditemukan.');
    }

    assert_writable_directory($parentPath);

    $targetPath = $parentPath . DIRECTORY_SEPARATOR . $name;

    if (file_exists($targetPath)) {
        throw new RuntimeException('Nama sudah digunakan.');
    }

    return [
        'root' => $normalizedRoot,
        'sanitized' => $sanitized,
        'parent_relative' => $parentRelative,
        'parent_path' => $parentPath,
        'name' => $name,
        'target_path' => $targetPath,
    ];
}

function create_folder(string $root, string $relativePath): array
{
    $info = prepare_creation_target($root, $relativePath);

    if (!@mkdir($info['target_path'], 0775, false)) {
        $error = error_get_last();
        $message = $error['message'] ?? 'Gagal membuat folder baru.';
        throw new RuntimeException($message);
    }

    clearstatcache(true, $info['target_path']);
    $modified = filemtime($info['target_path']) ?: time();

    return [
        'name' => $info['name'],
        'path' => $info['sanitized'],
        'type' => 'folder',
        'modified' => $modified,
        'size' => 0,
    ];
}

function create_file(string $root, string $relativePath, string $content = ''): array
{
    $info = prepare_creation_target($root, $relativePath);

    $bytes = @file_put_contents($info['target_path'], $content, LOCK_EX);
    if ($bytes === false) {
        $error = error_get_last();
        $message = $error['message'] ?? 'Gagal membuat file baru.';
        throw new RuntimeException($message);
    }

    clearstatcache(true, $info['target_path']);
    $modified = filemtime($info['target_path']) ?: time();

    return [
        'name' => $info['name'],
        'path' => $info['sanitized'],
        'type' => 'file',
        'modified' => $modified,
        'size' => $bytes,
    ];
}

// Upload functions moved to UploadManager.php

function list_directory(string $root, string $relativePath = ''): array
{
    [$normalizedRoot, , $realTargetPath] = resolve_path($root, $relativePath);

    if (!is_dir($realTargetPath) || !is_readable($realTargetPath)) {
        throw new RuntimeException('Direktori tidak dapat diakses.');
    }

    $items = [];
    try {
        $dir = new DirectoryIterator($realTargetPath);
    } catch (UnexpectedValueException $e) {
        throw new RuntimeException('Direktori tidak dapat diproses.', 0, $e);
    }

    foreach ($entries as $entry) {
        $originalName = is_string($entry['name']) ? $entry['name'] : '';
        $tmpName = is_string($entry['tmp_name']) ? $entry['tmp_name'] : '';
        $size = is_numeric($entry['size']) ? (int) $entry['size'] : 0;
        $errorCode = is_numeric($entry['error']) ? (int) $entry['error'] : UPLOAD_ERR_NO_FILE;
        $relPath = is_string($entry['relativePath']) ? $entry['relativePath'] : '';

        if ($errorCode === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        if ($errorCode !== UPLOAD_ERR_OK) {
            $errors[] = [
                'name' => $relPath ?: $originalName,
                'error' => upload_code_to_message($errorCode),
            ];
            continue;
        }

        $basename = basename($originalName);
        if ($basename === '' || preg_match('/[\\\\\/]/', $basename)) {
            $errors[] = [
                'name' => $relPath ?: $originalName,
                'error' => 'Nama file tidak valid.',
            ];
            continue;
        }

        // Validate file extension against dangerous extensions blocklist
        $extValidation = validate_file_extension($basename);
        if (!$extValidation['valid']) {
            $errors[] = [
                'name' => $relPath ?: $originalName,
                'error' => $extValidation['error'],
            ];
            continue;
        }

        if (!is_uploaded_file($tmpName)) {
            $errors[] = [
                'name' => $relPath ?: $originalName,
                'error' => 'File upload tidak valid.',
            ];
            continue;
        }

        // Determine target directory based on relative path
        $subfolderPath = '';
        if (!empty($relPath) && strpos($relPath, '/') !== false) {
            // Extract folder path from relativePath (e.g., "folder/subfolder/file.txt" -> "folder/subfolder")
            $subfolderPath = dirname($relPath);
            // Sanitize the subfolder path
            $subfolderPath = sanitize_relative_path($subfolderPath);
        }

        // Create target directory including subfolders
        $targetDir = $realTargetPath;
        if (!empty($subfolderPath)) {
            $targetDir = $realTargetPath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $subfolderPath);

            // Create subdirectories if they don't exist
            if (!is_dir($targetDir)) {
                if (!@mkdir($targetDir, 0755, true)) {
                    $error = error_get_last();
                    $message = $error['message'] ?? 'Gagal membuat direktori.';
                    $errors[] = [
                        'name' => $relPath,
                        'error' => $message,
                    ];
                    continue;
                }
            }
        }

        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $basename;

        // Check for existing file
        if (file_exists($targetPath)) {
            // Generate unique name
            $pathInfo = pathinfo($basename);
            $nameWithoutExt = $pathInfo['filename'];
            $ext = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
            $counter = 1;
            while (file_exists($targetPath)) {
                $newBasename = $nameWithoutExt . '_' . $counter . $ext;
                $targetPath = $targetDir . DIRECTORY_SEPARATOR . $newBasename;
                $counter++;
            }
            $basename = basename($targetPath);
        }

        if (!@move_uploaded_file($tmpName, $targetPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal memindahkan file yang diunggah.';
            $errors[] = [
                'name' => $relPath ?: $originalName,
                'error' => $message,
            ];
            continue;
        }

        clearstatcache(true, $targetPath);

        // Build relative path for response
        $relativeItemPath = $sanitizedRelativeUrl === '' ? '' : $sanitizedRelativeUrl . '/';
        if (!empty($subfolderPath)) {
            $relativeItemPath .= $subfolderPath . '/';
        }
        $relativeItemPath .= $basename;

        $uploaded[] = [
            'name' => $basename,
            'path' => $relativeItemPath,
            'relativePath' => $relPath,
            'type' => 'file',
            'modified' => filemtime($targetPath) ?: time(),
            'size' => filesize($targetPath) ?: 0,
        ];
    }

    return [
        'uploaded' => $uploaded,
        'errors' => $errors,
    ];
}

/**
 * Get detailed metadata for a single file or folder.
 *
 * Returns extended information beyond what list_directory provides:
 * MIME type, permissions, creation time, item count (for folders).
 *
 * @param string $root       Root directory path
 * @param string $relativePath Relative path to the item
 * @return array Associative array with item details
 * @throws RuntimeException If item does not exist or is inaccessible
 */
function get_item_details(string $root, string $relativePath): array
{
    [$normalizedRoot, , $realPath] = resolve_path($root, $relativePath);

    if (!file_exists($realPath)) {
        throw new RuntimeException('Item tidak ditemukan.');
    }

    $isDir = is_dir($realPath);
    $name = basename($realPath);

    // Basic info
    $details = [
        'name'     => $name,
        'type'     => $isDir ? 'folder' : 'file',
        'path'     => $relativePath,
        'size'     => $isDir ? 0 : filesize($realPath),
        'modified' => filemtime($realPath),
    ];

    // Created time (ctime on Windows = creation, on Linux = inode change)
    $ctime = filectime($realPath);
    $details['created'] = $ctime !== false ? $ctime : null;

    // MIME type (files only)
    if (!$isDir) {
        $mimeType = null;
        if (function_exists('mime_content_type')) {
            $mimeType = @mime_content_type($realPath);
        }
        if (!$mimeType || $mimeType === 'application/octet-stream') {
            // Fallback: guess from extension
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            $mimeMap = [
                'txt' => 'text/plain', 'html' => 'text/html', 'htm' => 'text/html',
                'css' => 'text/css', 'js' => 'application/javascript',
                'json' => 'application/json', 'xml' => 'application/xml',
                'php' => 'application/x-php', 'py' => 'text/x-python',
                'md' => 'text/markdown', 'csv' => 'text/csv',
                'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
                'gif' => 'image/gif', 'svg' => 'image/svg+xml', 'webp' => 'image/webp',
                'ico' => 'image/x-icon', 'bmp' => 'image/bmp',
                'pdf' => 'application/pdf', 'doc' => 'application/msword',
                'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xls' => 'application/vnd.ms-excel',
                'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'ppt' => 'application/vnd.ms-powerpoint',
                'zip' => 'application/zip', 'rar' => 'application/x-rar-compressed',
                'gz' => 'application/gzip', 'tar' => 'application/x-tar',
                '7z' => 'application/x-7z-compressed',
                'mp3' => 'audio/mpeg', 'wav' => 'audio/wav', 'ogg' => 'audio/ogg',
                'mp4' => 'video/mp4', 'webm' => 'video/webm', 'avi' => 'video/x-msvideo',
                'ts' => 'application/typescript', 'tsx' => 'application/typescript',
                'jsx' => 'application/javascript', 'yaml' => 'text/yaml', 'yml' => 'text/yaml',
                'sql' => 'application/sql', 'sh' => 'application/x-sh',
                'bat' => 'application/x-bat', 'ini' => 'text/plain',
                'log' => 'text/plain', 'env' => 'text/plain',
            ];
            $mimeType = $mimeMap[$ext] ?? 'application/octet-stream';
        }
        $details['mime'] = $mimeType;
    } else {
        $details['mime'] = 'inode/directory';
    }

    // Permissions
    $perms = @fileperms($realPath);
    if ($perms !== false) {
        $details['permissions'] = [
            'octal'    => substr(sprintf('%o', $perms), -4),
            'readable' => is_readable($realPath),
            'writable' => is_writable($realPath),
        ];
    }

    // Folder: count direct children
    if ($isDir && is_readable($realPath)) {
        $childFiles = 0;
        $childFolders = 0;
        try {
            $iter = new DirectoryIterator($realPath);
            foreach ($iter as $child) {
                if ($child->isDot()) continue;
                if ($child->isDir()) {
                    $childFolders++;
                } else {
                    $childFiles++;
                }
            }
        } catch (Throwable $e) {
            // Ignore errors counting children
        }
        $details['children'] = [
            'files'   => $childFiles,
            'folders' => $childFolders,
            'total'   => $childFiles + $childFolders,
        ];
    }

    // File extension (files only)
    if (!$isDir) {
        $details['extension'] = pathinfo($name, PATHINFO_EXTENSION);
    }

    return $details;
}

/**
 * Calculate the total size of a directory recursively.
 *
 * @param string $root         Root directory path
 * @param string $relativePath Relative path to the folder
 * @return array ['size' => int, 'files' => int, 'folders' => int]
 * @throws RuntimeException If path is not a directory
 */
function calculate_folder_size(string $root, string $relativePath): array
{
    [$normalizedRoot, , $realPath] = resolve_path($root, $relativePath);

    if (!is_dir($realPath)) {
        throw new RuntimeException('Path bukan folder.');
    }

    $totalSize = 0;
    $fileCount = 0;
    $folderCount = 0;

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($realPath, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        if ($item->isDir()) {
            $folderCount++;
        } else {
            $fileCount++;
            $totalSize += $item->getSize();
        }
    }

    return [
        'size'    => $totalSize,
        'files'   => $fileCount,
        'folders' => $folderCount,
    ];
}

function rename_item(string $root, string $oldRelativePath, string $newRelativePath): array
{
    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    // Sanitize old path
    $sanitizedOldPath = sanitize_relative_path($oldRelativePath);
    if ($sanitizedOldPath === '') {
        throw new RuntimeException('Path item wajib diisi.');
    }

    // Build old real path
    $oldRealPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedOldPath);

    if (!file_exists($oldRealPath)) {
        throw new RuntimeException('Item yang akan diubah namanya tidak ditemukan.');
    }

    $isDir = is_dir($oldRealPath);
    $targetType = $isDir ? 'folder' : 'file';

    // Validasi path baru
    $segments = explode('/', $newRelativePath);
    $newName = array_pop($segments);

    if ($newName === null || $newName === '') {
        throw new RuntimeException('Nama baru wajib diisi.');
    }

    if (preg_match('/[\\\\\/]/', $newName)) {
        throw new RuntimeException('Nama tidak valid.');
    }

    // Pastikan direktori induk dari path baru ada dan dapat ditulisi
    $parentRelative = implode('/', array_filter($segments, static fn($value) => $value !== ''));
    $parentPath = $normalizedRoot;

    if ($parentRelative !== '') {
        $sanitizedParentPath = sanitize_relative_path($parentRelative);
        $parentPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedParentPath);

        if (!is_dir($parentPath)) {
            throw new RuntimeException('Direktori induk tidak ditemukan.');
        }
    }

    assert_writable_directory($parentPath);

    // Path lengkap untuk item baru
    $sanitizedNewPath = sanitize_relative_path($newRelativePath);
    $newRealPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedNewPath);

    if (file_exists($newRealPath)) {
        throw new RuntimeException('Nama sudah digunakan.');
    }

    try {
        // Lakukan rename
        if (!@rename($oldRealPath, $newRealPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal mengubah nama item.';

            throw new RuntimeException($message);
        }

        clearstatcache(true, $newRealPath);
        $modified = filemtime($newRealPath) ?: time();

        $size = 0;
        if ($targetType === 'file') {
            $size = filesize($newRealPath) ?: 0;
        }

        return [
            'name' => $newName,
            'path' => $sanitizedNewPath,
            'type' => $targetType,
            'modified' => $modified,
            'size' => $size,
        ];
    } catch (Exception $e) {
        throw $e;
    }
}

function move_item(string $root, string $oldRelativePath, string $newRelativePath): array
{
    fm_debug_log('move_item called with oldPath: "' . $oldRelativePath . '", newPath: "' . $newRelativePath . '"');

    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    // Sanitize old path
    $sanitizedOldPath = sanitize_relative_path($oldRelativePath);
    if ($sanitizedOldPath === '') {
        throw new RuntimeException('Path item wajib diisi.');
    }

    // Build old real path
    $oldRealPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedOldPath);

    if (!file_exists($oldRealPath)) {
        throw new RuntimeException('Item yang akan dipindahkan tidak ditemukan.');
    }

    $isDir = is_dir($oldRealPath);
    $targetType = $isDir ? 'folder' : 'file';

    // Validasi path baru
    $segments = explode('/', $newRelativePath);

    // If targetPath is empty (moving to root), extract filename from old path
    if ($newRelativePath === '') {
        $newName = basename($oldRealPath); // Use basename from real path
    } else {
        $newName = array_pop($segments);
    }

    if ($newName === null || $newName === '') {
        throw new RuntimeException('Nama baru wajib diisi.');
    }

    if (preg_match('/[\\\\\/]/', $newName)) {
        throw new RuntimeException('Nama tidak valid.');
    }

    // Pastikan direktori induk dari path baru ada dan dapat ditulisi
    $parentRelative = implode('/', array_filter($segments, static fn($value) => $value !== ''));
    $parentPath = $normalizedRoot;

    if ($parentRelative !== '') {
        $sanitizedParentPath = sanitize_relative_path($parentRelative);
        $parentPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedParentPath);

        if (!is_dir($parentPath)) {
            throw new RuntimeException('Direktori induk tidak ditemukan.');
        }
    }

    assert_writable_directory($parentPath);

    // Path lengkap untuk item baru
    // If newRelativePath is empty, it means move to root
    $sanitizedNewPath = sanitize_relative_path($newRelativePath);
    $newRealPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedNewPath);

    if (file_exists($newRealPath)) {
        throw new RuntimeException('Nama sudah digunakan di lokasi tujuan.');
    }

    fm_debug_log('Moving from "' . $oldRealPath . '" to "' . $newRealPath . '"');

    try {
        // Lakukan move
        if (!@rename($oldRealPath, $newRealPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal memindahkan item.';

            throw new RuntimeException($message);
        }

        clearstatcache(true, $newRealPath);
        $modified = filemtime($newRealPath) ?: time();

        $size = 0;
        if ($targetType === 'file') {
            $size = filesize($newRealPath) ?: 0;
        }

        return [
            'name' => $newName,
            'path' => $sanitizedNewPath,
            'type' => $targetType,
            'modified' => $modified,
            'size' => $size,
        ];
    } catch (Exception $e) {
        throw $e;
    }
}

function move_items(string $root, array $sourcePaths, string $targetPath): array
{
    $moved = [];
    $errors = [];

    // Sanitize target path
    $sanitizedTargetPath = sanitize_relative_path($targetPath);

    foreach ($sourcePaths as $sourcePath) {
        try {
            // Sanitize source path for comparison
            $sanitizedSourcePath = sanitize_relative_path($sourcePath);

            // Prevent moving a folder into itself
            if ($sanitizedSourcePath === $sanitizedTargetPath) {
                throw new RuntimeException('Tidak dapat memindahkan folder ke dalam dirinya sendiri.');
            }

            // Prevent moving a folder into its own subdirectory
            if ($sanitizedTargetPath !== '' && strpos($sanitizedTargetPath, $sanitizedSourcePath . '/') === 0) {
                throw new RuntimeException('Tidak dapat memindahkan folder ke dalam subdirektori-nya sendiri.');
            }

            // Extract filename from source path
            $sourceSegments = explode('/', $sourcePath);
            $fileName = end($sourceSegments);

            // Build new full path
            // If target path is empty, it means move to root
            $newPath = $sanitizedTargetPath === '' ? $fileName : $sanitizedTargetPath . '/' . $fileName;

            // Move the item
            $result = move_item($root, $sourcePath, $newPath);
            $moved[] = $result;

            // Log activity
            write_activity_log('move', $result['name'], $result['type'], $result['path'], [
                'oldPath' => $sourcePath,
                'newPath' => $result['path']
            ]);
        } catch (Throwable $e) {
            $errors[] = [
                'path' => $sourcePath,
                'error' => $e->getMessage(),
            ];
        }
    }

    return [
        'moved' => $moved,
        'errors' => $errors,
    ];
}

// ============================================================================
// COPY FUNCTIONS
// ============================================================================

/**
 * Recursively copy a file or directory
 * @param string $source Absolute source path
 * @param string $destination Absolute destination path
 * @return void
 * @throws RuntimeException on failure
 */
function copy_recursive(string $source, string $destination): void
{
    if (is_file($source)) {
        if (!@copy($source, $destination)) {
            $error = error_get_last();
            throw new RuntimeException($error['message'] ?? 'Gagal menyalin file.');
        }
        return;
    }

    if (!is_dir($source)) {
        throw new RuntimeException('Item sumber tidak ditemukan.');
    }

    if (!@mkdir($destination, 0755, true)) {
        $error = error_get_last();
        throw new RuntimeException($error['message'] ?? 'Gagal membuat direktori tujuan.');
    }

    $iterator = new DirectoryIterator($source);
    foreach ($iterator as $entry) {
        if ($entry->isDot()) {
            continue;
        }
        $srcPath = $entry->getPathname();
        $dstPath = $destination . DIRECTORY_SEPARATOR . $entry->getFilename();
        copy_recursive($srcPath, $dstPath);
    }
}

/**
 * Copy a single item to a target directory
 * @param string $root Root directory path
 * @param string $sourceRelativePath Relative path of the source item
 * @param string $targetRelativePath Relative path of the target directory
 * @return array Item info array
 * @throws RuntimeException on failure
 */
function copy_item(string $root, string $sourceRelativePath, string $targetRelativePath): array
{
    fm_debug_log('copy_item called with source: "' . $sourceRelativePath . '", target: "' . $targetRelativePath . '"');

    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    // Sanitize source path
    $sanitizedSourcePath = sanitize_relative_path($sourceRelativePath);
    if ($sanitizedSourcePath === '') {
        throw new RuntimeException('Path sumber wajib diisi.');
    }

    // Build source real path
    $sourceRealPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedSourcePath);

    if (!file_exists($sourceRealPath)) {
        throw new RuntimeException('Item sumber tidak ditemukan.');
    }

    $isDir = is_dir($sourceRealPath);
    $targetType = $isDir ? 'folder' : 'file';
    $fileName = basename($sourceRealPath);

    // Sanitize target path
    $sanitizedTargetPath = sanitize_relative_path($targetRelativePath);

    // Build target directory real path
    $targetDirRealPath = $normalizedRoot;
    if ($sanitizedTargetPath !== '') {
        $targetDirRealPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedTargetPath);
    }

    if (!is_dir($targetDirRealPath)) {
        throw new RuntimeException('Direktori tujuan tidak ditemukan.');
    }

    assert_writable_directory($targetDirRealPath);

    // Build destination path
    $destRealPath = $targetDirRealPath . DIRECTORY_SEPARATOR . $fileName;

    // Handle name conflicts — append " - Copy", " - Copy (2)", etc.
    if (file_exists($destRealPath)) {
        $pathInfo = pathinfo($fileName);
        $baseName = $pathInfo['filename'];
        $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';

        // For directories, no extension handling
        if ($isDir) {
            $baseName = $fileName;
            $extension = '';
        }

        $copyName = $baseName . ' - Copy' . $extension;
        $destRealPath = $targetDirRealPath . DIRECTORY_SEPARATOR . $copyName;

        $counter = 2;
        while (file_exists($destRealPath)) {
            $copyName = $baseName . ' - Copy (' . $counter . ')' . $extension;
            $destRealPath = $targetDirRealPath . DIRECTORY_SEPARATOR . $copyName;
            $counter++;
        }

        $fileName = $copyName;
    }

    // Prevent copying a folder into itself
    if ($isDir) {
        $destNormalized = str_replace('\\', '/', $destRealPath);
        $sourceNormalized = str_replace('\\', '/', $sourceRealPath);
        if (strpos($destNormalized, $sourceNormalized . '/') === 0) {
            throw new RuntimeException('Tidak dapat menyalin folder ke dalam dirinya sendiri.');
        }
    }

    fm_debug_log('Copying from "' . $sourceRealPath . '" to "' . $destRealPath . '"');

    try {
        copy_recursive($sourceRealPath, $destRealPath);

        clearstatcache(true, $destRealPath);
        $modified = filemtime($destRealPath) ?: time();

        $size = 0;
        if ($targetType === 'file') {
            $size = filesize($destRealPath) ?: 0;
        }

        // Build relative path for the copied item
        $copiedRelativePath = str_replace(
            [$normalizedRoot . DIRECTORY_SEPARATOR, '\\'],
            ['', '/'],
            $destRealPath
        );

        return [
            'name' => $fileName,
            'path' => $copiedRelativePath,
            'type' => $targetType,
            'modified' => $modified,
            'size' => $size,
        ];
    } catch (Exception $e) {
        // Clean up partial copy on failure
        if (file_exists($destRealPath) && $isDir) {
            @rmdir($destRealPath);
        } elseif (file_exists($destRealPath)) {
            @unlink($destRealPath);
        }
        throw $e;
    }
}

/**
 * Copy multiple items to a target directory
 * @param string $root Root directory path
 * @param array $sourcePaths Array of relative source paths
 * @param string $targetPath Relative target directory path
 * @return array Results with 'copied' and 'errors' arrays
 */
function copy_items(string $root, array $sourcePaths, string $targetPath): array
{
    $copied = [];
    $errors = [];

    foreach ($sourcePaths as $sourcePath) {
        try {
            $sanitizedSourcePath = sanitize_relative_path($sourcePath);

            $result = copy_item($root, $sanitizedSourcePath, $targetPath);
            $copied[] = $result;

            // Log activity
            write_activity_log('copy', $result['name'], $result['type'], $result['path'], [
                'sourcePath' => $sourcePath,
                'targetPath' => $targetPath
            ]);
        } catch (Throwable $e) {
            $errors[] = [
                'path' => $sourcePath,
                'error' => $e->getMessage(),
            ];
        }
    }

    return [
        'copied' => $copied,
        'errors' => $errors,
    ];
}

// ============================================================================
// ACTIVITY LOGGING FUNCTIONS
// ============================================================================

/**
 * Get the logs directory path
 * @return string
 */
function get_logs_directory(): string
{
    // Use LOGS_DIR constant if defined, otherwise fallback to relative path
    if (defined('LOGS_DIR')) {
        return LOGS_DIR;
    }
    return dirname(__DIR__, 2) . '/storage/logs';
}

/**
 * Get the activity log file path
 * @return string
 */
function get_activity_log_file(): string
{
    // Use ACTIVITY_LOG_FILE constant if defined
    if (defined('ACTIVITY_LOG_FILE')) {
        return ACTIVITY_LOG_FILE;
    }
    return get_logs_directory() . '/activity.json';
}

// ============================================================================
// RATE LIMITING (kept for future integration — see Priority 4)
// ============================================================================

/**
 * Rate limiting storage (session-based)
 */
function get_rate_limit_key(string $action): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return 'rate_limit_' . md5($action . '_' . $ip);
}

/**
 * Check if action is rate limited
 * @param string $action Action name
 * @param int $maxAttempts Maximum attempts allowed
 * @param int $windowSeconds Time window in seconds
 * @return bool Whether action is rate limited
 */
function is_rate_limited(string $action, int $maxAttempts = 30, int $windowSeconds = 60): bool
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $key = get_rate_limit_key($action);
    $now = time();

    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = [];
    }

    // Remove old entries outside the window
    $_SESSION[$key] = array_filter($_SESSION[$key], function ($timestamp) use ($now, $windowSeconds) {
        return ($now - $timestamp) < $windowSeconds;
    });

    // Check if we've exceeded the limit
    return count($_SESSION[$key]) >= $maxAttempts;
}

/**
 * Record an action attempt for rate limiting
 * @param string $action Action name
 */
function record_rate_limit_attempt(string $action): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $key = get_rate_limit_key($action);

    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = [];
    }

    $_SESSION[$key][] = time();
}

/**
 * Get rate limit status for an action
 * @param string $action Action name
 * @param int $maxAttempts Maximum attempts allowed
 * @param int $windowSeconds Time window in seconds
 * @return array Status with 'limited', 'remaining', and 'reset' keys
 */
function get_rate_limit_status(string $action, int $maxAttempts = 30, int $windowSeconds = 60): array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $key = get_rate_limit_key($action);
    $now = time();

    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = [];
    }

    // Remove old entries
    $_SESSION[$key] = array_filter($_SESSION[$key], function ($timestamp) use ($now, $windowSeconds) {
        return ($now - $timestamp) < $windowSeconds;
    });

    $currentCount = count($_SESSION[$key]);
    $remaining = max(0, $maxAttempts - $currentCount);

    // Calculate reset time
    $oldestEntry = !empty($_SESSION[$key]) ? min($_SESSION[$key]) : $now;
    $resetTime = $oldestEntry + $windowSeconds;

    return [
        'limited' => $currentCount >= $maxAttempts,
        'remaining' => $remaining,
        'reset' => $resetTime,
        'current' => $currentCount,
        'max' => $maxAttempts
    ];
}

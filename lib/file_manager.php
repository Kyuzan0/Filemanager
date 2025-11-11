<?php

// Include Logger class
require_once __DIR__ . '/logger.php';

// Initialize global logger instance
function get_logger() {
    static $logger = null;
    if ($logger === null) {
        $logger = new Logger('logs/activity.json');
    }
    return $logger;
}

function sanitize_relative_path(string $relativePath): string
{
    $segments = preg_split('/[\\\\\/]+/', $relativePath, -1, PREG_SPLIT_NO_EMPTY);
    $normalized = [];

    if ($segments === false) {
        return '';
    }

    foreach ($segments as $segment) {
        if ($segment === '.') {
            continue;
        }

        if ($segment === '..') {
            array_pop($normalized);
            continue;
        }

        $normalized[] = $segment;
    }

    return implode('/', $normalized);
}

function build_breadcrumbs(string $relativePath, string $rootLabel = 'Root'): array
{
    $breadcrumbs = [
        [
            'label' => $rootLabel,
            'path' => '',
        ],
    ];

    if ($relativePath === '') {
        return $breadcrumbs;
    }

    $segments = explode('/', $relativePath);
    $current = '';

    foreach ($segments as $segment) {
        $current = $current === '' ? $segment : $current . '/' . $segment;
        $breadcrumbs[] = [
            'label' => $segment,
            'path' => $current,
        ];
    }

    return $breadcrumbs;
}

function get_editable_extensions(): array
{
    return [
        'txt',
        'md',
        'markdown',
        'yml',
        'yaml',
        'json',
        'xml',
        'html',
        'htm',
        'css',
        'scss',
        'less',
        'js',
        'ts',
        'tsx',
        'jsx',
        'ini',
        'conf',
        'cfg',
        'env',
        'log',
        'php',
        'phtml',
        'sql',
        'csv',
    ];
}

function resolve_path(string $root, string $relativePath = ''): array
{
    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    $sanitizedRelativeUrl = sanitize_relative_path($relativePath);
    $sanitizedRelative = str_replace('/', DIRECTORY_SEPARATOR, $sanitizedRelativeUrl);
    $targetPath = $sanitizedRelative === ''
        ? $normalizedRoot
        : $normalizedRoot . DIRECTORY_SEPARATOR . $sanitizedRelative;

    $realTargetPath = realpath($targetPath);

    if ($realTargetPath === false) {
        throw new RuntimeException('Path tidak ditemukan.');
    }

    $rootWithSeparator = $normalizedRoot . DIRECTORY_SEPARATOR;
    if ($realTargetPath !== $normalizedRoot && strpos($realTargetPath, $rootWithSeparator) !== 0) {
        throw new RuntimeException('Akses path di luar root tidak diizinkan.');
    }

    return [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath];
}

function assert_writable_directory(string $path): void
{
    if (!is_dir($path)) {
        throw new RuntimeException('Direktori tujuan tidak ditemukan.');
    }

    if (!is_writable($path)) {
        throw new RuntimeException('Direktori tujuan tidak dapat ditulisi.');
    }
}

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
    error_log('[DEBUG] delete_single_path called with root: ' . $root . ' and relative path: ' . $relativePath);
    
    [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath] = resolve_path($root, $relativePath);
    
    error_log('[DEBUG] Resolved paths - normalizedRoot: ' . $normalizedRoot . ', sanitizedRelativeUrl: ' . $sanitizedRelativeUrl . ', realTargetPath: ' . $realTargetPath);

    if ($sanitizedRelativeUrl === '') {
        error_log('[DEBUG] Attempted to delete root directory');
        throw new RuntimeException('Tidak dapat menghapus direktori root.');
    }

    if (!file_exists($realTargetPath)) {
        error_log('[DEBUG] Path does not exist: ' . $realTargetPath);
        throw new RuntimeException('Path tidak ditemukan.');
    }

    $isDir = is_dir($realTargetPath);
    error_log('[DEBUG] Path is directory: ' . ($isDir ? 'true' : 'false'));

    if ($isDir) {
        error_log('[DEBUG] Deleting directory recursively');
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
                error_log('[DEBUG] Deleting subdirectory: ' . $pathName);
                if (!@rmdir($pathName)) {
                    $error = error_get_last();
                    $message = $error['message'] ?? 'Gagal menghapus direktori.';
                    error_log('[DEBUG] Failed to delete subdirectory: ' . $pathName . ' with error: ' . $message);
                    throw new RuntimeException($message);
                }
            } else {
                error_log('[DEBUG] Deleting file: ' . $pathName);
                if (!@unlink($pathName)) {
                    $error = error_get_last();
                    $message = $error['message'] ?? 'Gagal menghapus file.';
                    error_log('[DEBUG] Failed to delete file: ' . $pathName . ' with error: ' . $message);
                    throw new RuntimeException($message);
                }
            }
        }

        error_log('[DEBUG] Deleting main directory: ' . $realTargetPath);
        if (!@rmdir($realTargetPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal menghapus direktori.';
            error_log('[DEBUG] Failed to delete main directory: ' . $realTargetPath . ' with error: ' . $message);
            throw new RuntimeException($message);
        }
    } else {
        error_log('[DEBUG] Deleting file: ' . $realTargetPath);
        if (!@unlink($realTargetPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal menghapus file.';
            error_log('[DEBUG] Failed to delete file: ' . $realTargetPath . ' with error: ' . $message);
            throw new RuntimeException($message);
        }
    }

    $result = [
        'name' => basename($realTargetPath),
        'path' => $sanitizedRelativeUrl,
        'type' => $isDir ? 'folder' : 'file',
    ];
    
    error_log('[DEBUG] Successfully deleted item: ' . json_encode($result));
    return $result;
}

function delete_paths(string $root, array $relativePaths): array
{
    error_log('[DEBUG] delete_paths called with root: ' . $root . ' and paths: ' . implode(', ', $relativePaths));
    
    $deleted = [];
    $errors = [];
    $logger = get_logger();

    $uniquePaths = [];
    foreach ($relativePaths as $path) {
        if (!is_string($path)) {
            error_log('[DEBUG] Skipping non-string path: ' . print_r($path, true));
            continue;
        }

        $sanitized = sanitize_relative_path($path);
        if ($sanitized === '' || isset($uniquePaths[$sanitized])) {
            error_log('[DEBUG] Skipping empty or duplicate path: ' . $sanitized);
            continue;
        }

        $uniquePaths[$sanitized] = $sanitized;
        error_log('[DEBUG] Added unique path: ' . $sanitized);
    }

    foreach ($uniquePaths as $sanitized) {
        try {
            // Log delete attempt
            $logger->log('delete', $sanitized, ['status' => 'attempt']);
            
            error_log('[DEBUG] Attempting to delete path: ' . $sanitized);
            $result = delete_single_path($root, $sanitized);
            $deleted[] = $result;
            
            // Log successful delete
            $logger->log('delete', $sanitized, [
                'status' => 'success',
                'target_type' => $result['type']
            ]);
            
            error_log('[DEBUG] Successfully deleted path: ' . $sanitized);
        } catch (Throwable $e) {
            error_log('[DEBUG] Failed to delete path: ' . $sanitized . ' with error: ' . $e->getMessage());
            
            // Log failed delete
            $logger->log('delete', $sanitized, [
                'status' => 'failed',
                'error' => $e->getMessage()
            ]);
            
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
    
    error_log('[DEBUG] delete_paths result: ' . json_encode($result));
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

    $parentRelative = implode('/', array_filter($segments, static fn ($value) => $value !== ''));
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
        'size' => null,
        'modified' => $modified,
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
    $size = filesize($info['target_path']);
    $modified = filemtime($info['target_path']) ?: time();

    return [
        'name' => $info['name'],
        'path' => $info['sanitized'],
        'type' => 'file',
        'size' => $size === false ? 0 : $size,
        'modified' => $modified,
    ];
}

function upload_files(string $root, string $relativePath, array $files): array
{
    [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath] = resolve_path($root, $relativePath);

    if (!is_dir($realTargetPath)) {
        throw new RuntimeException('Direktori tujuan tidak valid.');
    }

    assert_writable_directory($realTargetPath);

    $uploaded = [];
    $errors = [];

    $names = $files['name'] ?? [];
    $tmpNames = $files['tmp_name'] ?? [];
    $sizes = $files['size'] ?? [];
    $fileErrors = $files['error'] ?? [];

    $entries = [];

    if (is_array($names)) {
        $count = count($names);
        for ($i = 0; $i < $count; $i++) {
            $entries[] = [
                'name' => $names[$i] ?? '',
                'tmp_name' => $tmpNames[$i] ?? '',
                'size' => $sizes[$i] ?? 0,
                'error' => $fileErrors[$i] ?? UPLOAD_ERR_NO_FILE,
            ];
        }
    } else {
        $entries[] = [
            'name' => $names,
            'tmp_name' => $tmpNames,
            'size' => $sizes,
            'error' => $fileErrors,
        ];
    }

    foreach ($entries as $entry) {
        $originalName = is_string($entry['name']) ? $entry['name'] : '';
        $tmpName = is_string($entry['tmp_name']) ? $entry['tmp_name'] : '';
        $size = is_numeric($entry['size']) ? (int) $entry['size'] : 0;
        $errorCode = is_numeric($entry['error']) ? (int) $entry['error'] : UPLOAD_ERR_NO_FILE;

        if ($errorCode === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        if ($errorCode !== UPLOAD_ERR_OK) {
            $errors[] = [
                'name' => $originalName,
                'error' => upload_code_to_message($errorCode),
            ];
            continue;
        }

        $basename = basename($originalName);
        if ($basename === '' || preg_match('/[\\\\\/]/', $basename)) {
            $errors[] = [
                'name' => $originalName,
                'error' => 'Nama file tidak valid.',
            ];
            continue;
        }

        if (!is_uploaded_file($tmpName)) {
            $errors[] = [
                'name' => $originalName,
                'error' => 'File upload tidak valid.',
            ];
            continue;
        }

        $targetPath = $realTargetPath . DIRECTORY_SEPARATOR . $basename;

        if (file_exists($targetPath)) {
            $errors[] = [
                'name' => $originalName,
                'error' => 'File dengan nama sama sudah ada.',
            ];
            continue;
        }

        if (!@move_uploaded_file($tmpName, $targetPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal memindahkan file yang diunggah.';
            $errors[] = [
                'name' => $originalName,
                'error' => $message,
            ];
            continue;
        }

        clearstatcache(true, $targetPath);
        $relativeItemPath = $sanitizedRelativeUrl === ''
            ? $basename
            : $sanitizedRelativeUrl . '/' . $basename;

        $uploaded[] = [
            'name' => $basename,
            'path' => $relativeItemPath,
            'type' => 'file',
            'size' => filesize($targetPath) ?: $size,
            'modified' => filemtime($targetPath) ?: time(),
        ];
    }

    return [
        'uploaded' => $uploaded,
        'errors' => $errors,
    ];
}

function upload_code_to_message(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Ukuran file melebihi batas yang diizinkan.',
        UPLOAD_ERR_PARTIAL => 'File hanya terunggah sebagian.',
        UPLOAD_ERR_NO_FILE => 'Tidak ada file yang diunggah.',
        UPLOAD_ERR_NO_TMP_DIR => 'Folder sementara tidak ditemukan.',
        UPLOAD_ERR_CANT_WRITE => 'Gagal menulis file ke disk.',
        UPLOAD_ERR_EXTENSION => 'Ekstensi file diblokir.',
        default => 'Terjadi kesalahan saat mengunggah file.',
    };
}

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

    foreach ($dir as $fileInfo) {
        /** @var DirectoryIterator $fileInfo */
        if ($fileInfo->isDot()) {
            continue;
        }

        $relativeItemPath = substr($fileInfo->getPathname(), strlen($normalizedRoot));
        $relativeItemPath = ltrim(str_replace(['\\'], '/', $relativeItemPath), '/');

        $items[] = [
            'name' => $fileInfo->getFilename(),
            'type' => $fileInfo->isDir() ? 'folder' : 'file',
            'size' => $fileInfo->isDir() ? null : $fileInfo->getSize(),
            'modified' => $fileInfo->getMTime(),
            'path' => $relativeItemPath,
        ];
    }

    usort($items, static function ($a, $b) {
        if ($a['type'] === $b['type']) {
            return strnatcasecmp($a['name'], $b['name']);
        }
        return $a['type'] === 'folder' ? -1 : 1;
    });

    return $items;
}

function rename_item(string $root, string $oldRelativePath, string $newRelativePath): array
{
    $logger = get_logger();
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
    $parentRelative = implode('/', array_filter($segments, static fn ($value) => $value !== ''));
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
    
    // Log rename attempt
    $logger->log('rename', $sanitizedOldPath, [
        'status' => 'attempt',
        'target_type' => $targetType,
        'old_path' => $sanitizedOldPath,
        'new_path' => $sanitizedNewPath
    ]);
    
    try {
        // Lakukan rename
        if (!@rename($oldRealPath, $newRealPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal mengubah nama item.';
            
            // Log failed rename
            $logger->log('rename', $sanitizedOldPath, [
                'status' => 'failed',
                'target_type' => $targetType,
                'old_path' => $sanitizedOldPath,
                'new_path' => $sanitizedNewPath,
                'error' => $message
            ]);
            
            throw new RuntimeException($message);
        }
        
        clearstatcache(true, $newRealPath);
        $modified = filemtime($newRealPath) ?: time();
        $size = $isDir ? null : (filesize($newRealPath) ?: 0);
        
        // Log successful rename
        $logger->log('rename', $sanitizedNewPath, [
            'status' => 'success',
            'target_type' => $targetType,
            'old_path' => $sanitizedOldPath,
            'new_path' => $sanitizedNewPath
        ]);
        
        return [
            'name' => $newName,
            'path' => $sanitizedNewPath,
            'type' => $targetType,
            'size' => $size,
            'modified' => $modified,
        ];
    } catch (Exception $e) {
        // Log failed rename if not already logged
        if (strpos($e->getMessage(), 'Gagal mengubah nama item.') === false) {
            $logger->log('rename', $sanitizedOldPath, [
                'status' => 'failed',
                'target_type' => $targetType,
                'old_path' => $sanitizedOldPath,
                'new_path' => $sanitizedNewPath,
                'error' => $e->getMessage()
            ]);
        }
        throw $e;
    }
}

function move_item(string $root, string $oldRelativePath, string $newRelativePath): array
{
    error_log('[DEBUG] move_item called with oldPath: "' . $oldRelativePath . '", newPath: "' . $newRelativePath . '"');
    
    $logger = get_logger();
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
    $newName = array_pop($segments);
    
    if ($newName === null || $newName === '') {
        throw new RuntimeException('Nama baru wajib diisi.');
    }
    
    if (preg_match('/[\\\\\/]/', $newName)) {
        throw new RuntimeException('Nama tidak valid.');
    }
    
    // Pastikan direktori induk dari path baru ada dan dapat ditulisi
    $parentRelative = implode('/', array_filter($segments, static fn ($value) => $value !== ''));
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
    
    error_log('[DEBUG] Moving from "' . $oldRealPath . '" to "' . $newRealPath . '"');
    
    // Log move attempt
    $logger->log('move', $sanitizedOldPath, [
        'status' => 'attempt',
        'target_type' => $targetType,
        'old_path' => $sanitizedOldPath,
        'new_path' => $sanitizedNewPath
    ]);
    
    try {
        // Lakukan move
        if (!@rename($oldRealPath, $newRealPath)) {
            $error = error_get_last();
            $message = $error['message'] ?? 'Gagal memindahkan item.';
            
            // Log failed move
            $logger->log('move', $sanitizedOldPath, [
                'status' => 'failed',
                'target_type' => $targetType,
                'old_path' => $sanitizedOldPath,
                'new_path' => $sanitizedNewPath,
                'error' => $message
            ]);
            
            throw new RuntimeException($message);
        }
        
        clearstatcache(true, $newRealPath);
        $modified = filemtime($newRealPath) ?: time();
        $size = $isDir ? null : (filesize($newRealPath) ?: 0);
        
        // Log successful move
        $logger->log('move', $sanitizedNewPath, [
            'status' => 'success',
            'target_type' => $targetType,
            'old_path' => $sanitizedOldPath,
            'new_path' => $sanitizedNewPath
        ]);
        
        return [
            'name' => $newName,
            'path' => $sanitizedNewPath,
            'type' => $targetType,
            'size' => $size,
            'modified' => $modified,
        ];
    } catch (Exception $e) {
        // Log failed move if not already logged
        if (strpos($e->getMessage(), 'Gagal memindahkan item.') === false) {
            $logger->log('move', $sanitizedOldPath, [
                'status' => 'failed',
                'target_type' => $targetType,
                'old_path' => $sanitizedOldPath,
                'new_path' => $sanitizedNewPath,
                'error' => $e->getMessage()
            ]);
        }
        throw $e;
    }
}

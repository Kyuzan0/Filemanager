<?php

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
            error_log('[DEBUG] Attempting to delete path: ' . $sanitized);
            $result = delete_single_path($root, $sanitized);
            $deleted[] = $result;
            
            error_log('[DEBUG] Successfully deleted path: ' . $sanitized);
        } catch (Throwable $e) {
            error_log('[DEBUG] Failed to delete path: ' . $sanitized . ' with error: ' . $e->getMessage());
            
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
 * Upload files with folder structure support.
 * Creates subdirectories as needed based on relative paths.
 *
 * @param string $root Root directory path
 * @param string $relativePath Target relative path
 * @param array $files $_FILES array
 * @param array $relativePaths Array of relative paths for each file (from webkitRelativePath)
 * @return array Array with 'uploaded' and 'errors' keys
 */
function upload_files_with_folders(string $root, string $relativePath, array $files, array $relativePaths): array
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
                'relativePath' => $relativePaths[$i] ?? '',
            ];
        }
    } else {
        $entries[] = [
            'name' => $names,
            'tmp_name' => $tmpNames,
            'size' => $sizes,
            'error' => $fileErrors,
            'relativePath' => $relativePaths[0] ?? '',
        ];
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
 * Handle a single uploaded chunk and assemble when all chunks are present.
 *
 * Protocol (client must follow):
 * - POST a single file field named "file" containing the chunk bytes
 * - POST fields:
 *     - originalName: original filename (required to assemble)
 *     - chunkIndex: 0-based index of this chunk (required)
 *     - totalChunks: total number of chunks for this file (required)
 *
 * Returns array:
 *  - uploaded: [] when not finished, or array with assembled item when finished
 *  - errors: [] on success or with error objects
 *  - finished: boolean whether assembly is complete
 */
function upload_chunk(string $root, string $relativePath, array $fileEntry, string $originalName, int $chunkIndex, int $totalChunks): array
{
    $result = [
        'uploaded' => [],
        'errors' => [],
        'finished' => false,
    ];

    try {
        [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath] = resolve_path($root, $relativePath);

        if (!is_dir($realTargetPath)) {
            throw new RuntimeException('Direktori tujuan tidak valid.');
        }

        assert_writable_directory($realTargetPath);

        if ($originalName === '') {
            throw new RuntimeException('Nama file asli wajib diisi.');
        }

        $basename = basename($originalName);
        if ($basename === '' || preg_match('/[\\\\\/]/', $basename)) {
            throw new RuntimeException('Nama file tidak valid.');
        }

        if ($chunkIndex < 0 || $totalChunks < 1) {
            throw new RuntimeException('Indeks chunk atau total chunk tidak valid.');
        }

        if (!is_uploaded_file($fileEntry['tmp_name'] ?? '')) {
            $result['errors'][] = [
                'name' => $originalName,
                'error' => 'File chunk tidak valid.'
            ];
            return $result;
        }

        // Prepare temp storage for chunks
        $tempBase = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'filemanager_uploads';
        if (!is_dir($tempBase)) {
            @mkdir($tempBase, 0755, true);
        }

        // Use a deterministic upload id to allow resumed uploads from same file+path
        $uploadId = sha1($normalizedRoot . '|' . $sanitizedRelativeUrl . '|' . $basename);
        $chunkDir = $tempBase . DIRECTORY_SEPARATOR . $uploadId;

        if (!is_dir($chunkDir)) {
            @mkdir($chunkDir, 0755, true);
        }

        $chunkPath = $chunkDir . DIRECTORY_SEPARATOR . 'chunk_' . (int)$chunkIndex . '.part';

        if (!@move_uploaded_file($fileEntry['tmp_name'], $chunkPath)) {
            $err = error_get_last();
            $message = $err['message'] ?? 'Gagal menyimpan chunk.';
            $result['errors'][] = [
                'name' => $originalName,
                'error' => $message,
            ];
            return $result;
        }

        // Check how many chunk files exist
        $found = glob($chunkDir . DIRECTORY_SEPARATOR . 'chunk_*.part') ?: [];
        $received = count($found);

        // If not all chunks received yet, return partial status
        if ($received < $totalChunks) {
            return $result; // uploaded empty, finished false
        }

        // All chunks present -> assemble final file
        $targetPath = $realTargetPath . DIRECTORY_SEPARATOR . $basename;

        if (file_exists($targetPath)) {
            $result['errors'][] = [
                'name' => $originalName,
                'error' => 'File dengan nama sama sudah ada.'
            ];
            return $result;
        }

        $outHandle = @fopen($targetPath, 'c');
        if ($outHandle === false) {
            $result['errors'][] = [
                'name' => $originalName,
                'error' => 'Gagal membuat berkas akhir.'
            ];
            return $result;
        }

        // Lock final file while assembling
        if (!@flock($outHandle, LOCK_EX)) {
            fclose($outHandle);
            $result['errors'][] = [
                'name' => $originalName,
                'error' => 'Gagal mendapatkan kunci untuk menulis berkas akhir.'
            ];
            return $result;
        }

        // Append chunks in order
        for ($i = 0; $i < $totalChunks; $i++) {
            $part = $chunkDir . DIRECTORY_SEPARATOR . 'chunk_' . $i . '.part';
            if (!is_file($part)) {
                // Missing part - abort
                flock($outHandle, LOCK_UN);
                fclose($outHandle);
                $result['errors'][] = [
                    'name' => $originalName,
                    'error' => "Chunk ke-{$i} hilang saat merakit file."
                ];
                return $result;
            }

            $in = @fopen($part, 'rb');
            if ($in === false) {
                flock($outHandle, LOCK_UN);
                fclose($outHandle);
                $result['errors'][] = [
                    'name' => $originalName,
                    'error' => "Gagal membaca chunk ke-{$i}."
                ];
                return $result;
            }

            while (!feof($in)) {
                $buffer = fread($in, 8192);
                if ($buffer === false) {
                    fclose($in);
                    flock($outHandle, LOCK_UN);
                    fclose($outHandle);
                    $result['errors'][] = [
                        'name' => $originalName,
                        'error' => "Gagal membaca chunk ke-{$i} saat menulis."
                    ];
                    return $result;
                }
                $written = fwrite($outHandle, $buffer);
                if ($written === false) {
                    fclose($in);
                    flock($outHandle, LOCK_UN);
                    fclose($outHandle);
                    $result['errors'][] = [
                        'name' => $originalName,
                        'error' => 'Gagal menulis ke berkas akhir.'
                    ];
                    return $result;
                }
            }
            fclose($in);
        }

        // Assembly complete
        fflush($outHandle);
        flock($outHandle, LOCK_UN);
        fclose($outHandle);

        // Cleanup chunk files
        foreach (glob($chunkDir . DIRECTORY_SEPARATOR . 'chunk_*.part') as $p) {
            @unlink($p);
        }
        @rmdir($chunkDir);

        clearstatcache(true, $targetPath);
        $relativeItemPath = $sanitizedRelativeUrl === ''
            ? $basename
            : $sanitizedRelativeUrl . '/' . $basename;

        $result['uploaded'][] = [
            'name' => $basename,
            'path' => $relativeItemPath,
            'type' => 'file',
            'modified' => filemtime($targetPath) ?: time(),
            'size' => filesize($targetPath) ?: 0,
        ];
        $result['finished'] = true;

        return $result;
    } catch (Throwable $e) {
        $result['errors'][] = [
            'name' => $originalName,
            'error' => $e->getMessage(),
        ];
        return $result;
    }
}

/**
 * Handle a single uploaded chunk with folder support and assemble when all chunks are present.
 *
 * Similar to upload_chunk but creates subdirectories based on relativePath.
 *
 * @param string $root Root directory
 * @param string $relativePath Target relative path
 * @param array $fileEntry $_FILES['file'] entry
 * @param string $originalName Original filename
 * @param int $chunkIndex Current chunk index (0-based)
 * @param int $totalChunks Total number of chunks
 * @param string $folderRelativePath Relative path including folder structure
 * @return array Array with 'uploaded', 'errors', and 'finished' keys
 */
function upload_chunk_with_folder(string $root, string $relativePath, array $fileEntry, string $originalName, int $chunkIndex, int $totalChunks, string $folderRelativePath): array
{
    $result = [
        'uploaded' => [],
        'errors' => [],
        'finished' => false,
    ];

    try {
        [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath] = resolve_path($root, $relativePath);

        if (!is_dir($realTargetPath)) {
            throw new RuntimeException('Direktori tujuan tidak valid.');
        }

        assert_writable_directory($realTargetPath);

        if ($originalName === '') {
            throw new RuntimeException('Nama file asli wajib diisi untuk upload berpotongan.');
        }

        $basename = basename($originalName);
        if ($basename === '' || preg_match('/[\\\\\/]/', $basename)) {
            throw new RuntimeException('Nama file tidak valid.');
        }

        if (($fileEntry['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new RuntimeException(upload_code_to_message($fileEntry['error'] ?? UPLOAD_ERR_NO_FILE));
        }

        if (!is_uploaded_file($fileEntry['tmp_name'] ?? '')) {
            throw new RuntimeException('File tidak valid.');
        }

        // Determine target directory based on relative path
        $subfolderPath = '';
        if (!empty($folderRelativePath) && strpos($folderRelativePath, '/') !== false) {
            $subfolderPath = dirname($folderRelativePath);
            $subfolderPath = sanitize_relative_path($subfolderPath);
        }

        // Create target directory including subfolders
        $targetDir = $realTargetPath;
        if (!empty($subfolderPath)) {
            $targetDir = $realTargetPath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $subfolderPath);
            
            if (!is_dir($targetDir)) {
                if (!@mkdir($targetDir, 0755, true)) {
                    $error = error_get_last();
                    $message = $error['message'] ?? 'Gagal membuat direktori.';
                    throw new RuntimeException($message);
                }
            }
        }

        // Use md5 of relative path + original name for unique temp folder
        $uploadId = md5($folderRelativePath . '|' . session_id() . '|' . $_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $tempBase = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'fm_chunks_folder';
        $chunkDir = $tempBase . DIRECTORY_SEPARATOR . $uploadId;

        if (!is_dir($chunkDir)) {
            @mkdir($chunkDir, 0755, true);
        }

        $chunkPath = $chunkDir . DIRECTORY_SEPARATOR . 'chunk_' . (int)$chunkIndex . '.part';

        if (!@move_uploaded_file($fileEntry['tmp_name'], $chunkPath)) {
            $err = error_get_last();
            $message = $err['message'] ?? 'Gagal menyimpan chunk.';
            $result['errors'][] = [
                'name' => $folderRelativePath ?: $originalName,
                'error' => $message,
            ];
            return $result;
        }

        // Check how many chunk files exist
        $found = glob($chunkDir . DIRECTORY_SEPARATOR . 'chunk_*.part') ?: [];
        $received = count($found);

        if ($received < $totalChunks) {
            return $result;
        }

        // All chunks present -> assemble final file
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $basename;

        // Check for existing file
        if (file_exists($targetPath)) {
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

        $outHandle = @fopen($targetPath, 'c');
        if ($outHandle === false) {
            $result['errors'][] = [
                'name' => $folderRelativePath ?: $originalName,
                'error' => 'Gagal membuat berkas akhir.'
            ];
            return $result;
        }

        if (!@flock($outHandle, LOCK_EX)) {
            fclose($outHandle);
            $result['errors'][] = [
                'name' => $folderRelativePath ?: $originalName,
                'error' => 'Gagal mendapatkan kunci untuk menulis berkas akhir.'
            ];
            return $result;
        }

        // Append chunks in order
        for ($i = 0; $i < $totalChunks; $i++) {
            $part = $chunkDir . DIRECTORY_SEPARATOR . 'chunk_' . $i . '.part';
            if (!is_file($part)) {
                flock($outHandle, LOCK_UN);
                fclose($outHandle);
                $result['errors'][] = [
                    'name' => $folderRelativePath ?: $originalName,
                    'error' => "Chunk ke-{$i} hilang saat merakit file."
                ];
                return $result;
            }

            $in = @fopen($part, 'rb');
            if ($in === false) {
                flock($outHandle, LOCK_UN);
                fclose($outHandle);
                $result['errors'][] = [
                    'name' => $folderRelativePath ?: $originalName,
                    'error' => "Gagal membaca chunk ke-{$i}."
                ];
                return $result;
            }

            while (!feof($in)) {
                $buffer = fread($in, 8192);
                if ($buffer === false) {
                    fclose($in);
                    flock($outHandle, LOCK_UN);
                    fclose($outHandle);
                    $result['errors'][] = [
                        'name' => $folderRelativePath ?: $originalName,
                        'error' => "Gagal membaca chunk ke-{$i} saat menulis."
                    ];
                    return $result;
                }
                $written = fwrite($outHandle, $buffer);
                if ($written === false) {
                    fclose($in);
                    flock($outHandle, LOCK_UN);
                    fclose($outHandle);
                    $result['errors'][] = [
                        'name' => $folderRelativePath ?: $originalName,
                        'error' => 'Gagal menulis ke berkas akhir.'
                    ];
                    return $result;
                }
            }
            fclose($in);
        }

        fflush($outHandle);
        flock($outHandle, LOCK_UN);
        fclose($outHandle);

        // Cleanup chunk files
        foreach (glob($chunkDir . DIRECTORY_SEPARATOR . 'chunk_*.part') as $p) {
            @unlink($p);
        }
        @rmdir($chunkDir);

        clearstatcache(true, $targetPath);
        
        // Build relative path for response
        $relativeItemPath = $sanitizedRelativeUrl === '' ? '' : $sanitizedRelativeUrl . '/';
        if (!empty($subfolderPath)) {
            $relativeItemPath .= $subfolderPath . '/';
        }
        $relativeItemPath .= $basename;

        $result['uploaded'][] = [
            'name' => $basename,
            'path' => $relativeItemPath,
            'relativePath' => $folderRelativePath,
            'type' => 'file',
            'modified' => filemtime($targetPath) ?: time(),
            'size' => filesize($targetPath) ?: 0,
        ];
        $result['finished'] = true;

        return $result;
    } catch (Throwable $e) {
        $result['errors'][] = [
            'name' => $folderRelativePath ?: $originalName,
            'error' => $e->getMessage(),
        ];
        return $result;
    }
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
            'modified' => $fileInfo->getMTime(),
            'path' => $relativeItemPath,
            'size' => $fileInfo->getSize(),
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
    error_log('[DEBUG] move_item called with oldPath: "' . $oldRelativePath . '", newPath: "' . $newRelativePath . '"');
    
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
// ACTIVITY LOGGING FUNCTIONS
// ============================================================================

/**
 * Get the logs directory path
 * @return string
 */
function get_logs_directory(): string
{
    return __DIR__ . '/../logs';
}

/**
 * Get the activity log file path
 * @return string
 */
function get_activity_log_file(): string
{
    return get_logs_directory() . '/activity.json';
}

// ============================================================================
// SECURITY FUNCTIONS
// ============================================================================

/**
 * Validate file name for security
 * @param string $name File name to validate
 * @return array Validation result with 'valid' and 'error' keys
 */
function validate_file_name(string $name): array
{
    if (empty($name)) {
        return ['valid' => false, 'error' => 'File name is required.'];
    }
    
    $name = trim($name);
    
    if (strlen($name) > 255) {
        return ['valid' => false, 'error' => 'File name is too long (max 255 characters).'];
    }
    
    // Check for forbidden characters
    if (preg_match('/[<>:"\/\\\\|?*\x00-\x1f]/', $name)) {
        return ['valid' => false, 'error' => 'File name contains invalid characters.'];
    }
    
    // Check for reserved names (Windows)
    if (preg_match('/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i', $name)) {
        return ['valid' => false, 'error' => 'This file name is reserved by the system.'];
    }
    
    // Check for names that are just dots
    if (preg_match('/^\.+$/', $name)) {
        return ['valid' => false, 'error' => 'Invalid file name.'];
    }
    
    return ['valid' => true, 'error' => null];
}

/**
 * Sanitize file name by removing/replacing invalid characters
 * @param string $name File name to sanitize
 * @return string Sanitized file name
 */
function sanitize_file_name(string $name): string
{
    $name = trim($name);
    
    // Replace forbidden characters with underscore
    $name = preg_replace('/[<>:"\/\\\\|?*\x00-\x1f]/', '_', $name);
    
    // Replace multiple consecutive underscores
    $name = preg_replace('/_+/', '_', $name);
    
    // Remove leading/trailing underscores and dots
    $name = preg_replace('/^[_.]+|[_.]+$/', '', $name);
    
    // Handle reserved names
    if (preg_match('/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i', $name)) {
        $name = '_' . $name;
    }
    
    // Ensure we have something left
    if (empty($name)) {
        $name = 'unnamed';
    }
    
    // Truncate if too long
    if (strlen($name) > 255) {
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        $nameWithoutExt = $ext ? substr($name, 0, -(strlen($ext) + 1)) : $name;
        $maxNameLength = $ext ? 255 - strlen($ext) - 1 : 255;
        $name = substr($nameWithoutExt, 0, $maxNameLength) . ($ext ? '.' . $ext : '');
    }
    
    return $name;
}

/**
 * Check if file extension is allowed
 * @param string $filename File name to check
 * @param array|null $allowedExtensions List of allowed extensions (null = use default)
 * @return array Validation result with 'valid', 'error', and 'extension' keys
 */
function validate_file_extension(string $filename, ?array $allowedExtensions = null): array
{
    // Dangerous extensions that should never be allowed
    $dangerousExtensions = [
        'exe', 'msi', 'dll', 'com', 'scr', 'pif',
        'vbs', 'vbe', 'jse', 'ws', 'wsf', 'wsc', 'wsh',
        'ps1', 'ps1xml', 'ps2', 'ps2xml', 'psc1', 'psc2',
        'lnk', 'inf', 'reg', 'hta', 'cpl', 'msc',
        'jar', 'jnlp'
    ];
    
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    
    if (empty($ext)) {
        // Files without extensions are allowed
        return ['valid' => true, 'error' => null, 'extension' => null];
    }
    
    // Check for dangerous extensions
    if (in_array($ext, $dangerousExtensions, true)) {
        return [
            'valid' => false,
            'error' => "File type .{$ext} is not allowed for security reasons.",
            'extension' => $ext
        ];
    }
    
    // If allowed extensions list is provided, check against it
    if ($allowedExtensions !== null && count($allowedExtensions) > 0) {
        if (!in_array($ext, $allowedExtensions, true)) {
            return [
                'valid' => false,
                'error' => "File type .{$ext} is not allowed.",
                'extension' => $ext
            ];
        }
    }
    
    return ['valid' => true, 'error' => null, 'extension' => $ext];
}

/**
 * Validate file size against limits
 * @param int $size File size in bytes
 * @param string $filename File name (for type detection)
 * @return array Validation result with 'valid', 'error', and 'limit' keys
 */
function validate_file_size(int $size, string $filename): array
{
    // Maximum file sizes by type (in bytes)
    $maxSizes = [
        'image' => 10 * 1024 * 1024,      // 10MB
        'video' => 500 * 1024 * 1024,     // 500MB
        'audio' => 50 * 1024 * 1024,      // 50MB
        'document' => 50 * 1024 * 1024,   // 50MB
        'archive' => 100 * 1024 * 1024,   // 100MB
        'code' => 5 * 1024 * 1024,        // 5MB
        'default' => 25 * 1024 * 1024     // 25MB
    ];
    
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $type = get_file_type_category($ext);
    $limit = $maxSizes[$type] ?? $maxSizes['default'];
    
    if ($size > $limit) {
        $limitMB = round($limit / 1024 / 1024);
        $sizeMB = round($size / 1024 / 1024, 1);
        return [
            'valid' => false,
            'error' => "File size ({$sizeMB}MB) exceeds limit ({$limitMB}MB).",
            'limit' => $limit
        ];
    }
    
    return ['valid' => true, 'error' => null, 'limit' => $limit];
}

/**
 * Get file type category from extension
 * @param string $ext File extension
 * @return string File type category
 */
function get_file_type_category(string $ext): string
{
    $imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'];
    $videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv'];
    $audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'];
    $archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
    $codeExts = ['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'rb', 'java', 'c', 'cpp', 'go', 'rs'];
    
    if (in_array($ext, $imageExts, true)) return 'image';
    if (in_array($ext, $videoExts, true)) return 'video';
    if (in_array($ext, $audioExts, true)) return 'audio';
    if (in_array($ext, $archiveExts, true)) return 'archive';
    if (in_array($ext, $codeExts, true)) return 'code';
    
    return 'document';
}

/**
 * Enhanced path validation with additional security checks
 * @param string $path Path to validate
 * @return array Validation result
 */
function validate_path_security(string $path): array
{
    // Check for null bytes (path injection)
    if (strpos($path, "\0") !== false) {
        return ['valid' => false, 'error' => 'Invalid path: null byte detected.'];
    }
    
    // Check for URL encoded traversal attempts
    $decodedPath = urldecode($path);
    if ($decodedPath !== $path && (
        strpos($decodedPath, '..') !== false ||
        strpos($decodedPath, '%') !== false
    )) {
        return ['valid' => false, 'error' => 'Invalid path: encoded traversal detected.'];
    }
    
    // Check for various traversal patterns
    $traversalPatterns = [
        '/\.\./',           // Parent directory
        '/^\/+/',           // Leading slashes
        '/^[a-zA-Z]:/',     // Windows drive letters
        '/%2e%2e/i',        // URL encoded ..
        '/%252e%252e/i',    // Double URL encoded ..
        '/\.\.%2f/i',       // Mixed encoding
        '/\.\.%5c/i'        // Mixed encoding (backslash)
    ];
    
    foreach ($traversalPatterns as $pattern) {
        if (preg_match($pattern, $path)) {
            return ['valid' => false, 'error' => 'Invalid path: directory traversal detected.'];
        }
    }
    
    // Check path length
    if (strlen($path) > 4096) {
        return ['valid' => false, 'error' => 'Path is too long.'];
    }
    
    return ['valid' => true, 'error' => null];
}

/**
 * Validate upload for all security concerns
 * @param array $fileEntry Single file entry from $_FILES
 * @param string $originalName Original file name
 * @return array Validation result with 'valid' and 'errors' keys
 */
function validate_upload_security(array $fileEntry, string $originalName): array
{
    $errors = [];
    
    // Validate file name
    $nameResult = validate_file_name($originalName);
    if (!$nameResult['valid']) {
        $errors[] = $nameResult['error'];
    }
    
    // Validate extension
    $extResult = validate_file_extension($originalName);
    if (!$extResult['valid']) {
        $errors[] = $extResult['error'];
    }
    
    // Validate size
    $size = $fileEntry['size'] ?? 0;
    $sizeResult = validate_file_size($size, $originalName);
    if (!$sizeResult['valid']) {
        $errors[] = $sizeResult['error'];
    }
    
    // Check if it's a valid uploaded file
    $tmpName = $fileEntry['tmp_name'] ?? '';
    if (!empty($tmpName) && !is_uploaded_file($tmpName)) {
        $errors[] = 'Invalid upload file.';
    }
    
    return [
        'valid' => count($errors) === 0,
        'errors' => $errors
    ];
}

// ============================================================================
// RATE LIMITING
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
    $_SESSION[$key] = array_filter($_SESSION[$key], function($timestamp) use ($now, $windowSeconds) {
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
    $_SESSION[$key] = array_filter($_SESSION[$key], function($timestamp) use ($now, $windowSeconds) {
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

// ============================================================================
// CONTENT SECURITY
// ============================================================================

/**
 * Escape HTML special characters for safe output
 * @param string $text Text to escape
 * @return string Escaped text
 */
function escape_html(string $text): string
{
    return htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/**
 * Sanitize HTML content (strip dangerous tags)
 * @param string $html HTML content
 * @return string Sanitized HTML
 */
function sanitize_html_content(string $html): string
{
    // Remove script tags and content
    $html = preg_replace('/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/is', '', $html);
    
    // Remove style tags and content
    $html = preg_replace('/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/is', '', $html);
    
    // Remove event handlers
    $html = preg_replace('/\s*on\w+\s*=\s*["\'][^"\']*["\']/i', '', $html);
    
    // Remove javascript: URLs
    $html = preg_replace('/javascript\s*:/i', '', $html);
    
    return $html;
}

/**
 * Check if content is safe to display
 * @param string $content Content to check
 * @return array Safety check result with 'safe' and 'warnings' keys
 */
function check_content_safety(string $content): array
{
    $warnings = [];
    
    // Check for script tags
    if (preg_match('/<script\b/i', $content)) {
        $warnings[] = 'Content contains script tags.';
    }
    
    // Check for event handlers
    if (preg_match('/\bon\w+\s*=/i', $content)) {
        $warnings[] = 'Content contains event handlers.';
    }
    
    // Check for JavaScript URLs
    if (preg_match('/javascript\s*:/i', $content)) {
        $warnings[] = 'Content contains JavaScript URLs.';
    }
    
    // Check for embedded objects
    if (preg_match('/<(object|embed|iframe)\b/i', $content)) {
        $warnings[] = 'Content contains embedded objects.';
    }
    
    return [
        'safe' => count($warnings) === 0,
        'warnings' => $warnings
    ];
}

/**
 * Generate a secure random token
 * @param int $length Token length in bytes
 * @return string Hexadecimal token string
 */
function generate_secure_token(int $length = 32): string
{
    return bin2hex(random_bytes($length));
}

/**
 * Verify CSRF token
 * @param string $token Token to verify
 * @return bool Whether token is valid
 */
function verify_csrf_token(string $token): bool
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $storedToken = $_SESSION['csrf_token'] ?? '';
    
    if (empty($storedToken) || empty($token)) {
        return false;
    }
    
    return hash_equals($storedToken, $token);
}

/**
 * Generate and store CSRF token
 * @return string Generated token
 */
function generate_csrf_token(): string
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $token = generate_secure_token();
    $_SESSION['csrf_token'] = $token;
    
    return $token;
}

/**
 * Ensure logs directory exists and is writable
 * @return void
 */
function ensure_logs_directory(): void
{
    $logsDir = get_logs_directory();
    if (!is_dir($logsDir)) {
        if (!mkdir($logsDir, 0755, true)) {
            throw new RuntimeException('Gagal membuat direktori logs.');
        }
    }
    
    if (!is_writable($logsDir)) {
        throw new RuntimeException('Direktori logs tidak dapat ditulisi.');
    }
}


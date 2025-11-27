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

/**
 * Read activity logs from JSON file
 * @param int $limit Maximum number of logs to return (0 = all)
 * @param int $offset Starting position for pagination
 * @param array $filters Filter options (action, targetType, search, startDate, endDate)
 * @return array
 */
function read_activity_logs(int $limit = 0, int $offset = 0, array $filters = []): array
{
    $logFile = get_activity_log_file();
    
    if (!file_exists($logFile)) {
        return [
            'logs' => [],
            'total' => 0,
            'filtered' => 0
        ];
    }
    
    $content = file_get_contents($logFile);
    if ($content === false) {
        return [
            'logs' => [],
            'total' => 0,
            'filtered' => 0
        ];
    }
    
    $allLogs = json_decode($content, true);
    if (!is_array($allLogs)) {
        $allLogs = [];
    }
    
    // Sort by timestamp descending (newest first)
    usort($allLogs, function($a, $b) {
        return ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0);
    });
    
    $total = count($allLogs);
    
    // Apply filters
    $filteredLogs = array_filter($allLogs, function($log) use ($filters) {
        // Action filter
        if (!empty($filters['action']) && ($log['action'] ?? '') !== $filters['action']) {
            return false;
        }
        
        // Target type filter
        if (!empty($filters['targetType']) && ($log['targetType'] ?? '') !== $filters['targetType']) {
            return false;
        }
        
        // Search filter (search in target name and path)
        if (!empty($filters['search'])) {
            $search = strtolower($filters['search']);
            $target = strtolower($log['target'] ?? '');
            $path = strtolower($log['path'] ?? '');
            $action = strtolower($log['action'] ?? '');
            
            if (strpos($target, $search) === false && 
                strpos($path, $search) === false &&
                strpos($action, $search) === false) {
                return false;
            }
        }
        
        // Date range filter
        if (!empty($filters['startDate'])) {
            $startTimestamp = strtotime($filters['startDate']);
            if ($startTimestamp !== false && ($log['timestamp'] ?? 0) < $startTimestamp) {
                return false;
            }
        }
        
        if (!empty($filters['endDate'])) {
            $endTimestamp = strtotime($filters['endDate'] . ' 23:59:59');
            if ($endTimestamp !== false && ($log['timestamp'] ?? 0) > $endTimestamp) {
                return false;
            }
        }
        
        return true;
    });
    
    $filteredLogs = array_values($filteredLogs);
    $filteredCount = count($filteredLogs);
    
    // Apply pagination
    if ($limit > 0) {
        $filteredLogs = array_slice($filteredLogs, $offset, $limit);
    } elseif ($offset > 0) {
        $filteredLogs = array_slice($filteredLogs, $offset);
    }
    
    return [
        'logs' => $filteredLogs,
        'total' => $total,
        'filtered' => $filteredCount
    ];
}

/**
 * Write an activity log entry
 * @param string $action The action performed (create, delete, upload, rename, move, download, save)
 * @param string $target The target file/folder name
 * @param string $targetType The target type (file or folder)
 * @param string $path The path where the action occurred
 * @param array $extra Extra data (oldPath, newPath, size, etc.)
 * @return array The created log entry
 */
function write_activity_log(string $action, string $target, string $targetType, string $path = '', array $extra = []): array
{
    ensure_logs_directory();
    
    $logFile = get_activity_log_file();
    
    // Read existing logs
    $logs = [];
    if (file_exists($logFile)) {
        $content = file_get_contents($logFile);
        if ($content !== false) {
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                $logs = $decoded;
            }
        }
    }
    
    // Create new log entry
    $logEntry = [
        'id' => uniqid('log_', true),
        'timestamp' => time(),
        'datetime' => date('Y-m-d H:i:s'),
        'action' => $action,
        'target' => $target,
        'targetType' => $targetType,
        'path' => $path,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    // Merge extra data
    if (!empty($extra)) {
        $logEntry = array_merge($logEntry, $extra);
    }
    
    // Add to logs array
    array_unshift($logs, $logEntry);
    
    // Limit log size (keep last 10000 entries)
    $maxLogs = 10000;
    if (count($logs) > $maxLogs) {
        $logs = array_slice($logs, 0, $maxLogs);
    }
    
    // Write to file
    $json = json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        throw new RuntimeException('Gagal mengenkode log ke JSON.');
    }
    
    if (file_put_contents($logFile, $json, LOCK_EX) === false) {
        throw new RuntimeException('Gagal menyimpan log aktivitas.');
    }
    
    return $logEntry;
}

/**
 * Clean up old activity logs
 * @param int $days Delete logs older than this many days
 * @return int Number of logs deleted
 */
function cleanup_activity_logs(int $days): int
{
    $logFile = get_activity_log_file();
    
    if (!file_exists($logFile)) {
        return 0;
    }
    
    $content = file_get_contents($logFile);
    if ($content === false) {
        return 0;
    }
    
    $logs = json_decode($content, true);
    if (!is_array($logs)) {
        return 0;
    }
    
    $cutoffTimestamp = time() - ($days * 24 * 60 * 60);
    $originalCount = count($logs);
    
    $logs = array_filter($logs, function($log) use ($cutoffTimestamp) {
        return ($log['timestamp'] ?? 0) >= $cutoffTimestamp;
    });
    
    $logs = array_values($logs);
    $deletedCount = $originalCount - count($logs);
    
    if ($deletedCount > 0) {
        $json = json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($json !== false) {
            file_put_contents($logFile, $json, LOCK_EX);
        }
    }
    
    return $deletedCount;
}

/**
 * Export activity logs to CSV format
 * @param array $filters Filter options
 * @return string CSV content
 */
function export_logs_csv(array $filters = []): string
{
    $result = read_activity_logs(0, 0, $filters);
    $logs = $result['logs'];
    
    $output = "ID,Waktu,Aksi,Target,Tipe,Path,IP\n";
    
    foreach ($logs as $log) {
        $row = [
            $log['id'] ?? '',
            $log['datetime'] ?? date('Y-m-d H:i:s', $log['timestamp'] ?? 0),
            $log['action'] ?? '',
            $log['target'] ?? '',
            $log['targetType'] ?? '',
            $log['path'] ?? '',
            $log['ip'] ?? ''
        ];
        
        // Escape CSV values
        $row = array_map(function($val) {
            $val = str_replace('"', '""', $val);
            return '"' . $val . '"';
        }, $row);
        
        $output .= implode(',', $row) . "\n";
    }
    
    return $output;
}

/**
 * Export activity logs to JSON format
 * @param array $filters Filter options
 * @return string JSON content
 */
function export_logs_json(array $filters = []): string
{
    $result = read_activity_logs(0, 0, $filters);
    return json_encode($result['logs'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

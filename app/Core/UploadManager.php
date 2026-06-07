<?php
/**
 * Upload Manager
 * Handles file uploads: standard, chunked, and folder-aware.
 * Extracted from FileManager.php for single-responsibility.
 *
 * @version 2.0.0
 */

function validate_file_extension(string $filename, ?array $allowedExtensions = null): array
{
    // Dangerous extensions that should never be allowed
    $dangerousExtensions = [
        'exe',
        'msi',
        'dll',
        'com',
        'scr',
        'pif',
        'vbs',
        'vbe',
        'jse',
        'ws',
        'wsf',
        'wsc',
        'wsh',
        'ps1',
        'ps1xml',
        'ps2',
        'ps2xml',
        'psc1',
        'psc2',
        'lnk',
        'inf',
        'reg',
        'hta',
        'cpl',
        'msc',
        'jar',
        'jnlp',
        // Server-side executable extensions
        'php',
        'phtml',
        'phar',
        'php3',
        'php4',
        'php5',
        'php7',
        'phps',
        'sh',
        'bash',
        'py',
        'pyc',
        'pyo',
        'cgi',
        'pl',
        'asp',
        'aspx',
        'jsp',
        'shtml',
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

        // Validate file extension against dangerous extensions blocklist
        $extValidation = validate_file_extension($basename);
        if (!$extValidation['valid']) {
            $errors[] = [
                'name' => $originalName,
                'error' => $extValidation['error'],
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

        // Validate file extension against dangerous extensions blocklist
        $extValidation = validate_file_extension($basename);
        if (!$extValidation['valid']) {
            $result['errors'][] = [
                'name' => $originalName,
                'error' => $extValidation['error'],
            ];
            return $result;
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

        $chunkPath = $chunkDir . DIRECTORY_SEPARATOR . 'chunk_' . (int) $chunkIndex . '.part';

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

        // Validate file extension against dangerous extensions blocklist
        $extValidation = validate_file_extension($basename);
        if (!$extValidation['valid']) {
            $result['errors'][] = [
                'name' => $folderRelativePath ?: $originalName,
                'error' => $extValidation['error'],
            ];
            return $result;
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
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $uploadId = md5($folderRelativePath . '|' . session_id() . '|' . $clientIp);
        $tempBase = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'fm_chunks_folder';
        $chunkDir = $tempBase . DIRECTORY_SEPARATOR . $uploadId;

        if (!is_dir($chunkDir)) {
            @mkdir($chunkDir, 0755, true);
        }

        $chunkPath = $chunkDir . DIRECTORY_SEPARATOR . 'chunk_' . (int) $chunkIndex . '.part';

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
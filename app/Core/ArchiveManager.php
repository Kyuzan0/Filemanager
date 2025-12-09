<?php
/**
 * Archive Manager
 * Handles ZIP compression and extraction operations
 * 
 * Features:
 * - Create ZIP from selected files/folders
 * - Extract ZIP files
 * - List ZIP contents without extraction
 * - Progress tracking for large archives
 */

/**
 * Check if ZipArchive is available
 * @return bool
 */
function is_zip_supported(): bool
{
    return class_exists('ZipArchive');
}

/**
 * Create a ZIP archive from given paths
 * 
 * @param string $root Root directory
 * @param array $relativePaths Array of relative paths to compress
 * @param string|null $outputName Optional output filename (without .zip)
 * @return array Result with 'success', 'path', 'name', 'size', 'itemCount'
 */
function create_zip(string $root, array $relativePaths, ?string $outputName = null): array
{
    if (!is_zip_supported()) {
        throw new RuntimeException('ZipArchive tidak tersedia di server.');
    }

    if (empty($relativePaths)) {
        throw new RuntimeException('Tidak ada file yang dipilih untuk dikompres.');
    }

    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    // Determine output filename
    if ($outputName === null) {
        if (count($relativePaths) === 1) {
            // Single item - use its name
            $baseName = basename($relativePaths[0]);
            $outputName = pathinfo($baseName, PATHINFO_FILENAME);
        } else {
            // Multiple items - use timestamp
            $outputName = 'archive_' . date('Ymd_His');
        }
    }

    // Sanitize output name
    $outputName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $outputName);
    $zipFileName = $outputName . '.zip';

    // Determine output directory (same as first item's parent or root)
    $firstPath = $relativePaths[0];
    $parentDir = dirname($firstPath);
    if ($parentDir === '.' || $parentDir === '') {
        $outputDir = $normalizedRoot;
        $outputRelativePath = $zipFileName;
    } else {
        $outputDir = $normalizedRoot . DIRECTORY_SEPARATOR . $parentDir;
        $outputRelativePath = $parentDir . '/' . $zipFileName;
    }

    // Full output path
    $zipFullPath = $outputDir . DIRECTORY_SEPARATOR . $zipFileName;

    // Handle filename conflict
    $counter = 1;
    while (file_exists($zipFullPath)) {
        $newName = $outputName . '_' . $counter . '.zip';
        $zipFullPath = $outputDir . DIRECTORY_SEPARATOR . $newName;
        if ($parentDir === '.' || $parentDir === '') {
            $outputRelativePath = $newName;
        } else {
            $outputRelativePath = $parentDir . '/' . $newName;
        }
        $counter++;
    }

    $zip = new ZipArchive();
    $result = $zip->open($zipFullPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

    if ($result !== true) {
        throw new RuntimeException('Gagal membuat file ZIP. Error code: ' . $result);
    }

    $itemCount = 0;
    $errors = [];

    foreach ($relativePaths as $relativePath) {
        $sanitized = sanitize_relative_path($relativePath);
        if ($sanitized === '') {
            continue;
        }

        $fullPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitized);

        if (!file_exists($fullPath)) {
            $errors[] = ['path' => $sanitized, 'error' => 'File tidak ditemukan'];
            continue;
        }

        // Check if within root
        $realPath = realpath($fullPath);
        if ($realPath === false || strpos($realPath, $normalizedRoot) !== 0) {
            $errors[] = ['path' => $sanitized, 'error' => 'Path tidak valid'];
            continue;
        }

        if (is_dir($fullPath)) {
            // Add directory recursively
            $added = add_directory_to_zip($zip, $fullPath, basename($sanitized));
            $itemCount += $added;
        } else {
            // Add single file
            $entryName = basename($sanitized);
            if ($zip->addFile($fullPath, $entryName)) {
                $itemCount++;
            } else {
                $errors[] = ['path' => $sanitized, 'error' => 'Gagal menambahkan ke ZIP'];
            }
        }
    }

    $zip->close();

    // Verify the zip was created
    if (!file_exists($zipFullPath)) {
        throw new RuntimeException('Gagal membuat file ZIP.');
    }

    $zipSize = filesize($zipFullPath);

    return [
        'success' => count($errors) === 0,
        'path' => str_replace('\\', '/', $outputRelativePath),
        'name' => basename($zipFullPath),
        'size' => $zipSize,
        'itemCount' => $itemCount,
        'errors' => $errors
    ];
}

/**
 * Recursively add a directory to ZIP archive
 * 
 * @param ZipArchive $zip
 * @param string $dirPath Full path to directory
 * @param string $zipPath Path inside ZIP
 * @return int Number of items added
 */
function add_directory_to_zip(ZipArchive $zip, string $dirPath, string $zipPath): int
{
    $count = 0;

    // Add the directory entry
    $zip->addEmptyDir($zipPath);
    $count++;

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator(
            $dirPath,
            FilesystemIterator::SKIP_DOTS
        ),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        $itemPath = $item->getPathname();
        $relativePath = $zipPath . '/' . $iterator->getSubPathName();
        $relativePath = str_replace('\\', '/', $relativePath);

        if ($item->isDir()) {
            $zip->addEmptyDir($relativePath);
            $count++;
        } else {
            if ($zip->addFile($itemPath, $relativePath)) {
                $count++;
            }
        }
    }

    return $count;
}

/**
 * Extract a ZIP archive
 * 
 * @param string $root Root directory
 * @param string $zipRelativePath Relative path to ZIP file
 * @param string|null $extractToPath Optional extraction target (relative path)
 * @return array Result with 'success', 'extractedTo', 'itemCount'
 */
function extract_zip(string $root, string $zipRelativePath, ?string $extractToPath = null): array
{
    if (!is_zip_supported()) {
        throw new RuntimeException('ZipArchive tidak tersedia di server.');
    }

    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    $sanitizedZipPath = sanitize_relative_path($zipRelativePath);
    if ($sanitizedZipPath === '') {
        throw new RuntimeException('Path ZIP tidak valid.');
    }

    $zipFullPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedZipPath);

    if (!file_exists($zipFullPath)) {
        throw new RuntimeException('File ZIP tidak ditemukan.');
    }

    // Verify it's a zip file
    $mimeType = mime_content_type($zipFullPath);
    if (!in_array($mimeType, ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'])) {
        // Also check extension
        $ext = strtolower(pathinfo($zipFullPath, PATHINFO_EXTENSION));
        if ($ext !== 'zip') {
            throw new RuntimeException('File bukan format ZIP yang valid.');
        }
    }

    // Determine extraction directory
    if ($extractToPath !== null) {
        $sanitizedExtractPath = sanitize_relative_path($extractToPath);
        $extractDir = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedExtractPath);
    } else {
        // Extract to same directory as ZIP, in a folder with ZIP name
        $zipDir = dirname($zipFullPath);
        $zipBaseName = pathinfo($zipFullPath, PATHINFO_FILENAME);
        $extractDir = $zipDir . DIRECTORY_SEPARATOR . $zipBaseName;

        // Handle naming conflict
        $counter = 1;
        while (file_exists($extractDir)) {
            $extractDir = $zipDir . DIRECTORY_SEPARATOR . $zipBaseName . '_' . $counter;
            $counter++;
        }
    }

    // Create extraction directory
    if (!is_dir($extractDir)) {
        if (!mkdir($extractDir, 0755, true)) {
            throw new RuntimeException('Gagal membuat direktori ekstraksi.');
        }
    }

    // Verify extraction dir is within root
    $realExtractDir = realpath($extractDir);
    if ($realExtractDir === false) {
        $realExtractDir = $extractDir; // New directory
    }
    if (strpos($realExtractDir, $normalizedRoot) !== 0) {
        throw new RuntimeException('Lokasi ekstraksi tidak valid.');
    }

    $zip = new ZipArchive();
    $result = $zip->open($zipFullPath);

    if ($result !== true) {
        throw new RuntimeException('Gagal membuka file ZIP. Error code: ' . $result);
    }

    // Security check: validate all entries before extraction
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entryName = $zip->getNameIndex($i);
        if ($entryName === false) {
            continue;
        }

        // Check for path traversal attempts
        $sanitizedEntry = sanitize_relative_path($entryName);
        if (strpos($entryName, '..') !== false) {
            $zip->close();
            throw new RuntimeException('File ZIP mengandung path tidak aman: ' . $entryName);
        }
    }

    $itemCount = $zip->numFiles;
    $extractResult = $zip->extractTo($extractDir);
    $zip->close();

    if (!$extractResult) {
        throw new RuntimeException('Gagal mengekstrak file ZIP.');
    }

    // Calculate relative path for response
    $extractRelativePath = str_replace($normalizedRoot . DIRECTORY_SEPARATOR, '', $extractDir);
    $extractRelativePath = str_replace('\\', '/', $extractRelativePath);

    return [
        'success' => true,
        'extractedTo' => $extractRelativePath,
        'folderName' => basename($extractDir),
        'itemCount' => $itemCount
    ];
}

/**
 * List contents of a ZIP file without extracting
 * 
 * @param string $root Root directory
 * @param string $zipRelativePath Relative path to ZIP file
 * @return array List of items in ZIP
 */
function list_zip_contents(string $root, string $zipRelativePath): array
{
    if (!is_zip_supported()) {
        throw new RuntimeException('ZipArchive tidak tersedia di server.');
    }

    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    $sanitizedZipPath = sanitize_relative_path($zipRelativePath);
    if ($sanitizedZipPath === '') {
        throw new RuntimeException('Path ZIP tidak valid.');
    }

    $zipFullPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedZipPath);

    if (!file_exists($zipFullPath)) {
        throw new RuntimeException('File ZIP tidak ditemukan.');
    }

    $zip = new ZipArchive();
    $result = $zip->open($zipFullPath, ZipArchive::RDONLY);

    if ($result !== true) {
        throw new RuntimeException('Gagal membuka file ZIP. Error code: ' . $result);
    }

    $items = [];
    $totalSize = 0;

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $stat = $zip->statIndex($i);
        if ($stat === false) {
            continue;
        }

        $name = $stat['name'];
        $isDir = substr($name, -1) === '/';
        $size = $stat['size'];
        $compressedSize = $stat['comp_size'];
        $modified = $stat['mtime'];

        $items[] = [
            'name' => $isDir ? rtrim($name, '/') : $name,
            'type' => $isDir ? 'folder' : 'file',
            'size' => $size,
            'compressedSize' => $compressedSize,
            'modified' => $modified,
            'index' => $i
        ];

        $totalSize += $size;
    }

    $zipSize = filesize($zipFullPath);
    $compressionRatio = $totalSize > 0 ? round(($zipSize / $totalSize) * 100, 1) : 0;

    $result = [
        'success' => true,
        'name' => basename($zipFullPath),
        'zipSize' => $zipSize,
        'uncompressedSize' => $totalSize,
        'compressionRatio' => $compressionRatio . '%',
        'itemCount' => count($items),
        'items' => $items
    ];

    $zip->close();

    return $result;
}

/**
 * Check if a file is a ZIP archive
 * 
 * @param string $filename
 * @return bool
 */
function is_zip_file(string $filename): bool
{
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return $ext === 'zip';
}

/**
 * Check if a file is an extractable archive
 * 
 * @param string $filename
 * @return bool
 */
function is_archive_file(string $filename): bool
{
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($ext, ['zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'bz2']);
}

/**
 * Get archive type from filename
 * 
 * @param string $filename
 * @return string|null
 */
function get_archive_type(string $filename): ?string
{
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

    if ($ext === 'zip')
        return 'zip';
    if ($ext === '7z')
        return '7z';
    if ($ext === 'rar')
        return 'rar';
    if (in_array($ext, ['tar', 'gz', 'tgz', 'bz2']))
        return 'tar';

    return null;
}

// ============================================================================
// 7-ZIP INTEGRATION WITH BUNDLED BINARIES
// ============================================================================

/**
 * Detect the current operating system
 * 
 * @return string 'windows', 'linux', 'macos', or 'unknown'
 */
function detect_os(): string
{
    $os = strtoupper(PHP_OS);

    if (substr($os, 0, 3) === 'WIN') {
        return 'windows';
    }

    if ($os === 'LINUX') {
        return 'linux';
    }

    if ($os === 'DARWIN') {
        return 'macos';
    }

    // Try uname for more accurate detection
    if (function_exists('php_uname')) {
        $uname = strtolower(php_uname('s'));
        if (strpos($uname, 'linux') !== false) {
            return 'linux';
        }
        if (strpos($uname, 'darwin') !== false) {
            return 'macos';
        }
        if (strpos($uname, 'windows') !== false || strpos($uname, 'win') !== false) {
            return 'windows';
        }
    }

    return 'unknown';
}

/**
 * Get the base directory for bundled binaries
 * 
 * @return string
 */
function get_bin_directory(): string
{
    // Use BIN_DIR constant if defined, otherwise fallback to relative path
    if (defined('BIN_DIR')) {
        return BIN_DIR;
    }
    return dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'bin';
}

/**
 * Get the bundled 7-Zip binary path based on OS
 * 
 * @return string|null Path to bundled binary or null if not found
 */
function get_bundled_7zip_path(): ?string
{
    $binDir = get_bin_directory();
    $os = detect_os();

    switch ($os) {
        case 'windows':
            // Check for 7z.exe in bin/windows/
            $paths = [
                $binDir . DIRECTORY_SEPARATOR . 'windows' . DIRECTORY_SEPARATOR . '7z.exe',
                $binDir . DIRECTORY_SEPARATOR . 'windows' . DIRECTORY_SEPARATOR . '7za.exe',
            ];
            break;

        case 'linux':
        case 'macos':
            // Check for 7za in bin/linux/
            $paths = [
                $binDir . DIRECTORY_SEPARATOR . 'linux' . DIRECTORY_SEPARATOR . '7za',
                $binDir . DIRECTORY_SEPARATOR . 'linux' . DIRECTORY_SEPARATOR . '7z',
                $binDir . DIRECTORY_SEPARATOR . 'linux' . DIRECTORY_SEPARATOR . '7zr',
            ];
            break;

        default:
            return null;
    }

    foreach ($paths as $path) {
        if (file_exists($path)) {
            // On Linux/macOS, check if executable
            if ($os !== 'windows' && !is_executable($path)) {
                // Try to make it executable
                @chmod($path, 0755);
            }

            // Verify it works
            $testCmd = escapeshellarg($path) . ' 2>&1';
            $result = @shell_exec($testCmd);
            if ($result !== null && strpos($result, '7-Zip') !== false) {
                return $path;
            }
        }
    }

    return null;
}

/**
 * Check if 7-Zip command line tool is available
 * Checks bundled binaries first, then system-installed
 * 
 * @return bool
 */
function is_7zip_available(): bool
{
    static $available = null;

    if ($available !== null) {
        return $available;
    }

    $available = get_7zip_path() !== null;
    return $available;
}

/**
 * Get the 7-Zip executable path
 * Priority: Bundled binaries > PATH commands > System installations
 * 
 * @return string|null
 */
function get_7zip_path(): ?string
{
    static $cachedPath = null;
    static $pathChecked = false;

    // Return cached result
    if ($pathChecked) {
        return $cachedPath;
    }
    $pathChecked = true;

    // 1. First, check bundled binaries
    $bundledPath = get_bundled_7zip_path();
    if ($bundledPath !== null) {
        $cachedPath = $bundledPath;
        return $cachedPath;
    }

    // 2. Try common 7z executable names in PATH
    $commands = ['7z', '7za', '7zr'];
    foreach ($commands as $cmd) {
        $result = @shell_exec($cmd . ' 2>&1');
        if ($result !== null && strpos($result, '7-Zip') !== false) {
            $cachedPath = $cmd;
            return $cachedPath;
        }
    }

    // 3. Check system installation paths
    $os = detect_os();
    $paths = [];

    if ($os === 'windows') {
        $paths = [
            'C:\\Program Files\\7-Zip\\7z.exe',
            'C:\\Program Files (x86)\\7-Zip\\7z.exe',
        ];

        // Add environment variable paths
        $programFiles = getenv('ProgramFiles');
        $programFilesX86 = getenv('ProgramFiles(x86)');

        if ($programFiles) {
            $paths[] = $programFiles . '\\7-Zip\\7z.exe';
        }
        if ($programFilesX86) {
            $paths[] = $programFilesX86 . '\\7-Zip\\7z.exe';
        }
    } else {
        // Linux/macOS/Unix paths
        $paths = [
            '/usr/bin/7z',
            '/usr/bin/7za',
            '/usr/bin/7zr',
            '/usr/local/bin/7z',
            '/usr/local/bin/7za',
            '/snap/bin/7z',
            '/opt/homebrew/bin/7z',  // macOS Homebrew
            '/opt/homebrew/bin/7za',
        ];
    }

    foreach ($paths as $path) {
        if (file_exists($path) && is_executable($path)) {
            $cachedPath = $path;
            return $cachedPath;
        }
    }

    return null;
}

/**
 * Get information about 7-Zip availability
 * Useful for debugging and status display
 * 
 * @return array
 */
function get_7zip_info(): array
{
    $os = detect_os();
    $path = get_7zip_path();
    $bundledPath = get_bundled_7zip_path();

    $info = [
        'available' => $path !== null,
        'os' => $os,
        'path' => $path,
        'isBundled' => $bundledPath !== null && $path === $bundledPath,
        'bundledPath' => $bundledPath,
        'version' => null,
    ];

    // Get version info
    if ($path !== null) {
        $versionCmd = escapeshellarg($path) . ' 2>&1';
        $output = @shell_exec($versionCmd);
        if ($output !== null && preg_match('/7-Zip[^\d]*(\d+\.\d+)/i', $output, $matches)) {
            $info['version'] = $matches[1];
        }
    }

    return $info;
}

/**
 * Extract archive using 7-Zip command line
 * 
 * @param string $archivePath Full path to archive
 * @param string $extractDir Extraction directory
 * @return array Result with 'success', 'output'
 */
function extract_with_7zip(string $archivePath, string $extractDir): array
{
    // Get 7-Zip executable path
    $cmd = get_7zip_path();

    if ($cmd === null) {
        throw new RuntimeException('7-Zip tidak tersedia di server. Install 7-Zip untuk mengekstrak file ini.');
    }

    // Build extraction command
    // -y = assume Yes on all queries
    // -o = set output directory
    // Wrap path in quotes for Windows paths with spaces
    if (strpos($cmd, ' ') !== false || strpos($cmd, '\\') !== false) {
        $cmd = '"' . $cmd . '"';
    }
    $escapedArchive = escapeshellarg($archivePath);
    $escapedDir = escapeshellarg($extractDir);

    $command = "$cmd x $escapedArchive -o$escapedDir -y 2>&1";

    $output = shell_exec($command);
    $success = $output !== null && (strpos($output, 'Everything is Ok') !== false || strpos($output, 'Ok') !== false);

    return [
        'success' => $success,
        'output' => $output ?? 'No output'
    ];
}

/**
 * Universal archive extraction function
 * Supports ZIP (native) and 7z/RAR/TAR (via 7-Zip CLI)
 * 
 * @param string $root Root directory
 * @param string $archiveRelativePath Relative path to archive file
 * @param string|null $extractToPath Optional extraction target
 * @return array Result with 'success', 'extractedTo', 'itemCount'
 */
function extract_archive(string $root, string $archiveRelativePath, ?string $extractToPath = null): array
{
    $normalizedRoot = realpath($root);
    if ($normalizedRoot === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }

    $sanitizedPath = sanitize_relative_path($archiveRelativePath);
    if ($sanitizedPath === '') {
        throw new RuntimeException('Path arsip tidak valid.');
    }

    $archiveFullPath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedPath);

    if (!file_exists($archiveFullPath)) {
        throw new RuntimeException('File arsip tidak ditemukan.');
    }

    $archiveType = get_archive_type($archiveFullPath);

    if ($archiveType === null) {
        throw new RuntimeException('Format arsip tidak didukung.');
    }

    // Determine extraction directory
    $archiveDir = dirname($archiveFullPath);
    $archiveBaseName = pathinfo($archiveFullPath, PATHINFO_FILENAME);

    if ($extractToPath !== null) {
        $sanitizedExtractPath = sanitize_relative_path($extractToPath);
        $extractDir = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedExtractPath);
    } else {
        $extractDir = $archiveDir . DIRECTORY_SEPARATOR . $archiveBaseName;

        // Handle naming conflict
        $counter = 1;
        while (file_exists($extractDir)) {
            $extractDir = $archiveDir . DIRECTORY_SEPARATOR . $archiveBaseName . '_' . $counter;
            $counter++;
        }
    }

    // Create extraction directory
    if (!is_dir($extractDir)) {
        if (!mkdir($extractDir, 0755, true)) {
            throw new RuntimeException('Gagal membuat direktori ekstraksi.');
        }
    }

    // Verify extraction dir is within root
    $realExtractDir = realpath($extractDir);
    if ($realExtractDir === false) {
        $realExtractDir = $extractDir;
    }
    if (strpos($realExtractDir, $normalizedRoot) !== 0) {
        throw new RuntimeException('Lokasi ekstraksi tidak valid.');
    }

    $itemCount = 0;

    // Extract based on archive type
    if ($archiveType === 'zip' && is_zip_supported()) {
        // Use native PHP ZipArchive
        $zip = new ZipArchive();
        $result = $zip->open($archiveFullPath);

        if ($result !== true) {
            throw new RuntimeException('Gagal membuka file ZIP. Error code: ' . $result);
        }

        // Security check
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entryName = $zip->getNameIndex($i);
            if ($entryName !== false && strpos($entryName, '..') !== false) {
                $zip->close();
                throw new RuntimeException('File ZIP mengandung path tidak aman: ' . $entryName);
            }
        }

        $itemCount = $zip->numFiles;
        $extractResult = $zip->extractTo($extractDir);
        $zip->close();

        if (!$extractResult) {
            throw new RuntimeException('Gagal mengekstrak file ZIP.');
        }
    } else {
        // Use 7-Zip for other formats (or ZIP if ZipArchive not available)
        if (!is_7zip_available()) {
            throw new RuntimeException('7-Zip tidak tersedia. Install 7-Zip untuk mengekstrak file ' . strtoupper($archiveType) . '.');
        }

        $result = extract_with_7zip($archiveFullPath, $extractDir);

        if (!$result['success']) {
            throw new RuntimeException('Gagal mengekstrak arsip: ' . substr($result['output'], 0, 200));
        }

        // Count extracted items
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($extractDir, FilesystemIterator::SKIP_DOTS)
        );
        $itemCount = iterator_count($iterator);
    }

    // Calculate relative path for response
    $extractRelativePath = str_replace($normalizedRoot . DIRECTORY_SEPARATOR, '', $extractDir);
    $extractRelativePath = str_replace('\\', '/', $extractRelativePath);

    return [
        'success' => true,
        'extractedTo' => $extractRelativePath,
        'folderName' => basename($extractDir),
        'itemCount' => $itemCount,
        'archiveType' => $archiveType
    ];
}

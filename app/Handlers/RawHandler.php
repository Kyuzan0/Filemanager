<?php

/**
 * Raw File Handler
 * Handles raw file streaming for media preview and downloads
 */

/**
 * Handle raw file streaming request
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath Sanitized relative path
 * @return void
 */
function handle_raw_action(string $root, string $sanitizedPath): void
{
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
    $mimeTypes = get_mime_types();

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

    // Output file content
    stream_file_content($realFile, $start, $end);
    exit;
}

/**
 * Get common MIME types mapping
 * 
 * @return array<string, string>
 */
function get_mime_types(): array
{
    return [
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
}

/**
 * Stream file content with optional byte range support
 * 
 * @param string $filePath Full path to file
 * @param int $start Start byte position
 * @param int $end End byte position
 * @return void
 */
function stream_file_content(string $filePath, int $start, int $end): void
{
    $fp = fopen($filePath, 'rb');
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
}

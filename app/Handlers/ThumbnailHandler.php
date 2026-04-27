<?php

/**
 * Thumbnail Handler
 * 
 * Generates and serves cached image thumbnails using PHP GD.
 * Thumbnails are stored in storage/thumbnails/ with hashed filenames.
 */

/**
 * Supported image extensions for thumbnail generation
 * 
 * @return array<string>
 */
function get_thumbnail_extensions(): array
{
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
}

/**
 * Check if a file is eligible for thumbnail generation
 * 
 * @param string $filename File name
 * @return bool
 */
function is_thumbnailable(string $filename): bool
{
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($ext, get_thumbnail_extensions(), true);
}

/**
 * Generate a cache key for a thumbnail based on file path and modification time
 * 
 * @param string $filePath Absolute path to the source image
 * @return string Hash-based cache key
 */
function get_thumbnail_cache_key(string $filePath): string
{
    $mtime = filemtime($filePath);
    return md5($filePath . '|' . $mtime);
}

/**
 * Get the cached thumbnail path for a file
 * 
 * @param string $filePath Absolute path to the source image
 * @return string Absolute path to the cached thumbnail
 */
function get_thumbnail_path(string $filePath): string
{
    $cacheKey = get_thumbnail_cache_key($filePath);
    return THUMBNAILS_DIR . '/' . $cacheKey . '.jpg';
}

/**
 * Generate a thumbnail for an image file
 * 
 * Creates a JPEG thumbnail with max dimensions of 150x150px,
 * preserving aspect ratio. Uses PHP GD library.
 * 
 * @param string $filePath Absolute path to the source image
 * @param int $maxWidth Maximum thumbnail width (default: 150)
 * @param int $maxHeight Maximum thumbnail height (default: 150)
 * @return string|false Path to generated thumbnail, or false on failure
 */
function generate_thumbnail(string $filePath, int $maxWidth = 150, int $maxHeight = 150)
{
    if (!function_exists('imagecreatetruecolor')) {
        return false;
    }

    if (!is_file($filePath) || !is_readable($filePath)) {
        return false;
    }

    $thumbPath = get_thumbnail_path($filePath);

    // Return cached thumbnail if it exists
    if (is_file($thumbPath)) {
        return $thumbPath;
    }

    // Get image info
    $imageInfo = @getimagesize($filePath);
    if ($imageInfo === false) {
        return false;
    }

    [$origWidth, $origHeight, $imageType] = $imageInfo;

    // Skip very small images (already thumbnail-sized)
    if ($origWidth <= $maxWidth && $origHeight <= $maxHeight) {
        // For small images, just copy the original as JPEG
        $source = create_image_from_file($filePath, $imageType);
        if ($source === false) {
            return false;
        }
        imagejpeg($source, $thumbPath, 85);
        imagedestroy($source);
        return $thumbPath;
    }

    // Calculate proportional dimensions
    $ratio = min($maxWidth / $origWidth, $maxHeight / $origHeight);
    $newWidth = (int) round($origWidth * $ratio);
    $newHeight = (int) round($origHeight * $ratio);

    // Create source image
    $source = create_image_from_file($filePath, $imageType);
    if ($source === false) {
        return false;
    }

    // Create thumbnail canvas
    $thumb = imagecreatetruecolor($newWidth, $newHeight);
    if ($thumb === false) {
        imagedestroy($source);
        return false;
    }

    // Preserve transparency for PNG/GIF (convert to white background for JPEG output)
    $white = imagecolorallocate($thumb, 255, 255, 255);
    imagefill($thumb, 0, 0, $white);

    // Resize with high-quality resampling
    imagecopyresampled(
        $thumb, $source,
        0, 0, 0, 0,
        $newWidth, $newHeight,
        $origWidth, $origHeight
    );

    // Save as JPEG
    $success = imagejpeg($thumb, $thumbPath, 80);

    // Cleanup
    imagedestroy($source);
    imagedestroy($thumb);

    return $success ? $thumbPath : false;
}

/**
 * Create a GD image resource from a file based on its type
 * 
 * @param string $filePath Path to the image file
 * @param int $imageType IMAGETYPE_* constant
 * @return resource|GdImage|false
 */
function create_image_from_file(string $filePath, int $imageType)
{
    switch ($imageType) {
        case IMAGETYPE_JPEG:
            return @imagecreatefromjpeg($filePath);
        case IMAGETYPE_PNG:
            return @imagecreatefrompng($filePath);
        case IMAGETYPE_GIF:
            return @imagecreatefromgif($filePath);
        case IMAGETYPE_WEBP:
            if (function_exists('imagecreatefromwebp')) {
                return @imagecreatefromwebp($filePath);
            }
            return false;
        case IMAGETYPE_BMP:
            if (function_exists('imagecreatefrombmp')) {
                return @imagecreatefrombmp($filePath);
            }
            return false;
        default:
            return false;
    }
}

/**
 * Handle thumbnail serving request
 * 
 * Generates thumbnail on-demand and serves it with caching headers.
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath Sanitized relative path to the image
 * @return void
 */
function handle_thumbnail_action(string $root, string $sanitizedPath): void
{
    if ($sanitizedPath === '') {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Path file wajib diisi.']);
        exit;
    }

    // Verify the file exists and is within root
    $fullPath = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedPath);
    $realFile = realpath($fullPath);

    if ($realFile === false || strpos($realFile, $root) !== 0 || !is_file($realFile)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'File tidak ditemukan.']);
        exit;
    }

    // Check if file is an image
    if (!is_thumbnailable(basename($realFile))) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'File bukan gambar yang didukung.']);
        exit;
    }

    // Check GD availability
    if (!function_exists('imagecreatetruecolor')) {
        // Fallback: serve original via raw handler
        handle_raw_action($root, $sanitizedPath);
        return;
    }

    // Generate or retrieve cached thumbnail
    $thumbPath = generate_thumbnail($realFile);
    if ($thumbPath === false) {
        // Fallback: serve original
        handle_raw_action($root, $sanitizedPath);
        return;
    }

    // Clear any previous output
    if (ob_get_level()) {
        ob_end_clean();
    }

    // Serve the thumbnail with aggressive caching
    header('Content-Type: image/jpeg');
    header('Content-Length: ' . filesize($thumbPath));
    header('Cache-Control: public, max-age=86400'); // 24 hours
    header('ETag: "' . md5_file($thumbPath) . '"');

    // Handle conditional requests (304 Not Modified)
    $etag = '"' . md5_file($thumbPath) . '"';
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        http_response_code(304);
        exit;
    }

    readfile($thumbPath);
    exit;
}

/**
 * Clean up stale thumbnails that no longer have source files
 * 
 * @return array{removed: int, errors: int}
 */
function cleanup_thumbnails(): array
{
    $removed = 0;
    $errors = 0;

    if (!is_dir(THUMBNAILS_DIR)) {
        return ['removed' => 0, 'errors' => 0];
    }

    $dir = new DirectoryIterator(THUMBNAILS_DIR);
    foreach ($dir as $fileInfo) {
        if ($fileInfo->isDot() || $fileInfo->getExtension() !== 'jpg') {
            continue;
        }

        // Thumbnails older than 7 days without access are cleaned up
        $atime = $fileInfo->getATime();
        if ($atime && (time() - $atime) > 7 * 86400) {
            if (@unlink($fileInfo->getPathname())) {
                $removed++;
            } else {
                $errors++;
            }
        }
    }

    return ['removed' => $removed, 'errors' => $errors];
}

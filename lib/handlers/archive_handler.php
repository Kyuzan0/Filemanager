<?php

/**
 * Archive Handler
 * Handles compression and extraction operations
 */

/**
 * Handle compress action (create ZIP)
 * 
 * @param string $root Root directory path
 * @param string $method HTTP request method
 * @return void
 */
function handle_compress_action(string $root, string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();
    $paths = extract_archive_paths($payload);

    if (empty($paths)) {
        throw new RuntimeException('Tidak ada file yang dipilih untuk dikompres.');
    }

    $outputName = isset($payload['name']) && is_string($payload['name']) ? $payload['name'] : null;

    $result = create_zip($root, $paths, $outputName);

    echo json_encode([
        'success' => $result['success'],
        'type' => 'compress',
        'path' => $result['path'],
        'name' => $result['name'],
        'size' => $result['size'],
        'itemCount' => $result['itemCount'],
        'errors' => $result['errors'],
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle extract action (unzip/unarchive)
 * 
 * @param string $root Root directory path
 * @param string $method HTTP request method
 * @return void
 */
function handle_extract_action(string $root, string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();

    $zipPath = '';
    if (isset($payload['path']) && is_string($payload['path'])) {
        $zipPath = sanitize_relative_path(rawurldecode($payload['path']));
    }

    if ($zipPath === '') {
        throw new RuntimeException('Path file arsip tidak valid.');
    }

    $extractTo = isset($payload['extractTo']) && is_string($payload['extractTo'])
        ? sanitize_relative_path(rawurldecode($payload['extractTo']))
        : null;

    // Use extract_archive which supports multiple formats (ZIP, 7z, RAR, TAR)
    $result = extract_archive($root, $zipPath, $extractTo);

    echo json_encode([
        'success' => $result['success'],
        'type' => 'extract',
        'extractedTo' => $result['extractedTo'],
        'folderName' => $result['folderName'],
        'itemCount' => $result['itemCount'],
        'archiveType' => $result['archiveType'] ?? 'zip',
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle zip contents listing action
 * 
 * @param string $root Root directory path
 * @param string $sanitizedPath Archive path
 * @return void
 */
function handle_zip_contents_action(string $root, string $sanitizedPath): void
{
    if ($sanitizedPath === '') {
        throw new RuntimeException('Path file ZIP tidak valid.');
    }

    $result = list_zip_contents($root, $sanitizedPath);

    echo json_encode([
        'success' => $result['success'],
        'type' => 'zip-contents',
        'name' => $result['name'],
        'zipSize' => $result['zipSize'],
        'uncompressedSize' => $result['uncompressedSize'],
        'compressionRatio' => $result['compressionRatio'],
        'itemCount' => $result['itemCount'],
        'items' => $result['items'],
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Extract paths for archive operations from payload
 * 
 * @param array $payload Request payload
 * @return array
 */
function extract_archive_paths(array $payload): array
{
    $paths = [];

    if (isset($payload['paths']) && is_array($payload['paths'])) {
        $paths = array_values(array_filter(array_map(static function ($value) {
            if (!is_string($value)) {
                return '';
            }
            return sanitize_relative_path(rawurldecode($value));
        }, $payload['paths']), static function ($value) {
            return $value !== '';
        }));
    } elseif (isset($payload['path']) && is_string($payload['path'])) {
        $single = sanitize_relative_path(rawurldecode($payload['path']));
        if ($single !== '') {
            $paths[] = $single;
        }
    }

    return $paths;
}

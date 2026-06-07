<?php
/**
 * Path Resolver
 * Handles path sanitization, resolution, and breadcrumbs.
 * Extracted from FileManager.php for single-responsibility.
 *
 * @version 2.0.0
 */

/**
 * Sanitize a relative path to prevent directory traversal
 */
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

/**
 * Build breadcrumb navigation array from a relative path
 */
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

/**
 * Get the list of editable file extensions
 */
function get_editable_extensions(): array
{
    return EDITABLE_EXTENSIONS;
}

/**
 * Resolve a relative path against root, validate it exists and is within root
 *
 * @return array [normalizedRoot, sanitizedRelativeUrl, realTargetPath]
 */
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

/**
 * Assert that a directory exists and is writable
 */
function assert_writable_directory(string $path): void
{
    if (!is_dir($path)) {
        throw new RuntimeException('Direktori tujuan tidak ditemukan.');
    }

    if (!is_writable($path)) {
        throw new RuntimeException('Direktori tujuan tidak dapat ditulisi.');
    }
}

<?php

/**
 * System Handler
 * Handles system requirements check and 7-zip status
 */

/**
 * Handle system requirements check
 * 
 * @return void
 */
function handle_system_requirements_action(): void
{
    $requirements = [];

    // PHP Version Check
    $requirements['php'] = check_php_version();

    // PHP Extensions Check
    $requirements['extensions'] = check_php_extensions();

    // 7-Zip Check
    $requirements['7zip'] = check_7zip_availability();

    // Directory Permissions Check
    $requirements['permissions'] = check_directory_permissions();

    // Server Info
    $requirements['server'] = get_server_info();

    // Overall status
    $criticalOk = $requirements['php']['ok'] && $requirements['extensions']['ok'] && $requirements['permissions']['ok'];

    echo json_encode([
        'success' => true,
        'type' => 'system-requirements',
        'allOk' => $criticalOk,
        'requirements' => $requirements,
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Check PHP version requirement
 * 
 * @return array
 */
function check_php_version(): array
{
    $phpVersion = PHP_VERSION;
    $phpVersionOk = version_compare($phpVersion, '7.4.0', '>=');

    return [
        'name' => 'PHP Version',
        'ok' => $phpVersionOk,
        'value' => $phpVersion,
        'required' => '7.4+',
        'detail' => $phpVersionOk
            ? "PHP $phpVersion terinstall"
            : "PHP $phpVersion tidak memenuhi syarat (minimal 7.4)"
    ];
}

/**
 * Check required PHP extensions
 * 
 * @return array
 */
function check_php_extensions(): array
{
    $requiredExtensions = ['zip', 'json', 'fileinfo', 'mbstring'];
    $missingExtensions = [];
    $presentExtensions = [];

    foreach ($requiredExtensions as $ext) {
        if (extension_loaded($ext)) {
            $presentExtensions[] = $ext;
        } else {
            $missingExtensions[] = $ext;
        }
    }

    $extOk = empty($missingExtensions);

    return [
        'name' => 'PHP Extensions',
        'ok' => $extOk,
        'value' => implode(', ', $presentExtensions),
        'required' => implode(', ', $requiredExtensions),
        'missing' => $missingExtensions,
        'detail' => $extOk
            ? 'Semua extension tersedia'
            : 'Extension tidak tersedia: ' . implode(', ', $missingExtensions)
    ];
}

/**
 * Check 7-Zip availability
 * 
 * @return array
 */
function check_7zip_availability(): array
{
    $zipInfo = get_7zip_info();

    return [
        'name' => '7-Zip / p7zip',
        'ok' => $zipInfo['available'],
        'optional' => true,
        'value' => $zipInfo['available'] ? ($zipInfo['version'] ?? 'Installed') : 'Not found',
        'path' => $zipInfo['path'],
        'isBundled' => $zipInfo['isBundled'],
        'os' => $zipInfo['os'],
        'detail' => $zipInfo['available']
            ? ($zipInfo['isBundled']
                ? "Menggunakan bundled binary (v{$zipInfo['version']})"
                : "Menggunakan system 7-Zip (v{$zipInfo['version']})")
            : 'Tidak tersedia. Format .7z, .rar akan menggunakan fallback.'
    ];
}

/**
 * Check directory permissions
 * 
 * @return array
 */
function check_directory_permissions(): array
{
    $directories = [
        'file' => __DIR__ . '/../../file',
        'logs' => __DIR__ . '/../../logs',
        '.trash' => __DIR__ . '/../../.trash',
    ];

    $dirStatus = [];
    $allDirsOk = true;

    foreach ($directories as $name => $path) {
        $exists = is_dir($path);
        $writable = $exists && is_writable($path);

        if (!$exists) {
            // Try to create
            @mkdir($path, 0755, true);
            $exists = is_dir($path);
            $writable = $exists && is_writable($path);
        }

        $dirStatus[$name] = [
            'exists' => $exists,
            'writable' => $writable,
            'path' => $path
        ];

        if (!$writable) {
            $allDirsOk = false;
        }
    }

    return [
        'name' => 'Directory Permissions',
        'ok' => $allDirsOk,
        'directories' => $dirStatus,
        'detail' => $allDirsOk
            ? 'Semua direktori dapat ditulis'
            : 'Beberapa direktori tidak dapat ditulis'
    ];
}

/**
 * Get server information
 * 
 * @return array
 */
function get_server_info(): array
{
    $serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';

    return [
        'name' => 'Server Information',
        'ok' => true,
        'os' => PHP_OS,
        'server' => $serverSoftware,
        'sapi' => PHP_SAPI,
        'maxUpload' => ini_get('upload_max_filesize'),
        'maxPost' => ini_get('post_max_size'),
        'memoryLimit' => ini_get('memory_limit'),
        'detail' => "$serverSoftware on " . PHP_OS
    ];
}

/**
 * Handle 7-Zip status check
 * 
 * @return void
 */
function handle_7zip_status_action(): void
{
    $info = get_7zip_info();

    echo json_encode([
        'success' => true,
        'type' => '7zip-status',
        'available' => $info['available'],
        'os' => $info['os'],
        'path' => $info['path'],
        'isBundled' => $info['isBundled'],
        'bundledPath' => $info['bundledPath'],
        'version' => $info['version'],
        'supportedFormats' => [
            'zip' => true, // Always supported via PHP ZipArchive
            '7z' => $info['available'],
            'rar' => $info['available'],
            'tar' => $info['available'],
            'gz' => $info['available'],
            'bz2' => $info['available'],
        ],
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

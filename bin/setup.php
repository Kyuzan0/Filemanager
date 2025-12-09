<?php

/**
 * Binary Tools Setup
 * 
 * Detects the operating system and sets up paths for binary tools
 * such as 7-Zip for archive operations.
 * 
 * @version 2.0.0
 */

// This file should be included after paths.php is loaded

/**
 * Get the binary directory for the current OS
 * 
 * @return string
 */
function get_os_bin_directory(): string
{
    $os = get_current_os();
    return BIN_DIR . DIRECTORY_SEPARATOR . $os;
}

/**
 * Detect the current operating system
 * 
 * @return string 'windows', 'linux', or 'unknown'
 */
function get_current_os(): string
{
    if (defined('PHP_OS_FAMILY')) {
        switch (PHP_OS_FAMILY) {
            case 'Windows':
                return 'windows';
            case 'Linux':
            case 'Darwin':
            case 'BSD':
                return 'linux';
        }
    }

    $os = strtoupper(PHP_OS);

    if (substr($os, 0, 3) === 'WIN') {
        return 'windows';
    }

    if ($os === 'LINUX' || $os === 'DARWIN') {
        return 'linux';
    }

    return 'unknown';
}

/**
 * Get 7-Zip binary path for current OS
 * 
 * @return string|null Path to 7z binary or null if not found
 */
function get_7zip_binary(): ?string
{
    $binDir = get_os_bin_directory();
    $os = get_current_os();

    $binaries = [];

    if ($os === 'windows') {
        $binaries = [
            $binDir . DIRECTORY_SEPARATOR . '7z.exe',
            $binDir . DIRECTORY_SEPARATOR . '7za.exe',
        ];
    } else {
        $binaries = [
            $binDir . DIRECTORY_SEPARATOR . '7za',
            $binDir . DIRECTORY_SEPARATOR . '7z',
            $binDir . DIRECTORY_SEPARATOR . '7zr',
        ];
    }

    foreach ($binaries as $binary) {
        if (file_exists($binary)) {
            // Make executable on Linux/macOS
            if ($os !== 'windows' && !is_executable($binary)) {
                @chmod($binary, 0755);
            }
            return $binary;
        }
    }

    return null;
}

/**
 * Check if a specific binary tool is available
 * 
 * @param string $name Tool name (7zip, etc)
 * @return bool
 */
function is_binary_available(string $name): bool
{
    switch (strtolower($name)) {
        case '7zip':
        case '7z':
            return get_7zip_binary() !== null;
        default:
            return false;
    }
}

/**
 * Get version info for a binary tool
 * 
 * @param string $name Tool name
 * @return string|null Version string or null
 */
function get_binary_version(string $name): ?string
{
    switch (strtolower($name)) {
        case '7zip':
        case '7z':
            $binary = get_7zip_binary();
            if ($binary === null) {
                return null;
            }

            $cmd = escapeshellarg($binary) . ' 2>&1';
            $output = @shell_exec($cmd);

            if ($output !== null && preg_match('/7-Zip[^\d]*(\d+\.\d+)/i', $output, $matches)) {
                return $matches[1];
            }
            return null;

        default:
            return null;
    }
}

/**
 * Get info about all available binary tools
 * 
 * @return array
 */
function get_binaries_info(): array
{
    return [
        '7zip' => [
            'name' => '7-Zip',
            'available' => is_binary_available('7zip'),
            'version' => get_binary_version('7zip'),
            'path' => get_7zip_binary(),
            'os' => get_current_os(),
        ],
    ];
}

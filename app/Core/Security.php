<?php

/**
 * Security
 * 
 * Provides security utilities including path sanitization,
 * validation, and protection against directory traversal attacks.
 * 
 * @version 2.0.0
 */

namespace App\Core;

class Security
{
    /**
     * Sanitize a relative path to prevent directory traversal
     * 
     * @param string $path The path to sanitize
     * @return string Sanitized path
     */
    public static function sanitizeRelativePath(string $path): string
    {
        // Decode and normalize
        $path = urldecode($path);

        // Replace backslashes with forward slashes
        $path = str_replace('\\', '/', $path);

        // Remove null bytes
        $path = str_replace("\0", '', $path);

        // Split by directory separator
        $parts = explode('/', $path);
        $result = [];

        foreach ($parts as $part) {
            // Skip empty parts and current directory references
            if ($part === '' || $part === '.') {
                continue;
            }

            // Handle parent directory references
            if ($part === '..') {
                array_pop($result);
                continue;
            }

            // Add valid part
            $result[] = $part;
        }

        return implode('/', $result);
    }

    /**
     * Validate that a path is within the allowed root directory
     * 
     * @param string $fullPath The full path to validate
     * @param string $rootPath The root directory path
     * @return bool True if path is valid
     */
    public static function isPathWithinRoot(string $fullPath, string $rootPath): bool
    {
        $realPath = realpath($fullPath);
        $realRoot = realpath($rootPath);

        if ($realPath === false || $realRoot === false) {
            return false;
        }

        // Normalize paths
        $realPath = str_replace('\\', '/', $realPath);
        $realRoot = str_replace('\\', '/', $realRoot);

        if ($realPath === $realRoot) {
            return true;
        }

        $realRootWithSlash = rtrim($realRoot, '/') . '/';
        $realPathWithSlash = rtrim($realPath, '/') . '/';

        return str_starts_with($realPathWithSlash, $realRootWithSlash);
    }

    /**
     * Sanitize a filename
     * 
     * @param string $filename The filename to sanitize
     * @return string Sanitized filename
     */
    public static function sanitizeFilename(string $filename): string
    {
        // Remove directory traversal attempts
        $filename = basename($filename);

        // Remove null bytes
        $filename = str_replace("\0", '', $filename);

        // Replace potentially dangerous characters
        $filename = preg_replace('/[<>:"\/\\|?*]/', '_', $filename);

        // Strip or reject trailing dots and spaces (Windows strips automatically)
        $filename = trim($filename, ". \t\n\r");

        // Disallow Windows reserved names (CON, PRN, AUX, NUL, COM1-COM9, LPT1-LPT9)
        $baseWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
        $reserved = ['CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        if (in_array(strtoupper($baseWithoutExt), $reserved, true)) {
            $filename = '_' . $filename;
        }

        return $filename;
    }

    /**
     * Check if a filename is a Windows reserved device name
     *
     * @param string $filename
     * @return bool
     */
    public static function isWindowsReservedName(string $filename): bool
    {
        $base = pathinfo($filename, PATHINFO_FILENAME);
        $reserved = ['CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        return in_array(strtoupper($base), $reserved, true);
    }

    /**
     * Check if file extension is dangerous
     *
     * @param string $filename
     * @return bool
     */
    public static function isDangerousExtension(string $filename): bool
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $dangerous = [
            'php', 'phtml', 'phar', 'php3', 'php4', 'php5', 'php7', 'phps',
            'cgi', 'pl', 'asp', 'aspx', 'jsp', 'shtml',
            'exe', 'sh', 'bash', 'bat', 'cmd', 'ps1', 'ps2',
            'vbs', 'vbe', 'jse', 'ws', 'wsf', 'wsc', 'wsh',
            'msi', 'dll', 'com', 'scr', 'pif', 'hta', 'cpl', 'msc', 'jar',
            'htaccess', 'htpasswd', 'ini'
        ];

        // Also block .htaccess explicitly even if pathinfo treats whole name as filename
        $basename = strtolower(basename($filename));
        if ($basename === '.htaccess' || $basename === '.htpasswd') {
            return true;
        }

        return in_array($ext, $dangerous, true);
    }

    /**
     * Validate file extension
     * 
     * @param string $filename The filename to check
     * @param array $allowedExtensions Array of allowed extensions
     * @return bool True if extension is allowed
     */
    public static function isExtensionAllowed(string $filename, array $allowedExtensions): bool
    {
        if (in_array('*', $allowedExtensions)) {
            return true;
        }

        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($extension, $allowedExtensions);
    }

    /**
     * Check if a file is editable (text-based)
     * 
     * @param string $filename The filename to check
     * @return bool True if file is editable
     */
    public static function isFileEditable(string $filename): bool
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($extension, EDITABLE_EXTENSIONS);
    }

    /**
     * Generate a secure random token
     * 
     * @param int $length Token length
     * @return string Random token
     */
    public static function generateToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length / 2));
    }

    /**
     * Clean JSON input from request body
     * 
     * @return array|null Parsed JSON data or null on failure
     */
    public static function getJsonInput(): ?array
    {
        $json = file_get_contents('php://input');
        if (empty($json)) {
            return null;
        }

        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        return $data;
    }

    /**
     * Set security headers for API responses
     * 
     * @return void
     */
    public static function setSecurityHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

        // CSP — restrict resource origins while allowing necessary inline scripts
        $nonce = $_SERVER['csp_nonce'] ?? '';
        if ($nonce) {
            header("Content-Security-Policy: default-src 'self'; "
                . "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                . "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                . "font-src 'self' https://cdn.jsdelivr.net; "
                . "img-src 'self' data: blob:; "
                . "connect-src 'self'; "
                . "frame-ancestors 'self'; "
                . "base-uri 'self'; "
                . "form-action 'self'"
            );
        }
    }
}

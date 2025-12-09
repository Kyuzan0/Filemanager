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

        return strpos($realPath, $realRoot) === 0;
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

        // Remove leading/trailing dots and spaces
        $filename = trim($filename, ". \t\n\r");

        return $filename;
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
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
    }
}

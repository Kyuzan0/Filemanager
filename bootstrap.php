<?php

/**
 * Bootstrap
 * 
 * Initializes the application configuration, security settings,
 * error handling, and environment setup.
 * 
 * @version 2.0.0
 */

// Set error reporting based on environment
if (defined('FM_DEBUG') && FM_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

// Set default timezone
date_default_timezone_set('Asia/Jakarta');

// Set session configuration
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_samesite', 'Lax');

    session_start();
}

// Set memory limit for large file operations
ini_set('memory_limit', '256M');

// Set maximum execution time
set_time_limit(300);

// Configure upload settings
ini_set('upload_max_filesize', '100M');
ini_set('post_max_size', '105M');
ini_set('max_file_uploads', '50');

// Load autoloader
require_once __DIR__ . '/autoload.php';

// Initialize security headers if this is an API request
if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'api.php') !== false) {
    \App\Core\Security::setSecurityHeaders();
}

/**
 * Global exception handler
 */
set_exception_handler(function (Throwable $e) {
    $isApi = isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'api.php') !== false;

    if ($isApi) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => defined('FM_DEBUG') && FM_DEBUG
                ? $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine()
                : 'Terjadi kesalahan internal.',
        ], JSON_UNESCAPED_UNICODE);
    } else {
        // Log the error
        error_log('Uncaught exception: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

        if (defined('FM_DEBUG') && FM_DEBUG) {
            echo '<pre>Error: ' . htmlspecialchars($e->getMessage()) . '</pre>';
        } else {
            echo 'Terjadi kesalahan. Silakan coba lagi.';
        }
    }
    exit(1);
});

/**
 * Global error handler
 */
set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline) {
    if (!(error_reporting() & $errno)) {
        return false;
    }

    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

/**
 * Check if request is from valid origin (basic CSRF protection)
 */
function check_origin(): bool
{
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return true;
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';

    if (!empty($origin)) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        return $originHost === $host;
    }

    if (!empty($referer)) {
        $refererHost = parse_url($referer, PHP_URL_HOST);
        return $refererHost === $host;
    }

    return true; // Allow if no origin/referer (for API clients)
}

/**
 * Get the root files directory path
 * 
 * @return string
 * @throws RuntimeException
 */
function get_files_root(): string
{
    $root = get_root_path();
    if ($root === false) {
        throw new RuntimeException('Root directory tidak ditemukan.');
    }
    return $root;
}

<?php

/**
 * Bootstrap
 * 
 * Initializes the application configuration, security settings,
 * error handling, and environment setup.
 * 
 * @version 3.0.0
 */

// Load centralized configuration
$_app_config = require __DIR__ . '/app/Config/app.php';

// Set error reporting based on environment
if ($_app_config['debug']) {
    error_reporting($_app_config['error_reporting']['all']);
    ini_set('display_errors', '1');
} else {
    error_reporting($_app_config['error_reporting']['production']);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

// Set default timezone
date_default_timezone_set($_app_config['timezone']);

// Set session configuration
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_samesite', 'Lax');

    session_start();
}

// Generate CSP nonce once per request — shared across all pages and API
$_SERVER['csp_nonce'] = bin2hex(random_bytes(16));

// Set PHP limits from config
ini_set('memory_limit', $_app_config['memory_limit']);
set_time_limit($_app_config['max_execution_time']);

// Configure upload settings from config
ini_set('upload_max_filesize', $_app_config['upload_max_filesize']);
ini_set('post_max_size', $_app_config['post_max_size']);
ini_set('max_file_uploads', (string) $_app_config['max_file_uploads']);

// Load autoloader
require_once __DIR__ . '/autoload.php';

// Initialize security headers for ALL requests (not just API)
\App\Core\Security::setSecurityHeaders();

/**
 * Global exception handler
 */
set_exception_handler(function (Throwable $e) {
    global $_app_config;
    $isApi = isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'api.php') !== false;
    $debug = $_app_config['debug'] ?? false;

    if ($isApi) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => $debug
                ? $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine()
                : 'Terjadi kesalahan internal.',
        ], JSON_UNESCAPED_UNICODE);
    } else {
        // Log the error
        error_log('Uncaught exception: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

        if ($debug) {
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
 * Generate a CSRF token and store it in the session.
 * Returns the token for use in forms/AJAX headers.
 */
function generate_csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify a CSRF token against the session token.
 * Accepts token from X-CSRF-Token header or POST body.
 */
function verify_csrf_token(?string $token = null): bool
{
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (empty($sessionToken)) {
        return false;
    }

    $providedToken = $token
        ?? $_SERVER['HTTP_X_CSRF_TOKEN']
        ?? ($_POST['csrf_token'] ?? '');

    if (empty($providedToken)) {
        return false;
    }

    return hash_equals($sessionToken, $providedToken);
}

/**
 * Check if request is from valid origin (basic CSRF protection).
 * Enhanced: For POST/PUT/DELETE, also verifies CSRF token when available.
 */
function check_origin(): bool
{
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return true;
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';

    // Strip port from host for comparison (parse_url returns host without port)
    $hostName = parse_url('http://' . $host, PHP_URL_HOST) ?: $host;

    $originValid = false;

    if (!empty($origin)) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        $originValid = ($originHost === $hostName);
    } elseif (!empty($referer)) {
        $refererHost = parse_url($referer, PHP_URL_HOST);
        $originValid = ($refererHost === $hostName);
    }

    if ($originValid) {
        return true;
    }

    // If origin/referer missing (proxy stripped it), fall back to CSRF token check
    $csrfHeader = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!empty($csrfHeader) || !empty($_SESSION['csrf_token'])) {
        return verify_csrf_token();
    }

    return false;
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

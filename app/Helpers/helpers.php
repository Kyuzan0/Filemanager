<?php

/**
 * Handler Helpers
 * Common utility functions used across handlers
 */

// Load messages once
$_messages_cache = null;

/**
 * Get a localized message by key
 * 
 * @param string $key Message key
 * @param mixed ...$args sprintf arguments
 * @return string Translated message
 */
function msg(string $key, mixed ...$args): string
{
    global $_messages_cache;

    if ($_messages_cache === null) {
        $_messages_cache = require __DIR__ . '/messages.php';
    }

    $message = $_messages_cache[$key] ?? $key;

    if (!empty($args)) {
        $message = sprintf($message, ...$args);
    }

    return $message;
}

/**
 * Get JSON payload from request body
 * 
 * @return array
 * @throws RuntimeException
 */
function get_json_payload(): array
{
    $rawBody = file_get_contents('php://input');
    if ($rawBody === false) {
        throw new RuntimeException('Payload tidak dapat dibaca.');
    }

    $payload = json_decode($rawBody, true);
    if (!is_array($payload)) {
        throw new RuntimeException('Payload tidak valid.');
    }

    return $payload;
}

/**
 * Send JSON response and exit
 * 
 * @param array $data Response data
 * @param int $statusCode HTTP status code
 * @return void
 */
function json_response(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send success JSON response
 * 
 * @param string $type Response type
 * @param array $data Additional response data
 * @return void
 */
function json_success(string $type, array $data = []): void
{
    $response = array_merge([
        'success' => true,
        'type' => $type,
        'generated_at' => time(),
    ], $data);

    json_response($response);
}

/**
 * Send error JSON response
 * 
 * @param string $message Error message
 * @param int $statusCode HTTP status code
 * @return void
 */
function json_error(string $message, int $statusCode = 400): void
{
    json_response([
        'success' => false,
        'error' => $message,
    ], $statusCode);
}

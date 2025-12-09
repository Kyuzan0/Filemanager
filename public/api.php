<?php

/**
 * File Manager API
 * 
 * Main API router that delegates requests to appropriate handlers.
 * This file acts as a clean entry point with minimal complexity.
 * 
 * @version 2.0.0
 */

// =============================================================================
// BOOTSTRAP
// =============================================================================

require_once dirname(__DIR__) . '/bootstrap.php';

// =============================================================================
// INITIALIZATION
// =============================================================================

header('Content-Type: application/json; charset=utf-8');

// Validate root directory
$root = get_root_path();
if ($root === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Root directory tidak ditemukan.',
    ]);
    exit;
}

// Parse request parameters
$requestedPath = $_GET['path'] ?? '';
if (!is_string($requestedPath)) {
    $requestedPath = '';
}
$sanitizedPath = sanitize_relative_path(rawurldecode($requestedPath));
$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$editableExtensions = get_editable_extensions();

// =============================================================================
// REQUEST ROUTING
// =============================================================================

try {
    // Route request to appropriate handler based on action
    route_request($action, $root, $sanitizedPath, $method, $editableExtensions);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}

// =============================================================================
// ROUTER
// =============================================================================

/**
 * Route request to appropriate handler
 * 
 * @param string $action Action to perform
 * @param string $root Root directory path
 * @param string $sanitizedPath Sanitized relative path
 * @param string $method HTTP request method
 * @param array $editableExtensions Allowed editable extensions
 * @return void
 */
function route_request(
    string $action,
    string $root,
    string $sanitizedPath,
    string $method,
    array $editableExtensions
): void {
    // Action routing map
    $actionRoutes = [
        // Raw file streaming
        'raw' => fn() => handle_raw_action($root, $sanitizedPath),

        // System endpoints
        'system-requirements' => fn() => handle_system_requirements_action(),
        '7zip-status' => fn() => handle_7zip_status_action(),

        // Logs endpoints
        'logs' => fn() => handle_logs_action(),
        'logs-cleanup' => fn() => handle_logs_cleanup_action($method),
        'logs-export' => fn() => handle_logs_export_action(),

        // Trash endpoints
        'trash-list' => fn() => handle_trash_list_action(),
        'trash-restore' => fn() => handle_trash_restore_action($root, $method),
        'trash-delete' => fn() => handle_trash_delete_action($method),
        'trash-empty' => fn() => handle_trash_empty_action($method),
        'trash-cleanup' => fn() => handle_trash_cleanup_action($method),

        // File management endpoints
        'create' => fn() => handle_create_action($root, $sanitizedPath, $method),
        'upload' => fn() => handle_upload_action($root, $sanitizedPath, $method),
        'content' => fn() => handle_content_action($root, $sanitizedPath, $editableExtensions),
        'save' => fn() => handle_save_action($root, $sanitizedPath, $method, $editableExtensions),
        'delete' => fn() => handle_delete_action($root, $sanitizedPath, $method),
        'rename' => fn() => handle_rename_action($root, $sanitizedPath, $method),
        'move' => fn() => handle_move_action($root, $method),

        // Archive endpoints
        'compress' => fn() => handle_compress_action($root, $method),
        'extract' => fn() => handle_extract_action($root, $method),
        'zip-contents' => fn() => handle_zip_contents_action($root, $sanitizedPath),

        // Default: directory listing
        'list' => fn() => handle_list_action($root, $sanitizedPath),
    ];

    // Execute the appropriate handler
    if (isset($actionRoutes[$action])) {
        $actionRoutes[$action]();
    } else {
        // Default to list action for unknown actions
        handle_list_action($root, $sanitizedPath);
    }
}

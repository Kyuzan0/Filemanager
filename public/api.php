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

// Enforce CSRF protection for state-changing requests
if (!check_origin()) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Request origin tidak valid.',
    ]);
    exit;
}

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
// AUTH INITIALIZATION
// =============================================================================

// Initialize database on first request (auto-migrate)
if (!\App\Core\Database::isInitialized()) {
    \App\Core\Database::migrate();
}

// Auth-free endpoints (login, logout, setup)
$publicActions = ['auth-login', 'auth-logout', 'auth-setup', 'share-access', 'share-download'];

// Require authentication for all other endpoints
if (!in_array($action, $publicActions)) {
    \App\Core\Auth::requireAuth();

    // Write-protection for viewers on state-changing actions
    $writeActions = [
        'create', 'upload', 'save', 'delete', 'rename', 'move', 'copy',
        'bulk-rename', 'compress', 'extract',
        'trash-restore', 'trash-delete', 'trash-empty', 'trash-cleanup',
        'logs-cleanup',
        'share-create', 'share-delete',
    ];
    if (in_array($action, $writeActions)) {
        \App\Core\Auth::requireWrite();
    }
}

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
        // Auth endpoints
        'auth-login' => fn() => handle_auth_login_action($method),
        'auth-logout' => fn() => handle_auth_logout_action($method),
        'auth-me' => fn() => handle_auth_me_action(),
        'auth-register' => fn() => handle_auth_register_action($method),
        'auth-users' => fn() => handle_auth_users_action($method),
        'auth-update-user' => fn() => handle_auth_update_user_action($method),
        'auth-delete-user' => fn() => handle_auth_delete_user_action($method),
        'auth-permissions' => fn() => handle_auth_permissions_action($method),
        'auth-setup' => fn() => handle_auth_setup_action($method),

        // Share endpoints
        'share-create' => fn() => handle_share_create_action($root, $method),
        'share-list' => fn() => handle_share_list_action($root, $method),
        'share-delete' => fn() => handle_share_delete_action($method),
        'share-access' => fn() => handle_share_access_action($root),
        'share-download' => fn() => handle_share_download_action($root),

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
        'copy' => fn() => handle_copy_action($root, $method),
        'bulk-rename' => fn() => handle_bulk_rename_action($root, $method),

        // Archive endpoints
        'compress' => fn() => handle_compress_action($root, $method),
        'extract' => fn() => handle_extract_action($root, $method),
        'zip-contents' => fn() => handle_zip_contents_action($root, $sanitizedPath),

        // Full-text content search
        'search' => fn() => handle_search_action($root, $sanitizedPath),

        // Thumbnail generation & serving
        'thumbnail' => fn() => handle_thumbnail_action($root, $sanitizedPath),

        // Item details (extended metadata)
        'details' => fn() => handle_details_action($root, $sanitizedPath),

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

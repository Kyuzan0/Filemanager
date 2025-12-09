<?php

/**
 * Trash Handler
 * Handles trash bin operations
 */

/**
 * Handle trash list action
 * 
 * @return void
 */
function handle_trash_list_action(): void
{
    $items = list_trash_items();

    echo json_encode([
        'success' => true,
        'type' => 'trash-list',
        'items' => $items,
        'count' => count($items),
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle trash restore action
 * 
 * @param string $root Root directory path
 * @param string $method HTTP request method
 * @return void
 */
function handle_trash_restore_action(string $root, string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();
    $ids = extract_trash_ids($payload);

    if (empty($ids)) {
        throw new RuntimeException('ID trash wajib diisi.');
    }

    $result = restore_from_trash($root, $ids);
    $success = count($result['errors']) === 0;

    if (!$success) {
        http_response_code(207);
    }

    echo json_encode([
        'success' => $success,
        'type' => 'trash-restore',
        'restored' => $result['restored'],
        'errors' => $result['errors'],
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle trash permanent delete action
 * 
 * @param string $method HTTP request method
 * @return void
 */
function handle_trash_delete_action(string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();
    $ids = extract_trash_ids($payload);

    if (empty($ids)) {
        throw new RuntimeException('ID trash wajib diisi.');
    }

    $result = delete_from_trash_permanently($ids);
    $success = count($result['errors']) === 0;

    if (!$success) {
        http_response_code(207);
    }

    echo json_encode([
        'success' => $success,
        'type' => 'trash-delete',
        'deleted' => $result['deleted'],
        'errors' => $result['errors'],
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle empty trash action
 * 
 * @param string $method HTTP request method
 * @return void
 */
function handle_trash_empty_action(string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $result = empty_trash();

    echo json_encode([
        'success' => true,
        'type' => 'trash-empty',
        'deleted' => $result['deleted'],
        'count' => count($result['deleted']),
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle trash cleanup action
 * 
 * @param string $method HTTP request method
 * @return void
 */
function handle_trash_cleanup_action(string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();
    $days = isset($payload['days']) ? max(1, (int) $payload['days']) : 30;

    $result = cleanup_old_trash($days);

    echo json_encode([
        'success' => true,
        'type' => 'trash-cleanup',
        'deleted' => $result['deleted'],
        'count' => count($result['deleted']),
        'days' => $days,
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Extract trash IDs from payload
 * 
 * @param array $payload Request payload
 * @return array
 */
function extract_trash_ids(array $payload): array
{
    $ids = [];

    if (isset($payload['ids']) && is_array($payload['ids'])) {
        $ids = array_filter($payload['ids'], 'is_string');
    } elseif (isset($payload['id']) && is_string($payload['id'])) {
        $ids = [$payload['id']];
    }

    return $ids;
}

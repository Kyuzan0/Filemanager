<?php

/**
 * Logs Handler
 * Handles activity logs operations
 */

/**
 * Handle logs listing action
 * 
 * @return void
 */
function handle_logs_action(): void
{
    // Get activity logs with optional filtering and pagination
    $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(100, (int) $_GET['limit'])) : 20;

    $filters = get_log_filters();

    $result = read_activity_logs($limit, $page, $filters);

    echo json_encode([
        'success' => true,
        'type' => 'logs',
        'logs' => $result['logs'],
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $result['total'],
            'totalPages' => $result['totalPages']
        ],
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle logs cleanup action
 * 
 * @param string $method HTTP request method
 * @return void
 */
function handle_logs_cleanup_action(string $method): void
{
    if (strtoupper($method) !== 'POST') {
        throw new RuntimeException('Metode HTTP tidak diizinkan.');
    }

    $payload = get_json_payload();

    // Allow days = 0 for "delete all", otherwise minimum 1 day
    $days = isset($payload['days']) ? max(0, (int) $payload['days']) : 30;

    $deletedCount = cleanup_activity_logs($days);

    // Log the cleanup action itself (only if not deleting all logs)
    if ($days > 0 || $deletedCount > 0) {
        write_activity_log('cleanup', 'activity_logs', 'system', '', [
            'days' => $days,
            'deleted' => $deletedCount,
            'type' => $days === 0 ? 'all' : 'by_age'
        ]);
    }

    echo json_encode([
        'success' => true,
        'type' => 'logs-cleanup',
        'deleted' => $deletedCount,
        'days' => $days,
        'generated_at' => time(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Handle logs export action
 * 
 * @return void
 */
function handle_logs_export_action(): void
{
    $format = isset($_GET['format']) ? strtolower($_GET['format']) : 'json';
    $filters = get_log_filters();
    $logs = export_activity_logs($filters, 10000);

    if ($format === 'csv') {
        export_logs_as_csv($logs);
    } else {
        export_logs_as_json($logs);
    }
    exit;
}

/**
 * Get log filters from request
 * 
 * @return array
 */
function get_log_filters(): array
{
    $filters = [];

    if (isset($_GET['filterAction']) && $_GET['filterAction'] !== '') {
        $filters['action'] = $_GET['filterAction'];
    }
    if (isset($_GET['filterType']) && $_GET['filterType'] !== '') {
        $filters['type'] = $_GET['filterType'];
    }
    if (isset($_GET['search']) && $_GET['search'] !== '') {
        $filters['search'] = $_GET['search'];
    }

    return $filters;
}

/**
 * Export logs as CSV file
 * 
 * @param array $logs Logs data
 * @return void
 */
function export_logs_as_csv(array $logs): void
{
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="activity_logs_' . date('Y-m-d_His') . '.csv"');

    // CSV header
    echo "Waktu,Aksi,File,Tipe,Path,IP,Browser\n";

    foreach ($logs as $log) {
        $actionDisplay = $log['action'] ?? 'unknown';
        $fileDisplay = $log['filename'] ?? '-';
        $type = $log['targetType'] ?? '-';
        $path = $log['path'] ?? '-';
        $ip = $log['ip'] ?? '-';
        $browser = $log['userAgent'] ?? '-';
        $time = isset($log['timestamp']) ? date('Y-m-d H:i:s', $log['timestamp']) : '-';

        // Escape CSV values
        $row = [$time, $actionDisplay, $fileDisplay, $type, $path, $ip, $browser];
        echo '"' . implode('","', array_map(function ($v) {
            return str_replace('"', '""', $v);
        }, $row)) . "\"\n";
    }
}

/**
 * Export logs as JSON file
 * 
 * @param array $logs Logs data
 * @return void
 */
function export_logs_as_json(array $logs): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="activity_logs_' . date('Y-m-d_His') . '.json"');
    echo json_encode(['logs' => $logs], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

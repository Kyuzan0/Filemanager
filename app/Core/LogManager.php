<?php
/**
 * Log Manager
 * Handles activity logging, reading, filtering, and cleanup
 * Note: Depends on functions from file_manager.php (get_logs_directory, etc)
 */

/**
 * Write activity log entry
 * @param string $action Activity type (upload, delete, etc)
 * @param string $target Target filename or description
 * @param string $targetType Item type (file, folder, bulk, system)
 * @param string $path Item path
 * @param array $extra Additional data to store
 * @return void
 */
function write_activity_log(string $action, string $target, string $targetType, string $path = '', array $extra = []): void
{
    ensure_directories();

    $logFile = ACTIVITY_LOG_FILE;
    $logs = [];

    if (file_exists($logFile)) {
        $content = file_get_contents($logFile);
        if ($content) {
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                $logs = $decoded;
            }
        }
    }

    $entry = [
        'timestamp' => time(),
        'action' => $action,
        'filename' => $target,
        'targetType' => $targetType,
        'path' => $path,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    ];

    // Merge extra data (for count, items, etc)
    $entry = array_merge($entry, $extra);

    array_unshift($logs, $entry);

    // Keep only last 10000 entries to prevent unbounded growth
    $logs = array_slice($logs, 0, 10000);

    if (!@file_put_contents($logFile, json_encode($logs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
        throw new RuntimeException('Gagal menulis log aktivitas.');
    }
}

/**
 * Read activity logs with filtering and pagination
 * @param int $limit Maximum logs per page
 * @param int $page Page number (1-based)
 * @param array $filters Filter criteria (action, type, search)
 * @return array ['logs' => [...], 'total' => int, 'totalPages' => int]
 */
function read_activity_logs(int $limit = 15, int $page = 1, array $filters = []): array
{
    $logFile = ACTIVITY_LOG_FILE;

    if (!file_exists($logFile)) {
        return [
            'logs' => [],
            'total' => 0,
            'totalPages' => 0,
        ];
    }

    $content = file_get_contents($logFile);
    if ($content === false) {
        return [
            'logs' => [],
            'total' => 0,
            'totalPages' => 0,
        ];
    }

    $allLogs = json_decode($content, true);
    if (!is_array($allLogs)) {
        $allLogs = [];
    }

    // Sort by timestamp descending (newest first)
    usort($allLogs, function ($a, $b) {
        return ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0);
    });

    // Apply filters
    $filteredLogs = array_filter($allLogs, function ($log) use ($filters) {
        // Action filter
        if (!empty($filters['action']) && ($log['action'] ?? '') !== $filters['action']) {
            return false;
        }

        // Type filter
        if (!empty($filters['type']) && ($log['targetType'] ?? '') !== $filters['type']) {
            return false;
        }

        // Search filter (search in filename, path, action)
        if (!empty($filters['search'])) {
            $search = strtolower($filters['search']);
            $filename = strtolower($log['filename'] ?? $log['target'] ?? '');
            $path = strtolower($log['path'] ?? '');
            $action = strtolower($log['action'] ?? '');
            $ip = $log['ip'] ?? '';

            if (
                strpos($filename, $search) === false &&
                strpos($path, $search) === false &&
                strpos($action, $search) === false &&
                strpos($ip, $search) === false
            ) {
                return false;
            }
        }

        return true;
    });

    $total = count($filteredLogs);
    $totalPages = $limit > 0 ? ceil($total / $limit) : 1;

    // Pagination
    if ($limit > 0) {
        $page = max(1, min($page, $totalPages));
        $offset = ($page - 1) * $limit;
        $logs = array_slice($filteredLogs, $offset, $limit);
    } else {
        $logs = $filteredLogs;
    }

    return [
        'logs' => $logs,
        'total' => $total,
        'totalPages' => $totalPages,
    ];
}

/**
 * Get single log entry by index
 * @param int $index
 * @return array|null
 */
function get_activity_log(int $index): ?array
{
    $logFile = ACTIVITY_LOG_FILE;

    if (!file_exists($logFile)) {
        return null;
    }

    $content = file_get_contents($logFile);
    $logs = json_decode($content, true);

    return isset($logs[$index]) ? $logs[$index] : null;
}

/**
 * Export logs as array (for CSV or other formats)
 * @param array $filters Filter criteria
 * @param int $limit Maximum logs to export (0 = all)
 * @return array
 */
function export_activity_logs(array $filters = [], int $limit = 10000): array
{
    $result = read_activity_logs($limit, 1, $filters);
    return $result['logs'] ?? [];
}

/**
 * Cleanup old logs
 * @param int $days Delete logs older than this many days
 * @return int Number of logs deleted
 */
function cleanup_activity_logs(int $days = 30): int
{
    $logFile = ACTIVITY_LOG_FILE;

    if (!file_exists($logFile)) {
        return 0;
    }

    $content = file_get_contents($logFile);
    $logs = json_decode($content, true);

    if (!is_array($logs)) {
        return 0;
    }

    $cutoffTime = time() - ($days * 86400);
    $initialCount = count($logs);

    $logs = array_filter($logs, function ($log) use ($cutoffTime) {
        return ($log['timestamp'] ?? 0) > $cutoffTime;
    });

    // Reindex array
    $logs = array_values($logs);

    if (!@file_put_contents($logFile, json_encode($logs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
        throw new RuntimeException('Gagal membersihkan log aktivitas.');
    }

    return $initialCount - count($logs);
}

/**
 * Get log statistics
 * @return array Statistics about logs
 */
function get_log_statistics(): array
{
    $logFile = ACTIVITY_LOG_FILE;

    if (!file_exists($logFile)) {
        return [
            'total' => 0,
            'byAction' => [],
            'byType' => [],
        ];
    }

    $content = file_get_contents($logFile);
    $logs = json_decode($content, true);

    if (!is_array($logs)) {
        return [
            'total' => 0,
            'byAction' => [],
            'byType' => [],
        ];
    }

    $byAction = [];
    $byType = [];

    foreach ($logs as $log) {
        $action = $log['action'] ?? 'unknown';
        $type = $log['targetType'] ?? 'unknown';

        $byAction[$action] = ($byAction[$action] ?? 0) + 1;
        $byType[$type] = ($byType[$type] ?? 0) + 1;
    }

    return [
        'total' => count($logs),
        'byAction' => $byAction,
        'byType' => $byType,
    ];
}

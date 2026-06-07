<?php
/**
 * Log Manager
 * Handles activity logging, reading, filtering, and cleanup
 * Uses SQLite database for O(1) writes and indexed queries.
 *
 * @version 2.0.0
 */

use App\Core\Database;

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
    $db = Database::getConnection();

    $stmt = $db->prepare('
        INSERT INTO activity_logs (action, filename, target_type, path, ip_address, user_agent, extra_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        $action,
        $target,
        $targetType,
        $path,
        $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        !empty($extra) ? json_encode($extra, JSON_UNESCAPED_UNICODE) : null,
    ]);

    // Auto-cleanup: keep last 50,000 entries
    $db->exec('DELETE FROM activity_logs WHERE id NOT IN (SELECT id FROM activity_logs ORDER BY id DESC LIMIT 50000)');
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
    $db = Database::getConnection();

    $conditions = [];
    $params = [];

    if (!empty($filters['action'])) {
        $conditions[] = 'action = ?';
        $params[] = $filters['action'];
    }

    if (!empty($filters['type'])) {
        $conditions[] = 'target_type = ?';
        $params[] = $filters['type'];
    }

    if (!empty($filters['search'])) {
        $search = '%' . $filters['search'] . '%';
        $conditions[] = '(filename LIKE ? OR path LIKE ? OR action LIKE ? OR ip_address LIKE ?)';
        $params[] = $search;
        $params[] = $search;
        $params[] = $search;
        $params[] = $search;
    }

    $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

    // Count total
    $countStmt = $db->prepare("SELECT COUNT(*) as cnt FROM activity_logs {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetch()['cnt'];
    $totalPages = $limit > 0 ? (int) ceil($total / $limit) : 1;

    // Fetch page
    if ($limit > 0) {
        $page = max(1, min($page, $totalPages));
        $offset = ($page - 1) * $limit;
    } else {
        $offset = 0;
    }

    $sql = "SELECT * FROM activity_logs {$where} ORDER BY id DESC LIMIT ? OFFSET ?";
    $stmt = $db->prepare($sql);
    $allParams = array_merge($params, [$limit, $offset]);
    $stmt->execute($allParams);
    $rows = $stmt->fetchAll();

    // Normalize rows to match old JSON format for backward compatibility
    $logs = [];
    foreach ($rows as $row) {
        $extra = $row['extra_data'] ? json_decode($row['extra_data'], true) : [];
        $entry = array_merge([
            'timestamp' => strtotime($row['created_at']),
            'action' => $row['action'],
            'filename' => $row['filename'],
            'targetType' => $row['target_type'],
            'path' => $row['path'],
            'ip' => $row['ip_address'],
            'userAgent' => $row['user_agent'],
        ], is_array($extra) ? $extra : []);
        $logs[] = $entry;
    }

    return [
        'logs' => $logs,
        'total' => $total,
        'totalPages' => $totalPages,
    ];
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
    $db = Database::getConnection();

    $cutoff = date('Y-m-d H:i:s', time() - ($days * 86400));

    $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM activity_logs WHERE created_at < ?');
    $stmt->execute([$cutoff]);
    $initialCount = (int) $stmt->fetch()['cnt'];

    if ($initialCount === 0) {
        return 0;
    }

    $stmt = $db->prepare('DELETE FROM activity_logs WHERE created_at < ?');
    $stmt->execute([$cutoff]);

    return $initialCount;
}

/**
 * Get log statistics
 * @return array Statistics about logs
 */
function get_log_statistics(): array
{
    $db = Database::getConnection();

    $totalStmt = $db->query('SELECT COUNT(*) as cnt FROM activity_logs');
    $total = (int) $totalStmt->fetch()['cnt'];

    if ($total === 0) {
        return ['total' => 0, 'byAction' => [], 'byType' => []];
    }

    $byActionStmt = $db->query('SELECT action, COUNT(*) as cnt FROM activity_logs GROUP BY action');
    $byAction = [];
    foreach ($byActionStmt->fetchAll() as $row) {
        $byAction[$row['action']] = (int) $row['cnt'];
    }

    $byTypeStmt = $db->query('SELECT target_type, COUNT(*) as cnt FROM activity_logs GROUP BY target_type');
    $byType = [];
    foreach ($byTypeStmt->fetchAll() as $row) {
        $byType[$row['target_type']] = (int) $row['cnt'];
    }

    return [
        'total' => $total,
        'byAction' => $byAction,
        'byType' => $byType,
    ];
}

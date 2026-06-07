<?php
/**
 * One-time migration: Move activity logs from JSON file to SQLite
 * Run this AFTER deploying the LogManager.php changes.
 *
 * Usage: php bin/migrate_logs_to_sqlite.php
 */
require_once __DIR__ . '/../bootstrap.php';

$jsonFile = ACTIVITY_LOG_FILE;
if (!file_exists($jsonFile)) {
    echo "No activity.json found — nothing to migrate.\n";
    exit(0);
}

$content = file_get_contents($jsonFile);
$logs = json_decode($content, true);
if (!is_array($logs) || empty($logs)) {
    echo "activity.json is empty or invalid — nothing to migrate.\n";
    exit(0);
}

\dbg_set_exception_handler(function ($e) { echo "Error: {$e->getMessage()}\n"; exit(1); });

$db = \App\Core\Database::getConnection();
$stmt = $db->prepare('
    INSERT INTO activity_logs (action, filename, target_type, path, ip_address, user_agent, extra_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime(?, \'unixepoch\'))
');

$migrated = 0;
foreach ($logs as $log) {
    $extraData = null;
    $extraKeys = array_diff_key($log, array_flip([
        'timestamp', 'action', 'filename', 'targetType', 'path', 'ip', 'userAgent'
    ]));
    if (!empty($extraKeys)) {
        $extraData = json_encode($extraKeys, JSON_UNESCAPED_UNICODE);
    }

    $stmt->execute([
        $log['action'] ?? '',
        $log['filename'] ?? $log['target'] ?? '',
        $log['targetType'] ?? '',
        $log['path'] ?? '',
        $log['ip'] ?? 'unknown',
        $log['userAgent'] ?? '',
        $extraData,
        $log['timestamp'] ?? time(),
    ]);
    $migrated++;
}

// Backup old file
rename($jsonFile, $jsonFile . '.bak');

echo "Migrated {$migrated} log entries from activity.json to SQLite.\n";
echo "Old file backed up to: {$jsonFile}.bak\n";

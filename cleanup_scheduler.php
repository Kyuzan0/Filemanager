<?php
/**
 * Log Cleanup Scheduler
 * 
 * This script is designed to be run via cron job to automatically clean up old log entries.
 * It uses the Logger class's autoCleanup method with a default 30-day interval.
 */

// Include required files
require_once __DIR__ . '/lib/logger.php';

// Set default timezone to prevent issues
date_default_timezone_set('Asia/Jakarta');

echo "[" . date('Y-m-d H:i:s') . "] Starting log cleanup scheduler...\n";

try {
    // Ensure logs directory exists
    if (!is_dir(__DIR__ . '/logs')) {
        mkdir(__DIR__ . '/logs', 0755, true);
        echo "[" . date('Y-m-d H:i:s') . "] Created logs directory.\n";
    }
    
    // Initialize logger with auto-cleanup configuration
    $config = [
        'auto_cleanup_interval' => 30, // Default to 30 days
        'max_file_size' => 10 * 1024 * 1024, // 10MB
        'lock_timeout' => 5 // 5 seconds
    ];
    
    $logger = new Logger('logs/activity.json', $config);
    
    // Perform auto cleanup
    $result = $logger->autoCleanup();
    
    if ($result['success']) {
        echo "[" . date('Y-m-d H:i:s') . "] Cleanup completed successfully.\n";
        echo "[" . date('Y-m-d H:i:s') . "] Deleted {$result['deleted_count']} log entries.\n";
        echo "[" . date('Y-m-d H:i:s') . "] Remaining {$result['remaining_count']} log entries.\n";
        echo "[" . date('Y-m-d H:i:s') . "] Cleanup interval: {$result['interval_days']} days.\n";
    } else {
        echo "[" . date('Y-m-d H:i:s') . "] Cleanup failed: " . ($result['error'] ?? 'Unknown error') . "\n";
        exit(1);
    }
    
} catch (Exception $e) {
    echo "[" . date('Y-m-d H:i:s') . "] Error: " . $e->getMessage() . "\n";
    echo "[" . date('Y-m-d H:i:s') . "] Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "[" . date('Y-m-d H:i:s') . "] Log cleanup scheduler finished.\n";
?>
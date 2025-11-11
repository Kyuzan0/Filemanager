<?php

require_once '../lib/logger.php';

// Initialize logger with default configuration
$logger = new Logger();

// Example 1: Basic logging
echo "=== Basic Logging Examples ===\n";

// Log file deletion
$logger->log('delete', '/uploads/document.pdf');

// Log folder creation
$logger->log('create', '/uploads/new_folder');

// Log file upload
$logger->log('upload', '/uploads/image.jpg', [
    'file_size' => 1024000,
    'mime_type' => 'image/jpeg'
]);

// Example 2: Move and rename operations with additional details
echo "\n=== Move and Rename Operations ===\n";

// Log file move
$logger->log('move', '/uploads/new_folder/document.pdf', [
    'old_path' => '/uploads/document.pdf',
    'new_path' => '/uploads/new_folder/document.pdf'
]);

// Log file rename
$logger->log('rename', '/uploads/new_folder/renamed_document.pdf', [
    'old_path' => '/uploads/new_folder/document.pdf',
    'new_path' => '/uploads/new_folder/renamed_document.pdf'
]);

// Example 3: Reading logs with filters
echo "\n=== Reading Logs ===\n";

// Get all logs (limited to 10)
$allLogs = $logger->getLogs(10);
echo "Total logs retrieved: " . count($allLogs) . "\n";

// Get logs with action filter
$deleteLogs = $logger->getLogs(10, 0, ['action' => 'delete']);
echo "Delete action logs: " . count($deleteLogs) . "\n";

// Get logs with multiple filters
$fileLogs = $logger->getLogs(10, 0, [
    'target_type' => 'file',
    'action' => ['upload', 'create']
]);
echo "File creation/upload logs: " . count($fileLogs) . "\n";

// Example 4: Custom logger configuration
echo "\n=== Custom Logger Configuration ===\n";

// Initialize logger with custom settings
$customLogger = new Logger('logs/custom_activity.json', [
    'max_file_size' => 5 * 1024 * 1024, // 5MB
    'lock_timeout' => 10 // 10 seconds
]);

// Log with custom logger
$customLogger->log('download', '/downloads/report.xlsx', [
    'download_size' => 2048000,
    'user_role' => 'admin'
]);

// Example 5: Error handling
echo "\n=== Error Handling Example ===\n";

try {
    // Try to log with invalid data (will be sanitized)
    $logger->log('invalid_action', '/test/path');
    echo "Invalid action was sanitized and logged\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Example 6: Log cleanup
echo "\n=== Log Cleanup Example ===\n";

// Clean up logs older than 7 days
$cleanupResult = $logger->cleanup(7);
echo "Cleanup completed: " . ($cleanupResult ? "Success" : "Failed") . "\n";

// Example 7: Manual log rotation
echo "\n=== Manual Log Rotation ===\n";

$rotationResult = $logger->rotateLogs();
echo "Log rotation completed: " . ($rotationResult ? "Success" : "Failed") . "\n";

echo "\n=== Logger Usage Examples Complete ===\n";
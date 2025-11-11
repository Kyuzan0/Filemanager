<?php
require_once __DIR__ . '/lib/logger.php';

// Create a test log entry
$logger = new Logger('logs/activity.json');
$logger->log('create', 'test-file.txt', [
    'test' => true,
    'message' => 'Test log entry for log menu implementation'
]);

echo "Test log entry created successfully\n";
?>
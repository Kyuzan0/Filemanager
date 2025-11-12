<?php
/**
 * Test script to verify the logs API endpoint fix
 */

// Include required files
require_once __DIR__ . '/lib/logger.php';

// Create a test logger instance
$logger = new Logger('logs/activity.json');

// Add some test log entries if the log file is empty
$logs = $logger->getLogs(10, 0);
if (empty($logs)) {
    echo "Log file is empty. Adding test entries...\n";
    
    $logger->log('create', 'test-file.txt', ['test' => true]);
    $logger->log('delete', 'old-file.txt', ['test' => true]);
    $logger->log('move', 'moved-file.txt', ['test' => true, 'old_path' => 'old-location/moved-file.txt']);
    $logger->log('rename', 'renamed-file.txt', ['test' => true, 'old_path' => 'old-name.txt']);
    
    echo "Added 4 test log entries.\n";
}

// Test the logs API endpoint
echo "\n=== Testing Logs API Endpoint ===\n";

// Build the API URL
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
$apiUrl = str_replace('test_logs_fix.php', 'api.php', $baseUrl);

// Test basic logs request
echo "\n1. Testing basic logs request:\n";
$params = [
    'action' => 'logs',
    'limit' => 10,
    'offset' => 0
];

$url = $apiUrl . '?' . http_build_query($params);
echo "URL: $url\n";

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => 'Content-Type: application/json'
    ]
]);

$response = file_get_contents($url, false, $context);
if ($response === false) {
    echo "ERROR: Failed to get response from API\n";
} else {
    $data = json_decode($response, true);
    if ($data === null) {
        echo "ERROR: Invalid JSON response\n";
    } else {
        echo "SUCCESS: Got valid response\n";
        echo "Success: " . ($data['success'] ? 'true' : 'false') . "\n";
        echo "Logs count: " . count($data['logs'] ?? []) . "\n";
        echo "Total: " . ($data['total'] ?? 0) . "\n";
        
        if (!empty($data['logs'])) {
            echo "\nFirst log entry:\n";
            print_r($data['logs'][0]);
        }
    }
}

// Test logs with filter
echo "\n2. Testing logs with action filter:\n";
$params = [
    'action' => 'logs',
    'log_action' => 'create',
    'limit' => 10,
    'offset' => 0
];

$url = $apiUrl . '?' . http_build_query($params);
echo "URL: $url\n";

$response = file_get_contents($url, false, $context);
if ($response === false) {
    echo "ERROR: Failed to get response from API\n";
} else {
    $data = json_decode($response, true);
    if ($data === null) {
        echo "ERROR: Invalid JSON response\n";
    } else {
        echo "SUCCESS: Got valid response\n";
        echo "Success: " . ($data['success'] ? 'true' : 'false') . "\n";
        echo "Logs count: " . count($data['logs'] ?? []) . "\n";
        echo "Total: " . ($data['total'] ?? 0) . "\n";
    }
}

echo "\n=== Test Complete ===\n";
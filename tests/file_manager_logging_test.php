<?php

// Include required files
require_once __DIR__ . '/../lib/file_manager.php';
require_once __DIR__ . '/../lib/logger.php';

// Test setup
$testDir = __DIR__ . '/test_files';
$logDir = __DIR__ . '/../logs';

// Clean up previous test files and logs
if (is_dir($testDir)) {
    exec("rm -rf " . escapeshellarg($testDir));
}
if (is_dir($logDir)) {
    $logFiles = glob($logDir . '/*.json');
    foreach ($logFiles as $file) {
        unlink($file);
    }
}

// Create test directory
mkdir($testDir, 0755, true);

// Create test files and directories
$testFile = $testDir . '/test.txt';
$testSubDir = $testDir . '/subdir';
mkdir($testSubDir, 0755, true);
file_put_contents($testFile, 'Test content');
file_put_contents($testSubDir . '/subfile.txt', 'Sub file content');

echo "=== Testing File Manager Logging Integration ===\n\n";

// Test 1: Delete operation
echo "1. Testing delete operation...\n";
try {
    $result = delete_paths($testDir, ['test.txt']);
    echo "   Delete result: " . json_encode($result) . "\n";
    
    // Check if log was created
    $logger = get_logger();
    $logs = $logger->getLogs(10, 0, ['action' => 'delete']);
    echo "   Delete logs found: " . count($logs) . "\n";
    if (!empty($logs)) {
        echo "   Latest delete log: " . json_encode($logs[0]) . "\n";
    }
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 2: Move operation
echo "2. Testing move operation...\n";
try {
    $result = move_item($testDir, 'subdir/subfile.txt', 'moved_file.txt');
    echo "   Move result: " . json_encode($result) . "\n";
    
    // Check if log was created
    $logger = get_logger();
    $logs = $logger->getLogs(10, 0, ['action' => 'move']);
    echo "   Move logs found: " . count($logs) . "\n";
    if (!empty($logs)) {
        echo "   Latest move log: " . json_encode($logs[0]) . "\n";
    }
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 3: Rename operation
echo "3. Testing rename operation...\n";
try {
    $result = rename_item($testDir, 'moved_file.txt', 'renamed_file.txt');
    echo "   Rename result: " . json_encode($result) . "\n";
    
    // Check if log was created
    $logger = get_logger();
    $logs = $logger->getLogs(10, 0, ['action' => 'rename']);
    echo "   Rename logs found: " . count($logs) . "\n";
    if (!empty($logs)) {
        echo "   Latest rename log: " . json_encode($logs[0]) . "\n";
    }
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 4: Batch delete operation
echo "4. Testing batch delete operation...\n";
try {
    // Create more test files
    file_put_contents($testDir . '/batch1.txt', 'Batch file 1');
    file_put_contents($testDir . '/batch2.txt', 'Batch file 2');
    mkdir($testDir . '/batchdir', 0755, true);
    file_put_contents($testDir . '/batchdir/nested.txt', 'Nested file');
    
    $result = delete_paths($testDir, ['batch1.txt', 'batch2.txt', 'batchdir']);
    echo "   Batch delete result: " . json_encode($result) . "\n";
    
    // Check if logs were created
    $logger = get_logger();
    $logs = $logger->getLogs(20, 0, ['action' => 'delete']);
    echo "   Total delete logs found: " . count($logs) . "\n";
    
    // Count attempt and success logs
    $attemptLogs = array_filter($logs, function($log) {
        return isset($log['status']) && $log['status'] === 'attempt';
    });
    $successLogs = array_filter($logs, function($log) {
        return isset($log['status']) && $log['status'] === 'success';
    });
    
    echo "   Delete attempt logs: " . count($attemptLogs) . "\n";
    echo "   Delete success logs: " . count($successLogs) . "\n";
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 5: Error handling
echo "5. Testing error handling...\n";
try {
    // Try to delete non-existent file
    $result = delete_paths($testDir, ['nonexistent.txt']);
    echo "   Error delete result: " . json_encode($result) . "\n";
    
    // Check if error was logged
    $logger = get_logger();
    $logs = $logger->getLogs(10, 0, ['action' => 'delete', 'status' => 'failed']);
    echo "   Failed delete logs found: " . count($logs) . "\n";
    if (!empty($logs)) {
        echo "   Latest failed delete log: " . json_encode($logs[0]) . "\n";
    }
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 6: Log file integrity
echo "6. Testing log file integrity...\n";
try {
    $logFile = $logDir . '/activity.json';
    if (file_exists($logFile)) {
        $logContent = file_get_contents($logFile);
        $logData = json_decode($logContent, true);
        
        if (json_last_error() === JSON_ERROR_NONE) {
            echo "   Log file is valid JSON\n";
            echo "   Total log entries: " . count($logData) . "\n";
            
            // Check for required fields in recent logs
            $recentLogs = array_slice($logData, -5);
            $requiredFields = ['timestamp', 'session_id', 'action', 'target_path', 'ip_address'];
            
            foreach ($recentLogs as $log) {
                $missingFields = [];
                foreach ($requiredFields as $field) {
                    if (!isset($log[$field])) {
                        $missingFields[] = $field;
                    }
                }
                
                if (empty($missingFields)) {
                    echo "   Log entry has all required fields\n";
                } else {
                    echo "   Log entry missing fields: " . implode(', ', $missingFields) . "\n";
                }
            }
        } else {
            echo "   Log file contains invalid JSON: " . json_last_error_msg() . "\n";
        }
    } else {
        echo "   Log file does not exist\n";
    }
} catch (Exception $e) {
    echo "   Error checking log file: " . $e->getMessage() . "\n";
}
echo "\n";

// Clean up test files
if (is_dir($testDir)) {
    exec("rm -rf " . escapeshellarg($testDir));
}

echo "=== Test Complete ===\n";
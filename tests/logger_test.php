<?php

require_once '../lib/logger.php';

/**
 * Test Suite for Logger Class
 */
class LoggerTest
{
    private $testLogFile;
    private $logger;
    
    public function __construct()
    {
        $this->testLogFile = 'logs/test_activity_' . date('Y-m-d_H-i-s') . '.json';
        $this->logger = new Logger($this->testLogFile, [
            'max_file_size' => 1024, // 1KB for testing rotation
            'lock_timeout' => 5
        ]);
    }
    
    public function runAllTests()
    {
        echo "=== Logger Test Suite ===\n\n";
        
        $this->testBasicLogging();
        $this->testLogWithDetails();
        $this->testMoveAndRenameOperations();
        $this->testGetLogsWithoutFilters();
        $this->testGetLogsWithFilters();
        $this->testLogPagination();
        $this->testLogCleanup();
        $this->testLogRotation();
        $this->testErrorHandling();
        $this->testConcurrentLogging();
        
        $this->cleanup();
        echo "\n=== All Tests Completed ===\n";
    }
    
    private function testBasicLogging()
    {
        echo "Test 1: Basic Logging\n";
        
        // Test file deletion
        $result = $this->logger->log('delete', '/test/file.txt');
        $this->assert($result, "Should log file deletion successfully");
        
        // Test folder creation
        $result = $this->logger->log('create', '/test/folder');
        $this->assert($result, "Should log folder creation successfully");
        
        // Test file upload
        $result = $this->logger->log('upload', '/test/upload.jpg');
        $this->assert($result, "Should log file upload successfully");
        
        echo "✓ Basic logging tests passed\n\n";
    }
    
    private function testLogWithDetails()
    {
        echo "Test 2: Logging with Additional Details\n";
        
        $details = [
            'file_size' => 1024000,
            'mime_type' => 'application/pdf',
            'user_role' => 'admin'
        ];
        
        $result = $this->logger->log('upload', '/test/document.pdf', $details);
        $this->assert($result, "Should log with additional details");
        
        // Verify details are stored
        $logs = $this->logger->getLogs(1, 0, ['action' => 'upload']);
        $this->assert(count($logs) > 0, "Should find uploaded file in logs");
        $this->assert(isset($logs[0]['file_size']), "Should store file_size in log");
        $this->assert($logs[0]['file_size'] === 1024000, "Should store correct file size");
        
        echo "✓ Logging with details tests passed\n\n";
    }
    
    private function testMoveAndRenameOperations()
    {
        echo "Test 3: Move and Rename Operations\n";
        
        // Test move operation
        $moveDetails = [
            'old_path' => '/old/path/file.txt',
            'new_path' => '/new/path/file.txt'
        ];
        
        $result = $this->logger->log('move', '/new/path/file.txt', $moveDetails);
        $this->assert($result, "Should log move operation");
        
        // Test rename operation
        $renameDetails = [
            'old_path' => '/path/old_name.txt',
            'new_path' => '/path/new_name.txt'
        ];
        
        $result = $this->logger->log('rename', '/path/new_name.txt', $renameDetails);
        $this->assert($result, "Should log rename operation");
        
        // Verify move/rename details
        $moveLogs = $this->logger->getLogs(1, 0, ['action' => 'move']);
        $this->assert(isset($moveLogs[0]['old_path']), "Should store old_path for move");
        $this->assert(isset($moveLogs[0]['new_path']), "Should store new_path for move");
        
        echo "✓ Move and rename tests passed\n\n";
    }
    
    private function testGetLogsWithoutFilters()
    {
        echo "Test 4: Get Logs Without Filters\n";
        
        // Add some test logs
        $this->logger->log('create', '/test1.txt');
        $this->logger->log('delete', '/test2.txt');
        $this->logger->log('upload', '/test3.txt');
        
        // Get all logs
        $logs = $this->logger->getLogs(10);
        $this->assert(count($logs) >= 3, "Should retrieve at least 3 logs");
        
        // Verify log structure
        $firstLog = $logs[0];
        $requiredFields = ['timestamp', 'session_id', 'action', 'target_type', 'target_path', 'target_name', 'ip_address', 'user_agent'];
        
        foreach ($requiredFields as $field) {
            $this->assert(isset($firstLog[$field]), "Should have {$field} field in log");
        }
        
        // Verify timestamp format
        $this->assert(
            preg_match('/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/', $firstLog['timestamp']),
            "Timestamp should be in ISO 8601 format"
        );
        
        echo "✓ Get logs without filters tests passed\n\n";
    }
    
    private function testGetLogsWithFilters()
    {
        echo "Test 5: Get Logs With Filters\n";
        
        // Add test logs with different actions
        $this->logger->log('create', '/filter_test/file1.txt');
        $this->logger->log('delete', '/filter_test/file2.txt');
        $this->logger->log('create', '/filter_test/file3.txt');
        
        // Filter by action
        $createLogs = $this->logger->getLogs(10, 0, ['action' => 'create']);
        $this->assert(count($createLogs) >= 2, "Should find at least 2 create logs");
        
        foreach ($createLogs as $log) {
            $this->assert($log['action'] === 'create', "All logs should have action 'create'");
        }
        
        // Filter by target type
        $fileLogs = $this->logger->getLogs(10, 0, ['target_type' => 'file']);
        $this->assert(count($fileLogs) > 0, "Should find file logs");
        
        // Filter by multiple criteria
        $multiFilterLogs = $this->logger->getLogs(10, 0, [
            'action' => 'create',
            'target_type' => 'file'
        ]);
        $this->assert(count($multiFilterLogs) > 0, "Should find logs matching multiple filters");
        
        echo "✓ Get logs with filters tests passed\n\n";
    }
    
    private function testLogPagination()
    {
        echo "Test 6: Log Pagination\n";
        
        // Add multiple test logs
        for ($i = 1; $i <= 5; $i++) {
            $this->logger->log('create', "/pagination_test/file{$i}.txt");
        }
        
        // Test pagination
        $page1 = $this->logger->getLogs(2, 0);
        $page2 = $this->logger->getLogs(2, 2);
        
        $this->assert(count($page1) <= 2, "First page should have at most 2 logs");
        $this->assert(count($page2) <= 2, "Second page should have at most 2 logs");
        
        // Verify no duplicates between pages
        $page1Ids = array_map(function($log) { return $log['timestamp']; }, $page1);
        $page2Ids = array_map(function($log) { return $log['timestamp']; }, $page2);
        $intersection = array_intersect($page1Ids, $page2Ids);
        $this->assert(count($intersection) === 0, "Pages should not have duplicate logs");
        
        echo "✓ Log pagination tests passed\n\n";
    }
    
    private function testLogCleanup()
    {
        echo "Test 7: Log Cleanup\n";
        
        // Add a log entry
        $this->logger->log('create', '/cleanup_test/file.txt');
        
        // Verify log exists
        $logsBefore = $this->logger->getLogs(10);
        $this->assert(count($logsBefore) > 0, "Should have logs before cleanup");
        
        // Clean up logs older than 0 days (should remove all)
        $result = $this->logger->cleanup(0);
        $this->assert($result, "Cleanup should succeed");
        
        // Verify logs are cleaned
        $logsAfter = $this->logger->getLogs(10);
        $this->assert(count($logsAfter) === 0, "Should have no logs after cleanup");
        
        echo "✓ Log cleanup tests passed\n\n";
    }
    
    private function testLogRotation()
    {
        echo "Test 8: Log Rotation\n";
        
        // Add logs until rotation is triggered (file size > 1KB)
        for ($i = 1; $i <= 50; $i++) {
            $this->logger->log('create', "/rotation_test/very_long_file_name_to_increase_size_{$i}.txt", [
                'large_data' => str_repeat('x', 100) // Add some bulk
            ]);
        }
        
        // Check if backup file was created
        $logDir = dirname($this->testLogFile);
        $backupFiles = glob($logDir . '/test_activity_*.json');
        
        $this->assert(count($backupFiles) > 1, "Should create backup files after rotation");
        
        echo "✓ Log rotation tests passed\n\n";
    }
    
    private function testErrorHandling()
    {
        echo "Test 9: Error Handling\n";
        
        // Test invalid action (should be sanitized)
        $result = $this->logger->log('invalid_action', '/test/file.txt');
        $this->assert($result, "Should handle invalid action gracefully");
        
        // Verify action was sanitized
        $logs = $this->logger->getLogs(1);
        $this->assert($logs[0]['action'] === 'unknown', "Should sanitize invalid action to 'unknown'");
        
        // Test empty path
        $result = $this->logger->log('create', '');
        $this->assert($result, "Should handle empty path gracefully");
        
        echo "✓ Error handling tests passed\n\n";
    }
    
    private function testConcurrentLogging()
    {
        echo "Test 10: Concurrent Logging Simulation\n";
        
        // Simulate concurrent logging by adding multiple logs rapidly
        $successCount = 0;
        $totalAttempts = 10;
        
        for ($i = 0; $i < $totalAttempts; $i++) {
            $result = $this->logger->log('create', "/concurrent_test/file{$i}.txt");
            if ($result) {
                $successCount++;
            }
        }
        
        $this->assert($successCount === $totalAttempts, "All concurrent logging attempts should succeed");
        
        // Verify all logs were written
        $concurrentLogs = $this->logger->getLogs($totalAttempts, 0, ['action' => 'create']);
        $this->assert(count($concurrentLogs) >= $totalAttempts, "All concurrent logs should be written");
        
        echo "✓ Concurrent logging tests passed\n\n";
    }
    
    private function assert($condition, $message)
    {
        if (!$condition) {
            throw new Exception("Assertion failed: {$message}");
        }
    }
    
    private function cleanup()
    {
        // Clean up test files
        $logDir = dirname($this->testLogFile);
        $testFiles = glob($logDir . '/test_activity_*.json');
        
        foreach ($testFiles as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }
    }
}

// Run tests
try {
    $test = new LoggerTest();
    $test->runAllTests();
} catch (Exception $e) {
    echo "Test failed: " . $e->getMessage() . "\n";
    exit(1);
}
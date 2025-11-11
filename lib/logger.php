<?php

/**
 * JSON File-based Logger for File Manager
 * 
 * Provides logging functionality with JSON storage, rotation, and cleanup capabilities
 */
class Logger
{
    private $logFile;
    private $maxFileSize;
    private $lockTimeout;
    private $sessionId;
    private $autoCleanupInterval;
    
    /**
     * Constructor
     * 
     * @param string $logFilePath Path to log file (default: logs/activity.json)
     * @param array $config Configuration options
     */
    public function __construct($logFilePath = 'logs/activity.json', $config = [])
    {
        $this->logFile = $logFilePath;
        $this->maxFileSize = $config['max_file_size'] ?? 10 * 1024 * 1024; // 10MB default
        $this->lockTimeout = $config['lock_timeout'] ?? 5; // 5 seconds default
        $this->autoCleanupInterval = $config['auto_cleanup_interval'] ?? 30; // 30 days default
        $this->sessionId = $this->generateSessionId();
        
        // Ensure log directory exists
        $this->ensureLogDirectory();
    }
    
    /**
     * Log an action
     * 
     * @param string $action Action type (delete, move, rename, etc.)
     * @param string $targetPath Target path
     * @param array $details Additional details
     * @return bool Success status
     */
    public function log($action, $targetPath, $details = [])
    {
        try {
            $logEntry = $this->buildLogEntry($action, $targetPath, $details);
            
            // Check if rotation is needed
            if ($this->shouldRotate()) {
                $this->rotateLogs();
            }
            
            return $this->writeLog($logEntry);
        } catch (Exception $e) {
            error_log("Logger error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get logs with pagination and filtering
     *
     * @param int $limit Maximum number of entries
     * @param int $offset Offset for pagination
     * @param array $filters Filters to apply
     * @param string $sortBy Field to sort by
     * @param string $sortOrder Sort order (asc/desc)
     * @return array Log entries
     */
    public function getLogs($limit = 100, $offset = 0, $filters = [], $sortBy = 'timestamp', $sortOrder = 'desc')
    {
        try {
            if (!file_exists($this->logFile)) {
                return [];
            }
            
            $logs = $this->readLogFile();
            $filteredLogs = $this->applyFilters($logs, $filters);
            
            // Sort by specified field and order
            $this->sortLogs($filteredLogs, $sortBy, $sortOrder);
            
            return array_slice($filteredLogs, $offset, $limit);
        } catch (Exception $e) {
            error_log("Logger getLogs error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Clean up old logs
     * 
     * @param int $days Number of days to keep
     * @return bool Success status
     */
    public function cleanup($days)
    {
        try {
            if (!file_exists($this->logFile)) {
                return true;
            }
            
            $logs = $this->readLogFile();
            $cutoffDate = date('Y-m-d\TH:i:s.vP', strtotime("-{$days} days"));
            
            $filteredLogs = array_filter($logs, function($log) use ($cutoffDate) {
                return $log['timestamp'] >= $cutoffDate;
            });
            
            return $this->writeLogFile(array_values($filteredLogs));
        } catch (Exception $e) {
            error_log("Logger cleanup error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Auto cleanup logs using configured interval
     *
     * @return array Result with deleted count and remaining count
     */
    public function autoCleanup()
    {
        try {
            if (!file_exists($this->logFile)) {
                return [
                    'success' => true,
                    'deleted_count' => 0,
                    'remaining_count' => 0,
                    'message' => 'No log file exists'
                ];
            }
            
            $logs = $this->readLogFile();
            $originalCount = count($logs);
            $cutoffDate = date('Y-m-d\TH:i:s.vP', strtotime("-{$this->autoCleanupInterval} days"));
            
            $filteredLogs = array_filter($logs, function($log) use ($cutoffDate) {
                return $log['timestamp'] >= $cutoffDate;
            });
            
            $remainingCount = count($filteredLogs);
            $deletedCount = $originalCount - $remainingCount;
            
            if ($deletedCount > 0) {
                $success = $this->writeLogFile(array_values($filteredLogs));
                
                if ($success) {
                    // Log the cleanup operation itself
                    $this->log('cleanup', $this->logFile, [
                        'deleted_count' => $deletedCount,
                        'interval_days' => $this->autoCleanupInterval,
                        'cutoff_date' => $cutoffDate
                    ]);
                    
                    return [
                        'success' => true,
                        'deleted_count' => $deletedCount,
                        'remaining_count' => $remainingCount,
                        'message' => "Successfully cleaned up {$deletedCount} log entries older than {$this->autoCleanupInterval} days"
                    ];
                } else {
                    throw new Exception("Failed to write cleaned logs to file");
                }
            }
            
            return [
                'success' => true,
                'deleted_count' => 0,
                'remaining_count' => $remainingCount,
                'message' => "No logs older than {$this->autoCleanupInterval} days found"
            ];
        } catch (Exception $e) {
            error_log("Logger autoCleanup error: " . $e->getMessage());
            return [
                'success' => false,
                'deleted_count' => 0,
                'remaining_count' => 0,
                'message' => 'Auto cleanup failed: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Rotate log files
     * 
     * @return bool Success status
     */
    public function rotateLogs()
    {
        try {
            if (!file_exists($this->logFile)) {
                return true;
            }
            
            $timestamp = date('Y-m-d_H-i-s');
            $backupFile = dirname($this->logFile) . '/activity_' . $timestamp . '.json';
            
            // Copy current log to backup
            if (!copy($this->logFile, $backupFile)) {
                throw new Exception("Failed to create backup file");
            }
            
            // Create new empty log file
            return $this->writeLogFile([]);
        } catch (Exception $e) {
            error_log("Logger rotateLogs error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Build log entry structure
     * 
     * @param string $action Action type
     * @param string $targetPath Target path
     * @param array $details Additional details
     * @return array Log entry
     */
    private function buildLogEntry($action, $targetPath, $details = [])
    {
        $pathInfo = pathinfo($targetPath);
        
        $logEntry = [
            'timestamp' => date('Y-m-d\TH:i:s.vP'),
            'session_id' => $this->sessionId,
            'action' => $this->validateAction($action),
            'target_type' => $this->determineTargetType($targetPath),
            'target_path' => $targetPath,
            'target_name' => $pathInfo['basename'] ?? '',
            'ip_address' => $this->getClientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
        ];
        
        // Add optional fields
        if (isset($details['old_path'])) {
            $logEntry['old_path'] = $details['old_path'];
        }
        
        if (isset($details['new_path'])) {
            $logEntry['new_path'] = $details['new_path'];
        }
        
        // Merge additional details
        $logEntry = array_merge($logEntry, array_diff_key($details, array_flip(['old_path', 'new_path'])));
        
        return $logEntry;
    }
    
    /**
     * Write log entry to file with locking
     * 
     * @param array $logEntry Log entry to write
     * @return bool Success status
     */
    private function writeLog($logEntry)
    {
        $logs = $this->readLogFile();
        $logs[] = $logEntry;
        
        return $this->writeLogFile($logs);
    }
    
    /**
     * Read log file contents
     * 
     * @return array Log entries
     */
    private function readLogFile()
    {
        if (!file_exists($this->logFile)) {
            return [];
        }
        
        $content = file_get_contents($this->logFile);
        if ($content === false) {
            throw new Exception("Failed to read log file");
        }
        
        if (empty($content)) {
            return [];
        }
        
        $logs = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON in log file: " . json_last_error_msg());
        }
        
        return is_array($logs) ? $logs : [];
    }
    
    /**
     * Write logs to file with locking
     * 
     * @param array $logs Log entries
     * @return bool Success status
     */
    private function writeLogFile($logs)
    {
        $json = json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new Exception("Failed to encode logs to JSON");
        }
        
        $file = fopen($this->logFile, 'c');
        if ($file === false) {
            throw new Exception("Failed to open log file for writing");
        }
        
        try {
            // Acquire exclusive lock with timeout
            if (flock($file, LOCK_EX)) {
                ftruncate($file, 0);
                rewind($file);
                
                $bytesWritten = fwrite($file, $json);
                if ($bytesWritten === false) {
                    throw new Exception("Failed to write to log file");
                }
                
                fflush($file);
                flock($file, LOCK_UN);
                return true;
            } else {
                throw new Exception("Failed to acquire file lock");
            }
        } finally {
            fclose($file);
        }
    }
    
    /**
     * Check if log rotation is needed
     * 
     * @return bool True if rotation is needed
     */
    private function shouldRotate()
    {
        if (!file_exists($this->logFile)) {
            return false;
        }
        
        return filesize($this->logFile) >= $this->maxFileSize;
    }
    
    /**
     * Apply filters to log entries
     *
     * @param array $logs Log entries
     * @param array $filters Filters to apply
     * @return array Filtered log entries
     */
    private function applyFilters($logs, $filters)
    {
        if (empty($filters)) {
            return $logs;
        }
        
        return array_filter($logs, function($log) use ($filters) {
            foreach ($filters as $key => $value) {
                // Handle special filter cases
                switch ($key) {
                    case 'start_date':
                        if (isset($log['timestamp']) && $log['timestamp'] < $value) {
                            return false;
                        }
                        break;
                        
                    case 'end_date':
                        if (isset($log['timestamp']) && $log['timestamp'] > $value) {
                            return false;
                        }
                        break;
                        
                    case 'path_search':
                        if (isset($log['target_path']) && strpos(strtolower($log['target_path']), strtolower($value)) === false) {
                            return false;
                        }
                        break;
                        
                    default:
                        // Standard exact match for other fields
                        if (!isset($log[$key])) {
                            return false;
                        }
                        
                        if (is_array($value)) {
                            if (!in_array($log[$key], $value)) {
                                return false;
                            }
                        } elseif ($log[$key] !== $value) {
                            return false;
                        }
                        break;
                }
            }
            
            return true;
        });
    }
    
    /**
     * Sort log entries by specified field and order
     *
     * @param array &$logs Log entries (passed by reference)
     * @param string $sortBy Field to sort by
     * @param string $sortOrder Sort order (asc/desc)
     */
    private function sortLogs(&$logs, $sortBy, $sortOrder)
    {
        usort($logs, function($a, $b) use ($sortBy, $sortOrder) {
            $aValue = isset($a[$sortBy]) ? $a[$sortBy] : '';
            $bValue = isset($b[$sortBy]) ? $b[$sortBy] : '';
            
            // Special handling for timestamp
            if ($sortBy === 'timestamp') {
                $aValue = strtotime($aValue);
                $bValue = strtotime($bValue);
            }
            
            $comparison = 0;
            if ($aValue < $bValue) {
                $comparison = -1;
            } elseif ($aValue > $bValue) {
                $comparison = 1;
            }
            
            // Reverse for descending order
            return ($sortOrder === 'desc') ? -$comparison : $comparison;
        });
    }
    
    /**
     * Validate action type
     * 
     * @param string $action Action to validate
     * @return string Validated action
     */
    private function validateAction($action)
    {
        $validActions = ['create', 'delete', 'move', 'rename', 'copy', 'upload', 'download', 'read'];
        
        if (in_array($action, $validActions)) {
            return $action;
        }
        
        return 'unknown';
    }
    
    /**
     * Determine target type (file or folder)
     * 
     * @param string $path Path to check
     * @return string Target type
     */
    private function determineTargetType($path)
    {
        // Simple heuristic: if path ends with / or has no extension, consider it a folder
        if (substr($path, -1) === '/' || !pathinfo($path, PATHINFO_EXTENSION)) {
            return 'folder';
        }
        
        return 'file';
    }
    
    /**
     * Get client IP address
     * 
     * @return string IP address
     */
    private function getClientIp()
    {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ips = explode(',', $_SERVER[$key]);
                $ip = trim($ips[0]);
                
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
    
    /**
     * Generate unique session ID
     * 
     * @return string Session ID
     */
    private function generateSessionId()
    {
        return uniqid('session_', true);
    }
    
    /**
     * Ensure log directory exists
     */
    private function ensureLogDirectory()
    {
        $logDir = dirname($this->logFile);
        
        if (!is_dir($logDir)) {
            if (!mkdir($logDir, 0755, true)) {
                throw new Exception("Failed to create log directory: {$logDir}");
            }
        }
    }
}
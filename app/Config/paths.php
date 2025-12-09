<?php

/**
 * Path Configuration
 * 
 * Centralized path definitions for the File Manager application.
 * All paths are absolute and resolved at runtime.
 * 
 * @version 2.0.0
 */

// Project root directory (parent of 'app', 'public', 'storage')
define('PROJECT_ROOT', dirname(__DIR__, 2));

// Public directory (web-accessible)
define('PUBLIC_DIR', PROJECT_ROOT . '/public');

// Application directory
define('APP_DIR', PROJECT_ROOT . '/app');

// Storage directories
define('STORAGE_DIR', PROJECT_ROOT . '/storage');
define('FILES_DIR', STORAGE_DIR . '/files');
define('TRASH_DIR', STORAGE_DIR . '/trash');
define('LOGS_DIR', STORAGE_DIR . '/logs');
define('TEMP_DIR', STORAGE_DIR . '/temp');

// Binary tools directory
define('BIN_DIR', PROJECT_ROOT . '/bin');

// Documentation directory
define('DOCS_DIR', PROJECT_ROOT . '/docs');

// Trash metadata file
define('TRASH_METADATA_FILE', TRASH_DIR . '/metadata.json');

// Activity log file
define('ACTIVITY_LOG_FILE', LOGS_DIR . '/activity.json');

// Configuration for file manager
define('MAX_UPLOAD_SIZE', 100 * 1024 * 1024); // 100MB default max
define('ALLOWED_UPLOAD_TYPES', '*'); // Allow all types by default

// Editable file extensions
define('EDITABLE_EXTENSIONS', [
    'txt',
    'md',
    'html',
    'htm',
    'css',
    'js',
    'json',
    'xml',
    'php',
    'py',
    'rb',
    'java',
    'c',
    'cpp',
    'h',
    'hpp',
    'sh',
    'bash',
    'zsh',
    'bat',
    'ps1',
    'cmd',
    'sql',
    'yaml',
    'yml',
    'ini',
    'conf',
    'cfg',
    'htaccess',
    'log',
    'csv',
    'tsv',
    'gitignore',
    'env',
    'dockerfile'
]);

/**
 * Get the root file storage path
 * 
 * @return string|false Resolved path or false if not found
 */
function get_root_path(): string|false
{
    return realpath(FILES_DIR);
}

/**
 * Get the trash directory path
 * 
 * @return string|false Resolved path or false if not found
 */
function get_trash_path(): string|false
{
    return realpath(TRASH_DIR);
}

/**
 * Get the logs directory path
 * 
 * @return string|false Resolved path or false if not found
 */
function get_logs_path(): string|false
{
    return realpath(LOGS_DIR);
}

/**
 * Get the temp directory path
 * 
 * @return string|false Resolved path or false if not found
 */
function get_temp_path(): string|false
{
    return realpath(TEMP_DIR);
}

/**
 * Ensure all required directories exist
 * 
 * @return void
 */
function ensure_directories(): void
{
    $dirs = [STORAGE_DIR, FILES_DIR, TRASH_DIR, LOGS_DIR, TEMP_DIR];

    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}

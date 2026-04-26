<?php

/**
 * PHPUnit Bootstrap File
 * 
 * Loads the application autoloader and sets up the test environment.
 */

// Load the application autoloader
require_once __DIR__ . '/../autoload.php';

// Define test constants if not already defined
if (!defined('PROJECT_ROOT')) {
    define('PROJECT_ROOT', dirname(__DIR__));
}

if (!defined('FILES_DIR')) {
    define('FILES_DIR', PROJECT_ROOT . '/storage/files');
}

if (!defined('EDITABLE_EXTENSIONS')) {
    define('EDITABLE_EXTENSIONS', [
        'txt', 'md', 'html', 'htm', 'css', 'js', 'json', 'xml', 'php',
        'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash', 'zsh',
        'bat', 'ps1', 'cmd', 'sql', 'yaml', 'yml', 'ini', 'conf', 'cfg',
        'htaccess', 'log', 'csv', 'tsv', 'gitignore', 'env', 'dockerfile'
    ]);
}

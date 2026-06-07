<?php

/**
 * Application Configuration
 * 
 * Centralized configuration for all application settings.
 * Supports environment variables via $_ENV with sensible defaults.
 * 
 * @version 1.0.0
 */

return [
    // Environment
    'debug' => filter_var($_ENV['APP_DEBUG'] ?? 'false', FILTER_VALIDATE_BOOLEAN),

    // Timezone
    'timezone' => $_ENV['APP_TIMEZONE'] ?? 'Asia/Jakarta',

    // PHP Limits
    'memory_limit' => $_ENV['APP_MEMORY_LIMIT'] ?? '256M',
    'max_execution_time' => (int) ($_ENV['APP_MAX_EXECUTION_TIME'] ?? 300),

    // Upload Settings
    'upload_max_filesize' => $_ENV['APP_UPLOAD_MAX'] ?? '2G',
    'post_max_size' => $_ENV['APP_POST_MAX_SIZE'] ?? '2100M',
    'max_file_uploads' => (int) ($_ENV['APP_MAX_FILE_UPLOADS'] ?? 50),

    // Session
    'session_lifetime' => (int) ($_ENV['APP_SESSION_LIFETIME'] ?? 7200),

    // Security
    'csrf_token_length' => 32,
    'share_password_expiry' => 3600, // 1 hour for share password validation

    // Logging
    'log_max_entries' => 50000,

    // Error Reporting
    'error_reporting' => [
        'all' => E_ALL,
        'production' => E_ALL & ~E_NOTICE & ~E_DEPRECATED,
    ],
];

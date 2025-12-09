<?php

/**
 * Autoloader
 * 
 * Loads all core classes, handlers, helpers, and configurations.
 * This file should be included at the beginning of api.php and index.php.
 * 
 * @version 2.0.0
 */

// Prevent direct access
if (!defined('PROJECT_ROOT')) {
    define('PROJECT_ROOT', __DIR__);
}

// Load configuration
require_once PROJECT_ROOT . '/app/Config/paths.php';

// Ensure required directories exist
ensure_directories();

// Load Core classes
require_once PROJECT_ROOT . '/app/Core/Security.php';
require_once PROJECT_ROOT . '/app/Core/FileManager.php';
require_once PROJECT_ROOT . '/app/Core/TrashManager.php';
require_once PROJECT_ROOT . '/app/Core/LogManager.php';
require_once PROJECT_ROOT . '/app/Core/ArchiveManager.php';

// Load Helpers
require_once PROJECT_ROOT . '/app/Helpers/helpers.php';

// Load Handlers
require_once PROJECT_ROOT . '/app/Handlers/FileHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/TrashHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/ArchiveHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/LogHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/RawHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/SystemHandler.php';

// Load binary setup if needed
if (file_exists(PROJECT_ROOT . '/bin/setup.php')) {
    require_once PROJECT_ROOT . '/bin/setup.php';
}

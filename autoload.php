<?php

/**
 * Autoloader
 * 
 * Loads all core classes, handlers, helpers, and configurations.
 * Uses Composer autoloader for PSR-4 classes + manual requires for procedural functions.
 * 
 * @version 3.0.0
 */

// Prevent direct access
if (!defined('PROJECT_ROOT')) {
    define('PROJECT_ROOT', __DIR__);
}

// Composer autoloader — handles PSR-4 class loading and third-party packages
if (file_exists(PROJECT_ROOT . '/vendor/autoload.php')) {
    require_once PROJECT_ROOT . '/vendor/autoload.php';
}

// Load configuration
require_once PROJECT_ROOT . '/app/Config/paths.php';

// Ensure required directories exist
ensure_directories();

// Load Core classes (order matters: PathResolver first, then FileManager/UploadManager)
require_once PROJECT_ROOT . '/app/Core/Security.php';
require_once PROJECT_ROOT . '/app/Core/PathResolver.php';
require_once PROJECT_ROOT . '/app/Core/FileManager.php';
require_once PROJECT_ROOT . '/app/Core/UploadManager.php';
require_once PROJECT_ROOT . '/app/Core/TrashManager.php';
require_once PROJECT_ROOT . '/app/Core/LogManager.php';
require_once PROJECT_ROOT . '/app/Core/ArchiveManager.php';
require_once PROJECT_ROOT . '/app/Core/Database.php';
require_once PROJECT_ROOT . '/app/Core/Auth.php';

// Load Helpers
require_once PROJECT_ROOT . '/app/Helpers/helpers.php';

// Load Handlers
require_once PROJECT_ROOT . '/app/Handlers/FileHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/TrashHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/ArchiveHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/LogHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/RawHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/ThumbnailHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/SearchHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/SystemHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/AuthHandler.php';
require_once PROJECT_ROOT . '/app/Handlers/ShareHandler.php';

// Load binary setup if needed
if (file_exists(PROJECT_ROOT . '/bin/setup.php')) {
    require_once PROJECT_ROOT . '/bin/setup.php';
}

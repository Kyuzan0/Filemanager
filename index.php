<?php
/**
 * Root redirect to public/
 * This file handles access via IP address (e.g., 192.168.xxx.xxx/filemanager)
 */

// Get the base path
$basePath = dirname($_SERVER['SCRIPT_NAME']);

// Redirect to public/
header('Location: ' . $basePath . '/public/');
exit;

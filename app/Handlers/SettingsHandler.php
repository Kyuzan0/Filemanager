<?php

/**
 * Settings Handler
 * Handles reading and writing application settings (persistent config).
 * Settings are stored in storage/settings.json
 */

define('SETTINGS_FILE', dirname(__DIR__, 2) . '/storage/settings.json');

/**
 * Default settings
 */
function get_default_settings(): array
{
    return [
        'debug' => false,
        'upload' => [
            'maxSizeMB' => 100,
            'imageMaxMB' => 100,
            'videoMaxMB' => 2048,
            'audioMaxMB' => 100,
            'documentMaxMB' => 100,
            'archiveMaxMB' => 100,
            'codeMaxMB' => 100,
            'additionalAllowed' => '',  // comma-separated: exe,msi,dll
            'additionalBlocked' => '',   // comma-separated: txt,log (extra blocked)
        ],
    ];
}

/**
 * Load settings from disk, merge with defaults
 */
function load_settings(): array
{
    $defaults = get_default_settings();

    if (file_exists(SETTINGS_FILE)) {
        $raw = file_get_contents(SETTINGS_FILE);
        $stored = json_decode($raw, true);
        if (is_array($stored)) {
            return array_replace_recursive($defaults, $stored);
        }
    }

    return $defaults;
}

/**
 * Save settings to disk
 */
function save_settings(array $settings): bool
{
    $dir = dirname(SETTINGS_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $json = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents(SETTINGS_FILE, $json) !== false;
}

/**
 * Handle GET/POST settings action
 */
function handle_settings_action(string $method): void
{
    header('Content-Type: application/json; charset=utf-8');

    if ($method === 'GET') {
        $settings = load_settings();
        echo json_encode([
            'success' => true,
            'settings' => $settings,
            'phpLimits' => [
                'uploadMax' => ini_get('upload_max_filesize'),
                'postMax' => ini_get('post_max_size'),
            ],
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid request body']);
            return;
        }

        $current = load_settings();

        // Merge only allowed keys
        if (isset($input['debug'])) {
            $current['debug'] = (bool) $input['debug'];
        }

        if (isset($input['upload']) && is_array($input['upload'])) {
            $current['upload'] = array_merge($current['upload'], $input['upload']);
            // Clamp numeric values to PHP limits; keep strings as-is
            $phpMaxMB = (int) floor(parse_bytes(ini_get('upload_max_filesize')) / 1024 / 1024);
            foreach ($current['upload'] as $k => &$v) {
                if (is_int($v) || (is_string($v) && ctype_digit($v))) {
                    $v = max(1, min((int) $v, $phpMaxMB));
                }
            }
            unset($v);
        }

        if (save_settings($current)) {
            echo json_encode([
                'success' => true,
                'settings' => $current,
            ], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Gagal menyimpan pengaturan']);
        }
        return;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

/**
 * Parse PHP byte strings like "2G", "100M", "500K" to integer bytes
 */
function parse_bytes(string $val): int
{
    $val = trim($val);
    $num = (int) $val;
    $suffix = strtolower(substr($val, -1));
    return match ($suffix) {
        'g' => $num * 1024 * 1024 * 1024,
        'm' => $num * 1024 * 1024,
        'k' => $num * 1024,
        default => $num,
    };
}

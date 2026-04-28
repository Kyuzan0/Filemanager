<?php

/**
 * Database
 * 
 * SQLite database wrapper using PDO.
 * Provides connection management and schema migration.
 * 
 * @version 1.0.0
 */

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $connection = null;
    private static string $dbPath = '';

    /**
     * Get database connection (singleton)
     */
    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            self::connect();
        }
        return self::$connection;
    }

    /**
     * Initialize database connection
     */
    private static function connect(): void
    {
        self::$dbPath = defined('DATABASE_DIR')
            ? DATABASE_DIR . '/filemanager.sqlite'
            : STORAGE_DIR . '/database/filemanager.sqlite';

        $dir = dirname(self::$dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        try {
            self::$connection = new PDO(
                'sqlite:' . self::$dbPath,
                null,
                null,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );

            // Enable WAL mode for better concurrent access
            self::$connection->exec('PRAGMA journal_mode=WAL');
            self::$connection->exec('PRAGMA foreign_keys=ON');
        } catch (PDOException $e) {
            throw new RuntimeException('Database connection failed: ' . $e->getMessage());
        }
    }

    /**
     * Run database migrations
     */
    public static function migrate(): void
    {
        $db = self::getConnection();

        // Create migrations tracking table
        $db->exec('
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        ');

        $migrations = self::getMigrations();

        foreach ($migrations as $name => $sql) {
            // Check if already executed
            $stmt = $db->prepare('SELECT id FROM migrations WHERE name = ?');
            $stmt->execute([$name]);
            if ($stmt->fetch()) {
                continue;
            }

            // Execute migration
            $db->exec($sql);

            // Record migration
            $stmt = $db->prepare('INSERT INTO migrations (name) VALUES (?)');
            $stmt->execute([$name]);
        }
    }

    /**
     * Get all migration definitions
     */
    private static function getMigrations(): array
    {
        return [
            '001_create_users_table' => '
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    email TEXT UNIQUE COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    display_name TEXT,
                    role TEXT NOT NULL DEFAULT "viewer" CHECK(role IN ("admin", "editor", "viewer")),
                    is_active INTEGER NOT NULL DEFAULT 1,
                    last_login TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            ',

            '002_create_sessions_table' => '
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    last_activity TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ',

            '003_create_permissions_table' => '
                CREATE TABLE IF NOT EXISTS folder_permissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    folder_path TEXT NOT NULL,
                    can_read INTEGER NOT NULL DEFAULT 1,
                    can_write INTEGER NOT NULL DEFAULT 0,
                    can_delete INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(user_id, folder_path)
                )
            ',

            '004_create_login_attempts_table' => '
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip_address TEXT NOT NULL,
                    username TEXT,
                    success INTEGER NOT NULL DEFAULT 0,
                    attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            ',

            '005_seed_admin_user' => "
                INSERT OR IGNORE INTO users (username, email, password_hash, display_name, role)
                VALUES (
                    'admin',
                    'admin@filemanager.local',
                    '" . password_hash('admin123', PASSWORD_BCRYPT) . "',
                    'Administrator',
                    'admin'
                )
            ",

            '006_create_shares_table' => '
                CREATE TABLE IF NOT EXISTS shares (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token TEXT NOT NULL UNIQUE,
                    file_path TEXT NOT NULL,
                    created_by INTEGER NOT NULL,
                    password_hash TEXT,
                    expires_at TEXT,
                    max_downloads INTEGER,
                    download_count INTEGER NOT NULL DEFAULT 0,
                    can_download INTEGER NOT NULL DEFAULT 1,
                    can_preview INTEGER NOT NULL DEFAULT 1,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                )
            ',

            '007_create_shares_index' => '
                CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token)
            ',
        ];
    }

    /**
     * Get database file path
     */
    public static function getDatabasePath(): string
    {
        return self::$dbPath;
    }

    /**
     * Close database connection
     */
    public static function close(): void
    {
        self::$connection = null;
    }

    /**
     * Check if database exists and is initialized
     */
    public static function isInitialized(): bool
    {
        $path = defined('DATABASE_DIR')
            ? DATABASE_DIR . '/filemanager.sqlite'
            : STORAGE_DIR . '/database/filemanager.sqlite';

        if (!file_exists($path)) {
            return false;
        }

        try {
            $db = self::getConnection();
            $stmt = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
            return $stmt->fetch() !== false;
        } catch (PDOException $e) {
            return false;
        }
    }
}

<?php

/**
 * Database Test
 * 
 * Tests for App\Core\Database — SQLite connection, migrations, schema.
 */

namespace Tests\Unit;

use App\Core\Database;
use PHPUnit\Framework\TestCase;
use PDO;

class DatabaseTest extends TestCase
{
    private static string $testDbDir;

    public static function setUpBeforeClass(): void
    {
        // DATABASE_DIR is already defined by paths.php (loaded via autoload.php)
        // We use the same dir since we can't redefine constants
        self::$testDbDir = DATABASE_DIR;
        if (!is_dir(self::$testDbDir)) {
            mkdir(self::$testDbDir, 0755, true);
        }
    }

    protected function setUp(): void
    {
        // Reset Database singleton between tests so each test gets fresh connection
        Database::close();

        // Delete existing DB to test from scratch
        $this->deleteDbFiles();
    }

    protected function tearDown(): void
    {
        Database::close();
    }

    public static function tearDownAfterClass(): void
    {
        // Re-migrate so other test suites (Auth) can use the DB
        Database::close();
        Database::migrate();
    }

    private function deleteDbFiles(): void
    {
        $dbFile = self::$testDbDir . '/filemanager.sqlite';
        if (file_exists($dbFile)) {
            unlink($dbFile);
        }
        foreach (['-wal', '-shm'] as $suffix) {
            $f = $dbFile . $suffix;
            if (file_exists($f)) {
                unlink($f);
            }
        }
    }

    // =========================================================================
    // CONNECTION
    // =========================================================================

    public function testGetConnectionReturnsPDO(): void
    {
        $conn = Database::getConnection();
        $this->assertInstanceOf(PDO::class, $conn);
    }

    public function testGetConnectionReturnsSameInstance(): void
    {
        $conn1 = Database::getConnection();
        $conn2 = Database::getConnection();
        $this->assertSame($conn1, $conn2);
    }

    public function testConnectionHasCorrectAttributes(): void
    {
        $conn = Database::getConnection();

        // Check error mode
        $this->assertEquals(
            PDO::ERRMODE_EXCEPTION,
            $conn->getAttribute(PDO::ATTR_ERRMODE)
        );

        // Check default fetch mode
        $this->assertEquals(
            PDO::FETCH_ASSOC,
            $conn->getAttribute(PDO::ATTR_DEFAULT_FETCH_MODE)
        );
    }

    public function testConnectionEnablesWALMode(): void
    {
        $conn = Database::getConnection();
        $stmt = $conn->query('PRAGMA journal_mode');
        $result = $stmt->fetch();
        $this->assertEquals('wal', $result['journal_mode']);
    }

    public function testConnectionEnablesForeignKeys(): void
    {
        $conn = Database::getConnection();
        $stmt = $conn->query('PRAGMA foreign_keys');
        $result = $stmt->fetch();
        $this->assertEquals(1, $result['foreign_keys']);
    }

    public function testCloseResetsConnection(): void
    {
        $conn1 = Database::getConnection();
        Database::close();
        $conn2 = Database::getConnection();
        // After close + reconnect, should be a different instance
        $this->assertNotSame($conn1, $conn2);
    }

    // =========================================================================
    // MIGRATIONS
    // =========================================================================

    public function testMigrateCreatesUsersTable(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        $result = $stmt->fetch();
        $this->assertNotFalse($result);
        $this->assertEquals('users', $result['name']);
    }

    public function testMigrateCreatesSessionsTable(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'");
        $result = $stmt->fetch();
        $this->assertNotFalse($result);
    }

    public function testMigrateCreatesPermissionsTable(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query("SELECT name FROM sqlite_master WHERE type='table' AND name='folder_permissions'");
        $result = $stmt->fetch();
        $this->assertNotFalse($result);
    }

    public function testMigrateCreatesLoginAttemptsTable(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'");
        $result = $stmt->fetch();
        $this->assertNotFalse($result);
    }

    public function testMigrateCreatesSharesTable(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query("SELECT name FROM sqlite_master WHERE type='table' AND name='shares'");
        $result = $stmt->fetch();
        $this->assertNotFalse($result);
    }

    public function testMigrateSeedsAdminUser(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query('SELECT * FROM users WHERE username = "admin" COLLATE NOCASE');
        $admin = $stmt->fetch();

        $this->assertNotFalse($admin, 'Admin user should exist after migration');
        $this->assertEquals('admin', $admin['username']);
        $this->assertEquals('admin', $admin['role']);
        $this->assertEquals('Administrator', $admin['display_name']);
        $this->assertTrue(password_verify('admin123', $admin['password_hash']));
    }

    public function testMigrateIsIdempotent(): void
    {
        Database::migrate();
        Database::migrate(); // Run again — should not throw

        $conn = Database::getConnection();
        $stmt = $conn->query('SELECT COUNT(*) as cnt FROM users WHERE username = "admin"');
        $result = $stmt->fetch();
        $this->assertEquals(1, $result['cnt']); // Only one admin
    }

    public function testMigrateTracksMigrations(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query('SELECT COUNT(*) as cnt FROM migrations');
        $result = $stmt->fetch();
        $this->assertGreaterThanOrEqual(7, $result['cnt']);
    }

    // =========================================================================
    // INITIALIZATION CHECK
    // =========================================================================

    public function testIsInitializedReturnsTrueAfterMigration(): void
    {
        Database::migrate();
        $this->assertTrue(Database::isInitialized());
    }

    public function testIsInitializedReturnsFalseWithoutUsersTable(): void
    {
        // Get a fresh connection without users table
        Database::close();
        $dbFile = self::$testDbDir . '/filemanager.sqlite';
        if (file_exists($dbFile)) {
            unlink($dbFile);
        }
        foreach (['-wal', '-shm'] as $suffix) {
            $f = $dbFile . $suffix;
            if (file_exists($f)) {
                unlink($f);
            }
        }

        $this->assertFalse(Database::isInitialized());

        // Re-migrate for subsequent tests
        Database::migrate();
    }

    // =========================================================================
    // SCHEMA VALIDATION
    // =========================================================================

    public function testUsersTableHasCorrectColumns(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query('PRAGMA table_info(users)');
        $columns = $stmt->fetchAll();
        $columnNames = array_column($columns, 'name');

        $expected = ['id', 'username', 'email', 'password_hash', 'display_name', 'role', 'is_active', 'last_login', 'created_at', 'updated_at'];
        foreach ($expected as $col) {
            $this->assertContains($col, $columnNames, "Missing column: $col");
        }
    }

    public function testSharesTableHasCorrectColumns(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query('PRAGMA table_info(shares)');
        $columns = $stmt->fetchAll();
        $columnNames = array_column($columns, 'name');

        $expected = ['id', 'token', 'file_path', 'created_by', 'password_hash', 'expires_at', 'max_downloads', 'download_count', 'can_download', 'can_preview', 'is_active', 'created_at'];
        foreach ($expected as $col) {
            $this->assertContains($col, $columnNames, "Missing column: $col");
        }
    }

    public function testUsersRoleConstraint(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        // Valid roles should work
        $suffix = uniqid();
        $stmt = $conn->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
        $stmt->execute(['testviewer_' . $suffix, 'hash', 'viewer']);
        $stmt->execute(['testeditor_' . $suffix, 'hash', 'editor']);

        // Invalid role should fail
        $this->expectException(\PDOException::class);
        $stmt->execute(['testinvalid_' . $suffix, 'hash', 'superadmin']);
    }

    public function testUsersUsernameUnique(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $suffix = uniqid();
        $stmt = $conn->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
        $stmt->execute(['uniqueuser_' . $suffix, 'hash', 'viewer']);

        $this->expectException(\PDOException::class);
        $stmt->execute(['uniqueuser_' . $suffix, 'hash2', 'editor']);
    }

    public function testSharesTokenIndex(): void
    {
        Database::migrate();
        $conn = Database::getConnection();

        $stmt = $conn->query("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_shares_token'");
        $result = $stmt->fetch();
        $this->assertNotFalse($result);
    }
}

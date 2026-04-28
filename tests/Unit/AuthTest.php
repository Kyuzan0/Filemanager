<?php

/**
 * Auth Test
 * 
 * Tests for App\Core\Auth — registration, user management, RBAC, folder permissions.
 * Note: login/logout/session tests are limited because they require active PHP sessions.
 */

namespace Tests\Unit;

use App\Core\Auth;
use App\Core\Database;
use PHPUnit\Framework\TestCase;

class AuthTest extends TestCase
{
    /** @var int[] Track user IDs created during tests for cleanup */
    private array $createdUserIds = [];

    public static function setUpBeforeClass(): void
    {
        // DATABASE_DIR is already defined by paths.php (loaded via autoload.php)
        // Ensure DB is migrated
        Database::migrate();
    }

    protected function setUp(): void
    {
        $this->createdUserIds = [];

        // Reset Auth cached user
        $ref = new \ReflectionClass(Auth::class);
        $prop = $ref->getProperty('currentUser');
        $prop->setAccessible(true);
        $prop->setValue(null, null);
    }

    protected function tearDown(): void
    {
        // Clean up test users created during this test
        if (!empty($this->createdUserIds)) {
            $db = Database::getConnection();
            $placeholders = implode(',', array_fill(0, count($this->createdUserIds), '?'));
            $db->prepare("DELETE FROM folder_permissions WHERE user_id IN ($placeholders)")->execute($this->createdUserIds);
            $db->prepare("DELETE FROM users WHERE id IN ($placeholders)")->execute($this->createdUserIds);
        }
    }

    /**
     * Helper: register a user and track for cleanup
     */
    private function registerAndTrack(string $username, string $password = 'password123', string $role = 'viewer', string $email = '', string $displayName = ''): array
    {
        $result = Auth::register($username, $password, $role, $email, $displayName);
        if ($result['success'] && isset($result['user']['id'])) {
            $this->createdUserIds[] = $result['user']['id'];
        }
        return $result;
    }

    // =========================================================================
    // REGISTRATION
    // =========================================================================

    public function testRegisterCreatesUser(): void
    {
        $u = 'testuser_' . uniqid();
        $result = $this->registerAndTrack($u, 'password123', 'viewer', $u . '@example.com', 'Test User');

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('user', $result);
        $this->assertEquals($u, $result['user']['username']);
        $this->assertEquals('viewer', $result['user']['role']);
        $this->assertEquals('Test User', $result['user']['display_name']);
        $this->assertArrayNotHasKey('password_hash', $result['user']);
    }

    public function testRegisterWithMinimalData(): void
    {
        $u = 'minuser_' . uniqid();
        $result = $this->registerAndTrack($u, 'password123');

        $this->assertTrue($result['success']);
        $this->assertEquals($u, $result['user']['username']);
        $this->assertEquals('viewer', $result['user']['role']);
        $this->assertEquals($u, $result['user']['display_name']);
    }

    public function testRegisterWithEditorRole(): void
    {
        $result = $this->registerAndTrack('editor_' . uniqid(), 'password123', 'editor');

        $this->assertTrue($result['success']);
        $this->assertEquals('editor', $result['user']['role']);
    }

    public function testRegisterWithAdminRole(): void
    {
        $result = $this->registerAndTrack('admin_' . uniqid(), 'password123', 'admin');

        $this->assertTrue($result['success']);
        $this->assertEquals('admin', $result['user']['role']);
    }

    public function testRegisterRejectsShortUsername(): void
    {
        $result = Auth::register('ab', 'password123');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('3-50', $result['error']);
    }

    public function testRegisterRejectsLongUsername(): void
    {
        $result = Auth::register(str_repeat('a', 51), 'password123');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('3-50', $result['error']);
    }

    public function testRegisterRejectsInvalidUsernameChars(): void
    {
        $result = Auth::register('user name', 'password123');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('huruf, angka', $result['error']);
    }

    public function testRegisterRejectsSpecialCharsInUsername(): void
    {
        $result = Auth::register('user@name', 'password123');

        $this->assertFalse($result['success']);
    }

    public function testRegisterAllowsDotsUnderscoresDashes(): void
    {
        $result = $this->registerAndTrack('user.name_test-' . uniqid(), 'password123');

        $this->assertTrue($result['success']);
    }

    public function testRegisterRejectsShortPassword(): void
    {
        $result = Auth::register('validuser_' . uniqid(), '12345');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('6 karakter', $result['error']);
    }

    public function testRegisterRejectsInvalidRole(): void
    {
        $result = Auth::register('validuser_' . uniqid(), 'password123', 'superadmin');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Role', $result['error']);
    }

    public function testRegisterRejectsDuplicateUsername(): void
    {
        $u = 'dupuser_' . uniqid();
        $this->registerAndTrack($u, 'password123');
        $result = Auth::register($u, 'password456');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('sudah digunakan', $result['error']);
    }

    public function testRegisterRejectsDuplicateUsernameCaseInsensitive(): void
    {
        $base = 'CaseUser_' . uniqid();
        $this->registerAndTrack($base, 'password123');
        $result = Auth::register(strtolower($base), 'password456');

        $this->assertFalse($result['success']);
    }

    public function testRegisterRejectsInvalidEmail(): void
    {
        $result = Auth::register('emailuser_' . uniqid(), 'password123', 'viewer', 'not-an-email');

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('email', $result['error']);
    }

    public function testRegisterRejectsDuplicateEmail(): void
    {
        $email = 'same_' . uniqid() . '@example.com';
        $this->registerAndTrack('user1_' . uniqid(), 'password123', 'viewer', $email);
        $result = Auth::register('user2_' . uniqid(), 'password123', 'viewer', $email);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Email', $result['error']);
    }

    public function testRegisterAllowsEmptyEmail(): void
    {
        $result = $this->registerAndTrack('noemail_' . uniqid(), 'password123', 'viewer', '');

        $this->assertTrue($result['success']);
    }

    public function testRegisterHashesPassword(): void
    {
        $u = 'hashtest_' . uniqid();
        $this->registerAndTrack($u, 'mypassword');

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT password_hash FROM users WHERE username = ?');
        $stmt->execute([$u]);
        $user = $stmt->fetch();

        $this->assertNotEquals('mypassword', $user['password_hash']);
        $this->assertTrue(password_verify('mypassword', $user['password_hash']));
    }

    // =========================================================================
    // USER MANAGEMENT
    // =========================================================================

    public function testListUsersReturnsAllUsers(): void
    {
        $beforeCount = count(Auth::listUsers());

        $this->registerAndTrack('listuser1_' . uniqid(), 'password123');
        $this->registerAndTrack('listuser2_' . uniqid(), 'password123');

        $users = Auth::listUsers();

        $this->assertCount($beforeCount + 2, $users);
    }

    public function testGetUserReturnsUser(): void
    {
        $u = 'getme_' . uniqid();
        $email = $u . '@me.com';
        $result = $this->registerAndTrack($u, 'password123', 'editor', $email, 'Get Me');
        $userId = $result['user']['id'];

        $user = Auth::getUser($userId);

        $this->assertNotNull($user);
        $this->assertEquals($u, $user['username']);
        $this->assertEquals('editor', $user['role']);
        $this->assertEquals('Get Me', $user['display_name']);
    }

    public function testGetUserReturnsNullForNonExistent(): void
    {
        $user = Auth::getUser(99999);
        $this->assertNull($user);
    }

    public function testUpdateUserDisplayName(): void
    {
        $result = $this->registerAndTrack('updateme_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        $updateResult = Auth::updateUser($userId, ['display_name' => 'New Name']);

        $this->assertTrue($updateResult['success']);

        $user = Auth::getUser($userId);
        $this->assertEquals('New Name', $user['display_name']);
    }

    public function testUpdateUserEmail(): void
    {
        $result = $this->registerAndTrack('emailupd_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        $email = 'new_' . uniqid() . '@email.com';
        $updateResult = Auth::updateUser($userId, ['email' => $email]);

        $this->assertTrue($updateResult['success']);

        $user = Auth::getUser($userId);
        $this->assertEquals($email, $user['email']);
    }

    public function testUpdateUserRole(): void
    {
        $result = $this->registerAndTrack('roleupd_' . uniqid(), 'password123', 'viewer');
        $userId = $result['user']['id'];

        $updateResult = Auth::updateUser($userId, ['role' => 'editor']);

        $this->assertTrue($updateResult['success']);

        $user = Auth::getUser($userId);
        $this->assertEquals('editor', $user['role']);
    }

    public function testUpdateUserPassword(): void
    {
        $result = $this->registerAndTrack('passupd_' . uniqid(), 'oldpassword');
        $userId = $result['user']['id'];

        $updateResult = Auth::updateUser($userId, ['password' => 'newpassword']);

        $this->assertTrue($updateResult['success']);

        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        $this->assertTrue(password_verify('newpassword', $user['password_hash']));
        $this->assertFalse(password_verify('oldpassword', $user['password_hash']));
    }

    public function testUpdateUserRejectsShortPassword(): void
    {
        $result = $this->registerAndTrack('shortpas_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        $updateResult = Auth::updateUser($userId, ['password' => '12345']);

        $this->assertFalse($updateResult['success']);
    }

    public function testUpdateUserRejectsInvalidEmail(): void
    {
        $result = $this->registerAndTrack('bademail_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        $updateResult = Auth::updateUser($userId, ['email' => 'not-valid']);

        $this->assertFalse($updateResult['success']);
    }

    public function testUpdateUserRejectsInvalidRole(): void
    {
        $result = $this->registerAndTrack('badrole_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        $updateResult = Auth::updateUser($userId, ['role' => 'superadmin']);

        $this->assertFalse($updateResult['success']);
    }

    public function testUpdateUserRejectsEmptyData(): void
    {
        $result = $this->registerAndTrack('emptyupd_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        $updateResult = Auth::updateUser($userId, []);

        $this->assertFalse($updateResult['success']);
    }

    public function testUpdateUserRejectsDuplicateEmail(): void
    {
        $email = 'taken_' . uniqid() . '@email.com';
        $this->registerAndTrack('emailown_' . uniqid(), 'password123', 'viewer', $email);
        $result = $this->registerAndTrack('emailstl_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        $updateResult = Auth::updateUser($userId, ['email' => $email]);

        $this->assertFalse($updateResult['success']);
    }

    public function testUpdateUserIsActive(): void
    {
        $result = $this->registerAndTrack('deact_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        Auth::updateUser($userId, ['is_active' => false]);

        $user = Auth::getUser($userId);
        $this->assertEquals(0, $user['is_active']);

        Auth::updateUser($userId, ['is_active' => true]);

        $user = Auth::getUser($userId);
        $this->assertEquals(1, $user['is_active']);
    }

    // =========================================================================
    // DELETE USER
    // =========================================================================

    public function testDeleteUser(): void
    {
        $result = $this->registerAndTrack('delme_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        $deleteResult = Auth::deleteUser($userId);

        $this->assertTrue($deleteResult['success']);
        $this->assertNull(Auth::getUser($userId));

        // Remove from tracking since already deleted
        $this->createdUserIds = array_filter($this->createdUserIds, fn($id) => $id !== $userId);
    }

    public function testDeleteNonExistentUser(): void
    {
        $result = Auth::deleteUser(99999);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('tidak ditemukan', $result['error']);
    }

    public function testDeleteLastAdminPrevented(): void
    {
        $db = Database::getConnection();

        // Create a fresh admin that will be the ONLY active admin
        $result = $this->registerAndTrack('soleadm_' . uniqid(), 'password123', 'admin');
        $soleAdminId = $result['user']['id'];

        // Deactivate all other admins
        $db->exec('UPDATE users SET is_active = 0 WHERE role = "admin" AND id != ' . (int)$soleAdminId);

        // Try to delete the sole active admin
        $deleteResult = Auth::deleteUser($soleAdminId);

        $this->assertFalse($deleteResult['success']);
        $this->assertStringContainsString('admin terakhir', $deleteResult['error']);

        // Restore other admins
        $db->exec('UPDATE users SET is_active = 1 WHERE role = "admin"');
    }

    public function testDeleteAdminAllowedWhenMultipleAdmins(): void
    {
        $result = $this->registerAndTrack('admin2_' . uniqid(), 'password123', 'admin');
        $admin2Id = $result['user']['id'];

        // Now there are 2+ admins, deleting one should work
        $deleteResult = Auth::deleteUser($admin2Id);

        $this->assertTrue($deleteResult['success']);

        // Remove from tracking since already deleted
        $this->createdUserIds = array_filter($this->createdUserIds, fn($id) => $id !== $admin2Id);
    }

    // =========================================================================
    // FOLDER PERMISSIONS
    // =========================================================================

    public function testSetAndGetFolderPermission(): void
    {
        $result = $this->registerAndTrack('permuser_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        Auth::setFolderPermission($userId, 'documents', true, true, false);

        $perms = Auth::getFolderPermissions($userId);

        $this->assertCount(1, $perms);
        $this->assertEquals('documents', $perms[0]['folder_path']);
        $this->assertEquals(1, $perms[0]['can_read']);
        $this->assertEquals(1, $perms[0]['can_write']);
        $this->assertEquals(0, $perms[0]['can_delete']);
    }

    public function testSetFolderPermissionOverwrites(): void
    {
        $result = $this->registerAndTrack('overwr_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        Auth::setFolderPermission($userId, 'docs', true, false, false);
        Auth::setFolderPermission($userId, 'docs', true, true, true);

        $perms = Auth::getFolderPermissions($userId);

        $this->assertCount(1, $perms);
        $this->assertEquals(1, $perms[0]['can_write']);
        $this->assertEquals(1, $perms[0]['can_delete']);
    }

    public function testMultipleFolderPermissions(): void
    {
        $result = $this->registerAndTrack('multip_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        Auth::setFolderPermission($userId, 'docs', true, true, false);
        Auth::setFolderPermission($userId, 'images', true, false, false);
        Auth::setFolderPermission($userId, 'private', false, false, false);

        $perms = Auth::getFolderPermissions($userId);

        $this->assertCount(3, $perms);
    }

    public function testDeleteFolderPermission(): void
    {
        $result = $this->registerAndTrack('delperm_' . uniqid(), 'password123');
        $userId = $result['user']['id'];

        Auth::setFolderPermission($userId, 'temp', true, true, true);

        $perms = Auth::getFolderPermissions($userId);
        $this->assertCount(1, $perms);

        Auth::deleteFolderPermission($perms[0]['id']);

        $perms = Auth::getFolderPermissions($userId);
        $this->assertCount(0, $perms);
    }

    // =========================================================================
    // CHECK (without session — should return false/null)
    // =========================================================================

    public function testCheckReturnsFalseWithoutSession(): void
    {
        $this->assertFalse(Auth::check());
    }

    public function testGetCurrentUserReturnsNullWithoutSession(): void
    {
        $this->assertNull(Auth::getCurrentUser());
    }
}

<?php
/**
 * Password Reset Tool
 * Usage: php bin/reset_password.php <username> <new_password>
 * 
 * Contoh: php bin/reset_password.php admin MyNewSecurePass123
 */
require_once __DIR__ . '/../autoload.php';

$username = $argv[1] ?? '';
$newPassword = $argv[2] ?? '';

if (empty($username) || empty($newPassword)) {
    echo "Usage: php bin/reset_password.php <username> <new_password>\n";
    echo "Example: php bin/reset_password.php admin NewSecurePass123\n";
    exit(1);
}

if (strlen($newPassword) < 8) {
    echo "Error: Password minimal 8 karakter.\n";
    exit(1);
}

$db = \App\Core\Database::getConnection();
$stmt = $db->prepare('SELECT id, username FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user) {
    echo "Error: User '{$username}' tidak ditemukan.\n";
    echo "\nUsers yang tersedia:\n";
    $all = $db->query('SELECT username, role FROM users')->fetchAll();
    foreach ($all as $u) {
        echo "  - {$u['username']} ({$u['role']})\n";
    }
    exit(1);
}

$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$update = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$update->execute([$newHash, $user['id']]);

echo "Password untuk user '{$username}' berhasil direset.\n";
echo "Gunakan password baru untuk login.\n";

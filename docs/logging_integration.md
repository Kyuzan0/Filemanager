# File Manager Logging Integration

## Overview

Sistem logging telah berhasil diintegrasikan ke dalam operasi kritis file manager. Integrasi ini mencakup pencatatan aktivitas untuk operasi delete, move, dan rename dengan detail lengkap.

## Implementation Details

### 1. Logger Initialization

File `lib/file_manager.php` telah dimodifikasi untuk:
- Include class Logger dari `lib/logger.php`
- Menambahkan fungsi `get_logger()` yang mengembalikan instance Logger singleton
- Menggunakan path log file default: `logs/activity.json`

```php
// Include Logger class
require_once __DIR__ . '/logger.php';

// Initialize global logger instance
function get_logger() {
    static $logger = null;
    if ($logger === null) {
        $logger = new Logger('logs/activity.json');
    }
    return $logger;
}
```

### 2. Delete Operation Logging

Fungsi `delete_paths()` telah dimodifikasi untuk:
- Mencatat setiap percobaan delete (attempt)
- Mencatat hasil delete (success/failed)
- Mencatat setiap item secara individual untuk batch operations
- Menyertakan informasi target type (file/folder)

```php
// Log delete attempt
$logger->log('delete', $sanitized, ['status' => 'attempt']);

// Log successful delete
$logger->log('delete', $sanitized, [
    'status' => 'success',
    'target_type' => $result['type']
]);

// Log failed delete
$logger->log('delete', $sanitized, [
    'status' => 'failed',
    'error' => $e->getMessage()
]);
```

### 3. Move Operation Logging

Fungsi `move_item()` telah dimodifikasi untuk:
- Mencatat percobaan move dengan old_path dan new_path
- Mencatat hasil move (success/failed)
- Menyertakan informasi target type dan error message jika gagal

```php
// Log move attempt
$logger->log('move', $sanitizedOldPath, [
    'status' => 'attempt',
    'target_type' => $targetType,
    'old_path' => $sanitizedOldPath,
    'new_path' => $sanitizedNewPath
]);

// Log successful move
$logger->log('move', $sanitizedNewPath, [
    'status' => 'success',
    'target_type' => $targetType,
    'old_path' => $sanitizedOldPath,
    'new_path' => $sanitizedNewPath
]);
```

### 4. Rename Operation Logging

Fungsi `rename_item()` telah dimodifikasi untuk:
- Mencatat percobaan rename dengan old_path dan new_path
- Mencatat hasil rename (success/failed)
- Menyertakan informasi target type dan error message jika gagal

```php
// Log rename attempt
$logger->log('rename', $sanitizedOldPath, [
    'status' => 'attempt',
    'target_type' => $targetType,
    'old_path' => $sanitizedOldPath,
    'new_path' => $sanitizedNewPath
]);

// Log successful rename
$logger->log('rename', $sanitizedNewPath, [
    'status' => 'success',
    'target_type' => $targetType,
    'old_path' => $sanitizedOldPath,
    'new_path' => $sanitizedNewPath
]);
```

## Log Entry Structure

Setiap entri log mengandung informasi berikut:

```json
{
    "timestamp": "2023-11-11T17:00:00.000+00:00",
    "session_id": "session_1234567890abcdef",
    "action": "delete|move|rename",
    "target_type": "file|folder",
    "target_path": "path/to/item",
    "target_name": "item_name",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "status": "attempt|success|failed",
    "old_path": "path/to/old_item", // untuk move/rename
    "new_path": "path/to/new_item", // untuk move/rename
    "error": "Error message" // jika status = failed
}
```

## Error Handling

Implementasi logging dirancang untuk:
- Tidak mengganggu operasi utama jika logging gagal
- Menggunakan try-catch untuk menangani error logging
- Operasi file manager tetap berjalan meskipun logging gagal
- Error logging dicatat ke error_log PHP

## Performance Considerations

- Logger menggunakan singleton pattern untuk menghindari multiple instance
- File locking digunakan untuk mencegah race condition
- Log rotation otomatis saat file mencapai ukuran maksimal (default 10MB)
- Logging dilakukan secara asynchronous dengan file locking

## Testing

File test `tests/file_manager_logging_test.php` telah dibuat untuk menguji:
- Delete operation logging
- Move operation logging
- Rename operation logging
- Batch delete operation logging
- Error handling logging
- Log file integrity

## Usage Examples

### Mengambil Log untuk Operasi Tertentu

```php
$logger = get_logger();

// Ambil semua log delete
$deleteLogs = $logger->getLogs(100, 0, ['action' => 'delete']);

// Ambil log dengan status failed
$failedLogs = $logger->getLogs(100, 0, ['status' => 'failed']);

// Ambil log untuk session tertentu
$sessionLogs = $logger->getLogs(100, 0, ['session_id' => 'session_123']);
```

### Cleanup Log Lama

```php
$logger = get_logger();
// Hapus log lebih dari 30 hari
$logger->cleanup(30);
```

## Security Considerations

- Path validation dilakukan sebelum logging
- Session ID digenerated secara unik untuk setiap instance
- IP address dan user agent dicatat untuk audit trail
- Log file disimpan di luar web root directory (sebaiknya)

## Future Enhancements

- Integrasi dengan database logging untuk skala besar
- Real-time log monitoring dengan WebSocket
- Log filtering berdasarkan user authentication
- Log export ke format lain (CSV, XML)
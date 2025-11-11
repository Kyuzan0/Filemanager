# Sistem Logging JSON untuk File Manager

## Overview

Sistem logging ini dirancang untuk mencatat aktivitas file manager dengan penyimpanan berbasis JSON. Sistem ini menyediakan fitur lengkap termasuk rotasi log, pembersihan otomatis, dan filtering data.

## Struktur File

```
lib/logger.php              - Class Logger utama
examples/logger_usage.php   - Contoh penggunaan
docs/logger_documentation.md - Dokumentasi ini
logs/activity.json          - File log utama (dibuat otomatis)
logs/activity_*.json        - File log backup (dibuat saat rotasi)
```

## Instalasi

1. Pastikan direktori `lib/` ada dan dapat ditulis
2. Include file `lib/logger.php` dalam proyek Anda
3. Pastikan direktori `logs/` dapat ditulis oleh web server

## Penggunaan Dasar

### Inisialisasi Logger

```php
require_once 'lib/logger.php';

// Gunakan konfigurasi default
$logger = new Logger();

// Atau dengan konfigurasi kustom
$logger = new Logger('logs/custom_activity.json', [
    'max_file_size' => 10 * 1024 * 1024, // 10MB
    'lock_timeout' => 5 // 5 detik
]);
```

### Mencatat Log

```php
// Log aksi sederhana
$logger->log('delete', '/path/to/file.pdf');

// Log dengan detail tambahan
$logger->log('upload', '/uploads/image.jpg', [
    'file_size' => 1024000,
    'mime_type' => 'image/jpeg'
]);

// Log untuk operasi move/rename
$logger->log('move', '/new/path/file.pdf', [
    'old_path' => '/old/path/file.pdf',
    'new_path' => '/new/path/file.pdf'
]);
```

## Struktur Data Log

Setiap entri log memiliki struktur berikut:

```json
{
  "timestamp": "2025-01-11T16:47:53.872Z",
  "session_id": "session_6789abcdef12345",
  "action": "delete|move|rename|create|upload|download|read",
  "target_type": "file|folder",
  "target_path": "/path/to/item",
  "target_name": "item_name.ext",
  "old_path": "/old/path",        // Opsional, untuk move/rename
  "new_path": "/new/path",        // Opsional, untuk move/rename
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "file_size": 1024000,           // Opsional, data tambahan
  "mime_type": "application/pdf"  // Opsional, data tambahan
}
```

## Method Reference

### `__construct($logFilePath, $config)`

Constructor untuk menginisialisasi logger.

**Parameters:**
- `$logFilePath` (string): Path file log (default: `logs/activity.json`)
- `$config` (array): Konfigurasi tambahan
  - `max_file_size` (int): Ukuran maksimum file sebelum rotasi (default: 10MB)
  - `lock_timeout` (int): Timeout untuk file locking (default: 5 detik)

### `log($action, $targetPath, $details = [])`

Mencatat aktivitas ke log.

**Parameters:**
- `$action` (string): Tipe aksi (`create`, `delete`, `move`, `rename`, `copy`, `upload`, `download`, `read`)
- `$targetPath` (string): Path target file/folder
- `$details` (array): Detail tambahan (opsional)

**Returns:** `bool` - Status keberhasilan

### `getLogs($limit = 100, $offset = 0, $filters = [])`

Membaca log dengan pagination dan filtering.

**Parameters:**
- `$limit` (int): Jumlah maksimum entri (default: 100)
- `$offset` (int): Offset untuk pagination (default: 0)
- `$filters` (array): Filter yang diterapkan (opsional)

**Returns:** `array` - Array entri log

**Contoh Filter:**
```php
// Filter by action
$logs = $logger->getLogs(50, 0, ['action' => 'delete']);

// Filter by multiple values
$logs = $logger->getLogs(50, 0, [
    'action' => ['create', 'upload'],
    'target_type' => 'file'
]);
```

### `cleanup($days)`

Menghapus log yang lebih lama dari jumlah hari tertentu.

**Parameters:**
- `$days` (int): Jumlah hari log yang disimpan

**Returns:** `bool` - Status keberhasilan

### `rotateLogs()`

Melakukan rotasi file log secara manual.

**Returns:** `bool` - Status keberhasilan

## Fitur Keamanan

### Thread-Safe Logging

Sistem menggunakan file locking (`flock`) untuk memastikan logging aman dalam lingkungan multi-thread:

```php
// File locking otomatis diterapkan saat menulis
$logger->log('delete', '/path/to/file');
```

### Input Validation

Semua input divalidasi dan disanitasi:

- Action types divalidasi terhadap daftar aksi yang diizinkan
- Path data divalidasi untuk mencegah injection
- JSON data divalidasi sebelum penyimpanan

### Error Handling

Sistem memiliki error handling komprehensif:

```php
try {
    $logger->log('delete', '/path/to/file');
} catch (Exception $e) {
    error_log("Logging failed: " . $e->getMessage());
}
```

## Konfigurasi

### Auto-Rotation

File log otomatis di-rotasi ketika mencapai ukuran maksimum:

- Default: 10MB
- Backup file diberi timestamp: `activity_2025-01-11_16-47-53.json`
- File log baru dibuat otomatis

### Performance Considerations

1. **File Locking**: Menggunakan exclusive lock untuk mencegah race conditions
2. **Memory Efficient**: Membaca file log secara incremental
3. **JSON Optimization**: Menggunakan `JSON_PRETTY_PRINT` untuk readability dan `JSON_UNESCAPED_SLASHES` untuk efisiensi

## Contoh Implementasi Lengkap

```php
<?php
require_once 'lib/logger.php';

// Inisialisasi logger
$logger = new Logger();

// Log berbagai operasi file manager
function logFileOperation($logger, $action, $oldPath = null, $newPath = null, $details = []) {
    $targetPath = $newPath ?: $oldPath;
    
    $logData = $details;
    
    if ($oldPath && $newPath) {
        $logData['old_path'] = $oldPath;
        $logData['new_path'] = $newPath;
    }
    
    return $logger->log($action, $targetPath, $logData);
}

// Contoh penggunaan
logFileOperation($logger, 'create', null, '/uploads/new_folder');
logFileOperation($logger, 'upload', null, '/uploads/document.pdf', [
    'file_size' => filesize('/uploads/document.pdf'),
    'mime_type' => 'application/pdf'
]);
logFileOperation($logger, 'move', '/uploads/document.pdf', '/documents/official/document.pdf');

// Baca log terbaru
$recentLogs = $logger->getLogs(10);
foreach ($recentLogs as $log) {
    echo "{$log['timestamp']} - {$log['action']}: {$log['target_path']}\n";
}

// Cleanup log lama (30 hari)
$logger->cleanup(30);
```

## Troubleshooting

### Permission Issues

Pastikan direktori `logs/` dapat ditulis:

```bash
chmod 755 logs/
chmod 644 logs/activity.json
```

### Large Log Files

Jika file log terlalu besar:

1. Kurangi `max_file_size` dalam konfigurasi
2. Jalankan `cleanup()` lebih sering
3. Gunakan `rotateLogs()` secara manual

### Performance Issues

Untuk high-volume logging:

1. Pertimbangkan untuk menggunakan `cleanup()` dengan interval yang lebih sering
2. Monitor ukuran file log
3. Gunakan filtering yang efisien saat membaca log

## Integrasi dengan File Manager

Untuk mengintegrasikan dengan file manager yang ada:

```php
// Di dalam operasi file manager
class FileManager {
    private $logger;
    
    public function __construct() {
        $this->logger = new Logger();
    }
    
    public function deleteFile($path) {
        // Log sebelum operasi
        $this->logger->log('delete', $path);
        
        // Lakukan operasi delete
        return unlink($path);
    }
    
    public function moveFile($oldPath, $newPath) {
        // Log operasi move
        $this->logger->log('move', $newPath, [
            'old_path' => $oldPath,
            'new_path' => $newPath
        ]);
        
        // Lakukan operasi move
        return rename($oldPath, $newPath);
    }
}
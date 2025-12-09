# System Requirements

**File Manager — System Requirements Documentation**

---

## 📋 Table of Contents

- [Server Requirements](#-server-requirements)
- [PHP Requirements](#-php-requirements)
- [Browser Requirements](#-browser-requirements)
- [Optional Dependencies](#-optional-dependencies)
- [Recommended Configuration](#-recommended-configuration)

---

## 🖥️ Server Requirements

### Operating System

| OS | Support | Notes |
|-----|---------|-------|
| **Windows** | ✅ Full | Windows 10/11, Windows Server 2016+ |
| **Linux** | ✅ Full | Ubuntu 18.04+, CentOS 7+, Debian 9+ |
| **macOS** | ✅ Full | macOS 10.15+ (Catalina) |

### Web Server

| Server | Minimum Version | Recommended |
|--------|-----------------|-------------|
| **Apache** | 2.4+ | 2.4.41+ |
| **Nginx** | 1.14+ | 1.18+ |
| **PHP Built-in** | 7.4+ | Development only |
| **Laragon** | 5.0+ | Windows development |
| **XAMPP** | 7.4+ | Cross-platform development |

---

## 🐘 PHP Requirements

### PHP Version

| Version | Support | Status |
|---------|---------|--------|
| **PHP 7.4** | ✅ Minimum | Supported |
| **PHP 8.0** | ✅ Full | Recommended |
| **PHP 8.1** | ✅ Full | Recommended |
| **PHP 8.2** | ✅ Full | Latest tested |
| **PHP 8.3** | ✅ Full | Compatible |

### Required PHP Extensions

| Extension | Purpose | Check Command |
|-----------|---------|---------------|
| **zip** | ZIP archive operations | `php -m \| grep zip` |
| **json** | API JSON handling | `php -m \| grep json` |
| **fileinfo** | MIME type detection | `php -m \| grep fileinfo` |
| **mbstring** | String encoding | `php -m \| grep mbstring` |

### Optional PHP Extensions

| Extension | Purpose | Required For |
|-----------|---------|--------------|
| **gd** | Image manipulation | Thumbnail generation (future) |
| **intl** | Internationalization | Multi-language support (future) |

### Verify PHP Extensions

```bash
# Check all required extensions at once
php -m | grep -E "(zip|json|fileinfo|mbstring)"

# Or check individually
php -r "echo extension_loaded('zip') ? 'ZIP: OK' : 'ZIP: MISSING';"
php -r "echo extension_loaded('json') ? 'JSON: OK' : 'JSON: MISSING';"
php -r "echo extension_loaded('fileinfo') ? 'FILEINFO: OK' : 'FILEINFO: MISSING';"
php -r "echo extension_loaded('mbstring') ? 'MBSTRING: OK' : 'MBSTRING: MISSING';"
```

---

## 🌐 Browser Requirements

### Supported Browsers

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| **Chrome** | 80+ | Full support |
| **Firefox** | 75+ | Full support |
| **Safari** | 13+ | Full support |
| **Edge** | 80+ | Full support |
| **Opera** | 67+ | Full support |

### Required Browser Features

- **ES6+ JavaScript** - Class, Arrow functions, Promises, async/await
- **Fetch API** - HTTP requests
- **CSS Variables** - Custom properties
- **CSS Grid/Flexbox** - Layout
- **LocalStorage** - State persistence
- **File API** - File uploads
- **Drag & Drop API** - File movement

### Not Supported

- ❌ Internet Explorer (all versions)
- ❌ Older mobile browsers without ES6 support

---

## 🔧 Optional Dependencies

### 7-Zip (for multi-format archive extraction)

7-Zip is **optional** but required for extracting non-ZIP archives (.7z, .rar, .tar.gz, etc.)

#### Windows Installation

1. **Download** from: https://www.7-zip.org/download.html
2. **Install** to default location: `C:\Program Files\7-Zip`
3. **Verify** installation:
   ```cmd
   "C:\Program Files\7-Zip\7z.exe" --help
   ```

#### Linux Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install p7zip-full

# CentOS/RHEL/Fedora
sudo dnf install p7zip p7zip-plugins
# or
sudo yum install p7zip p7zip-plugins

# Arch Linux
sudo pacman -S p7zip

# Verify installation
7z --help
```

#### macOS Installation

```bash
# Using Homebrew
brew install p7zip

# Verify installation
7z --help
```

### Supported Archive Formats

| Format | Without 7-Zip | With 7-Zip |
|--------|---------------|------------|
| **.zip** | ✅ Native PHP | ✅ |
| **.7z** | ❌ | ✅ |
| **.rar** | ❌ | ✅ |
| **.tar** | ❌ | ✅ |
| **.tar.gz / .tgz** | ❌ | ✅ |
| **.gz** | ❌ | ✅ |
| **.bz2** | ❌ | ✅ |

---

## ⚙️ Recommended Configuration

### PHP Configuration (php.ini)

```ini
; File Upload Settings
upload_max_filesize = 100M
post_max_size = 105M
max_file_uploads = 50

; Execution Settings
max_execution_time = 300
max_input_time = 300
memory_limit = 256M

; Security Settings
expose_php = Off
display_errors = Off
log_errors = On

; Session Settings
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
```

### Directory Permissions

```bash
# Linux/macOS
chmod 755 file/          # User file storage
chmod 755 logs/          # Activity logs
chmod 755 .trash/        # Trash storage
chmod 644 api.php        # API endpoint
chmod 644 index.php      # Main page

# Windows (no chmod needed, but ensure write access)
# Right-click folder > Properties > Security > Edit
```

### Apache Configuration (.htaccess)

```apache
# Prevent directory listing
Options -Indexes

# Protect sensitive files
<FilesMatch "^\.">
    Require all denied
</FilesMatch>

# PHP settings
php_value upload_max_filesize 100M
php_value post_max_size 105M
php_value max_execution_time 300
```

### Nginx Configuration

```nginx
# In server block
location ~ /\. {
    deny all;
}

location /file {
    # Allow file access
    try_files $uri $uri/ =404;
}

location /logs {
    deny all;
}

location /.trash {
    deny all;
}

# PHP settings
client_max_body_size 100M;
fastcgi_read_timeout 300;
```

---

## 🔍 Verification Script

Create a file `check-requirements.php` to verify your setup:

```php
<?php
header('Content-Type: text/plain');

echo "=== File Manager Requirements Check ===\n\n";

// PHP Version
echo "PHP Version: " . PHP_VERSION . "\n";
echo "  Status: " . (version_compare(PHP_VERSION, '7.4.0', '>=') ? '✅ OK' : '❌ Requires PHP 7.4+') . "\n\n";

// Required Extensions
$required = ['zip', 'json', 'fileinfo', 'mbstring'];
echo "Required Extensions:\n";
foreach ($required as $ext) {
    $loaded = extension_loaded($ext);
    echo "  $ext: " . ($loaded ? '✅ Loaded' : '❌ Missing') . "\n";
}
echo "\n";

// Optional: 7-Zip
echo "7-Zip (Optional):\n";
$sevenZip = shell_exec('7z 2>&1');
if ($sevenZip && strpos($sevenZip, '7-Zip') !== false) {
    echo "  Status: ✅ Available\n";
} else {
    // Check Windows paths
    $winPath = 'C:\\Program Files\\7-Zip\\7z.exe';
    if (file_exists($winPath)) {
        echo "  Status: ✅ Available (Windows)\n";
    } else {
        echo "  Status: ⚠️ Not found (optional - only needed for .7z, .rar extraction)\n";
    }
}
echo "\n";

// Directory Permissions
echo "Directory Permissions:\n";
$dirs = ['file', 'logs', '.trash'];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        echo "  $dir/: ⚠️ Missing (will be created automatically)\n";
    } else {
        $writable = is_writable($dir);
        echo "  $dir/: " . ($writable ? '✅ Writable' : '❌ Not Writable') . "\n";
    }
}

echo "\n=== Check Complete ===\n";
?>
```

---

## 📌 Quick Start Checklist

- [ ] PHP 7.4+ installed
- [ ] Required PHP extensions enabled (zip, json, fileinfo, mbstring)
- [ ] Web server configured (Apache/Nginx/Laragon)
- [ ] Directory permissions set correctly
- [ ] Optional: 7-Zip installed for multi-format archive support

---

**Last Updated:** December 9, 2025


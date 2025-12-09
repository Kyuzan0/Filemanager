<?php
/**
 * 7-Zip Binary Setup Script
 * 
 * This script helps set up bundled 7-Zip binaries for the File Manager.
 * Run this script from the command line to download and configure 7-Zip.
 * 
 * Usage:
 *   php bin/setup-7zip.php
 * 
 * Or access via web browser (development only):
 *   http://localhost/Filemanager/bin/setup-7zip.php
 */

// Security check - only allow CLI or localhost access
$isCli = php_sapi_name() === 'cli';
$isLocalhost = isset($_SERVER['REMOTE_ADDR']) && in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);

if (!$isCli && !$isLocalhost) {
    http_response_code(403);
    die('Access denied. This script can only be run from CLI or localhost.');
}

// Set content type for web access
if (!$isCli) {
    header('Content-Type: text/plain; charset=utf-8');
}

// Configuration
$binDir = __DIR__;
$windowsDir = $binDir . DIRECTORY_SEPARATOR . 'windows';
$linuxDir = $binDir . DIRECTORY_SEPARATOR . 'linux';

// Detect OS
function detectOs(): string
{
    $os = strtoupper(PHP_OS);

    if (substr($os, 0, 3) === 'WIN') {
        return 'windows';
    }

    if ($os === 'LINUX') {
        return 'linux';
    }

    if ($os === 'DARWIN') {
        return 'macos';
    }

    return 'unknown';
}

// Print message
function msg(string $message, bool $newline = true): void
{
    echo $message . ($newline ? "\n" : '');
    if (php_sapi_name() !== 'cli') {
        ob_flush();
        flush();
    }
}

// Check if 7-Zip is already available
function check7zipStatus(): array
{
    require_once dirname(__DIR__) . '/lib/archive_manager.php';
    return get_7zip_info();
}

// Download file using cURL
function downloadFile(string $url, string $destination): bool
{
    msg("Downloading from: $url");
    msg("Saving to: $destination");

    // Check if cURL is available
    if (!function_exists('curl_init')) {
        msg("ERROR: cURL extension is not available.");
        return false;
    }

    $fp = fopen($destination, 'w+');
    if ($fp === false) {
        msg("ERROR: Cannot create file: $destination");
        return false;
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 300);
    curl_setopt($ch, CURLOPT_USERAGENT, 'FileManager/3.0');

    // Progress callback
    curl_setopt($ch, CURLOPT_NOPROGRESS, false);
    curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, function ($resource, $downloadSize, $downloaded, $uploadSize, $uploaded) {
        if ($downloadSize > 0) {
            $percent = round(($downloaded / $downloadSize) * 100, 1);
            msg("\rProgress: $percent% (" . formatBytes($downloaded) . " / " . formatBytes($downloadSize) . ")       ", false);
        }
        return 0;
    });

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);

    curl_close($ch);
    fclose($fp);

    msg(""); // New line after progress

    if (!$result || $httpCode !== 200) {
        msg("ERROR: Download failed. HTTP Code: $httpCode, Error: $error");
        @unlink($destination);
        return false;
    }

    msg("Download complete!");
    return true;
}

// Format bytes
function formatBytes(int $bytes): string
{
    if ($bytes >= 1048576) {
        return round($bytes / 1048576, 2) . ' MB';
    }
    if ($bytes >= 1024) {
        return round($bytes / 1024, 2) . ' KB';
    }
    return $bytes . ' B';
}

// Extract ZIP file
function extractZip(string $zipFile, string $destination): bool
{
    if (!class_exists('ZipArchive')) {
        msg("ERROR: ZipArchive class is not available.");
        return false;
    }

    $zip = new ZipArchive();
    if ($zip->open($zipFile) !== true) {
        msg("ERROR: Cannot open ZIP file: $zipFile");
        return false;
    }

    $result = $zip->extractTo($destination);
    $zip->close();

    if (!$result) {
        msg("ERROR: Failed to extract ZIP file.");
        return false;
    }

    msg("Extraction complete!");
    return true;
}

// Setup for Windows
function setupWindows(string $windowsDir): bool
{
    msg("\n=== Setting up 7-Zip for Windows ===\n");

    // Create directory if not exists
    if (!is_dir($windowsDir)) {
        mkdir($windowsDir, 0755, true);
    }

    $sevenZipExe = $windowsDir . DIRECTORY_SEPARATOR . '7z.exe';
    $sevenZipDll = $windowsDir . DIRECTORY_SEPARATOR . '7z.dll';

    // Check if already exists
    if (file_exists($sevenZipExe) && file_exists($sevenZipDll)) {
        msg("7-Zip binaries already exist in $windowsDir");
        msg("Testing...");

        $output = shell_exec('"' . $sevenZipExe . '" 2>&1');
        if ($output !== null && strpos($output, '7-Zip') !== false) {
            msg("7-Zip is working correctly!");
            return true;
        }
    }

    msg("7-Zip binaries not found or not working.");
    msg("\n--- Manual Setup Instructions ---\n");
    msg("1. Download 7-Zip Extra (standalone console version) from:");
    msg("   https://www.7-zip.org/download.html");
    msg("   Look for '7-Zip Extra: standalone console version'");
    msg("");
    msg("2. Extract the downloaded archive");
    msg("");
    msg("3. Copy these files to: $windowsDir");
    msg("   - 7za.exe (rename to 7z.exe)");
    msg("   OR");
    msg("   - 7z.exe and 7z.dll from a full 7-Zip installation");
    msg("");
    msg("Alternative: Copy from installed 7-Zip:");
    msg("   copy \"C:\\Program Files\\7-Zip\\7z.exe\" \"$windowsDir\"");
    msg("   copy \"C:\\Program Files\\7-Zip\\7z.dll\" \"$windowsDir\"");
    msg("");

    // Try to copy from system installation
    $systemPaths = [
        'C:\\Program Files\\7-Zip',
        'C:\\Program Files (x86)\\7-Zip',
    ];

    foreach ($systemPaths as $sysPath) {
        $sysExe = $sysPath . '\\7z.exe';
        $sysDll = $sysPath . '\\7z.dll';

        if (file_exists($sysExe) && file_exists($sysDll)) {
            msg("Found 7-Zip installation at: $sysPath");
            msg("Attempting to copy...");

            if (copy($sysExe, $sevenZipExe) && copy($sysDll, $sevenZipDll)) {
                msg("Successfully copied 7-Zip binaries!");

                // Test
                $output = shell_exec('"' . $sevenZipExe . '" 2>&1');
                if ($output !== null && strpos($output, '7-Zip') !== false) {
                    msg("7-Zip is working correctly!");
                    return true;
                }
            } else {
                msg("Failed to copy files. Please copy manually.");
            }
            break;
        }
    }

    return false;
}

// Setup for Linux
function setupLinux(string $linuxDir): bool
{
    msg("\n=== Setting up p7zip for Linux ===\n");

    // Create directory if not exists
    if (!is_dir($linuxDir)) {
        mkdir($linuxDir, 0755, true);
    }

    $sevenZa = $linuxDir . DIRECTORY_SEPARATOR . '7za';

    // Check if already exists
    if (file_exists($sevenZa)) {
        msg("p7zip binary already exists in $linuxDir");
        msg("Testing...");

        // Make executable
        chmod($sevenZa, 0755);

        $output = shell_exec(escapeshellarg($sevenZa) . ' 2>&1');
        if ($output !== null && strpos($output, '7-Zip') !== false) {
            msg("p7zip is working correctly!");
            return true;
        }
    }

    msg("p7zip binary not found or not working.");
    msg("\n--- Setup Instructions ---\n");

    // Check if p7zip is installed system-wide
    $systemBin = null;
    foreach (['/usr/bin/7za', '/usr/bin/7z', '/usr/local/bin/7za'] as $path) {
        if (file_exists($path) && is_executable($path)) {
            $systemBin = $path;
            break;
        }
    }

    if ($systemBin !== null) {
        msg("Found system p7zip at: $systemBin");
        msg("Attempting to copy...");

        if (copy($systemBin, $sevenZa)) {
            chmod($sevenZa, 0755);
            msg("Successfully copied p7zip binary!");

            // Test
            $output = shell_exec(escapeshellarg($sevenZa) . ' 2>&1');
            if ($output !== null && strpos($output, '7-Zip') !== false) {
                msg("p7zip is working correctly!");
                return true;
            }
        } else {
            msg("Failed to copy. Please run manually:");
            msg("  sudo cp $systemBin $sevenZa");
            msg("  sudo chmod 755 $sevenZa");
        }
    } else {
        msg("p7zip is not installed on this system.");
        msg("\nTo install p7zip:");
        msg("");
        msg("Ubuntu/Debian:");
        msg("  sudo apt update");
        msg("  sudo apt install p7zip-full");
        msg("");
        msg("CentOS/RHEL/Fedora:");
        msg("  sudo dnf install p7zip p7zip-plugins");
        msg("");
        msg("Arch Linux:");
        msg("  sudo pacman -S p7zip");
        msg("");
        msg("After installation, run this script again or copy manually:");
        msg("  cp /usr/bin/7za $sevenZa");
        msg("  chmod 755 $sevenZa");
    }

    return false;
}

// Main execution
msg("========================================");
msg("  7-Zip Binary Setup for File Manager  ");
msg("========================================\n");

$os = detectOs();
msg("Detected OS: $os");
msg("Binary directory: $binDir\n");

// Check current status
msg("Checking current 7-Zip status...");
$status = check7zipStatus();

msg("Available: " . ($status['available'] ? 'Yes' : 'No'));
if ($status['available']) {
    msg("Path: " . $status['path']);
    msg("Version: " . ($status['version'] ?? 'Unknown'));
    msg("Using bundled: " . ($status['isBundled'] ? 'Yes' : 'No'));
}

msg("");

// Run setup based on OS
$success = false;

switch ($os) {
    case 'windows':
        $success = setupWindows($windowsDir);
        break;

    case 'linux':
        $success = setupLinux($linuxDir);
        break;

    case 'macos':
        msg("\n=== macOS Setup ===\n");
        msg("For macOS, you can use the Linux binary directory.");
        msg("\nInstall p7zip via Homebrew:");
        msg("  brew install p7zip");
        msg("");
        msg("Then copy the binary:");
        msg("  cp /opt/homebrew/bin/7za $linuxDir/7za");
        msg("  chmod 755 $linuxDir/7za");
        break;

    default:
        msg("\nUnknown operating system. Please set up 7-Zip manually.");
}

msg("\n========================================");

if ($success) {
    msg("Setup completed successfully!");

    // Re-check status
    $newStatus = check7zipStatus();
    msg("\nNew Status:");
    msg("  Available: " . ($newStatus['available'] ? 'Yes' : 'No'));
    msg("  Path: " . ($newStatus['path'] ?? 'N/A'));
    msg("  Version: " . ($newStatus['version'] ?? 'Unknown'));
    msg("  Using bundled: " . ($newStatus['isBundled'] ? 'Yes' : 'No'));
} else {
    msg("Setup incomplete. Please follow the manual instructions above.");
}

msg("\n========================================\n");

// Show API endpoint hint
msg("You can check 7-Zip status via API:");
msg("  GET /api.php?action=7zip-status");
msg("");

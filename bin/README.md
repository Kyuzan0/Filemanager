# Bundled 7-Zip Binaries

This directory contains portable 7-Zip binaries for cross-platform archive extraction.

## Directory Structure

```
bin/
├── windows/
│   ├── 7z.exe          # 7-Zip command line executable
│   └── 7z.dll          # 7-Zip library (required by 7z.exe)
├── linux/
│   └── 7za             # p7zip standalone executable
└── README.md           # This file
```

## Windows Setup

1. Download 7-Zip from: https://www.7-zip.org/download.html
2. Install 7-Zip or download the standalone console version
3. Copy the following files to `bin/windows/`:
   - `7z.exe` (from `C:\Program Files\7-Zip\` or standalone download)
   - `7z.dll` (from same location, required for 7z.exe to work)

**Alternative: Download standalone executable**
- Download "7-Zip Extra: standalone console version" from https://www.7-zip.org/download.html
- Extract and copy `7za.exe` to `bin/windows/7z.exe`

## Linux (Ubuntu/Debian) Setup

### Option 1: Copy from installed p7zip

```bash
# Install p7zip-full if not installed
sudo apt update
sudo apt install p7zip-full

# Copy the standalone binary
cp /usr/bin/7za bin/linux/7za

# Make it executable
chmod +x bin/linux/7za
```

### Option 2: Build static binary

```bash
# Install build dependencies
sudo apt install build-essential

# Download p7zip source
wget https://github.com/p7zip-project/p7zip/archive/refs/tags/v17.05.tar.gz
tar -xzf v17.05.tar.gz
cd p7zip-17.05

# Build standalone 7za
make 7za

# Copy to bin directory
cp bin/7za /path/to/Filemanager/bin/linux/7za
chmod +x /path/to/Filemanager/bin/linux/7za
```

### Option 3: Download pre-built binary

For Ubuntu 20.04+ (x64):
```bash
# Download pre-built p7zip
wget https://github.com/p7zip-project/p7zip/releases/download/v17.05/p7zip_17.05_linux_x64.tar.gz
tar -xzf p7zip_17.05_linux_x64.tar.gz
cp p7zip_17.05/bin/7za bin/linux/7za
chmod +x bin/linux/7za
```

## Verification

### Windows
```cmd
bin\windows\7z.exe --help
```

### Linux
```bash
./bin/linux/7za --help
```

## Supported Archive Formats

With bundled 7-Zip binaries, the following formats are supported:

| Format | Extension | Compression | Extraction |
|--------|-----------|-------------|------------|
| ZIP    | .zip      | ✅          | ✅         |
| 7z     | .7z       | ✅          | ✅         |
| RAR    | .rar      | ❌          | ✅         |
| TAR    | .tar      | ✅          | ✅         |
| GZIP   | .gz, .tgz | ✅          | ✅         |
| BZIP2  | .bz2      | ✅          | ✅         |
| XZ     | .xz       | ✅          | ✅         |

## Security Notes

1. The bundled binaries are only used when system-installed 7-Zip is not found
2. All archive operations are sandboxed within the `file/` directory
3. Path traversal attacks are prevented by the PHP security layer
4. Archive contents are validated before extraction

## License

7-Zip is licensed under GNU LGPL. See https://www.7-zip.org/license.txt

---

**Last Updated:** December 9, 2025

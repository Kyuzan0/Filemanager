# Deployment Guide — File Manager

## Server Requirements

| Komponen | Minimum | Recommended |
|----------|---------|-------------|
| PHP | 7.4 | 8.1+ |
| SQLite extension | yes | yes (bawaan PHP) |
| GD extension | yes | yes (thumbnail) |
| Zip extension | optional | yes (archive) |
| web server | Apache / Nginx | Nginx + PHP-FPM |
| disk space | 100MB | tergantung file storage |

### PHP Extensions

```bash
php -m | grep -i -E 'pdo_sqlite|gd|zip|json|mbstring|session'
```

Harus menampilkan: `PDO_SQLITE`, `gd`, `zip`, `json`, `mbstring`, `session`.

---

## Cara Deploy

### Opsi 1: Apache (Shared Hosting / VPS)

**Step 1 — Copy files ke server**

```bash
scp -r public_html/filemanager/ user@server:/var/www/html/filemanager/
```

**Step 2 — Setup permissions**

```bash
cd /var/www/html/filemanager
mkdir -p storage/{files,trash,logs,temp,thumbnails,database}
chmod -R 775 storage/
chown -R www-data:www-data storage/
```

**Step 3 — Pastikan mod_rewrite aktif**

```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

**Step 4 — Akses aplikasi**

```
http://yourdomain.com/filemanager/public/
```

---

### Opsi 2: Nginx + PHP-FPM (VPS / Cloud)

**Step 1 — Nginx config**

```nginx
server {
    listen 80;
    server_name filemanager.example.com;
    root /var/www/html/filemanager/public;
    index index.php;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Block access to storage directory
    location ~ ^/storage/ {
        deny all;
        return 403;
    }

    # Block access to sensitive files
    location ~ /\.(ht|git|env) {
        deny all;
    }

    # Block access to non-public files
    location ~ ^/(app|bin|tests|vendor|node_modules|docs)/ {
        deny all;
    }

    # Static assets caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # PHP handler
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
        client_max_body_size 105M;
    }

    # Clean URLs
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

**Step 2 — Restart Nginx**

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

### Opsi 3: Docker

**Dockerfile:**

```dockerfile
FROM php:8.1-apache

# Install extensions
RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg-dev libfreetype6-dev \
    libzip-dev zip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_sqlite gd zip \
    && rm -rf /var/lib/apt/lists/*

# Enable mod_rewrite
RUN a2enmod rewrite

# Upload limits
RUN echo "php_value upload_max_filesize 100M" >> /etc/apache2/conf-available/upload.conf \
    && echo "php_value post_max_size 105M" >> /etc/apache2/conf-available/upload.conf \
    && echo "php_value max_execution_time 300" >> /etc/apache2/conf-available/upload.conf \
    && echo "php_value memory_limit 256M" >> /etc/apache2/conf-available/upload.conf \
    && a2enconf upload

# Copy application
COPY . /var/www/html/

# Setup permissions
RUN mkdir -p storage/{files,trash,logs,temp,thumbnails,database} \
    && chmod -R 775 storage/ \
    && chown -R www-data:www-data storage/

EXPOSE 80
```

**Build & Run:**

```bash
docker build -t filemanager .
docker run -d -p 8080:80 -v filemanager-data:/var/www/html/storage filemanager
```

Akses: `http://localhost:8080`

---

## Post-Deploy Checklist

### 1. Buat Akun Admin

Buka halaman setup:
```
http://yourdomain.com/filemanager/public/setup.php
```

Buat akun admin baru dengan password yang kuat (minimal 8 karakter).

> **PENTING:** Hapus atau rename `setup.php` setelah admin pertama dibuat!

### 2. Pastikan storage writable

```bash
ls -la storage/
# Semua subfolder harus writable oleh web server
```

### 3. Test fitur utama

- [ ] Login / logout
- [ ] Browse files
- [ ] Upload file
- [ ] Download file
- [ ] Buat folder
- [ ] Rename / move / copy
- [ ] Delete (trash)
- [ ] Restore dari trash
- [ ] Edit text file
- [ ] Search
- [ ] Share link
- [ ] Activity log

### 4. Security hardening

```apache
# .htaccess di root project (BUKAN public/)
# Untuk mencegah akses langsung ke file sensitif

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^storage/ - [F,L]
    RewriteRule ^app/ - [F,L]
    RewriteRule ^bin/ - [F,L]
    RewriteRule ^tests/ - [F,L]
    RewriteRule ^vendor/ - [F,L]
    RewriteRule ^node_modules/ - [F,L]
    RewriteRule ^\.git - [F,L]
    RewriteRule ^\.env - [F,L]
    RewriteRule ^composer\.(json|lock) - [F,L]
    RewriteRule ^package\.json - [F,L]
    RewriteRule ^package-lock\.json - [F,L]
    RewriteRule ^\.gitignore - [F,L]
</IfModule>
```

---

## Environment Variables (Optional)

Buat file `.env` di root project:

```env
APP_TIMEZONE=Asia/Jakarta
APP_DEBUG=false
APP_MEMORY_LIMIT=256M
APP_MAX_EXECUTION_TIME=300
APP_UPLOAD_MAX=100M
```

> **Catatan:** `.env` sudah ada di `.gitignore` — tidak akan ter-commit.

---

## Backup Strategy

### Database
```bash
cp storage/database/filemanager.sqlite /backup/filemanager-$(date +%Y%m%d).sqlite
```

### Files
```bash
tar -czf backup-$(date +%Y%m%d).tar.gz storage/files/
```

### Full
```bash
tar -czf full-backup-$(date +%Y%m%d).tar.gz \
    storage/database/ \
    storage/files/ \
    storage/trash/ \
    app/Config/
```

### Cron job (daily backup)
```bash
0 2 * * * /path/to/backup-script.sh >> /var/log/filemanager-backup.log 2>&1
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| 500 Internal Server Error | Cek `php_errors.log` di `storage/temp/` |
| "Root directory tidak ditemukan" | Pastikan folder `storage/files/` ada dan writable |
| Upload gagal | Cek `upload_max_filesize` di phpinfo() |
| Session tidak persist | Cek `session.save_path` writable |
| SQLite locked error | Cek concurrent writes, pastikan `busy_timeout` di-set |
| Blank page | Aktifkan `display_errors` di `bootstrap.php` untuk debug |

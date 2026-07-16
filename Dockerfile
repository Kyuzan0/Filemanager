FROM php:8.1-apache

# System libraries + required PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libzip-dev \
        libsqlite3-dev \
        pkg-config \
        zip \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo_sqlite gd zip \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

# Match app/Config/app.php defaults
RUN { \
        echo 'upload_max_filesize = 2G'; \
        echo 'post_max_size = 2100M'; \
        echo 'max_file_uploads = 50'; \
        echo 'max_execution_time = 300'; \
        echo 'memory_limit = 256M'; \
        echo 'session.cookie_httponly = 1'; \
        echo 'session.use_strict_mode = 1'; \
    } > /usr/local/etc/php/conf.d/filemanager.ini

# Point Apache at public/ (avoid fragile sed on base image configs)
RUN printf '%s\n' \
    'ServerName localhost' \
    '<VirtualHost *:80>' \
    '    DocumentRoot /var/www/html/public' \
    '    <Directory /var/www/html/public>' \
    '        Options -Indexes +FollowSymLinks' \
    '        AllowOverride All' \
    '        Require all granted' \
    '    </Directory>' \
    '    <Directory /var/www/html>' \
    '        Options -Indexes' \
    '        AllowOverride None' \
    '        Require all denied' \
    '    </Directory>' \
    '    ErrorLog ${APACHE_LOG_DIR}/error.log' \
    '    CustomLog ${APACHE_LOG_DIR}/access.log combined' \
    '</VirtualHost>' \
    > /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html

COPY . /var/www/html/

# Writable storage (mount this path as a volume in Dokploy)
RUN mkdir -p \
        storage/files \
        storage/trash \
        storage/logs \
        storage/temp \
        storage/thumbnails \
        storage/database \
        storage/sessions \
    && chown -R www-data:www-data /var/www/html/storage \
    && chmod -R 775 /var/www/html/storage

EXPOSE 80

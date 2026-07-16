FROM php:8.1-apache

# System libraries + required PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libzip-dev \
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

# Serve only the public/ directory
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e "s!/var/www/html!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/sites-available/*.conf \
    && sed -ri -e "s!/var/www/!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && sed -ri -e 's/AllowOverride\s+None/AllowOverride All/g' /etc/apache2/apache2.conf \
    && sed -ri -e 's/AllowOverride\s+None/AllowOverride All/g' /etc/apache2/sites-available/*.conf

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

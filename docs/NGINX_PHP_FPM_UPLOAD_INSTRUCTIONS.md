# Nginx + PHP-FPM: Allow large uploads (step-by-step)

This file lists exact commands to run on an Ubuntu/Debian Linux server running Nginx + PHP-FPM.
Increase limits safely (example values set to 256M). Adjust values as needed.

----
1) Backup current configs

sudo mkdir -p /root/backup-filemanager-configs
sudo cp /etc/nginx/nginx.conf /root/backup-filemanager-configs/nginx.conf.$(date +%F-%T) 2>/dev/null || true
sudo cp -r /etc/nginx/sites-available /root/backup-filemanager-configs/sites-available.$(date +%F-%T) 2>/dev/null || true
sudo cp -r /etc/php /root/backup-filemanager-configs/php.$(date +%F-%T) 2>/dev/null || true

----
2) Update nginx: set client_max_body_size

# Add or update client_max_body_size in main nginx.conf (http block)
sudo grep -q 'client_max_body_size' /etc/nginx/nginx.conf \
    && sudo sed -i "s/^\s*client_max_body_size\s\+.*;/    client_max_body_size 256M;/" /etc/nginx/nginx.conf \
    || sudo sed -i '/http {/a\    client_max_body_size 256M;' /etc/nginx/nginx.conf

# If you have a site config (recommended), add inside the server { } block for your site:
# sudo nano /etc/nginx/sites-available/your-site.conf
# add: client_max_body_size 256M;

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

----
3) Update PHP-FPM (post_max_size, upload_max_filesize, memory_limit)

# Set values in all php-fpm php.ini files (will operate over /etc/php/*/fpm/php.ini)
for f in /etc/php/*/fpm/php.ini; do
  [ -f "$f" ] || continue
  sudo cp "$f" "$f.bak"
  sudo grep -q '^post_max_size' "$f" \
    && sudo sed -i "s/^post_max_size.*/post_max_size = 256M/" "$f" \
    || sudo bash -c "echo 'post_max_size = 256M' >> '$f'"
  sudo grep -q '^upload_max_filesize' "$f" \
    && sudo sed -i "s/^upload_max_filesize.*/upload_max_filesize = 256M/" "$f" \
    || sudo bash -c "echo 'upload_max_filesize = 256M' >> '$f'"
  sudo grep -q '^memory_limit' "$f" \
    && sudo sed -i "s/^memory_limit.*/memory_limit = 512M/" "$f" \
    || sudo bash -c "echo 'memory_limit = 512M' >> '$f'"
done

# Restart php-fpm services (determine correct service name and restart)
sudo systemctl list-units --type=service | grep php
echo "If your php-fpm service is e.g. php8.1-fpm run: sudo systemctl restart php8.1-fpm"

----
4) If you use a reverse proxy in front of Nginx (e.g. another Nginx/HAProxy/load balancer), ensure proxy buffers and limits are increased there too. Key settings:
# proxy_read_timeout, proxy_connect_timeout, proxy_send_timeout
# proxy_buffering off;
# client_max_body_size 256M; (on the frontend proxy)

----
5) Verification

# Check effective PHP values (example: for php8.1-fpm)
sudo grep -E 'post_max_size|upload_max_filesize|memory_limit' /etc/php/*/fpm/php.ini

# Test nginx config
sudo nginx -t && sudo systemctl reload nginx

# Restart php-fpm (replace service name as needed)
# sudo systemctl restart php8.1-fpm

# Try the upload again from client and watch Network tab for 413 -> if still 413, the frontend (load balancer) likely rejects it first.

----
Notes:
- Use sensible limits: set both nginx and PHP to >= the largest single chunk size (we used 256M here).
- For chunked uploads the per-request body should be small (we send ~5MB chunks) so frontend proxies should allow at least that size; but PHP's post_max_size matters when non-chunked requests are used.
- If you cannot find php.ini under /etc/php/*/fpm, check /etc/php.ini or run: php -i | grep 'Loaded Configuration File'

End.
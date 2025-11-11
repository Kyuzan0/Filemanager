# Log Cleanup Scheduler Setup

## Overview

The `cleanup_scheduler.php` script provides automated log cleanup functionality for the File Manager application. This script is designed to be run via cron job to automatically remove old log entries based on a configured time interval.

## Features

- Automatic cleanup of log entries older than the specified interval (default: 30 days)
- Configurable cleanup interval (7 or 30 days)
- Error handling and logging
- Detailed output for monitoring and debugging
- Safe execution with proper error codes

## Setup Instructions

### 1. Verify PHP CLI Access

First, ensure you can run PHP scripts from the command line:

```bash
php -v
```

### 2. Test the Script Manually

Before setting up the cron job, test the script manually:

```bash
php /path/to/your/project/cleanup_scheduler.php
```

Expected output:
```
[2025-11-11 17:45:00] Starting log cleanup scheduler...
[2025-11-11 17:45:00] Cleanup completed successfully.
[2025-11-11 17:45:00] Deleted 150 log entries.
[2025-11-11 17:45:00] Remaining 75 log entries.
[2025-11-11 17:45:00] Cleanup interval: 30 days.
[2025-11-11 17:45:00] Log cleanup scheduler finished.
```

### 3. Set Up Cron Job

#### Linux/macOS

Edit your crontab:

```bash
crontab -e
```

Add one of the following lines based on your desired frequency:

**Daily cleanup at 2:00 AM:**
```bash
0 2 * * * /usr/bin/php /path/to/your/project/cleanup_scheduler.php >> /path/to/your/project/logs/cleanup.log 2>&1
```

**Weekly cleanup every Sunday at 2:00 AM:**
```bash
0 2 * * 0 /usr/bin/php /path/to/your/project/cleanup_scheduler.php >> /path/to/your/project/logs/cleanup.log 2>&1
```

**Monthly cleanup on the 1st at 2:00 AM:**
```bash
0 2 1 * * /usr/bin/php /path/to/your/project/cleanup_scheduler.php >> /path/to/your/project/logs/cleanup.log 2>&1
```

#### Windows

Using Windows Task Scheduler:

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily, weekly, or monthly)
4. Set action to run:
   ```
   "C:\path\to\php.exe" "C:\path\to\your\project\cleanup_scheduler.php"
   ```
5. Configure logging if needed

### 4. Verify Cron Job

Check if the cron job is running:

```bash
# View cron jobs
crontab -l

# Check cron service status
sudo systemctl status cron  # Ubuntu/Debian
sudo systemctl status crond  # CentOS/RHEL
```

Monitor the log file:
```bash
tail -f /path/to/your/project/logs/cleanup.log
```

## Configuration

### Default Configuration

The script uses the following default configuration:

- **Cleanup Interval**: 30 days
- **Max File Size**: 10MB
- **Lock Timeout**: 5 seconds
- **Timezone**: Asia/Jakarta

### Custom Configuration

To modify the cleanup interval, edit the `cleanup_scheduler.php` file:

```php
$config = [
    'auto_cleanup_interval' => 7,  // Change to 7 days
    'max_file_size' => 10 * 1024 * 1024, // 10MB
    'lock_timeout' => 5 // 5 seconds
];
```

## Manual vs Automatic Cleanup

### Manual Cleanup

Users can trigger manual cleanup through the File Manager interface:
1. Open the Log Activity modal
2. Select cleanup interval (7 or 30 days)
3. Click the "Cleanup" button
4. Confirm the action

### Automatic Cleanup

The cron job runs automatically based on the configured schedule without user intervention.

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure the script has execute permissions: `chmod +x cleanup_scheduler.php`
   - Check that the logs directory is writable

2. **PHP Not Found**
   - Use the full path to PHP: `which php`
   - Update the cron job with the correct path

3. **Script Not Running**
   - Check cron service status
   - Verify the cron job syntax
   - Check system logs: `grep CRON /var/log/syslog`

4. **Log File Not Growing**
   - Ensure the logs directory exists and is writable
   - Check file permissions

### Debug Mode

To run the script with more verbose output:

```bash
php -d error_reporting=E_ALL cleanup_scheduler.php
```

## Security Considerations

1. **File Permissions**: Ensure the script and log files have appropriate permissions
2. **Path Security**: Use absolute paths in cron jobs to prevent path traversal
3. **Access Control**: Limit access to the cleanup script and logs
4. **Monitoring**: Regularly check the cleanup logs for unusual activity

## Monitoring

### Log Files

Monitor these log files:
- `logs/cleanup.log` - Scheduler execution logs
- `logs/activity.json` - Application logs (after cleanup)

### Health Check

Create a simple health check script:

```bash
#!/bin/bash
# Check if cleanup ran in the last 48 hours
if find logs/cleanup.log -mtime -2 | read; then
    echo "Cleanup scheduler is running normally"
else
    echo "WARNING: Cleanup scheduler may not be running"
    exit 1
fi
```

## Integration with Existing Systems

The cleanup scheduler integrates seamlessly with the existing File Manager logging system:

- Uses the same Logger class
- Respects existing file locking mechanisms
- Logs cleanup operations to the activity log
- Maintains data integrity during cleanup operations

## Best Practices

1. **Schedule**: Run cleanup during low-traffic hours
2. **Frequency**: Daily cleanup is usually sufficient for most applications
3. **Monitoring**: Regularly check cleanup logs
4. **Backup**: Consider backing up logs before cleanup if needed for compliance
5. **Testing**: Test any configuration changes in a staging environment
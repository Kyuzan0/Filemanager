<?php
/**
 * Log Aktivitas Page
 * Halaman terpisah untuk menampilkan riwayat aktivitas file manager
 */
require_once __DIR__ . '/lib/log_manager.php';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <!-- Anti-flash: Set theme before anything else -->
    <script>
        (function() {
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            if (theme === 'dark') {
                document.documentElement.style.backgroundColor = '#0f172a';
                document.documentElement.style.colorScheme = 'dark';
            }
        })();
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Aktivitas - File Manager</title>
    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: ['class', '[data-theme="dark"]'],
        }
    </script>
    <!-- Modular CSS -->
    <link rel="stylesheet" href="assets/css/main.css">
    <link rel="stylesheet" href="assets/css/pages/logs.css">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body class="bg-slate-50 text-slate-900 dark:bg-[#0f172a] dark:text-slate-300 overflow-hidden">
    <div class="app h-screen flex overflow-hidden" id="app">
        <?php 
        $activePage = 'logs';
        include 'partials/sidebar.php'; 
        ?>
        
        <div class="log-container">
            <?php include 'partials/logs/toolbar.php'; ?>
            <?php include 'partials/logs/table.php'; ?>
        </div>
    </div><!-- End app wrapper -->
    
    <?php include 'partials/logs/modal.php'; ?>

    <!-- Modular JavaScript -->
    <script src="assets/js/logs.js"></script>
</body>
</html>

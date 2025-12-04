<?php
/**
 * Trash Page - Recycle Bin
 * Halaman untuk menampilkan dan mengelola file/folder yang dihapus
 */
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
    <title>Trash - File Manager</title>
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
    <link rel="stylesheet" href="assets/css/pages/trash.css">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body class="bg-slate-50 text-slate-900 dark:bg-[#0f172a] dark:text-slate-300 overflow-hidden">
    <div class="app h-screen flex overflow-hidden" id="app">
        <?php 
        $activePage = 'trash';
        include 'partials/sidebar.php'; 
        ?>
        
        <div class="log-container">
            <?php include 'partials/trash/toolbar.php'; ?>
            <?php include 'partials/trash/table.php'; ?>
        </div>
    </div><!-- End app wrapper -->
    
    <?php include 'partials/trash/detail-modal.php'; ?>
    <?php include 'partials/trash/confirm-modal.php'; ?>

    <!-- Modular JavaScript -->
    <script src="assets/js/trash.js"></script>
</body>
</html>

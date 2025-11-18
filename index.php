<!DOCTYPE html>
<html lang="id">
<head>
    <!-- Using Tailwind CDN (reverted to CDN-based workflow) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="assets/css/style.css">
    <!-- RemixIcon CDN -->
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title>File Manager</title>
</head>
<body class="bg-slate-50 text-slate-900">
    <div class="app-shell min-h-screen">
        <?php include 'partials/header.php'; ?>

        <main class="app-main container mx-auto px-4 py-4 md:py-6">
            <section class="meta-bar mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div class="breadcrumbs" id="breadcrumbs"></div>
                <div class="meta-actions hidden"></div>
            </section>

        <?php include 'partials/action-bar.php'; ?>

        <?php include 'partials/table.php'; ?>

            <div class="loader-overlay fixed inset-0 hidden items-center justify-center bg-black/30 z-50 p-4" id="loader-overlay" aria-hidden="true">
                <div class="loader-inner bg-white px-4 py-3 rounded-md shadow flex items-center gap-3 max-w-xs w-full">
                    <svg class="w-5 h-5 animate-spin text-blue-600 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                    <span class="text-sm text-slate-700">Memuat data...</span>
                </div>
            </div>
        </main>
    </div>

    <?php include 'partials/overlays.php'; ?>

    <script type="module" src="assets/js/index.js"></script>
</body>
</html>


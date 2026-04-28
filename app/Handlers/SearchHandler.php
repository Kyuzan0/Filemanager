<?php

/**
 * Search Handler
 * 
 * Handles full-text content search across files.
 * Supports regex, case-sensitive, and file type filtering.
 * 
 * @version 1.0.0
 */

/**
 * Handle search action — search file contents recursively.
 *
 * GET /api.php?action=search&q=...&path=...&regex=0&case=0&ext=js,php&maxResults=100
 *
 * @param string $root Root directory path
 * @param string $sanitizedPath Starting directory for search
 * @return void
 */
function handle_search_action(string $root, string $sanitizedPath): void
{
    $query = $_GET['q'] ?? '';
    if (!is_string($query) || trim($query) === '') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Parameter pencarian (q) diperlukan.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $query = trim($query);
    $useRegex = !empty($_GET['regex']) && $_GET['regex'] === '1';
    $caseSensitive = !empty($_GET['case']) && $_GET['case'] === '1';
    $maxResults = isset($_GET['maxResults']) ? min((int)$_GET['maxResults'], 500) : 100;
    $extensionFilter = isset($_GET['ext']) && is_string($_GET['ext']) && $_GET['ext'] !== ''
        ? array_map('trim', explode(',', strtolower($_GET['ext'])))
        : [];

    try {
        $results = search_file_contents($root, $sanitizedPath, $query, [
            'regex' => $useRegex,
            'caseSensitive' => $caseSensitive,
            'maxResults' => $maxResults,
            'extensions' => $extensionFilter,
        ]);

        echo json_encode([
            'success' => true,
            'query' => $query,
            'path' => $sanitizedPath,
            'totalMatches' => $results['totalMatches'],
            'filesSearched' => $results['filesSearched'],
            'filesMatched' => $results['filesMatched'],
            'truncated' => $results['truncated'],
            'results' => $results['results'],
            'generated_at' => time(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Search file contents recursively within a directory.
 *
 * @param string $root Root directory path
 * @param string $startPath Relative path to start searching from
 * @param string $query Search query (plain text or regex pattern)
 * @param array $options Search options:
 *   - regex (bool): Treat query as regex pattern
 *   - caseSensitive (bool): Case-sensitive matching
 *   - maxResults (int): Maximum number of matching lines to return
 *   - extensions (array): Only search files with these extensions (empty = all text files)
 * @return array Search results with metadata
 */
function search_file_contents(
    string $root,
    string $startPath,
    string $query,
    array $options = []
): array {
    $useRegex = $options['regex'] ?? false;
    $caseSensitive = $options['caseSensitive'] ?? false;
    $maxResults = $options['maxResults'] ?? 100;
    $extensionFilter = $options['extensions'] ?? [];

    // Searchable text extensions (superset of editable extensions)
    $searchableExtensions = [
        'txt', 'md', 'markdown', 'yml', 'yaml', 'json', 'xml',
        'html', 'htm', 'css', 'scss', 'less', 'sass',
        'js', 'ts', 'tsx', 'jsx', 'mjs', 'cjs',
        'ini', 'conf', 'cfg', 'env', 'log',
        'php', 'phtml', 'twig',
        'sql', 'csv', 'tsv',
        'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp',
        'go', 'rs', 'swift', 'kt', 'kts',
        'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1',
        'toml', 'lock', 'editorconfig', 'gitignore', 'gitattributes',
        'dockerfile', 'makefile', 'cmake',
        'vue', 'svelte', 'astro',
        'graphql', 'gql', 'proto',
        'r', 'lua', 'pl', 'pm',
    ];

    // If extension filter provided, use it; otherwise use all searchable
    $allowedExtensions = !empty($extensionFilter) ? $extensionFilter : $searchableExtensions;

    // Build the regex pattern
    if ($useRegex) {
        // Validate user regex
        $testPattern = '/' . $query . '/u';
        if (@preg_match($testPattern, '') === false) {
            throw new RuntimeException('Pola regex tidak valid: ' . preg_last_error_msg());
        }
        $pattern = '/' . $query . '/' . ($caseSensitive ? 'u' : 'iu');
    } else {
        $pattern = '/' . preg_quote($query, '/') . '/' . ($caseSensitive ? 'u' : 'iu');
    }

    // Resolve start directory
    [$normalizedRoot, $sanitizedRelativeUrl, $realStartPath] = resolve_path($root, $startPath);

    if (!is_dir($realStartPath)) {
        throw new RuntimeException('Direktori tidak ditemukan.');
    }

    $results = [];
    $totalMatches = 0;
    $filesSearched = 0;
    $filesMatched = 0;
    $truncated = false;
    $maxFileSize = 1048576; // 1MB max per file
    $contextLines = 1; // Lines of context around match

    // Skip directories
    $skipDirs = ['.git', 'node_modules', 'vendor', '.svn', '.hg', '__pycache__', '.idea', '.vscode', 'storage'];

    try {
        $iterator = new RecursiveDirectoryIterator(
            $realStartPath,
            RecursiveDirectoryIterator::SKIP_DOTS | RecursiveDirectoryIterator::FOLLOW_SYMLINKS
        );

        $filterIterator = new RecursiveCallbackFilterIterator(
            $iterator,
            function ($current, $key, $iterator) use ($skipDirs) {
                if ($current->isDir()) {
                    return !in_array($current->getFilename(), $skipDirs, true);
                }
                return true;
            }
        );

        $files = new RecursiveIteratorIterator(
            $filterIterator,
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $file) {
            if ($truncated) break;
            if (!$file->isFile() || !$file->isReadable()) continue;

            $ext = strtolower($file->getExtension());

            // Handle extensionless files (Makefile, Dockerfile, etc.)
            if ($ext === '') {
                $basename = strtolower($file->getBasename());
                if (!in_array($basename, $allowedExtensions, true)) {
                    continue;
                }
            } elseif (!in_array($ext, $allowedExtensions, true)) {
                continue;
            }

            // Skip large files
            if ($file->getSize() > $maxFileSize) continue;

            $filesSearched++;
            $filePath = $file->getRealPath();

            // Read file content
            $content = @file_get_contents($filePath);
            if ($content === false) continue;

            // Skip binary files (check for null bytes in first 8KB)
            $sample = substr($content, 0, 8192);
            if (strpos($sample, "\0") !== false) continue;

            // Search line by line
            $lines = explode("\n", $content);
            $fileMatches = [];

            foreach ($lines as $lineIndex => $line) {
                if (preg_match($pattern, $line, $matches)) {
                    $lineNumber = $lineIndex + 1;

                    // Get context lines
                    $contextBefore = [];
                    $contextAfter = [];

                    for ($i = max(0, $lineIndex - $contextLines); $i < $lineIndex; $i++) {
                        $contextBefore[] = [
                            'line' => $i + 1,
                            'text' => mb_substr($lines[$i], 0, 500),
                        ];
                    }

                    for ($i = $lineIndex + 1; $i <= min(count($lines) - 1, $lineIndex + $contextLines); $i++) {
                        $contextAfter[] = [
                            'line' => $i + 1,
                            'text' => mb_substr($lines[$i], 0, 500),
                        ];
                    }

                    $fileMatches[] = [
                        'line' => $lineNumber,
                        'text' => mb_substr(rtrim($line, "\r"), 0, 500),
                        'match' => $matches[0],
                        'column' => mb_strpos($caseSensitive ? $line : mb_strtolower($line), $caseSensitive ? $matches[0] : mb_strtolower($matches[0])) + 1,
                        'contextBefore' => $contextBefore,
                        'contextAfter' => $contextAfter,
                    ];

                    $totalMatches++;

                    if ($totalMatches >= $maxResults) {
                        $truncated = true;
                        break;
                    }
                }
            }

            if (!empty($fileMatches)) {
                $filesMatched++;

                // Build relative path from root
                $relativePath = str_replace(
                    [$normalizedRoot . DIRECTORY_SEPARATOR, DIRECTORY_SEPARATOR],
                    ['', '/'],
                    $filePath
                );

                $results[] = [
                    'path' => $relativePath,
                    'name' => $file->getBasename(),
                    'extension' => $ext,
                    'matches' => $fileMatches,
                    'matchCount' => count($fileMatches),
                ];
            }
        }
    } catch (Throwable $e) {
        // Log but don't fail — return partial results
        if (function_exists('log_activity')) {
            log_activity('search', 'Search error: ' . $e->getMessage());
        }
    }

    return [
        'totalMatches' => $totalMatches,
        'filesSearched' => $filesSearched,
        'filesMatched' => $filesMatched,
        'truncated' => $truncated,
        'results' => $results,
    ];
}

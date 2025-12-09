<?php
/**
 * Trash Manager
 * Handles soft deletion, restoration, and permanent deletion of files/folders
 */

function get_trash_directory(): string
{
    // Use TRASH_DIR constant if defined, otherwise fallback to relative path
    if (defined('TRASH_DIR')) {
        return TRASH_DIR;
    }
    return dirname(__DIR__, 2) . '/storage/trash';
}

function get_trash_metadata_file(): string
{
    // Use TRASH_METADATA_FILE constant if defined
    if (defined('TRASH_METADATA_FILE')) {
        return TRASH_METADATA_FILE;
    }
    return get_trash_directory() . '/metadata.json';
}

function ensure_trash_directory(): void
{
    $trashDir = get_trash_directory();
    if (!is_dir($trashDir)) {
        if (!mkdir($trashDir, 0755, true)) {
            throw new RuntimeException('Gagal membuat direktori trash.');
        }
    }

    if (!is_writable($trashDir)) {
        throw new RuntimeException('Direktori trash tidak dapat ditulisi.');
    }
}

function read_trash_metadata(): array
{
    $metadataFile = get_trash_metadata_file();

    if (!file_exists($metadataFile)) {
        return [];
    }

    $content = file_get_contents($metadataFile);
    if ($content === false) {
        return [];
    }

    $metadata = json_decode($content, true);
    return is_array($metadata) ? $metadata : [];
}

function write_trash_metadata(array $metadata): void
{
    ensure_trash_directory();

    $metadataFile = get_trash_metadata_file();
    $json = json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if ($json === false) {
        throw new RuntimeException('Gagal mengenkode metadata trash ke JSON.');
    }

    if (file_put_contents($metadataFile, $json, LOCK_EX) === false) {
        throw new RuntimeException('Gagal menyimpan metadata trash.');
    }
}

function move_to_trash(string $root, array $relativePaths): array
{
    ensure_trash_directory();

    $trashDir = get_trash_directory();
    $metadata = read_trash_metadata();
    $trashed = [];
    $errors = [];

    foreach ($relativePaths as $relativePath) {
        try {
            $sanitized = sanitize_relative_path($relativePath);
            if ($sanitized === '') {
                throw new RuntimeException('Path tidak valid.');
            }

            [$normalizedRoot, $sanitizedRelativeUrl, $realTargetPath] = resolve_path($root, $sanitized);

            if (!file_exists($realTargetPath)) {
                throw new RuntimeException('Item tidak ditemukan.');
            }

            $isDir = is_dir($realTargetPath);
            $name = basename($realTargetPath);
            $type = $isDir ? 'folder' : 'file';

            $trashId = uniqid('trash_', true);
            $trashItemPath = $trashDir . DIRECTORY_SEPARATOR . $trashId;

            if (!@rename($realTargetPath, $trashItemPath)) {
                $error = error_get_last();
                $message = $error['message'] ?? 'Gagal memindahkan ke trash.';
                throw new RuntimeException($message);
            }

            $metadataEntry = [
                'id' => $trashId,
                'originalPath' => $sanitized,
                'originalName' => $name,
                'type' => $type,
                'size' => $isDir ? 0 : (filesize($trashItemPath) ?: 0),
                'deletedAt' => time(),
                'deletedBy' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            ];

            $metadata[] = $metadataEntry;

            $trashed[] = [
                'id' => $trashId,
                'name' => $name,
                'path' => $sanitized,
                'type' => $type,
            ];

        } catch (Throwable $e) {
            $errors[] = [
                'path' => $relativePath,
                'error' => $e->getMessage(),
            ];
        }
    }

    if (!empty($trashed)) {
        write_trash_metadata($metadata);

        // Log activity: single entry for bulk delete, individual entry for single delete
        $trashedCount = count($trashed);
        if ($trashedCount === 1) {
            // Single item delete - log with specific filename
            $item = $trashed[0];
            write_activity_log('trash', $item['name'], $item['type'], $item['path'], [
                'trashId' => $item['id']
            ]);
        } else {
            // Bulk delete - log as single bulk action
            $fileCount = 0;
            $folderCount = 0;
            $itemNames = [];
            $trashIds = [];

            foreach ($trashed as $item) {
                if ($item['type'] === 'folder') {
                    $folderCount++;
                } else {
                    $fileCount++;
                }
                $itemNames[] = $item['name'];
                $trashIds[] = $item['id'];
            }

            // Build summary description
            $typeSummary = [];
            if ($fileCount > 0) {
                $typeSummary[] = $fileCount . ' file' . ($fileCount > 1 ? 's' : '');
            }
            if ($folderCount > 0) {
                $typeSummary[] = $folderCount . ' folder' . ($folderCount > 1 ? 's' : '');
            }

            $bulkFilename = $trashedCount . ' items (' . implode(', ', $typeSummary) . ')';

            write_activity_log('bulk_trash', $bulkFilename, 'bulk', '', [
                'count' => $trashedCount,
                'fileCount' => $fileCount,
                'folderCount' => $folderCount,
                'items' => $itemNames,
                'trashIds' => $trashIds
            ]);
        }
    }

    return [
        'trashed' => $trashed,
        'errors' => $errors,
    ];
}

function list_trash_items(): array
{
    $metadata = read_trash_metadata();

    usort($metadata, function ($a, $b) {
        return ($b['deletedAt'] ?? 0) - ($a['deletedAt'] ?? 0);
    });

    return $metadata;
}

function restore_from_trash(string $root, array $trashIds): array
{
    $trashDir = get_trash_directory();
    $metadata = read_trash_metadata();
    $restored = [];
    $errors = [];

    foreach ($trashIds as $trashId) {
        try {
            $itemIndex = null;
            $itemData = null;

            foreach ($metadata as $index => $item) {
                if ($item['id'] === $trashId) {
                    $itemIndex = $index;
                    $itemData = $item;
                    break;
                }
            }

            if ($itemData === null) {
                throw new RuntimeException('Item tidak ditemukan di trash.');
            }

            $trashItemPath = $trashDir . DIRECTORY_SEPARATOR . $trashId;

            if (!file_exists($trashItemPath)) {
                unset($metadata[$itemIndex]);
                throw new RuntimeException('File trash tidak ditemukan.');
            }

            $normalizedRoot = realpath($root);
            if ($normalizedRoot === false) {
                throw new RuntimeException('Root directory tidak ditemukan.');
            }

            $originalPath = $itemData['originalPath'];
            $restorePath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $originalPath);

            if (file_exists($restorePath)) {
                $pathInfo = pathinfo($originalPath);
                $dirname = $pathInfo['dirname'] !== '.' ? $pathInfo['dirname'] : '';
                $basename = $pathInfo['filename'];
                $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';

                $counter = 1;
                do {
                    $newName = $basename . '_restored_' . $counter . $extension;
                    $newPath = $dirname !== '' ? $dirname . '/' . $newName : $newName;
                    $restorePath = $normalizedRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $newPath);
                    $counter++;
                } while (file_exists($restorePath) && $counter < 1000);

                if (file_exists($restorePath)) {
                    throw new RuntimeException('Tidak dapat membuat nama unik untuk restore.');
                }

                $originalPath = $newPath;
            }

            $parentDir = dirname($restorePath);
            if (!is_dir($parentDir)) {
                if (!@mkdir($parentDir, 0755, true)) {
                    throw new RuntimeException('Gagal membuat direktori parent.');
                }
            }

            if (!@rename($trashItemPath, $restorePath)) {
                $error = error_get_last();
                $message = $error['message'] ?? 'Gagal merestore item.';
                throw new RuntimeException($message);
            }

            unset($metadata[$itemIndex]);

            $restored[] = [
                'id' => $trashId,
                'name' => basename($restorePath),
                'path' => $originalPath,
                'type' => $itemData['type'],
            ];

            write_activity_log('restore', basename($restorePath), $itemData['type'], $originalPath, [
                'trashId' => $trashId,
                'originalPath' => $itemData['originalPath']
            ]);

        } catch (Throwable $e) {
            $errors[] = [
                'id' => $trashId,
                'error' => $e->getMessage(),
            ];
        }
    }

    if (!empty($restored)) {
        write_trash_metadata(array_values($metadata));
    }

    return [
        'restored' => $restored,
        'errors' => $errors,
    ];
}

function delete_from_trash_permanently(array $trashIds): array
{
    $trashDir = get_trash_directory();
    $metadata = read_trash_metadata();
    $deleted = [];
    $errors = [];

    foreach ($trashIds as $trashId) {
        try {
            $itemIndex = null;
            $itemData = null;

            foreach ($metadata as $index => $item) {
                if ($item['id'] === $trashId) {
                    $itemIndex = $index;
                    $itemData = $item;
                    break;
                }
            }

            if ($itemData === null) {
                throw new RuntimeException('Item tidak ditemukan di trash.');
            }

            $trashItemPath = $trashDir . DIRECTORY_SEPARATOR . $trashId;

            if (file_exists($trashItemPath)) {
                if (is_dir($trashItemPath)) {
                    $iterator = new RecursiveIteratorIterator(
                        new RecursiveDirectoryIterator(
                            $trashItemPath,
                            FilesystemIterator::SKIP_DOTS | FilesystemIterator::CURRENT_AS_FILEINFO
                        ),
                        RecursiveIteratorIterator::CHILD_FIRST
                    );

                    foreach ($iterator as $item) {
                        $pathName = $item->getPathname();
                        if ($item->isDir()) {
                            if (!@rmdir($pathName)) {
                                throw new RuntimeException('Gagal menghapus subdirektori.');
                            }
                        } else {
                            if (!@unlink($pathName)) {
                                throw new RuntimeException('Gagal menghapus file.');
                            }
                        }
                    }

                    if (!@rmdir($trashItemPath)) {
                        throw new RuntimeException('Gagal menghapus direktori trash.');
                    }
                } else {
                    if (!@unlink($trashItemPath)) {
                        throw new RuntimeException('Gagal menghapus file trash.');
                    }
                }
            }

            unset($metadata[$itemIndex]);

            $deleted[] = [
                'id' => $trashId,
                'name' => $itemData['originalName'],
                'type' => $itemData['type'],
            ];

            write_activity_log('permanent_delete', $itemData['originalName'], $itemData['type'], '', [
                'trashId' => $trashId,
                'originalPath' => $itemData['originalPath']
            ]);

        } catch (Throwable $e) {
            $errors[] = [
                'id' => $trashId,
                'error' => $e->getMessage(),
            ];
        }
    }

    if (!empty($deleted)) {
        write_trash_metadata(array_values($metadata));
    }

    return [
        'deleted' => $deleted,
        'errors' => $errors,
    ];
}

function empty_trash(): array
{
    $metadata = read_trash_metadata();
    $trashIds = array_column($metadata, 'id');

    if (empty($trashIds)) {
        return [
            'deleted' => [],
            'errors' => [],
        ];
    }

    $result = delete_from_trash_permanently($trashIds);

    write_activity_log('empty_trash', 'all_items', 'system', '', [
        'count' => count($result['deleted'])
    ]);

    return $result;
}

function cleanup_old_trash(int $days): array
{
    $metadata = read_trash_metadata();
    $cutoffTimestamp = time() - ($days * 24 * 60 * 60);

    $oldIds = [];
    foreach ($metadata as $item) {
        if (($item['deletedAt'] ?? 0) < $cutoffTimestamp) {
            $oldIds[] = $item['id'];
        }
    }

    if (empty($oldIds)) {
        return [
            'deleted' => [],
            'errors' => [],
        ];
    }

    $result = delete_from_trash_permanently($oldIds);

    write_activity_log('cleanup_trash', 'old_items', 'system', '', [
        'days' => $days,
        'count' => count($result['deleted'])
    ]);

    return $result;
}
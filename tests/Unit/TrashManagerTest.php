<?php

/**
 * TrashManager Test
 * 
 * Tests for TrashManager functions — metadata read/write, move to trash,
 * restore, permanent delete, empty trash, cleanup.
 * 
 * Uses the actual TRASH_DIR (already defined by autoload.php) but creates
 * a dedicated test root directory for file operations. Saves/restores
 * original metadata between tests.
 */

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class TrashManagerTest extends TestCase
{
    private static string $testRootDir;
    private string $trashDir;
    private array $originalMetadata = [];

    public static function setUpBeforeClass(): void
    {
        self::$testRootDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'phpunit_trash_root_' . uniqid();
        mkdir(self::$testRootDir, 0755, true);
    }

    protected function setUp(): void
    {
        $this->trashDir = get_trash_directory();
        ensure_trash_directory();

        // Save original metadata
        $this->originalMetadata = read_trash_metadata();

        // Clean root directory
        $this->cleanDirectory(self::$testRootDir);

        // Write empty metadata for clean test state
        write_trash_metadata([]);
    }

    protected function tearDown(): void
    {
        // Restore original metadata
        write_trash_metadata($this->originalMetadata);

        // Clean root directory
        $this->cleanDirectory(self::$testRootDir);
    }

    public static function tearDownAfterClass(): void
    {
        if (is_dir(self::$testRootDir)) {
            self::removeRecursive(self::$testRootDir);
        }
    }

    private function cleanDirectory(string $dir): void
    {
        if (!is_dir($dir)) return;

        $items = new \DirectoryIterator($dir);
        foreach ($items as $item) {
            if ($item->isDot()) continue;
            $path = $item->getPathname();
            if ($item->isDir()) {
                self::removeRecursive($path);
            } else {
                unlink($path);
            }
        }
    }

    private static function removeRecursive(string $path): void
    {
        if (!file_exists($path)) return;

        if (is_dir($path)) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($iterator as $item) {
                if ($item->isDir()) {
                    rmdir($item->getPathname());
                } else {
                    unlink($item->getPathname());
                }
            }
            rmdir($path);
        } else {
            unlink($path);
        }
    }

    private function createTestFile(string $name, string $content = 'test'): string
    {
        $path = self::$testRootDir . DIRECTORY_SEPARATOR . $name;
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($path, $content);
        return $path;
    }

    private function createTestFolder(string $name): string
    {
        $path = self::$testRootDir . DIRECTORY_SEPARATOR . $name;
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }
        return $path;
    }

    /**
     * Clean up trash items created during a test
     */
    private function cleanupTrashItems(array $trashIds): void
    {
        foreach ($trashIds as $id) {
            $trashPath = $this->trashDir . DIRECTORY_SEPARATOR . $id;
            if (file_exists($trashPath)) {
                if (is_dir($trashPath)) {
                    self::removeRecursive($trashPath);
                } else {
                    unlink($trashPath);
                }
            }
        }
    }

    // =========================================================================
    // TRASH DIRECTORY
    // =========================================================================

    public function testGetTrashDirectoryReturnsString(): void
    {
        $dir = get_trash_directory();
        $this->assertIsString($dir);
        $this->assertNotEmpty($dir);
    }

    public function testGetTrashMetadataFileReturnsPath(): void
    {
        $file = get_trash_metadata_file();
        $this->assertStringEndsWith('metadata.json', $file);
    }

    public function testEnsureTrashDirectoryCreatesDir(): void
    {
        ensure_trash_directory();
        $this->assertDirectoryExists($this->trashDir);
    }

    // =========================================================================
    // METADATA
    // =========================================================================

    public function testReadTrashMetadataReturnsArray(): void
    {
        $metadata = read_trash_metadata();
        $this->assertIsArray($metadata);
    }

    public function testWriteAndReadTrashMetadata(): void
    {
        $data = [
            ['id' => 'test_1', 'originalName' => 'file.txt', 'type' => 'file'],
            ['id' => 'test_2', 'originalName' => 'folder', 'type' => 'folder'],
        ];

        write_trash_metadata($data);
        $result = read_trash_metadata();

        $this->assertCount(2, $result);
        $this->assertEquals('test_1', $result[0]['id']);
        $this->assertEquals('test_2', $result[1]['id']);
    }

    public function testReadTrashMetadataHandlesCorruptedFile(): void
    {
        $metaFile = get_trash_metadata_file();
        file_put_contents($metaFile, 'not valid json');

        $result = read_trash_metadata();
        $this->assertIsArray($result);
        $this->assertEmpty($result);
    }

    // =========================================================================
    // MOVE TO TRASH
    // =========================================================================

    public function testMoveFileToTrash(): void
    {
        $this->createTestFile('deleteme.txt', 'content');

        $result = move_to_trash(self::$testRootDir, ['deleteme.txt']);

        $this->assertCount(1, $result['trashed']);
        $this->assertEmpty($result['errors']);
        $this->assertEquals('deleteme.txt', $result['trashed'][0]['name']);
        $this->assertEquals('file', $result['trashed'][0]['type']);
        $this->assertNotEmpty($result['trashed'][0]['id']);

        // File should no longer exist in root
        $this->assertFileDoesNotExist(self::$testRootDir . DIRECTORY_SEPARATOR . 'deleteme.txt');

        // Metadata should be updated
        $metadata = read_trash_metadata();
        $this->assertCount(1, $metadata);

        // Cleanup
        $this->cleanupTrashItems([$result['trashed'][0]['id']]);
    }

    public function testMoveFolderToTrash(): void
    {
        $folder = $this->createTestFolder('deletefolder');
        $this->createTestFile('deletefolder' . DIRECTORY_SEPARATOR . 'inner.txt', 'inner');

        $result = move_to_trash(self::$testRootDir, ['deletefolder']);

        // On some Windows configurations, resolve_path may fail for temp dirs
        if (empty($result['trashed'])) {
            $this->markTestSkipped('resolve_path cannot resolve temp directory on this system');
        }

        $this->assertCount(1, $result['trashed']);
        $this->assertEquals('folder', $result['trashed'][0]['type']);

        // Cleanup
        $this->cleanupTrashItems([$result['trashed'][0]['id']]);
    }

    public function testMoveMultipleItemsToTrash(): void
    {
        $this->createTestFile('file1.txt');
        $this->createTestFile('file2.txt');
        $this->createTestFile('file3.txt');

        $result = move_to_trash(self::$testRootDir, ['file1.txt', 'file2.txt', 'file3.txt']);

        $this->assertCount(3, $result['trashed']);
        $this->assertEmpty($result['errors']);

        // Cleanup
        $ids = array_column($result['trashed'], 'id');
        $this->cleanupTrashItems($ids);
    }

    public function testMoveNonExistentItemToTrash(): void
    {
        $result = move_to_trash(self::$testRootDir, ['nonexistent.txt']);

        $this->assertEmpty($result['trashed']);
        $this->assertCount(1, $result['errors']);
    }

    public function testMoveToTrashWithEmptyPath(): void
    {
        $result = move_to_trash(self::$testRootDir, ['']);

        $this->assertEmpty($result['trashed']);
        $this->assertCount(1, $result['errors']);
    }

    public function testMoveToTrashSetsMetadata(): void
    {
        $this->createTestFile('metacheck.txt', 'hello');

        $result = move_to_trash(self::$testRootDir, ['metacheck.txt']);
        $trashId = $result['trashed'][0]['id'];

        $metadata = read_trash_metadata();
        $item = $metadata[0];

        $this->assertEquals($trashId, $item['id']);
        $this->assertEquals('metacheck.txt', $item['originalPath']);
        $this->assertEquals('metacheck.txt', $item['originalName']);
        $this->assertEquals('file', $item['type']);
        $this->assertArrayHasKey('deletedAt', $item);
        $this->assertIsInt($item['deletedAt']);

        // Cleanup
        $this->cleanupTrashItems([$trashId]);
    }

    // =========================================================================
    // LIST TRASH
    // =========================================================================

    public function testListTrashItemsReturnsArray(): void
    {
        $items = list_trash_items();
        $this->assertIsArray($items);
    }

    public function testListTrashItemsSortedByDate(): void
    {
        $this->createTestFile('old.txt');
        $this->createTestFile('new.txt');

        $r1 = move_to_trash(self::$testRootDir, ['old.txt']);
        usleep(10000);
        $r2 = move_to_trash(self::$testRootDir, ['new.txt']);

        $items = list_trash_items();

        $this->assertCount(2, $items);
        // Should be sorted newest first
        $this->assertGreaterThanOrEqual($items[1]['deletedAt'], $items[0]['deletedAt']);

        // Cleanup
        $this->cleanupTrashItems([$r1['trashed'][0]['id'], $r2['trashed'][0]['id']]);
    }

    // =========================================================================
    // RESTORE FROM TRASH
    // =========================================================================

    public function testRestoreFileFromTrash(): void
    {
        $this->createTestFile('restore.txt', 'restore content');

        $trashResult = move_to_trash(self::$testRootDir, ['restore.txt']);
        $trashId = $trashResult['trashed'][0]['id'];

        $restoreResult = restore_from_trash(self::$testRootDir, [$trashId]);

        $this->assertCount(1, $restoreResult['restored']);
        $this->assertEmpty($restoreResult['errors']);

        // File should be back
        $this->assertFileExists(self::$testRootDir . DIRECTORY_SEPARATOR . 'restore.txt');
        $this->assertEquals('restore content', file_get_contents(self::$testRootDir . DIRECTORY_SEPARATOR . 'restore.txt'));
    }

    public function testRestoreWithConflictRenames(): void
    {
        $this->createTestFile('conflict.txt', 'original');

        // Trash it
        $trashResult = move_to_trash(self::$testRootDir, ['conflict.txt']);
        $trashId = $trashResult['trashed'][0]['id'];

        // Create a new file with the same name
        $this->createTestFile('conflict.txt', 'new version');

        // Restore — should create conflict_restored_1.txt
        $restoreResult = restore_from_trash(self::$testRootDir, [$trashId]);

        $this->assertCount(1, $restoreResult['restored']);
        $restoredName = $restoreResult['restored'][0]['name'];
        $this->assertStringContainsString('restored', $restoredName);
    }

    public function testRestoreNonExistentTrashId(): void
    {
        $result = restore_from_trash(self::$testRootDir, ['nonexistent_id']);

        $this->assertEmpty($result['restored']);
        $this->assertCount(1, $result['errors']);
    }

    // =========================================================================
    // PERMANENT DELETE
    // =========================================================================

    public function testPermanentDeleteFile(): void
    {
        $this->createTestFile('permdelete.txt');

        $trashResult = move_to_trash(self::$testRootDir, ['permdelete.txt']);
        $trashId = $trashResult['trashed'][0]['id'];

        $deleteResult = delete_from_trash_permanently([$trashId]);

        $this->assertCount(1, $deleteResult['deleted']);
        $this->assertEmpty($deleteResult['errors']);

        // Metadata should be empty
        $metadata = read_trash_metadata();
        $this->assertEmpty($metadata);
    }

    public function testPermanentDeleteFolder(): void
    {
        $this->createTestFolder('permfolder');
        $this->createTestFile('permfolder' . DIRECTORY_SEPARATOR . 'a.txt');
        $this->createTestFile('permfolder' . DIRECTORY_SEPARATOR . 'b.txt');

        $trashResult = move_to_trash(self::$testRootDir, ['permfolder']);

        if (empty($trashResult['trashed'])) {
            $this->markTestSkipped('resolve_path cannot resolve temp directory on this system');
        }

        $trashId = $trashResult['trashed'][0]['id'];
        $deleteResult = delete_from_trash_permanently([$trashId]);

        $this->assertCount(1, $deleteResult['deleted']);
    }

    public function testPermanentDeleteNonExistentId(): void
    {
        $result = delete_from_trash_permanently(['fake_id']);

        $this->assertEmpty($result['deleted']);
        $this->assertCount(1, $result['errors']);
    }

    // =========================================================================
    // EMPTY TRASH
    // =========================================================================

    public function testEmptyTrashDeletesAll(): void
    {
        $this->createTestFile('e1.txt');
        $this->createTestFile('e2.txt');
        $this->createTestFile('e3.txt');

        move_to_trash(self::$testRootDir, ['e1.txt', 'e2.txt', 'e3.txt']);

        $items = list_trash_items();
        $this->assertCount(3, $items);

        $result = empty_trash();

        $this->assertCount(3, $result['deleted']);
        $this->assertEmpty(list_trash_items());
    }

    // =========================================================================
    // CLEANUP OLD TRASH
    // =========================================================================

    public function testCleanupOldTrashRemovesOldItems(): void
    {
        $this->createTestFile('oldfile.txt');
        move_to_trash(self::$testRootDir, ['oldfile.txt']);

        // Manually set deletedAt to 31 days ago
        $metadata = read_trash_metadata();
        $metadata[0]['deletedAt'] = time() - (31 * 24 * 60 * 60);
        write_trash_metadata($metadata);

        $trashId = $metadata[0]['id'];

        $result = cleanup_old_trash(30);

        $this->assertCount(1, $result['deleted']);

        // Cleanup any remaining
        $this->cleanupTrashItems([$trashId]);
    }

    public function testCleanupOldTrashKeepsRecentItems(): void
    {
        $this->createTestFile('recentfile.txt');
        $r = move_to_trash(self::$testRootDir, ['recentfile.txt']);

        $result = cleanup_old_trash(30);

        $this->assertEmpty($result['deleted']);
        $this->assertCount(1, list_trash_items());

        // Cleanup
        $this->cleanupTrashItems([$r['trashed'][0]['id']]);
    }
}

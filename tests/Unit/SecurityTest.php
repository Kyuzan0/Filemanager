<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Core\Security;

/**
 * Security Class Unit Tests
 * 
 * Tests for path sanitization, validation, and security utilities.
 */
class SecurityTest extends TestCase
{
    /**
     * Test sanitizeRelativePath with normal paths
     */
    public function testSanitizeRelativePathWithNormalPath(): void
    {
        $result = Security::sanitizeRelativePath('folder/subfolder/file.txt');
        $this->assertEquals('folder/subfolder/file.txt', $result);
    }

    /**
     * Test sanitizeRelativePath removes parent directory references
     */
    public function testSanitizeRelativePathRemovesParentReferences(): void
    {
        $result = Security::sanitizeRelativePath('folder/../file.txt');
        $this->assertEquals('file.txt', $result);
        
        $result = Security::sanitizeRelativePath('folder/subfolder/../../file.txt');
        $this->assertEquals('file.txt', $result);
        
        $result = Security::sanitizeRelativePath('../../../etc/passwd');
        $this->assertEquals('', $result);
    }

    /**
     * Test sanitizeRelativePath removes null bytes
     */
    public function testSanitizeRelativePathRemovesNullBytes(): void
    {
        $result = Security::sanitizeRelativePath("file\0.txt");
        $this->assertEquals('file.txt', $result);
        
        $result = Security::sanitizeRelativePath("folder/\0hidden/file.txt");
        $this->assertEquals('folder/hidden/file.txt', $result);
    }

    /**
     * Test sanitizeRelativePath with empty path
     */
    public function testSanitizeRelativePathWithEmptyPath(): void
    {
        $result = Security::sanitizeRelativePath('');
        $this->assertEquals('', $result);
    }

    /**
     * Test sanitizeRelativePath normalizes backslashes
     */
    public function testSanitizeRelativePathNormalizesBackslashes(): void
    {
        $result = Security::sanitizeRelativePath('folder\\subfolder\\file.txt');
        $this->assertEquals('folder/subfolder/file.txt', $result);
    }

    /**
     * Test sanitizeRelativePath removes current directory references
     */
    public function testSanitizeRelativePathRemovesCurrentDirReferences(): void
    {
        $result = Security::sanitizeRelativePath('./folder/./file.txt');
        $this->assertEquals('folder/file.txt', $result);
    }

    /**
     * Test isPathWithinRoot with valid paths
     */
    public function testIsPathWithinRootWithValidPath(): void
    {
        $tempDir = sys_get_temp_dir();
        $testDir = $tempDir . '/phpunit_test_' . uniqid();
        mkdir($testDir);
        
        $subDir = $testDir . '/subdir';
        mkdir($subDir);
        
        $result = Security::isPathWithinRoot($subDir, $testDir);
        $this->assertTrue($result);
        
        // Cleanup
        rmdir($subDir);
        rmdir($testDir);
    }

    /**
     * Test isPathWithinRoot rejects paths outside root
     */
    public function testIsPathWithinRootRejectsOutsidePaths(): void
    {
        $tempDir = sys_get_temp_dir();
        $testDir = $tempDir . '/phpunit_test_' . uniqid();
        mkdir($testDir);
        
        $outsideDir = $tempDir . '/outside_' . uniqid();
        mkdir($outsideDir);
        
        $result = Security::isPathWithinRoot($outsideDir, $testDir);
        $this->assertFalse($result);
        
        // Cleanup
        rmdir($outsideDir);
        rmdir($testDir);
    }

    /**
     * Test isPathWithinRoot with non-existent paths
     */
    public function testIsPathWithinRootWithNonExistentPath(): void
    {
        $result = Security::isPathWithinRoot('/nonexistent/path', '/another/nonexistent');
        $this->assertFalse($result);
    }

    /**
     * Test sanitizeFilename with normal names
     */
    public function testSanitizeFilenameWithNormalName(): void
    {
        $result = Security::sanitizeFilename('document.txt');
        $this->assertEquals('document.txt', $result);
    }

    /**
     * Test sanitizeFilename removes special characters
     */
    public function testSanitizeFilenameRemovesSpecialChars(): void
    {
        $result = Security::sanitizeFilename('file<name>.txt');
        $this->assertEquals('file_name_.txt', $result);
        
        $result = Security::sanitizeFilename('file:name|test?.txt');
        $this->assertEquals('file_name_test_.txt', $result);
    }

    /**
     * Test sanitizeFilename removes path separators
     */
    public function testSanitizeFilenameRemovesPathSeparators(): void
    {
        $result = Security::sanitizeFilename('../../etc/passwd');
        $this->assertEquals('passwd', $result);
        
        $result = Security::sanitizeFilename('folder/file.txt');
        $this->assertEquals('file.txt', $result);
    }

    /**
     * Test sanitizeFilename removes null bytes
     */
    public function testSanitizeFilenameRemovesNullBytes(): void
    {
        $result = Security::sanitizeFilename("file\0name.txt");
        $this->assertEquals('filename.txt', $result);
    }

    /**
     * Test sanitizeFilename trims dots and spaces
     */
    public function testSanitizeFilenameTrimsDotsAndSpaces(): void
    {
        $result = Security::sanitizeFilename('  .file.txt  ');
        $this->assertEquals('file.txt', $result);
        
        $result = Security::sanitizeFilename('...file...');
        $this->assertEquals('file', $result);
    }

    /**
     * Test isExtensionAllowed with allowed extensions
     */
    public function testIsExtensionAllowedWithAllowedExtensions(): void
    {
        $allowed = ['txt', 'pdf', 'jpg'];
        
        $this->assertTrue(Security::isExtensionAllowed('document.txt', $allowed));
        $this->assertTrue(Security::isExtensionAllowed('image.jpg', $allowed));
        $this->assertTrue(Security::isExtensionAllowed('file.PDF', $allowed)); // Case insensitive
    }

    /**
     * Test isExtensionAllowed rejects disallowed extensions
     */
    public function testIsExtensionAllowedRejectsDisallowed(): void
    {
        $allowed = ['txt', 'pdf'];
        
        $this->assertFalse(Security::isExtensionAllowed('script.php', $allowed));
        $this->assertFalse(Security::isExtensionAllowed('binary.exe', $allowed));
    }

    /**
     * Test isExtensionAllowed with wildcard
     */
    public function testIsExtensionAllowedWithWildcard(): void
    {
        $allowed = ['*'];
        
        $this->assertTrue(Security::isExtensionAllowed('any.file', $allowed));
        $this->assertTrue(Security::isExtensionAllowed('script.php', $allowed));
    }

    /**
     * Test isFileEditable with editable extensions
     */
    public function testIsFileEditableWithEditableExtensions(): void
    {
        $this->assertTrue(Security::isFileEditable('document.txt'));
        $this->assertTrue(Security::isFileEditable('script.js'));
        $this->assertTrue(Security::isFileEditable('style.css'));
        $this->assertTrue(Security::isFileEditable('data.json'));
    }

    /**
     * Test isFileEditable rejects non-editable extensions
     */
    public function testIsFileEditableRejectsNonEditable(): void
    {
        $this->assertFalse(Security::isFileEditable('image.jpg'));
        $this->assertFalse(Security::isFileEditable('video.mp4'));
        $this->assertFalse(Security::isFileEditable('archive.zip'));
    }

    /**
     * Test isFileEditable is case insensitive
     */
    public function testIsFileEditableCaseInsensitive(): void
    {
        $this->assertTrue(Security::isFileEditable('document.TXT'));
        $this->assertTrue(Security::isFileEditable('script.JS'));
    }
}

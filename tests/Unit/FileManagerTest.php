<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * FileManager Functions Unit Tests
 * 
 * Tests for file manager security functions including validate_file_extension
 * and resolve_path.
 */
class FileManagerTest extends TestCase
{
    /**
     * Test validate_file_extension rejects dangerous executable extensions
     */
    public function testValidateFileExtensionRejectsDangerousExecutables(): void
    {
        $dangerousFiles = [
            'malware.exe',
            'installer.msi',
            'library.dll',
            'command.com',
            'screensaver.scr',
            'program.pif',
        ];

        foreach ($dangerousFiles as $filename) {
            $result = validate_file_extension($filename);
            $this->assertFalse($result['valid'], "Should reject {$filename}");
            $this->assertStringContainsString('not allowed for security reasons', $result['error']);
        }
    }

    /**
     * Test validate_file_extension rejects dangerous script extensions
     */
    public function testValidateFileExtensionRejectsDangerousScripts(): void
    {
        $dangerousScripts = [
            'script.vbs',
            'script.vbe',
            'script.jse',
            'script.ws',
            'script.wsf',
            'script.wsc',
            'script.wsh',
            'script.ps1',
            'script.ps1xml',
            'script.ps2',
            'script.ps2xml',
            'script.psc1',
            'script.psc2',
        ];

        foreach ($dangerousScripts as $filename) {
            $result = validate_file_extension($filename);
            $this->assertFalse($result['valid'], "Should reject {$filename}");
            $this->assertStringContainsString('not allowed for security reasons', $result['error']);
        }
    }

    /**
     * Test validate_file_extension rejects dangerous system extensions
     */
    public function testValidateFileExtensionRejectsDangerousSystemFiles(): void
    {
        $dangerousSystem = [
            'shortcut.lnk',
            'driver.inf',
            'registry.reg',
            'application.hta',
            'control.cpl',
            'console.msc',
        ];

        foreach ($dangerousSystem as $filename) {
            $result = validate_file_extension($filename);
            $this->assertFalse($result['valid'], "Should reject {$filename}");
            $this->assertStringContainsString('not allowed for security reasons', $result['error']);
        }
    }

    /**
     * Test validate_file_extension rejects dangerous Java extensions
     */
    public function testValidateFileExtensionRejectsDangerousJavaFiles(): void
    {
        $dangerousJava = [
            'application.jar',
            'webstart.jnlp',
        ];

        foreach ($dangerousJava as $filename) {
            $result = validate_file_extension($filename);
            $this->assertFalse($result['valid'], "Should reject {$filename}");
            $this->assertStringContainsString('not allowed for security reasons', $result['error']);
        }
    }

    /**
     * Test validate_file_extension rejects dangerous server-side extensions
     */
    public function testValidateFileExtensionRejectsDangerousServerSide(): void
    {
        $dangerousServerSide = [
            'script.php',
            'page.phtml',
            'archive.phar',
            'script.php3',
            'script.php4',
            'script.php5',
            'script.php7',
            'source.phps',
            'script.sh',
            'script.bash',
            'script.py',
            'compiled.pyc',
            'optimized.pyo',
            'script.cgi',
            'script.pl',
            'page.asp',
            'page.aspx',
            'page.jsp',
            'page.shtml',
        ];

        foreach ($dangerousServerSide as $filename) {
            $result = validate_file_extension($filename);
            $this->assertFalse($result['valid'], "Should reject {$filename}");
            $this->assertStringContainsString('not allowed for security reasons', $result['error']);
        }
    }

    /**
     * Test validate_file_extension allows safe extensions
     */
    public function testValidateFileExtensionAllowsSafeExtensions(): void
    {
        $safeFiles = [
            'document.txt',
            'image.jpg',
            'image.png',
            'data.json',
            'style.css',
            'page.html',
            'archive.zip',
            'document.pdf',
            'spreadsheet.xlsx',
            'presentation.pptx',
        ];

        foreach ($safeFiles as $filename) {
            $result = validate_file_extension($filename);
            $this->assertTrue($result['valid'], "Should allow {$filename}");
            $this->assertNull($result['error']);
        }
    }

    /**
     * Test validate_file_extension allows files without extensions
     */
    public function testValidateFileExtensionAllowsNoExtension(): void
    {
        $result = validate_file_extension('README');
        $this->assertTrue($result['valid']);
        $this->assertNull($result['error']);
        $this->assertNull($result['extension']);
    }

    /**
     * Test validate_file_extension is case insensitive
     */
    public function testValidateFileExtensionCaseInsensitive(): void
    {
        $result = validate_file_extension('MALWARE.EXE');
        $this->assertFalse($result['valid']);
        
        $result = validate_file_extension('Script.PHP');
        $this->assertFalse($result['valid']);
        
        $result = validate_file_extension('Document.TXT');
        $this->assertTrue($result['valid']);
    }

    /**
     * Test validate_file_extension with custom allowed extensions
     */
    public function testValidateFileExtensionWithCustomAllowedList(): void
    {
        $allowed = ['txt', 'pdf'];
        
        $result = validate_file_extension('document.txt', $allowed);
        $this->assertTrue($result['valid']);
        
        $result = validate_file_extension('image.jpg', $allowed);
        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('not allowed', $result['error']);
    }

    /**
     * Test validate_file_extension dangerous extensions override allowed list
     */
    public function testValidateFileExtensionDangerousOverridesAllowed(): void
    {
        // Even if we explicitly allow dangerous extensions, they should be blocked
        $allowed = ['php', 'exe', 'txt'];
        
        $result = validate_file_extension('script.php', $allowed);
        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('not allowed for security reasons', $result['error']);
        
        $result = validate_file_extension('malware.exe', $allowed);
        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('not allowed for security reasons', $result['error']);
        
        // Safe extension should still work
        $result = validate_file_extension('document.txt', $allowed);
        $this->assertTrue($result['valid']);
    }

    /**
     * Test resolve_path prevents directory traversal
     */
    public function testResolvePathPreventsDirectoryTraversal(): void
    {
        $tempDir = sys_get_temp_dir();
        $testRoot = $tempDir . '/phpunit_root_' . uniqid();
        mkdir($testRoot);
        
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Akses path di luar root tidak diizinkan');
        
        try {
            resolve_path($testRoot, '../../../etc/passwd');
        } finally {
            rmdir($testRoot);
        }
    }

    /**
     * Test resolve_path with valid relative path
     */
    public function testResolvePathWithValidRelativePath(): void
    {
        $tempDir = sys_get_temp_dir();
        $testRoot = $tempDir . '/phpunit_root_' . uniqid();
        mkdir($testRoot);
        
        $subDir = $testRoot . '/subdir';
        mkdir($subDir);
        
        [$root, $relative, $real] = resolve_path($testRoot, 'subdir');
        
        $this->assertEquals($testRoot, $root);
        $this->assertEquals('subdir', $relative);
        $this->assertEquals($subDir, $real);
        
        // Cleanup
        rmdir($subDir);
        rmdir($testRoot);
    }

    /**
     * Test resolve_path with empty relative path (root)
     */
    public function testResolvePathWithEmptyRelativePath(): void
    {
        $tempDir = sys_get_temp_dir();
        $testRoot = $tempDir . '/phpunit_root_' . uniqid();
        mkdir($testRoot);
        
        [$root, $relative, $real] = resolve_path($testRoot, '');
        
        $this->assertEquals($testRoot, $root);
        $this->assertEquals('', $relative);
        $this->assertEquals($testRoot, $real);
        
        // Cleanup
        rmdir($testRoot);
    }

    /**
     * Test resolve_path throws exception for non-existent path
     */
    public function testResolvePathThrowsExceptionForNonExistentPath(): void
    {
        $tempDir = sys_get_temp_dir();
        $testRoot = $tempDir . '/phpunit_root_' . uniqid();
        mkdir($testRoot);
        
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Path tidak ditemukan');
        
        try {
            resolve_path($testRoot, 'nonexistent/path');
        } finally {
            rmdir($testRoot);
        }
    }

    /**
     * Test sanitize_relative_path function
     */
    public function testSanitizeRelativePath(): void
    {
        $this->assertEquals('folder/file.txt', sanitize_relative_path('folder/file.txt'));
        $this->assertEquals('file.txt', sanitize_relative_path('folder/../file.txt'));
        $this->assertEquals('', sanitize_relative_path('../../../etc/passwd'));
        $this->assertEquals('folder/file.txt', sanitize_relative_path('folder\\file.txt'));
    }
}

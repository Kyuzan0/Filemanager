<?php
require_once dirname(__DIR__) . '/bootstrap.php';

// Simulate login
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';

// Simulate file upload
$root = get_root_path();
echo "Root: $root\n";
echo "Root exists: " . (is_dir($root) ? 'YES' : 'NO') . "\n";
echo "Root writable: " . (is_writable($root) ? 'YES' : 'NO') . "\n\n";

// Test upload via API
$tmpFile = tempnam(sys_get_temp_dir(), 'test_');
file_put_contents($tmpFile, 'Hello World - test upload content');

// Create a fake $_FILES array
$_FILES['files'] = [
    'name' => ['test_upload.txt'],
    'type' => ['text/plain'],
    'tmp_name' => [$tmpFile],
    'error' => [UPLOAD_ERR_OK],
    'size' => [filesize($tmpFile)],
];

$_POST['path'] = '';

// Start output buffering to capture JSON response
ob_start();
try {
    handle_upload_action($root, '', 'POST');
} catch (Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
}
$response = ob_get_clean();

echo "Upload response: $response\n\n";

// Cleanup
@unlink($tmpFile);

// Check if file was created
$uploadedFile = $root . '/test_upload.txt';
if (file_exists($uploadedFile)) {
    echo "File uploaded successfully: " . file_get_contents($uploadedFile) . "\n";
    unlink($uploadedFile);
} else {
    echo "File was NOT created\n";
}

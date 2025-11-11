<?php
if (!is_dir('logs')) {
    mkdir('logs', 0755, true);
    echo "Logs directory created successfully\n";
} else {
    echo "Logs directory already exists\n";
}
?>
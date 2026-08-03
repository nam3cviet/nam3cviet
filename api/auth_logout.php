<?php
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Phương thức không được hỗ trợ'], 405);

$_SESSION = [];
session_destroy();
respond(['ok' => true]);

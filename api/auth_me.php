<?php
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(['error' => 'Phương thức không được hỗ trợ'], 405);

respond(['user' => current_user()]);

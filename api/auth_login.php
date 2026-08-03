<?php
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Phương thức không được hỗ trợ'], 405);

$in = json_input();
$username = trim($in['username'] ?? '');
$password = (string) ($in['password'] ?? '');
if ($username === '' || $password === '') {
  respond(['error' => 'Thiếu tên đăng nhập hoặc mật khẩu'], 400);
}

$stmt = db()->prepare('SELECT * FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
  respond(['error' => 'Sai tên đăng nhập hoặc mật khẩu'], 401);
}

session_regenerate_id(true);
$_SESSION['user'] = [
  'id' => $user['id'],
  'username' => $user['username'],
  'full_name' => $user['full_name'],
  'role' => $user['role'],
];
respond(['user' => $_SESSION['user']]);

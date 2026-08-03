<?php
// One-time bootstrap to create the first admin account. Self-disables the
// moment any user exists in the database — after that this endpoint always
// returns 403, so it's safe to leave in place, but delete it anyway once
// you've created your admin account (defense in depth).
require __DIR__ . '/bootstrap.php';

$count = (int) db()->query('SELECT COUNT(*) AS c FROM users')->fetch()['c'];
if ($count > 0) {
  respond(['error' => 'Hệ thống đã có người dùng — không thể khởi tạo lại. Hãy xóa file setup.php khỏi server.'], 403);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Phương thức không được hỗ trợ'], 405);

$in = json_input();
$username = trim($in['username'] ?? '');
$password = (string) ($in['password'] ?? '');
$fullName = trim($in['full_name'] ?? 'Quản trị viên');

if ($username === '' || mb_strlen($password) < 6) {
  respond(['error' => 'Tên đăng nhập không hợp lệ hoặc mật khẩu quá ngắn (tối thiểu 6 ký tự)'], 400);
}

$id = new_id();
db()->prepare('INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, \'admin\')')
  ->execute([$id, $username, password_hash($password, PASSWORD_DEFAULT), $fullName]);

respond(['ok' => true, 'message' => 'Đã tạo tài khoản quản trị đầu tiên. Hãy XÓA file setup.php khỏi server ngay bây giờ.']);

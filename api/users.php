<?php
require __DIR__ . '/bootstrap.php';

// Account management (create/edit/delete login accounts) — admin only, even
// to list the accounts, since usernames/roles aren't meant for viewers.
$method = $_SERVER['REQUEST_METHOD'];
$me = require_admin();

if ($method === 'GET') {
  $rows = db()->query('SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at ASC')->fetchAll();
  respond(['items' => $rows]);
}

if ($method === 'POST') {
  $in = json_input();
  $username = trim($in['username'] ?? '');
  $password = (string) ($in['password'] ?? '');
  $fullName = trim($in['full_name'] ?? '');
  $role = (($in['role'] ?? 'viewer') === 'admin') ? 'admin' : 'viewer';

  if ($username === '' || mb_strlen($password) < 6) {
    respond(['error' => 'Tên đăng nhập không hợp lệ hoặc mật khẩu quá ngắn (tối thiểu 6 ký tự)'], 400);
  }
  $exists = db()->prepare('SELECT id FROM users WHERE username = ?');
  $exists->execute([$username]);
  if ($exists->fetch()) respond(['error' => 'Tên đăng nhập đã tồn tại'], 409);

  $id = new_id();
  db()->prepare('INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)')
    ->execute([$id, $username, password_hash($password, PASSWORD_DEFAULT), $fullName, $role]);
  respond(['item' => ['id' => $id, 'username' => $username, 'full_name' => $fullName, 'role' => $role]], 201);
}

if ($method === 'PUT') {
  $id = $_GET['id'] ?? '';
  if ($id === '') respond(['error' => 'Thiếu id'], 400);
  $in = json_input();

  $fields = [];
  $params = [];
  if (isset($in['full_name'])) { $fields[] = 'full_name = ?'; $params[] = trim($in['full_name']); }
  if (isset($in['role'])) { $fields[] = 'role = ?'; $params[] = ($in['role'] === 'admin') ? 'admin' : 'viewer'; }
  if (!empty($in['password'])) {
    if (mb_strlen($in['password']) < 6) respond(['error' => 'Mật khẩu quá ngắn (tối thiểu 6 ký tự)'], 400);
    $fields[] = 'password_hash = ?';
    $params[] = password_hash($in['password'], PASSWORD_DEFAULT);
  }
  if (empty($fields)) respond(['error' => 'Không có gì để cập nhật'], 400);

  $params[] = $id;
  db()->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  respond(['ok' => true]);
}

if ($method === 'DELETE') {
  $id = $_GET['id'] ?? '';
  if ($id === '') respond(['error' => 'Thiếu id'], 400);
  if ($id === $me['id']) respond(['error' => 'Không thể tự xóa tài khoản đang đăng nhập'], 400);
  db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
  respond(['ok' => true]);
}

respond(['error' => 'Phương thức không được hỗ trợ'], 405);

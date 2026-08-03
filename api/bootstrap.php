<?php
declare(strict_types=1);

// Shared setup for every endpoint under /api: session, DB connection, and a
// handful of small helpers (json_input/respond/require_auth/require_admin).
// Every endpoint file starts with `require __DIR__ . '/bootstrap.php';`.

ini_set('display_errors', '0');
error_reporting(E_ALL);

session_set_cookie_params([
  'httponly' => true,
  'samesite' => 'Lax',
  'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
]);
session_start();

header('Content-Type: application/json; charset=utf-8');

$GLOBALS['__config'] = require __DIR__ . '/config.php';

function db(): PDO {
  static $pdo = null;
  if ($pdo !== null) return $pdo;

  $config = $GLOBALS['__config'];
  if ($config['driver'] === 'sqlite') {
    $pdo = new PDO('sqlite:' . $config['sqlite']['path']);
    $pdo->exec('PRAGMA foreign_keys = ON');
  } else {
    $c = $config['mysql'];
    $dsn = "mysql:host={$c['host']};dbname={$c['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $c['user'], $c['pass']);
  }
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  return $pdo;
}

function json_input(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw ?: '', true);
  return is_array($data) ? $data : [];
}

function respond($data, int $status = 200): void {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function current_user(): ?array {
  return $_SESSION['user'] ?? null;
}

function require_auth(): array {
  $u = current_user();
  if (!$u) respond(['error' => 'Chưa đăng nhập'], 401);
  return $u;
}

// Viewer (chỉ xem) may only read; every write endpoint calls this instead of
// require_auth() so the permission check lives in one place.
function require_admin(): array {
  $u = require_auth();
  if ($u['role'] !== 'admin') respond(['error' => 'Tài khoản chỉ xem không có quyền thực hiện thao tác này'], 403);
  return $u;
}

function new_id(): string {
  return bin2hex(random_bytes(12));
}

// Shared GET (list) / POST (create) / PUT (update, ?id=) / DELETE (?id=)
// handler for the clients/contracts/quotes tables, which all store their
// record as a single JSON blob so the API doesn't need to know their shape.
function handle_json_collection(string $table): void {
  $method = $_SERVER['REQUEST_METHOD'];
  require_auth();

  if ($method === 'GET') {
    $rows = db()->query("SELECT id, data FROM {$table} ORDER BY created_at ASC")->fetchAll();
    $items = array_map(function ($r) {
      $decoded = json_decode($r['data'], true);
      return array_merge(is_array($decoded) ? $decoded : [], ['id' => $r['id']]);
    }, $rows);
    respond(['items' => $items]);
  }

  if ($method === 'POST') {
    require_admin();
    $in = json_input();
    $id = !empty($in['id']) ? $in['id'] : new_id();
    unset($in['id']);
    $stmt = db()->prepare("INSERT INTO {$table} (id, data) VALUES (?, ?)");
    $stmt->execute([$id, json_encode($in, JSON_UNESCAPED_UNICODE)]);
    respond(['item' => array_merge($in, ['id' => $id])], 201);
  }

  if ($method === 'PUT') {
    require_admin();
    $id = $_GET['id'] ?? '';
    if ($id === '') respond(['error' => 'Thiếu id'], 400);
    $in = json_input();
    unset($in['id']);
    $stmt = db()->prepare("UPDATE {$table} SET data = ? WHERE id = ?");
    $stmt->execute([json_encode($in, JSON_UNESCAPED_UNICODE), $id]);
    if ($stmt->rowCount() === 0) respond(['error' => 'Không tìm thấy bản ghi'], 404);
    respond(['item' => array_merge($in, ['id' => $id])]);
  }

  if ($method === 'DELETE') {
    require_admin();
    $id = $_GET['id'] ?? '';
    if ($id === '') respond(['error' => 'Thiếu id'], 400);
    db()->prepare("DELETE FROM {$table} WHERE id = ?")->execute([$id]);
    respond(['ok' => true]);
  }

  respond(['error' => 'Phương thức không được hỗ trợ'], 405);
}

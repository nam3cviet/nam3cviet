<?php
require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
require_auth();

if ($method === 'GET') {
  $row = db()->query('SELECT data FROM settings WHERE id = 1')->fetch();
  respond(['settings' => $row ? (json_decode($row['data'], true) ?: new stdClass()) : new stdClass()]);
}

if ($method === 'PUT') {
  require_admin();
  $in = json_input();
  $json = json_encode($in, JSON_UNESCAPED_UNICODE);
  $exists = db()->query('SELECT id FROM settings WHERE id = 1')->fetch();
  if ($exists) {
    db()->prepare('UPDATE settings SET data = ? WHERE id = 1')->execute([$json]);
  } else {
    db()->prepare('INSERT INTO settings (id, data) VALUES (1, ?)')->execute([$json]);
  }
  respond(['settings' => $in]);
}

respond(['error' => 'Phương thức không được hỗ trợ'], 405);

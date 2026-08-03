<?php
// Cấu hình kết nối cơ sở dữ liệu.
//
// Trên Hostinger: hPanel -> Databases -> MySQL Databases -> tạo database mới,
// điền tên database/tên người dùng/mật khẩu bạn đã đặt vào bên dưới (host
// thường là "localhost"). Không cần đổi 'driver'.
//
// Không nên commit file này lên nơi công khai sau khi điền mật khẩu thật.

return [
  'driver' => getenv('APP_DB_DRIVER') ?: 'mysql', // 'mysql' (dùng thật) hoặc 'sqlite' (chạy thử local)

  'mysql' => [
    'host' => getenv('APP_DB_HOST') ?: 'localhost',
    'name' => getenv('APP_DB_NAME') ?: 'CHANGE_ME_db_name',
    'user' => getenv('APP_DB_USER') ?: 'CHANGE_ME_db_user',
    'pass' => getenv('APP_DB_PASS') ?: 'CHANGE_ME_db_password',
  ],

  'sqlite' => [
    'path' => getenv('APP_SQLITE_PATH') ?: (__DIR__ . '/data.sqlite'),
  ],
];

- 👋 Hi, I’m @nam3cviet
- 👀 I’m interested in ...
- 🌱 I’m currently learning ...
- 💞️ I’m looking to collaborate on ...
- 📫 How to reach me ...

<!---
nam3cviet/nam3cviet is a ✨ special ✨ repository because its `README.md` (this file) appears on your GitHub profile.
You can click the Preview link to take a look at your changes.
--->

## TVV — Phần mềm Quản lý Hợp đồng Tư vấn

Ứng dụng web một trang, đơn giản và chuyên nghiệp, giúp quản lý hợp đồng tư vấn: khách hàng, hợp đồng, thanh toán/công nợ, báo giá dịch vụ và báo cáo thống kê. Xây dựng riêng cho **Công ty TNHH Dịch Vụ Tư Vấn Doanh Nghiệp Việt (TVV)**.

### Tính năng
- **Hợp đồng & khách hàng**: thêm/sửa/xóa, mã hợp đồng tự sinh, tìm kiếm & lọc theo trạng thái, lưu người đại diện/chức danh của khách hàng.
- **Nhập nhanh khách hàng từ Giấy phép kinh doanh**: tải lên ảnh/PDF Giấy chứng nhận đăng ký doanh nghiệp (chọn nhiều file cùng lúc), hệ thống tự đọc bằng OCR và điền sẵn tên công ty, mã số thuế, địa chỉ, người đại diện, chức danh — cho phép chỉnh sửa trước khi lưu. Cần kết nối Internet; đây là nhận diện tự động nên độ chính xác không tuyệt đối.
- **Nhắc hạn & thông báo**: cảnh báo hợp đồng sắp/đã hết hạn và các đợt thanh toán quá hạn ngay trên trang Tổng quan.
- **Thanh toán / công nợ**: quản lý lịch thanh toán theo từng đợt cho mỗi hợp đồng, theo dõi đã thu/còn lại.
- **Báo giá dịch vụ tư vấn**: lập báo giá nhiều hạng mục, chiết khấu, VAT, mẫu in gọn gàng dễ đọc (dựa theo mẫu báo giá thực tế của TVV), chuyển báo giá thành hợp đồng.
- **In hợp đồng theo đúng mẫu công ty**: sinh văn bản hợp đồng đầy đủ 8 điều khoản (phạm vi công việc, giá trị hợp đồng, thanh toán, trách nhiệm các bên, nghiệm thu, tạm dừng/thay đổi/hủy, bảo mật, cam kết chung) dựa trên mẫu hợp đồng thật của TVV, tự điền thông tin hai bên, lịch thanh toán và số tiền bằng chữ.
- **Đa ngôn ngữ cho báo giá & hợp đồng**: in báo giá và hợp đồng bằng Tiếng Việt, English, 한국어, hoặc 中文 — các nhãn/điều khoản chuẩn được dịch sẵn; nội dung tự nhập (mô tả, ghi chú...) giữ nguyên ngôn ngữ đã nhập. Bản dịch chỉ mang tính tham khảo, **bản tiếng Việt là bản có giá trị pháp lý chính thức**.
- **Báo cáo & thống kê**: doanh thu theo tháng, phân bổ trạng thái hợp đồng, khách hàng theo giá trị.
- **Đăng nhập 2 cấp quyền & lưu dữ liệu dùng chung trên hosting** *(tùy chọn, cần deploy backend — xem mục riêng bên dưới)*: **Full quyền** (thêm/sửa/xóa mọi thứ) và **Chỉ xem** (chỉ xem, không sửa được — kể cả khi cố gọi thẳng API). Khi bật, dữ liệu được lưu trên server dùng chung cho mọi người đăng nhập, thay vì chỉ nằm trong trình duyệt của một máy.

### Cách chạy

**Dùng ngay (khuyến nghị)** — mở file `hop-dong-tu-van.html` bằng cách nhấp đúp hoặc kéo vào trình duyệt. Đây là bản đóng gói toàn bộ (HTML + CSS + JS) trong **một file duy nhất**, không cần cài đặt hay chạy server, đã điền sẵn thông tin công ty.

**Bản phát triển** (`index.html` + thư mục `css/`, `js/`) tách thành nhiều file để dễ chỉnh sửa, nhưng dùng ES module nên cần chạy qua server tĩnh (mở trực tiếp bằng `file://` sẽ bị trình duyệt chặn do CORS):

```bash
python3 -m http.server 8000
# rồi truy cập http://localhost:8000
```

Toàn bộ dữ liệu được lưu trong `localStorage` của trình duyệt (theo từng file/URL riêng). Vào mục **Cài đặt** để chỉnh thông tin công ty và sao lưu/khôi phục dữ liệu (xuất/nhập JSON).

> Lưu ý: nếu bạn sửa code trong `js/` hoặc `css/`, hãy chạy lại script gộp file (xem bên dưới) để cập nhật `hop-dong-tu-van.html`.

### Cấu trúc thư mục
```
hop-dong-tu-van.html  # File hoàn chỉnh — mở là dùng được ngay, không cần server
index.html             # Bố cục chính của bản phát triển (sidebar + các trang)
css/style.css           # Giao diện
js/store.js             # Lớp lưu trữ dữ liệu (localStorage)
js/utils.js              # Hàm tiện ích (định dạng ngày/tiền, escape HTML, số tiền bằng chữ...)
js/charts.js             # Vẽ biểu đồ cột/donut bằng Canvas (không phụ thuộc thư viện ngoài)
js/i18n.js               # Bản dịch nhãn/điều khoản chuẩn cho báo giá & hợp đồng (vi/en/ko/zh)
js/ocr.js                # Đọc ảnh/PDF Giấy phép KD (Tesseract.js + pdf.js qua CDN) và bóc tách thông tin
js/main.js               # Giao diện, điều hướng và xử lý sự kiện
```

### Tính năng cần Internet
Ứng dụng hoạt động offline hoàn toàn, **trừ** tính năng "Nhập nhanh khách hàng từ Giấy phép kinh doanh" — tính năng này tải thư viện nhận diện văn bản (Tesseract.js) và đọc PDF (pdf.js) từ CDN khi dùng lần đầu. Nếu không có Internet, ứng dụng vẫn chạy bình thường, chỉ riêng nút này sẽ báo lỗi khi bấm.

## Đăng nhập nhiều người dùng + lưu dữ liệu trên hosting (tùy chọn)

Mặc định ứng dụng chạy 100% trên trình duyệt, không cần server — mở file là dùng được ngay, như mô tả ở trên. Nếu muốn **nhiều người cùng dùng chung một bộ dữ liệu** (thay vì mỗi máy một bản riêng) và có **đăng nhập theo 2 cấp quyền**, bạn cần deploy thêm backend PHP + MySQL trong thư mục `api/` lên hosting có hỗ trợ PHP (ví dụ Hostinger shared hosting) — GitHub Pages **không** chạy được vì đó là hosting tĩnh, không chạy PHP.

**Khi backend chưa được deploy** (ví dụ trang đang chạy trên GitHub Pages, hoặc mở file standalone), ứng dụng tự động dùng lại đúng như cũ — không đăng nhập, dữ liệu lưu trong trình duyệt. Màn hình đăng nhập chỉ xuất hiện khi `api/` thực sự có mặt và trả lời được.

### Các bước triển khai trên Hostinger

1. **Tạo database MySQL**: hPanel → *Databases* → *MySQL Databases* → tạo database mới, ghi lại tên database / tên người dùng / mật khẩu.
2. **Tạo bảng dữ liệu**: hPanel → *Databases* → *phpMyAdmin* → chọn database vừa tạo → tab *SQL* → dán toàn bộ nội dung file `api/schema.sql` → **Go**.
3. **Điền cấu hình**: mở `api/config.php`, điền đúng tên database/tên người dùng/mật khẩu vào phần `'mysql' => [...]` (giữ nguyên `'driver' => 'mysql'`).
4. **Tải toàn bộ mã nguồn lên hosting** qua FTP (ví dụ FTP Rush) — tải cả `index.html`, `css/`, `js/`, và thư mục `api/` vào đúng thư mục web gốc của domain (xem hướng dẫn thư mục ở các phần trước của repo này).
5. **Tạo tài khoản quản trị đầu tiên**: mở trình duyệt tới `https://<domain-của-bạn>/api/setup.php`, dùng công cụ như trình duyệt/Postman gửi **POST** với nội dung JSON:
   ```json
   { "username": "admin", "password": "mat-khau-it-nhat-6-ky-tu", "full_name": "Tên của bạn" }
   ```
   (Cách đơn giản nhất: dùng phần mở rộng "Talend API Tester"/"REST Client" trên trình duyệt, hoặc nhờ Claude Code chạy giúp lệnh `curl` này nếu bạn thao tác qua Claude.)
   Endpoint này **tự khóa** ngay sau khi tài khoản đầu tiên được tạo — gọi lần 2 sẽ báo lỗi. Sau khi tạo xong, **xóa file `api/setup.php` khỏi server** để an toàn tuyệt đối.
6. **Truy cập domain** — màn hình đăng nhập sẽ hiện ra. Đăng nhập bằng tài khoản vừa tạo, vào mục **Người dùng** (chỉ Full quyền mới thấy) để tạo thêm tài khoản Chỉ xem cho nhân viên.

### Cách hoạt động (dành cho khi cần sửa/mở rộng)

- `api/` là một REST API PHP thuần (không cần Composer/framework), mỗi file là một endpoint, dùng PDO nên đổi được giữa MySQL (thật) và SQLite (test local) chỉ bằng biến môi trường `APP_DB_DRIVER`.
- Khách hàng/hợp đồng/báo giá được lưu dạng JSON nguyên khối trong cột `data` — giữ đúng cấu trúc dữ liệu phía trình duyệt, không cần đồng bộ schema hai bên.
- `js/auth.js`: gọi API đăng nhập/đăng xuất và đồng bộ dữ liệu.
- `js/store.js`: mỗi lần thêm/sửa/xóa vẫn ghi vào `localStorage` như cũ (giao diện không đổi tốc độ), đồng thời **âm thầm gửi thêm** thay đổi đó lên server ("write-behind"). Khi đăng nhập, dữ liệu mới nhất từ server sẽ tải về ghi đè `localStorage` trước khi hiển thị.
- Quyền **Chỉ xem** được chặn ở cả 2 lớp: giao diện ẩn hết nút thêm/sửa/xóa, **và** chính server cũng từ chối (403) nếu có ai cố gọi thẳng API — nên không thể bấm sai hay "bẻ" giao diện để ghi dữ liệu.

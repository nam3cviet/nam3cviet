- 👋 Hi, I’m @nam3cviet
- 👀 I’m interested in ...
- 🌱 I’m currently learning ...
- 💞️ I’m looking to collaborate on ...
- 📫 How to reach me ...

<!---
nam3cviet/nam3cviet is a ✨ special ✨ repository because its `README.md` (this file) appears on your GitHub profile.
You can click the Preview link to take a look at your changes.
--->

## Phần mềm Quản lý Hợp đồng Tư vấn

Ứng dụng web một trang, đơn giản và chuyên nghiệp, giúp quản lý hợp đồng tư vấn: khách hàng, hợp đồng, thanh toán/công nợ, báo giá dịch vụ và báo cáo thống kê.

### Tính năng
- **Hợp đồng & khách hàng**: thêm/sửa/xóa, mã hợp đồng tự sinh, tìm kiếm & lọc theo trạng thái.
- **Nhắc hạn & thông báo**: cảnh báo hợp đồng sắp/đã hết hạn và các đợt thanh toán quá hạn ngay trên trang Tổng quan.
- **Thanh toán / công nợ**: quản lý lịch thanh toán theo từng đợt cho mỗi hợp đồng, theo dõi đã thu/còn lại.
- **Báo giá dịch vụ tư vấn**: lập báo giá nhiều hạng mục, chiết khấu, VAT, in báo giá, chuyển báo giá thành hợp đồng.
- **Báo cáo & thống kê**: doanh thu theo tháng, phân bổ trạng thái hợp đồng, khách hàng theo giá trị.

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
js/utils.js              # Hàm tiện ích (định dạng ngày/tiền, escape HTML...)
js/charts.js             # Vẽ biểu đồ cột/donut bằng Canvas (không phụ thuộc thư viện ngoài)
js/main.js               # Giao diện, điều hướng và xử lý sự kiện
```

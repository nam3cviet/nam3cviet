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
Không cần cài đặt gì thêm — chỉ cần một trình duyệt hiện đại:

```bash
# Mở trực tiếp
open index.html   # macOS
# hoặc chạy một server tĩnh đơn giản rồi truy cập http://localhost:8000
python3 -m http.server 8000
```

Toàn bộ dữ liệu được lưu trong `localStorage` của trình duyệt. Vào mục **Cài đặt** để cấu hình thông tin công ty và sao lưu/khôi phục dữ liệu (xuất/nhập JSON).

### Cấu trúc thư mục
```
index.html        # Bố cục chính (sidebar + các trang)
css/style.css      # Giao diện
js/store.js        # Lớp lưu trữ dữ liệu (localStorage)
js/utils.js         # Hàm tiện ích (định dạng ngày/tiền, escape HTML...)
js/charts.js        # Vẽ biểu đồ cột/donut bằng Canvas (không phụ thuộc thư viện ngoài)
js/main.js          # Giao diện, điều hướng và xử lý sự kiện
```

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

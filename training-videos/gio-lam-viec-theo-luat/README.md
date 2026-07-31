# Video đào tạo: "Giờ Làm Việc Theo Luật"

Chủ đề: quy định thời giờ làm việc, nghỉ ngơi và làm thêm giờ theo
**Bộ luật Lao động 2019** (số 45/2019/QH14) và **Nghị định 145/2020/NĐ-CP**.

Đã tách thành 2 video ngắn (~1'45" và ~1'52"), có giọng đọc tiếng Việt, sẵn sàng
upload lên YouTube bằng công cụ `youtube-upload-tool` có sẵn trong repo.

## File

| Video | Nội dung | Thời lượng |
|---|---|---|
| `video1_gio_lam_them.mp4` | Phần 1 — Thời giờ làm việc bình thường, giờ đêm, làm thêm giờ, lương làm thêm (Điều 105, 106, 107, 98) | ~1:46 |
| `video2_nghi_ngoi_phep_nam.mp4` | Phần 2 — Nghỉ giữa giờ, chuyển ca, nghỉ hằng tuần, nghỉ lễ Tết, phép năm, lưu ý (Điều 109–114) | ~1:52 |

Các file `.mp4` không đưa vào git (dung lượng lớn) — được gửi trực tiếp qua chat.
Để tái tạo, chạy `python3 build.py` trong thư mục này (cần `ffmpeg`, `espeak-ng`,
và Chromium — script đã dùng sẵn `/opt/pw-browsers/chromium-1194`).

## Nguồn thiết kế (Canva)

Slide gốc (để bạn tự chỉnh sửa/xuất lại nếu muốn) cũng đã được tạo trên Canva:
- Edit: https://www.canva.com/d/czt6aKUdL1PUGu-
- View: https://www.canva.com/d/VZIGPcRLX2xhqOT

## Giọng đọc (TTS)

Phiên làm việc này chỉ được phép gọi ra một số host mạng nhất định (chính sách
egress của tổ chức) — Google Translate TTS và Hugging Face đều bị chặn (403),
nên giọng đọc được tạo **hoàn toàn offline** bằng `espeak-ng` (giọng
`vi` — Vietnamese Northern). Chất lượng còn hơi robot; nếu muốn giọng tự nhiên
hơn, có hai lựa chọn:
1. Mở file trong `html/` bằng Canva hoặc công cụ dựng video khác có tính năng
   text-to-speech, dùng kịch bản lời đọc trong `slides_data.py` (trường
   `narration`).
2. Dùng dịch vụ TTS ngoài (Google TTS, ElevenLabs, Azure Speech...) trên máy có
   mạng không bị giới hạn, rồi thay file `.wav` tương ứng trong `audio/` và
   chạy lại `python3 build.py`.

## Upload lên YouTube

1. Vào thư mục `youtube-upload-tool/` (đã có sẵn trong repo).
2. Làm theo `youtube-upload-tool/README.md`: tạo OAuth2 credentials trên
   Google Cloud Console, điền vào `.env`, `npm install && npm start`.
3. Mở `http://localhost:3000`, đăng nhập bằng tài khoản Google của bạn, chọn
   file video, đặt tiêu đề/mô tả/thẻ, và upload.

Gợi ý tiêu đề/mô tả:
- **Video 1**: "Giờ Làm Việc Theo Luật – Phần 1: Thời giờ làm việc & làm thêm giờ"
- **Video 2**: "Giờ Làm Việc Theo Luật – Phần 2: Nghỉ ngơi, nghỉ lễ Tết & phép năm"

> Nội dung mang tính tham khảo, không thay thế văn bản pháp luật chính thức.

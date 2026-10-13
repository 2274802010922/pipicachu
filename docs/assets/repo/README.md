# Bộ nhận diện repo · Best Solana Integration

- hero-vi.png / hero-en.png: banner README,1440×590.
- social-preview.png: ảnh chia sẻ,1200×630.
- manifest.json: nguồn nội dung, quyền logo và trạng thái link công bố giải.

Sinh lại từ root bằng `node scripts/readme/build-assets.mjs`. Thêm `--capture` để chụp website hiện tại theo VI/EN; bộ ảnh có manifest riêng trong `docs/assets/showcase/award-2026-10-13`. Cần Node24, npm ci và Chromium của Playwright.

Thiết kế gốc HTML/CSS dùng Be Vietnam Pro, logo pixel sẵn có, canvas cream / ink / lime / blue. Không dùng hình huy chương/chứng nhận của ban tổ chức. Tên giải theo owner xác nhận13/10/2026; chưa có URL công bố.

Ảnh social preview đã chuẩn bị; áp dụng ở GitHub repository Settings → Social preview → Edit → Upload an image khi owner đăng nhập. README banner hoạt động độc lập với thiết lập này.

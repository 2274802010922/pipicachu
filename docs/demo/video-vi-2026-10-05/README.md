# Video demo tiếng Việt · 05/10/2026

Bản dựng từ video do owner cung cấp, dài khoảng **2:56**, 1920×1080 / 30 fps / H.264 / AAC. Giọng nam tổng hợp `vi-VN-NamMinhNeural`, rate −5%, pitch −2Hz; phụ đề Việt gắn trong hình và SRT riêng.

## Câu chuyện và nguồn hình

- Persona Linh / Alex là **tình huống minh họa**, không phải khách hàng hay giao dịch đã trả phí.
- Nhóm mục tiêu: người mua/bán sản phẩm số qua cộng đồng, đã có ví Solana và chọn USDC. Đây là định vị, chưa phải kết quả validation.
- Footage do owner tự quay: seller bên trái, buyer bên phải, popup Phantom thật. Cảnh dựng đầu/cuối được phân biệt với cảnh thao tác ứng dụng.
- Demo **2 USDC Devnet**, seller nhận **1,96**, trọng tài **0,02**, hệ thống **0,02**. Không thay đổi chữ hoặc cảnh báo trong popup.
- File được bàn giao ngoài ứng dụng. Video gốc chỉ quay đánh dấu bàn giao, không quay việc gửi file.
- Clip chỉ có luồng xác nhận thông thường; không demo tranh chấp hay keeper. Không suy rộng thành nghiệm thu mọi tổ hợp ví.
- Giữ nguyên file gốc. Cắt cảnh mở khóa ví, tải đen và thao tác lặp; crop giữ tỷ lệ. Freeze frame để đọc được ghi trong edit manifest.
- Nhạc nền ambience do script tạo từ sóng sin, không lấy mẫu nhạc của bên thứ ba. Logo theo phạm vi riêng trong THIRD_PARTY_NOTICES, không được coi là tài sản Apache-2.0.

## Bàn giao và xuất bản

MP4, SRT, thumbnail, kịch bản, mô tả YouTube, edit manifest và QA report được giao riêng trong thư mục Downloads của owner. Không commit file quay gốc, MP4 hoặc audio build vào Git. Poster và tài liệu nhỏ được giữ trong repository.

Owner đã upload thủ công: [Xem video tiếng Việt](https://www.youtube.com/watch?v=mTY3e3qX_4k). Link được dùng trong README VI/EN và trang Demo. Bản EN chờ footage UI tiếng Anh riêng. Không sửa video/tài sản Picachu cũ.

## Dựng lại trên Windows

Cần Python 3.11, FFmpeg/FFprobe có libass, font Segoe UI và file quay gốc được owner cấp. TTS cần mạng tới dịch vụ giọng đọc; chỉ gửi lời dẫn, không gửi video, ví hoặc secret. Phiên bản Python package được pin ở `scripts/video-demo/requirements.txt`.

```powershell
python -m pip install -r scripts/video-demo/requirements.txt
python scripts/video-demo/narration.py --source "C:/duong-dan/video demo 1.mp4"
python scripts/video-demo/render_vi.py
python scripts/video-demo/verify.py
```

Chạy từ root repo. Output/cache dưới `work/video-demo-vi/` được Git ignore. Storyboard giữ tên file tương đối; đường dẫn nguồn thực chỉ nằm trong manifest build local. Script dựng cảnh bằng đồ họa native, không tạo popup ví giả.

## Giới hạn và kiểm tra

Tự động kiểm codec, kích thước, 30 fps, decode toàn file, timing phụ đề không chồng, tối đa hai dòng, QR đúng website và âm lượng không vượt 0 dBTP. Kiểm hình đại diện ở từng chương và popup ký; không coi kiểm máy hoặc nghe mẫu là nghe toàn bộ giọng đọc. Owner cần nghe bản hoàn chỉnh trước khi đăng.

Thông tin Devnet/không audit/quyền nâng cấp được giữ trong hình và lời dẫn. Không tuyên bố an toàn tuyệt đối, đã có khách hàng trả phí, đã được cấp phép hay tự kiểm chứng chất lượng hàng.

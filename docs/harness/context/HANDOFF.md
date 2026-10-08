# Handoff pipicachu · 08/10/2026

Đọc [CURRENT_STATE](CURRENT_STATE.md), [quality evidence](../../evidence/quality/README.md) và [owner checklist](../../deployment/OWNER_CHECKS.md). User đã yêu cầu hoàn tất đợt tối ưu hiện có, không thêm tính năng; phần cần kiểm thủ công họ làm sau.

## Tiếp tục từ bằng chứng

Revision/CI/build/source/IDL/binary được ghi trong evidence; không suy pass từ log cũ. Không sửa Picachu cũ hoặc dùng key/secret của nó. Key riêng pipicachu chỉ ở `work/private/` Git ignore. Không in hoặc copy key ra Git/chat.

Web: `npm ci`, `npm run verify`. Program Linux/WSL: `bash scripts/checks/program.sh`, Node 24, Agave 3.1.10 và Cargo trong PATH. Local key/mint/config là synthetic; không thay Devnet receipts. Windows WSL runtime có thể nằm trong `work/senior/runtime/`; artifact dựng không commit.

## Phần owner thực hiện sau

1. Redis credentials đã cấu hình và kiểm GET/SET/EVAL, Production ready true, unsigned simulation pass. GitHub keeper manual 37751655480 và 37754223664 pass, eligible 0. Không yêu cầu owner nhập lại; chưa dùng làm live payout/scheduled uptime proof.
2. Manager `CXjK…1pJN` ký duyệt test application `2dak…n5XeC8`, policy 1/10 USDC và 300/60/60/60 giây. Không đổi/revoke primary `7Pp…K39CG`.
3. Sau đó chạy acceptance CLI có guard, kiểm Phantom thật và keeper riêng; lưu receipt thật theo revision. Không coi inject wallet là extension proof.
4. User tester, WTP và EN video vẫn chưa thu thập. Video cũ giữ phạm vi v0.5; không gọi v0.6 đã quay/đã validation.

Không đánh dấu release kỹ thuật hoàn tất khi owner/production gates còn thiếu. Hoàn tất tự động và business validation là hai kết luận khác nhau.

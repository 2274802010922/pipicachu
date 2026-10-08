# Handoff pipicachu · 09/10/2026

Đọc [CURRENT_STATE](CURRENT_STATE.md), [quality evidence](../../evidence/quality/README.md) và [owner checklist](../../deployment/OWNER_CHECKS.md). User đã yêu cầu hoàn tất đợt tối ưu hiện có, không thêm tính năng; phần cần kiểm thủ công họ làm sau.

## Tiếp tục từ bằng chứng

Revision/CI/build/source/IDL/binary được ghi trong evidence; không suy pass từ log cũ. Không sửa Picachu cũ hoặc dùng key/secret của nó. Key riêng pipicachu chỉ ở `work/private/` Git ignore. Không in hoặc copy key ra Git/chat.

Web: `npm ci`, `npm run verify`. Program Linux/WSL: `bash scripts/checks/program.sh`, Node 24, Agave 3.1.10 và Cargo trong PATH. Local key/mint/config là synthetic; không thay Devnet receipts. Windows WSL runtime có thể nằm trong `work/senior/runtime/`; artifact dựng không commit.

## Phần owner thực hiện sau

1. Redis credentials đã cấu hình và kiểm GET/SET/EVAL, Production ready true, unsigned simulation pass. GitHub keeper manual 37751655480 và 37754223664 pass, eligible 0. Không yêu cầu owner nhập lại; chưa dùng làm live payout/scheduled uptime proof.
2. Manager approval/policy đã lên chain. Actual times1800/1800/300/60; không cần yêu cầu ký lại ngắn. Sáu nhánh CLI/finalized đã pass; read live/acceptance.json và keeper-payout.json. Testarb2dak sau kiểm đã pause, locked0; không đổi primary7Pp.
3. RPC public từng429, helper đã resume cùng nonce qua gateway và product operation tracker. Finality batch thay hàng chục call; không tạo deal/fund lặp. Dùng `--allow-long-policy --resume` để phục hồi đúng journal, không chạy fresh khi còn obligations.
4. Actual keeper dispatch37765632041 payout đúng, normal restart37766407120 eligible0. Forced recheck37766142958 lỗi report-storage; không nâng thành pass. Cron uptime vẫn riêng. Owner báo đã test Phantom thành công ngày 08/10, nhưng không có receipt hoặc phạm vi từng ca. User dữ liệu WTP và EN footage chưa có.
5. UI Manage thêm policy đang áp dụng và dialog exactvalues; browser test34 có kiểm field→transaction bytes, mocked provider không phải Phantom proof. Chạy verify/CI và cập nhật trạng thái theo revision hiện tại.
6. User yêu cầu bỏ JSON, không tiếp tục keeper. UI xóa auto-download/export/import, file input và verifier; dùng noteCommitment cho deliver/dispute/resolve, có NOTE_REQUIRED/NOTE_TOO_LONG. Contract/ABI giữ nguyên. Package helper chỉ còn dùng cho fixture lịch sử. Giữ chú giải hash không mã hóa hoặc chứng minh chất lượng.
7. Bản nháp keeper trước khi pause nằm ở local stash `8c7b36dd7683f4738cf3e732b5eb1c5d83e5c06b`, message “Bản nháp keeper tạm dừng ngày 08/10/2026”. Chưa push/test đủ; chỉ phục hồi nếu user tiếp tục phần đó. Đợt UI không áp dụng module/report/retry keeper mới.
8. BỏJSON implementation463b3fa, CI37812338693 web/program pass, Vercel đúngrevision/ready true; user không cần thêmenv. Read-only UI có proof localwork/simple-notes.
9. User chốt **live demo**, slide4phút phải thấy Business và Technical. Bộ mới4slideVIEN/source scripts/slides/content-pitch4.json, artifactswork/pitch-4min/output. Không dùng deck18slideR6 cho pitch. Kịch bản3:45+15sbuffer/live125s, amount1USDC nhất quán; primaryarbitrator7Pp và managerCXj không đổi. Owner rehearsal bằng đồng hồ, không giả kết quả timing hoặcWTP.

Không đánh dấu release kỹ thuật hoàn tất khi owner/production gates còn thiếu. Hoàn tất tự động và business validation là hai kết luận khác nhau.

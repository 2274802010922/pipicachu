# Handoff pipicachu · 08/10/2026

Đọc [CURRENT_STATE](CURRENT_STATE.md), [quality evidence](../../evidence/quality/README.md) và [owner checklist](../../deployment/OWNER_CHECKS.md). User đã yêu cầu hoàn tất đợt tối ưu hiện có, không thêm tính năng; phần cần kiểm thủ công họ làm sau.

## Tiếp tục từ bằng chứng

Revision/CI/build/source/IDL/binary được ghi trong evidence; không suy pass từ log cũ. Không sửa Picachu cũ hoặc dùng key/secret của nó. Key riêng pipicachu chỉ ở `work/private/` Git ignore. Không in hoặc copy key ra Git/chat.

Web: `npm ci`, `npm run verify`. Program Linux/WSL: `bash scripts/checks/program.sh`, Node 24, Agave 3.1.10 và Cargo trong PATH. Local key/mint/config là synthetic; không thay Devnet receipts. Windows WSL runtime có thể nằm trong `work/senior/runtime/`; artifact dựng không commit.

## Phần owner thực hiện sau

1. Redis credentials đã cấu hình và kiểm GET/SET/EVAL, Production ready true, unsigned simulation pass. GitHub keeper manual 37751655480 và 37754223664 pass, eligible 0. Không yêu cầu owner nhập lại; chưa dùng làm live payout/scheduled uptime proof.
2. Manager approval/policy đã lên chain. Actual times1800/1800/300/60; không cần yêu cầu ký lại ngắn. Sáu nhánh CLI/finalized đã pass; read live/acceptance.json và keeper-payout.json. Testarb2dak sau kiểm đã pause, locked0; không đổi primary7Pp.
3. RPC public từng429, helper đã resume cùng nonce qua gateway và product operation tracker. Finality batch thay hàng chục call; không tạo deal/fund lặp. Dùng `--allow-long-policy --resume` để phục hồi đúng journal, không chạy fresh khi còn obligations.
4. Actual keeper dispatch37765632041 payout đúng, normal restart37766407120 eligible0. Forced recheck37766142958 lỗi report-storage; không nâng thành pass. Cron uptime và Phantom extension accept/reject/transfers vẫn là cổng riêng; user dữ liệu WTP và EN footage chưa có.
5. UI Manage thêm policy đang áp dụng và dialog exactvalues; browser test34 có kiểm field→transaction bytes, mocked provider không phải Phantom proof. Chạy verify/CI và cập nhật trạng thái theo revision hiện tại.

Không đánh dấu release kỹ thuật hoàn tất khi owner/production gates còn thiếu. Hoàn tất tự động và business validation là hai kết luận khác nhau.

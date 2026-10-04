# Bàn giao v0.3 — một trọng tài

Đọc CURRENT_STATE, product, architecture và evidence. Không dùng kết quả v0.2 để nhận v0.3 hoàn tất.

Program mới do thay ABI; mint USDC Circle Devnet giữ nguyên. Key riêng work/private/escrow-single-program.json; wallet trọng tài test escrow-arbitrator.json là ví mới của pipicachu từ trước, không phải key Picachu cũ. Private key không đưa Git/Vercel/browser.

Đã kiểm: 38 local program checks, 6 finalized Devnet receipt với exact vault transfer, web verify, browser ký local/Vercel bằng provider test, CI và Vercel smoke. Script live-negative đầy đủ gặp RPC 429 nên không nhận 38 live checks pass. Phantom extension thật vẫn chưa kiểm. Các test bị gián đoạn đã đồng thuận hoàn tiền; không để principal test còn khóa.

Không cần env mới; program/mint version-control. Không auto penalty/keeper. Một arbitrator hết hạn cần đồng thuận hai bên, có thể kẹt tiền nếu không đồng ý. Source v0.3 tại aa30d7c; docs/evidence được cập nhật sau nghiệm thu. Giữ sửa tiêu đề README của owner.

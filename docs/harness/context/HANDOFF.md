# Bàn giao v0.3 — một trọng tài

Đọc CURRENT_STATE, product, architecture và evidence. Không dùng kết quả v0.2 để nhận v0.3 hoàn tất.

Program mới do thay ABI; mint USDC Circle Devnet giữ nguyên. Key riêng work/private/escrow-single-program.json; wallet trọng tài test escrow-arbitrator.json là ví mới của pipicachu từ trước, không phải key Picachu cũ. Private key không đưa Git/Vercel/browser.

Đã kiểm: 38 local program checks, 6 finalized Devnet receipt với exact vault transfer, web verify, browser ký local/Vercel bằng provider test, CI và Vercel smoke. Script live-negative đầy đủ gặp RPC 429 nên không nhận 38 live checks pass. Phantom extension thật vẫn chưa kiểm. Các test bị gián đoạn đã đồng thuận hoàn tiền; không để principal test còn khóa.

Không cần env mới; program/mint version-control. Không auto penalty. Có keeper finalize sau review deadline, không có keeper resolve tranh chấp. Một arbitrator hết hạn cần đồng thuận hai bên, có thể kẹt tiền nếu không đồng ý. Source v0.3 tại aa30d7c; docs/evidence được cập nhật sau nghiệm thu. Giữ sửa tiêu đề README của owner.

Lỗi manual mới: tạo deal thiếu registration được báo ARBITRATOR_NOT_REGISTERED trước khi ký. Đăng ký sau ký từng báo gộp WALLET_CHANGED; thêm explicit budget Devnet, tách đổi ví và thay message nhưng giữ binding nguyên vẹn. 37 unit/8 browser/full verify pass, đăng ký fresh Devnet với budget pass bằng CLI signer. Owner cần thử lại Phantom sau deploy; không nhận đã kiểm extension thực. Không sửa Rust/ABI/mint/Program ID.

Flow cuối: seller tạo link, buyer nạp, seller giao, buyer xác nhận hoặc khiếu nại; hết hạn không khiếu nại có keeper GitHub Actions tự finalize. Không seller cọc, không buyer tạo deal. Admin preparation/consent trước funding giữ nguyên. 45 unit/8 browser và CI pass; service test thực có keeper receipt finalized, disputed không bị chi và đã refund fixture. Secret keeper Devnet đã cấu hình repo; không cần Vercel env mới. Schedule 5 phút active, service run được nghiệm thu bằng workflow_dispatch, chưa xác nhận tick schedule tự nhiên.

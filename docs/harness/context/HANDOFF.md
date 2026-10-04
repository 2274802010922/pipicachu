# Rollout phí hệ thống — 05/10/2026

Owner đã chọn treasury CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN. Chương trình cùng ID đã upgrade Devnet, dump khớp SHA256 cefc482eeb4d2b7b3f6cece0e44a637ac7e7639d805abb21a6f977546166492e. FeeConfig immutable đã initialize đúng treasury. Legacy funded/delivered trước upgrade đã confirm thành công sau upgrade, snapshot platformFee=0.

Đang rollout web/keeper lên main, tiếp tục kiểm số tiền live mới, refund, browser/CI/Vercel và keeper. Chưa nhận nghiệm thu end-to-end. Local checkpoint trước rollout: 39 program checks, native legacy max512, 53 unit/17 browser pass. Không cần env Vercel mới.

## Ngữ cảnh trước rollout (lịch sử, không phải trạng thái hiện tại)

# Bàn giao v0.3 — một trọng tài

Fee-platform WIP: user duyệt tổng 2% (1 arb +1 platform), refund zero. Local code/IDL/UI/keeper/tests đã chuẩn bị, 39 program checks + native legacy-512 compatibility +53 unit/17 browser pass. CHƯA deploy/push; đang cần public treasury wallet user chọn. Không tự chọn treasury hoặc deploy placeholder. Giữ Program ID/layout876, append9 bytes fee/version vào padding; legacy snapshot0 không hồi tố. FeeConfig immutable v1 cần initializer. Xem CURRENT_STATE trước tiếp tục; production hiện vẫn1%.

Đọc CURRENT_STATE, product, architecture và evidence. Không dùng kết quả v0.2 để nhận v0.3 hoàn tất.

Program mới do thay ABI; mint USDC Circle Devnet giữ nguyên. Key riêng work/private/escrow-single-program.json; wallet trọng tài test escrow-arbitrator.json là ví mới của pipicachu từ trước, không phải key Picachu cũ. Private key không đưa Git/Vercel/browser.

Đã kiểm: 38 local program checks, 6 finalized Devnet receipt với exact vault transfer, web verify, browser ký local/Vercel bằng provider test, CI và Vercel smoke. Script live-negative đầy đủ gặp RPC 429 nên không nhận 38 live checks pass. Phantom extension thật vẫn chưa kiểm. Các test bị gián đoạn đã đồng thuận hoàn tiền; không để principal test còn khóa.

Không cần env mới; program/mint version-control. Không auto penalty. Có keeper finalize sau review deadline, không có keeper resolve tranh chấp. Một arbitrator hết hạn cần đồng thuận hai bên, có thể kẹt tiền nếu không đồng ý. Source v0.3 tại aa30d7c; docs/evidence được cập nhật sau nghiệm thu. Giữ sửa tiêu đề README của owner.

Lỗi manual mới: tạo deal thiếu registration được báo ARBITRATOR_NOT_REGISTERED trước khi ký. Đăng ký sau ký từng báo gộp WALLET_CHANGED; thêm explicit budget Devnet, tách đổi ví và thay message nhưng giữ binding nguyên vẹn. 37 unit/8 browser/full verify pass, đăng ký fresh Devnet với budget pass bằng CLI signer. Owner cần thử lại Phantom sau deploy; không nhận đã kiểm extension thực. Không sửa Rust/ABI/mint/Program ID.

Flow cuối: seller tạo link, buyer nạp, seller giao, buyer xác nhận hoặc khiếu nại; hết hạn không khiếu nại có keeper GitHub Actions tự finalize. Không seller cọc, không buyer tạo deal. Admin preparation/consent trước funding giữ nguyên. 45 unit/8 browser và CI pass; service test thực có keeper receipt finalized, disputed không bị chi và đã refund fixture. Secret keeper Devnet đã cấu hình repo; không cần Vercel env mới. Schedule 5 phút active, service run được nghiệm thu bằng workflow_dispatch, chưa xác nhận tick schedule tự nhiên.

UX cọc: bước 2 sau seller tạo link, trực tiếp trên deal. Required/available/missing, chỉ đúng arb wallet thấy nút top-up phần thiếu + nhận deal; có đủ pool thì tái sử dụng. Chặn fund trên UI nếu đọc cọc chưa đủ/unknown; contract vẫn kiểm. Cọc deposit không đồng nghĩa reserve (reserve lúc buyer fund). 48 unit/11 browser, Devnet atomic top-up/accept pass. Không đổi Program ID hoặc env.

05/10 UI gọn: tiến trình current có lime/glow tĩnh + nhãn/aria-current; một action card và CTA chính, complaint vẫn cạnh confirm. Detail mặc định đóng; mobile current summary, CTA toàn chiều ngang. 48 unit/16 browser/axe/responsive, visual desktop/mobile và ký Devnet bằng provider test pass. Không gọi là Phantom extension proof. Không thay core/keeper/Program ID; script demo đã đồng bộ labels mới.

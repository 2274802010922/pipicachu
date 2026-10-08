# Câu hỏi Business và Technical

Trả lời ngắn, rồi dẫn nguồn khi giám khảo muốn xem thêm. Không suy test code thành validation khách hàng.

## Business

**Ai gặp vấn đề và ai dùng?** Người mua/bán file hoặc template qua cộng đồng, đã dùng ví Solana và thanh toán USDC. Người mua muốn kiểm trước; người bán muốn biết tiền đã được ký quỹ trước khi giao. Admin cộng đồng hỗ trợ dispute. Đây là nhóm mục tiêu đề xuất, chưa có nghiên cứu khách hàng riêng.

**Ai trả tiền và vì sao?** Khi payout, seller proceeds bị trừ 1% platform và 1% arbitrator. Giá trị đề xuất là shared deal terms/status, program custody và workflow đơn giản. Khả năng nhóm này chấp nhận phí chưa được đo; [validation kit](../product/validation-kit.md) là bước tiếp theo. Phí Devnet không phải doanh thu.

**Sẽ có người dùng đầu tiên bằng cách nào?** Đề xuất pilot qua 1–2 admin cộng đồng đang có giao dịch USDC, rồi 5–10 người mua/bán. Đo hoàn thành không trợ giúp, lỗi, hiểu phí/deadline và quyết định trên một mức phí cụ thể. Chưa có người dùng/đối tác cam kết được công bố.

**Có đối thủ không?** Có. [Escrow.com](https://www.escrow.com/what-is-escrow) có flow điều kiện, thanh toán, giao hàng, kiểm tra và giải ngân. [Kleros](https://docs.kleros.io/) cung cấp hạ tầng xử tranh chấp; scope khác mô hình một trọng tài allowlist. Chuyển USDC thẳng và admin giữ tiền cũng là lựa chọn hiện tại. Không tuyên bố thị trường trống.

**Nếu đối thủ thêm feature tương tự?** Escrow không phải ý tưởng độc quyền. Điểm đề xuất của pipicachu là quy trình cho cộng đồng đã dùng USDC: standing consent, prepaid capacity, link deal và UI theo vai. Lợi thế phân phối/cộng đồng chỉ có thể được chứng minh qua pilot; hiện chưa có moat đã kiểm chứng. Độ hoàn thiện code là lợi thế triển khai, không tự thay moat.

**Vì sao không dùng admin giữ tiền như hiện nay?** Người mua/bán vẫn có thể chọn cách đó. pipicachu giữ principal trong vault của program và cố định recipient. Admin xử dispute mà không có đường rút principal về ví riêng. Đánh đổi là cần ví/SOL/USDC và vẫn phải tin phán quyết cũng như quyền nâng cấp Devnet.

## Technical

**Blockchain thực sự làm gì?** Thực thi custody, quyền tiền và chuyển SPL Token nguyên tử; không chỉ ghi database lên chain. [Constraints](../../programs/pipicachu-escrow/src/contexts.rs), [settlement](../../programs/pipicachu-escrow/src/settlement.rs). Server không giữ key của các role.

**Tại sao Solana?** PDA vault giữ USDC, SPL Token CPI chia principal/fees trong một transaction; Clock/finality/Phantom là phần trực tiếp của flow. Đội tự xây program và client; dùng Anchor/SDK làm hạ tầng. Không cần tạo token riêng.

**Trọng tài có lấy tiền được không?** Theo code hiện tại, ruling chỉ payout tới seller/fee recipients cố định hoặc refund buyer. Không chọn người nhận tùy ý. Tuy nhiên trọng tài vẫn có thể xử sai; program còn upgrade authority. [Trust boundary](../architecture/v06.md).

**Cọc có bồi thường hoặc phạt xử sai không?** Không. Pool cọc giới hạn capacity; phần reserve mở khi deal kết thúc. MVP không có insurance hoặc slashing. Không dùng stake để tuyên bố trọng tài chắc chắn trung thực.

**Trọng tài không xử thì sao?** Policy 1 cho xử sau SLA; hai bên vẫn có mutual settlement. Nếu trọng tài bỏ xử hoàn toàn và hai bên bất đồng thì tiền có thể tiếp tục bị khóa. [Live late/mutual receipts](../evidence/v06/live/acceptance.json).

**Có tự động giải ngân không?** Contract không tự chạy theo đồng hồ. Keeper/người dùng gửi finalize; contract kiểm state/deadline lại. [Service payout thật](../evidence/v06/live/keeper-payout.json) đã có, nhưng workflow dispatch không chứng minh uptime cron. Trong pitch dùng buyer confirm.

**Làm sao không nạp/chi hai lần khi RPC timeout?** Operation giữ signature/message/blockhash/expiry; retry cùng bytes, đọc signature/history/finality trước ký lại. Contract chặn terminal settlement lặp. [Operation](../../src/escrow/operation.ts), [tests](../../tests/unit/operation.test.ts).

**Có tự xác minh file đúng không?** Không. File/bằng chứng gửi ngoài ứng dụng; UI chỉ ghi chú/hash và các bước ký. Hash không chứng minh chất lượng, không mã hóa ghi chú. Tính năng JSON/file verifier đã bỏ.

**122+41 nghĩa là gì?** 122 unit/integration và 41 browser của revision 463b3fa; không cộng nhiều lần chạy. Native Rust/program executable có nhóm riêng. Sáu nhánh CLI, Phantom owner report, keeper receipt và paid users là các nguồn bằng chứng khác nhau. [Current report](../evidence/quality/README.md).

**Có audit/Mainnet chưa?** Chưa. Đây là Devnet prototype; còn quyền nâng cấp và [dependency exceptions](../legal/dependency-exceptions.md) đã khai báo. Các checks không thay audit độc lập.

## Giải và scope

Ưu tiên Technical Build, Solana Integration và System Architecture qua sản phẩm chạy thật/constraints/receipts/CI. Product & Business có story và mô hình phí, nhưng validation còn thiếu. UX chứng minh bằng demo và QA, không bằng tuyên bố tự chấm. Đợt này không có AI trong user flow, không định vị Developer Tooling hoặc công bố tác động xã hội đã đo.

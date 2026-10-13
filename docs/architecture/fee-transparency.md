# Minh bạch phí và điều kiện đã ký

## Người dùng kiểm tra gì?

Deal mới payout theo 98% người bán, 1% trọng tài, 1% hệ thống; refund trả đủ principal và không thu phí dịch vụ. Mỗi phí làm tròn xuống atom USDC, phần dư thuộc người bán. Deal legacy giữ phí đã lưu, không bị ép thành 98/1/1.

Bảng trước ký lấy principal, phí và các bên từ account deal; ví hệ thống lấy từ FeeConfig PDA. Hiển thị địa chỉ đầy đủ, số tiền thực, quy tắc refund và phí mạng/rent SOL riêng. Không dùng giá trị môi trường để quyết định phí. Treasury trùng một bên thì các khoản được cộng vào cùng ATA nhưng vẫn trình bày riêng theo vai.

## Binding trước nạp

Instruction mới `fund_reviewed` bổ sung FeeConfig readonly, giữ nguyên allocation/ABI các account hiện có. Instruction `fund` cũ còn để tương thích; không có đường quản trị sửa phí/deal trong code hiện tại.

SHA-256 đầu vào theo đúng thứ tự byte:

1. ASCII domain `pipicachu:fund-review:v1`.
2. Bảy pubkey 32 byte: program, deal, seller, buyer, arbitrator, mint, treasury.
3. Bốn u64 little-endian: principal, arbitrator fee, platform fee, bond.
4. Ba byte: fee/workflow/resolution policy version.
5. Bốn i64 little-endian: fund deadline, delivery/review/arbitration duration.
6. Borsh string: u32 byte length little-endian + UTF-8 terms.

UI chụp điều kiện trước mở dialog, đọc lại trước đưa sang ví; chữ ký transaction chứa hash đã duyệt. Rust tính lại từ account thật và FeeConfig trước CPI nhận tiền. Sai hash trả lỗi **6009 PaymentTermsChanged**, không chuyển principal hoặc khóa cọc. Mutable state/hash bàn giao không thuộc điều kiện ký ban đầu.

Nguồn: [Rust](../../programs/pipicachu-escrow/src/funding.rs), [client](../../src/escrow/payment-terms.ts), [executable tests](../../tests/program/v06.ts).

## Bằng chứng kết quả

UI đọc transaction finalized từ RPC, tìm đúng instruction settlement của program/deal và SPL transferChecked từ vault. Kiểm mint, decimals, nguyên lượng, tổng từng token account, gồm alias treasury. Chỉ hiện “đã đối chiếu” nếu khớp đủ; thiếu RPC/CPI hoặc receipt failed không được báo pass. Bảng điều kiện vẫn tách biệt với bằng chứng chuyển tiền.

Nguồn: [verifier](../../src/escrow/settlement-receipt.ts), [negative tests](../../tests/unit/settlement-receipt.test.ts).

## Quyền nâng cấp và bất biến

`GET /api/program-status` đọc program và ProgramData đúng PDA/loader ở finalized, kiểm tag/layout rồi đọc Option upgrade authority. Cache thành công tối đa30 giây. RPC lỗi hoặc dữ liệu sai là unknown, không phải immutable. Health cũng dùng kết quả này.

Một manager/trọng tài không có instruction sửa phí khác với việc program không còn quyền upgrade. Multisig/timelock giảm quyền đơn phương nhưng vẫn cho nâng cấp. Chỉ khi ProgramData authority=None mới được công bố đã bỏ quyền nâng cấp; đây là thao tác không thể hoàn tác. Khi cần đổi contract sau đó, phát hành Program ID mới và giữ đường đọc/settlement phiên bản cũ. Không migrate hoặc đổi điều kiện deal cũ một cách ngầm định.

Phạm vi bảo đảm: code hiện tại không cho sửa principal/phí/recipients sau tạo và program immutable không thể được owner thay bằng code khác. Điều này không chứng minh chất lượng hàng hay phán quyết đúng; không biến demo Devnet thành audit/Mainnet. Quyền freeze của issuer USDC và dữ liệu RPC vẫn là ranh giới tin cậy riêng.

## Cổng phát hành

- Native Rust, SBF lifecycle/alias/legacy/capacity và các biến thể hash phải pass.
- Web unit, browser VI/EN/375–1440/axe; giả lập RPC/provider được ghi riêng với Phantom thật.
- Snapshot/hash các account trước/sau upgrade giữ nguyên; đối chiếu binary deployed với binary đã test.
- Devnet fixture reviewed-fund → deliver → confirm phải finalized, đúng delta0,98/0,01/0,01 và mở cọc.
- Chỉ bỏ upgrade authority trên Devnet sau các bước trên; xác nhận lại on-chain rồi để UI đổi nhãn từ dữ liệu live. Không đổi cấu hình để giả “immutable”.

Không có biến môi trường hoặc manager key mới cho Vercel. [Solana: quyền nâng cấp và immutable](https://solana.com/docs/programs/deploying#make-your-program-immutable).

# pipicachu · Giao dịch trung gian C2C

**Ký quỹ USDC cho người mua/bán sản phẩm số qua cộng đồng: một link, điều kiện rõ, tiền trong vault và trọng tài xử tranh chấp.**

[Sản phẩm](https://pipicachu.vercel.app) · [Mã nguồn](https://github.com/2274802010922/pipicachu) · [Slide VI/EN](slides-v06.md) · [Kịch bản live 4 phút](pitch-4min.md) · [Bằng chứng](../evidence/quality/README.md)

## Vấn đề và người dùng

Người bán file/template muốn nhận tiền trước; người mua chưa quen muốn kiểm hàng trước. Admin cộng đồng có thể làm trung gian, nhưng giữ tiền giao dịch trong ví cá nhân thêm một phụ thuộc cho cả hai bên. Nhóm mục tiêu là người mua/bán **đã có ví Solana và chọn USDC**; ứng dụng không cung cấp đổi VND hoặc marketplace.

[FTC cảnh báo rủi ro thanh toán giả khi bán online](https://consumer.ftc.gov/consumer-alerts/2022/07/selling-stuff-online-heres-how-avoid-scam). Đây là bối cảnh của tình huống, chưa phải dữ liệu nhu cầu riêng của nhóm USDC hoặc khách hàng pipicachu.

## Giải pháp và luồng hoạt động

Người bán chọn trọng tài khả dụng, tạo link → người mua xem điều kiện và nạp USDC → người bán gửi hàng qua kênh đã thống nhất rồi ký xác nhận bàn giao → người mua xác nhận hoặc khiếu nại trước hạn. Khi tranh chấp, trọng tài chọn payout/refund tới recipient đã chốt. Ghi chú ngắn và ký ví là thao tác trong app; file/bằng chứng không upload lên server.

Trọng tài đăng ký, được manager duyệt, nạp pool cọc và bật nhận trước. Standing consent bỏ lượt ký nhận mỗi deal; capacity được reserve khi buyer fund. Cọc không phải bảo hiểm hoặc phạt xử sai.

## Business và khác biệt

- **Phí đã xây:** payout 98% người bán +1% trọng tài +1% hệ thống. Refund trả toàn tiền giao dịch, không phí dịch vụ; SOL mạng riêng.
- **Giá trị đề xuất:** chia sẻ terms/status, program custody thay ví cá nhân trung gian, workflow theo vai và cọc sẵn.
- **Tiếp cận đề xuất:** pilot qua 1–2 admin cộng đồng dùng USDC, mời 5–10 người mua/bán thử và quyết định trên mức phí cụ thể. Đây là kế hoạch, chưa phải traction.
- **Cần kiểm chứng:** completion không trợ giúp, mức hiểu phí/deadline, ý định dùng lại và willingness-to-pay. Chưa có doanh thu hoặc moat được chứng minh.

Escrow không phải ý tưởng độc quyền. Chuyển USDC thẳng, admin custody, Escrow.com và Kleros là các alternatives có scope/trade-off khác; [so sánh và Q&A](questions.md).

## Technical Build và vai trò Solana

Đội tự xây program Anchor, state machine, account constraints, vault/cọc/settlement, client theo IDL, transaction recovery, RPC proxy/limiter và UI. Solana thực thi quyền giữ/chuyển tiền bằng **PDA + SPL Token CPI**, với Clock mạng, ví ký và finality. Payout/phí nguyên tử; terminal chặn chi lặp và unlock cọc một lần.

[Constraints](../../programs/pipicachu-escrow/src/contexts.rs) · [Settlement](../../programs/pipicachu-escrow/src/settlement.rs) · [Recovery](../../src/escrow/operation.ts) · [Nguồn kế thừa](../../THIRD_PARTY_NOTICES.md)

## Bằng chứng và demo

| Bằng chứng                                                                            | Phạm vi                                                                           |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [CI 37818489543](https://github.com/2274802010922/pipicachu/actions/runs/37818489543) | Source e9b53f0: web/program pass; 122 unit/integration +41 browser                |
| [Sáu nhánh Devnet finalized](../evidence/v06/live/acceptance.json)                    | Confirm, hết hạn giao, ruling payout/refund, xử muộn, mutual refund; CLI fixtures |
| [Keeper payout](../evidence/v06/live/keeper-payout.json)                              | Service signer thật, chia tiền và unlock; dispatch không chứng minh cron uptime   |
| Owner báo đã test Phantom thành công08/10                                             | Báo cáo thủ công; không suy thành receipt riêng cho mọi ca                        |

Pitch **4 slide, live 125 giây**, deal mới1 USDC đã tạo trước; nạp → bàn giao → xác nhận → kết quả0,98/0,01/0,01. [Một kết quả đã chạy trước](https://pipicachu.vercel.app/deals/25JTcp8NdyqQoTksumh8hkUszc8SD3Ea3t2SNmor8Buj) để đối chiếu, không giả thành thao tác vừa chạy trên sân khấu. [Video v0.5](https://www.youtube.com/watch?v=mTY3e3qX_4k) giữ làm footage happy path 2 USDC, không phải video toàn bộ v0.6.

## Trạng thái, giới hạn và đội

Prototype **Devnet**, chưa audit độc lập/Mainnet, còn upgrade authority. Trọng tài vẫn có thể xử sai; bỏ xử và hai bên bất đồng có thể khóa tiền. Hash không kiểm chất lượng file. Cron reliability, rehearsal timing và WTP chưa có kết quả được công bố. Demo live dùng buyer confirm.

Ưu tiên Product & Business và Technical Build, đặc biệt Solana Integration/System Architecture. Không có AI trong user flow hiện tại. Solo builder: [@2274802010922](https://github.com/2274802010922). Code Apache-2.0; quyền logo/artwork tách riêng. [License/notices](../legal/README.md).

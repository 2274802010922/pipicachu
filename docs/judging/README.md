# Judge guide · khoảng 90 giây

**pipicachu** là công cụ ký quỹ USDC cho người mua/bán sản phẩm số qua cộng đồng đã dùng Solana. Người bán tạo link; người mua nạp vào vault; bàn giao ngoài ứng dụng; người mua xác nhận hoặc mở tranh chấp.

[Website](https://pipicachu.vercel.app) · [Video happy path v0.5](https://www.youtube.com/watch?v=mTY3e3qX_4k) · [Trạng thái nghiệm thu](../evidence/quality/README.md) · [Quality CI](https://github.com/2274802010922/pipicachu/actions/workflows/quality.yml).

## Bốn tiêu chí Technical Build

| Tiêu chí                                             | Phần cần xem                                                                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical Difficulty & Depth · 30                    | [Settlement/alias](../../programs/pipicachu-escrow/src/settlement.rs), [race/capacity/late ruling](../../tests/program/v06.ts), [pending recovery](../../src/escrow/operation.ts) |
| Architecture & Smart Contract Quality · 25           | [Account constraints](../../programs/pipicachu-escrow/src/contexts.rs), [ABI/policy](../architecture/v06.md), [module boundaries](../architecture/quality.md)                     |
| Solana Stack, Composability & Performance · 25       | PDA vault + SPL Token CPI; Clock và finality; [RPC benchmark](../evidence/quality/snapshot-benchmark.json); transaction metrics trong gói evidence                                |
| Build Evidence, Documentation & Reproducibility · 20 | [Checkout mới → test](../testing/reproduce.md), source-derived IDL, pinned tools, CI artifacts và receipt/snapshot theo revision                                                  |

Principal và recipient cố định; payout 98/1/1 hoặc refund 100% nguyên tử; cọc reserve/unlock đúng một lần. Treasury trùng vai trò được gộp theo token account. Manager chỉ quản lý registry; trọng tài không rút principal về ví riêng. Không server giữ key người mua/người bán/manager. Keeper chỉ gửi finalize khi đủ điều kiện; contract kiểm lại state và deadline.

## Product & UX

Bốn field tạo deal. Trọng tài đăng ký → manager duyệt → nạp cọc → bật nhận trong workspace riêng; standing consent bỏ lượt ký nhận từng deal. Nút chính theo vai/trạng thái; VI/EN, bàn phím và responsive được kiểm ở 375/768/1024/1440 px.

Mô hình phí là giả thuyết 1% hệ thống + 1% trọng tài khi payout; refund không phí. [Bộ dùng thử](../product/validation-kit.md) chưa có dữ liệu tester hoặc khách trả phí. Đợt này không xây AI Product.

## Trust boundary và giới hạn

Deal 876 byte, policy version giữ điều kiện cũ: policy 0 có cutoff; policy 1 cho xử muộn. Terminal transaction đầu tiên thắng. Hash bằng chứng không xác minh chất lượng hàng; cọc không phải bảo hiểm/phạt xử sai. Trọng tài bỏ xử và hai bên bất đồng có thể khóa tiền.

Devnet còn quyền nâng cấp, chưa audit độc lập. Redis/keeper và manager/Phantom cần [owner kiểm riêng](../deployment/OWNER_CHECKS.md). Read-only smoke hoặc provider inject không thay nghiệm thu ký thật. Video hiện có không chứng minh tính năng v0.6.

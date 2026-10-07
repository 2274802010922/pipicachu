# Judge guide · đọc khoảng90 giây

**pipicachu** dành cho người mua/bán sản phẩm số qua cộng đồng đã có Solana wallet và chọnUSDC: seller tạo link, buyer nạp vào program vault, bàn giao ngoài ứng dụng, xác nhận hoặc dispute. ChưaMainnet/chưaaudit/chưaWTP.

- [Website](https://pipicachu.vercel.app) · [video happy-path v0.5](https://www.youtube.com/watch?v=mTY3e3qX_4k) · [evidence](../evidence/README.md)
- [Rust](../../programs/pipicachu-escrow/src/lib.rs) · [IDL](../../client/idl/escrow.json) · [kiến trúc v0.6](../architecture/v06.md)
- [Tests](../testing/v06-gates.md) · [CI](https://github.com/2274802010922/pipicachu/actions/workflows/quality.yml)

## Technical Build / Solana / Architecture

Principal PDA vault, fixed mint/participants/recipients; atomic98/1/1/refund100%; reserve/unlock bond exactly once; terminal state ngăn chi lặp. Treasury alias được gộp theo ATA thật. Không backend giữ private key buyer/seller/manager. Keeper chỉ gửi finalize permissionless; contract kiểm deadline/state.

v0.6 phân quyền ManagerConfig+application, bootstrap một lần, manager transfer2signatures; allowlist khôngKYC. Policy version trong padding giữ Deal876byte; deal cũ0 giữ hạn, deal mới1cho xử muộn. UI view-model +operation recovery +evidence JSON local; Redis giới hạn và keeper report, khôngdatabase user.

Kiểm các test negative đúng mã lỗi, concurrency capacity, ABI compatibility, signedmessage/owner checks; [hotfix receipt thật](../evidence/hotfix-alias-recovery.json). Các kiểm local và cổng production/owner chưa kiểm được tách rõ trong current status. CLI không tự được tínhPhantom.

## Product / UX

Bốn field tạo deal; trọng tài đăng ký→managerduyệt→nạp cọc→bật nhận riêng. Một nút chính theo role/state; không đòi trọng tài ký mỗi deal. Phí đề xuất1%platform+1%arb, chưa có khách trả phí. [Bộ dùng thử](../product/validation-kit.md) chờ owner mời tester. Không tham giaAIProduct trong đợt này.

## Giới hạn quan trọng

Hash không xác minh chất lượng file. Trọng tài được xử muộn không đảm bảo họ sẽ xử; bỏ xử và hai bên không đồng thuận vẫn khóa tiền. Cọc khôngbảo hiểm/phạtxửsai. Program giữ upgradeauthority Devnet; CSP report-only tới lúc extensionthật pass. Video cũ chỉ happy-pathv0.5, không demo các phầnv0.6.

# Trạng thái — 04/10/2026

Đã chuyển scope sang escrow USDC Devnet, giữ thương hiệu/UI; tra cứu archived ở checkpoint 7315d42. Picachu cũ không sửa.

Chương trình .so build thành công sau sửa stack allocation bằng Box; IDL sinh từ Rust. Bảy flow và 42 checks pass cả local validator lẫn Devnet USDC Circle. Có thêm destination/vault substitution và stale proposal acceptance. Program upgrade thành công, code dump khớp prefix .so, phần dư zero padding. Web: 23 unit/IDL tests, 7 browser tests, 10 routes build, lint/typecheck/links pass. Browser lần đầu có 2 lỗi locator route announcer đã sửa selector đúng vùng, không giảm assertion.

Đã kiểm script CI-like Linux/WSL với wallet mới, genesis Config/mint synthetic, không cần key maintainer: 42 checks pass. Devnet run đầu dừng vì seller thiếu SOL rent khi tạo deal thứ sáu; bổ sung SOL và chạy lại toàn bộ pass. RPC public có 429 và retry, ghi đúng giới hạn nguồn dữ liệu.

Browser signer-to-program flow pass cả local website và https://pipicachu.vercel.app với provider test: create, accept hai trọng tài, fund, deliver, reject signature không đổi state, confirm, read completed, axe, VI/EN, storage privacy. Private key ở Node, không đưa vào browser; KHÔNG phải Phantom extension thực. Phantom popup thật vẫn chưa được kiểm bằng automation.

Commit f707958 đã push main, CI Quality 37203335589 pass cả quality và escrow-program; Vercel health đúng SHA và smoke đọc deal finalized pass. Bản bàn giao tiếp theo bổ sung evidence, nhãn cọc/hoàn tiền theo trạng thái và guard không hiển thị deal cũ khi chuyển link. Các thay đổi cuối đã qua check/build/7 browser tests; CI và deployment cuối sẽ kiểm sau push.

Deal-state audit Devnet: 9 completed, 7 refunded, 1 draft, 0 funded/delivered/disputed. Không còn principal test chờ xử lý hoặc cọc bị giữ bởi active deal. Cổng còn chưa kiểm là Phantom extension/popup thực; browser signing đã chạy bằng test provider trên Vercel. Không báo đây là audit bảo mật hoặc readiness Mainnet.

Browser từng lỗi helper __name của tsx và dùng browser.newPage không tương thích axe; sửa harness, không giảm assertion. Một browser test gặp RPC send error, deal giữ funded; đã hoàn đủ principal theo refund_expired và lưu receipt. RPC proxy retry có giới hạn, wallet chỉ resend cùng signed bytes và theo dõi chữ ký; unknown không báo thành công.

Không slide/video mới trong scope. Cọc/slashing/keeper/arb timeout ghi rõ. Chưa có audit độc lập, Mainnet hoặc kiểm chứng WTP. Production dependency audit còn 4 moderate, 0 high/critical; không gọi hệ thống đã audit an toàn.

# Trạng thái — 04/10/2026

Đã chuyển scope sang escrow USDC Devnet, giữ thương hiệu/UI; tra cứu archived ở checkpoint 7315d42. Picachu cũ không sửa.

Chương trình .so build thành công sau sửa stack allocation bằng Box; IDL sinh từ Rust. Bảy flow và 42 checks pass cả local validator lẫn Devnet USDC Circle. Có thêm destination/vault substitution và stale proposal acceptance. Program upgrade thành công, code dump khớp prefix .so, phần dư zero padding. Web: 23 unit/IDL tests, 7 browser tests, 10 routes build, lint/typecheck/links pass. Browser lần đầu có 2 lỗi locator route announcer đã sửa selector đúng vùng, không giảm assertion.

Đã kiểm script CI-like Linux/WSL với wallet mới, genesis Config/mint synthetic, không cần key maintainer: 42 checks pass. Devnet run đầu dừng vì seller thiếu SOL rent khi tạo deal thứ sáu; bổ sung SOL và chạy lại toàn bộ pass. RPC public có 429 và retry, ghi đúng giới hạn nguồn dữ liệu.

Phần còn lại: browser signer-to-program flow đang kiểm, Phantom extension thật chưa khả dụng trong browser automation, CI/push và Vercel smoke. Không slide/video mới trong scope. Cọc/slashing/keeper/arb timeout ghi rõ. Browser init provider từng lỗi helper __name của tsx (test harness); đã sửa helper injection riêng trong test.

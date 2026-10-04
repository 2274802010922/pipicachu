# Bằng chứng v0.4 — phí hệ thống

Deal mới: seller 98%, trọng tài 1%, hệ thống 1%; refund nguyên principal. Treasury `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`. Chỉ Devnet.

- [Rollout và tương thích legacy](platform-fee-rollout.json): tạo/nạp/bàn giao deal trước upgrade, confirm sau upgrade; finalized transfer 990000 seller, 10000 arb, 0 platform. Toàn bộ fee snapshot cũ giữ nguyên.
- [6 receipt finalized](devnet-escrow-cycle.json): buyer confirm, timeout, refund quá hạn giao, arb trả seller/hoàn buyer, đồng thuận hoàn buyer. Đối chiếu exact transfer từ vault, platform fee và refund chỉ một destination.
- [39 checks Devnet](devnet-program-execution.json): rerun thành công sau khi bổ sung USDC giữa các ví test riêng. Summary terminal được ghi riêng; không giả là raw report từng assertion.
- [Local executable checks](local-escrow-cycle.json): 39 checks, synthetic mint được ghi rõ. Native Rust kiểm layout legacy 512-byte terms; client kiểm decoder fee0.
- [Keeper thật](keeper-live.json): service run 37230007638, signer keeper, 980000 seller +10000 arb +10000 hệ thống; disputed không bị chi, rồi được arb hoàn fixture. [Schedule run 37225785710](https://github.com/2274802010922/pipicachu/actions/runs/37225785710) đã chạy tự nhiên thành công trước upgrade. Không bảo đảm SLA đúng giây.
- [Browser Vercel](browser-wallet-cycle.json): create → accept → fund → deliver → reject giữ state → confirm; axe, VI/EN, không localStorage. Injected provider, **không phải Phantom extension thật**. [Ảnh kết quả](screenshots/completed-vi.png) hiển thị 0,98 USDC nhận /0,02 phí.
- [Smoke production](vercel-smoke.json): health, treasury, routes và genesis Devnet. [CI 37229653915](https://github.com/2274802010922/pipicachu/actions/runs/37229653915) pass web và program. Web 53 unit/17 browser, responsive 375/768/1024/1440.
- [Binary](program-binary.json) dump/cmp/SHA256 khớp; [deployment](devnet-deployment.json) giữ Program ID, upgrade authority còn giữ cho demo.

[Receipt v0.3 phí cũ](../archive/v0.3-before-platform-fee/README.md) và [v0.2 hai trọng tài](../archive/v0.2-two-arbitrators/README.md) là lịch sử; không dùng để khẳng định kiểm phí mới. Không có audit độc lập hoặc Mainnet nghiệm thu.

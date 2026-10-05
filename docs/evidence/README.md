# Bằng chứng v0.5 — trọng tài được duyệt, cọc trước

- [Registry rollout](organization-rollout.json): initializer duyệt Demo A, trọng tài ký standing consent thật. 39 account cũ giữ fee/workflow snapshot. Tổ chức thử nghiệm, không phải đối tác công ty thật.
- [13 checks local](local-organization-checks.json) và [13 checks Devnet](devnet-organization-checks.json): authority, policy, pause/fund, withdrawal lock, reserve/double fund, settle khi paused, phí và double payout.
- [Receipt độc lập finalized](organization-finalized-receipts.json): fund chỉ có buyer signer, không arb ký từng deal; payout98/1/1 đúng destination và mint.
- [Vercel browser mới](browser-wallet-cycle.json): auto-open sau tạo → fund trực tiếp → deliver → reject giữ state → confirm với dialog số tiền; axe/VI/EN/privacy. Injected test provider, không Phantom extension thật.
- [Keeper workflow1](keeper-live.json): run37282329331 signer service thật, payout98/1/1; disputed giữ nguyên rồi arb refund fixture.

Web55 unit/21 browser, UI4 bước cho deal mới và5 bước legacy, responsive375/768/1024/1440. CI implementation [37280669915](https://github.com/2274802010922/pipicachu/actions/runs/37280669915) pass cả web và52 executable program checks (39+13); native Rust compatibility đã kiểm riêng.

SBF dump có code prefix khớp [binary proof](program-binary.json), phần capacity thêm chỉ zero; không ghi byte-for-byte toàn file khi có padding. [Deployment](devnet-deployment.json) giữ Program ID và treasury, schema5. Không env mới, Mainnet hoặc audit độc lập.

## Bằng chứng phí/legacy trước workflow mới

### v0.4 — phí hệ thống

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

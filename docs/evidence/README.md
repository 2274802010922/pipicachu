# Bằng chứng v0.3 — một trọng tài

Chỉ dùng receipt/schema của Program ID 4Xds5m5JtWR8HbNLdGeF7e3Qh3akKMHwMfjKsQeVXnrb để đánh giá bản hiện tại.

Local program: [6 flow / 38 checks](local-escrow-cycle.json) pass. Devnet: [6 kịch bản finalized, đối chiếu số tiền từ vault](devnet-escrow-cycle.json). Script negative-test live gặp RPC 429; không nhận đó là 38 checks live pass. [Browser local](local-browser-wallet-cycle.json), [browser Vercel](browser-wallet-cycle.json) ký flow bằng provider test, không phải Phantom thật. [Vercel smoke](vercel-smoke.json) pass; [CI 37207354325](https://github.com/2274802010922/pipicachu/actions/runs/37207354325) xanh cả web/program.

[Binary](program-binary.json) khớp byte-for-byte program mới, [deployment](devnet-deployment.json), [phục hồi test bị gián đoạn](interrupted-run-recovery.json), [rút cọc legacy](legacy-bond-recovery.json).

[Keeper live](keeper-live.json): workflow service trên GitHub Actions ký finalize bằng ví keeper, payout finalized 0,99 USDC seller + 0,01 fee; buyer/seller không ký thêm. Deal disputed được giữ nguyên trong lượt scan, sau đó trọng tài hoàn fixture. Run dùng workflow_dispatch để nghiệm thu worker; lịch 5 phút đã active nhưng chưa nhận là đã quan sát tick schedule tự nhiên hoặc SLA đúng giờ.

[Bond preparation](bond-preparation.json): top-up 0,1 USDC và accept trong cùng transaction Devnet, profile đủ cọc; chưa reserve trước buyer fund. CLI signer, không phải Phantom. UI test synthetic kiểm thiếu 0,5 USDC, đúng bước 2, đúng wallet, VI/EN/axe và buyer không fund khi thiếu cọc.

Toàn bộ bằng chứng bản hai trọng tài nằm ở [archive v0.2](../archive/v0.2-two-arbitrators/README.md). Program cũ giữ nguyên để không đổi ABI các account cũ; cọc test đã rút về ví gốc, không có active deal trước migration.

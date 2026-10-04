# Bằng chứng

- [Local cycle](local-escrow-cycle.json): .so trên local validator, token synthetic (không Circle-issued).
- [Devnet deployment](devnet-deployment.json), [Devnet cycle](devnet-escrow-cycle.json): Circle USDC thật trên mạng thử nghiệm, 7 flow / 42 checks. Không phải tài sản Mainnet.
- Web: 23 unit/IDL tests, 7 browser tests, build 10 routes, lint/typecheck/Markdown pass.
- [Browser signing trên Vercel](browser-wallet-cycle.json), [browser local](local-browser-wallet-cycle.json): giao dịch thật Devnet, signer test ở Node, reject không đổi state, axe và VI/EN pass. Không phải extension Phantom thực.
- [Vercel smoke](vercel-smoke.json): đúng SHA, live deal, RPC, responsive. [Binary đối chiếu](program-binary.json), [refund sau test gián đoạn](browser-interrupted-refund.json).
- CI [37203335589](https://github.com/2274802010922/pipicachu/actions/runs/37203335589) pass cả web và chương trình trên runner mới.
- [Deal state audit](deal-state-audit.json): không có test deal funded/delivered/disputed còn giữ principal. Draft không nạp không khóa cọc.
- Mock wallet/browser automation không phải bằng chứng Phantom popup thật.
- Bằng chứng tra cứu checkpoint 7315d42 không áp dụng cho escrow.
- Chưa audit độc lập hoặc WTP/traction kiểm chứng.

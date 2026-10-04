# Bằng chứng

- [Local cycle](local-escrow-cycle.json): .so trên local validator, token synthetic (không Circle-issued).
- [Devnet deployment](devnet-deployment.json), [Devnet cycle](devnet-escrow-cycle.json): Circle USDC thật trên mạng thử nghiệm, 7 flow / 42 checks. Không phải tài sản Mainnet.
- Web: 23 unit/IDL tests, 7 browser tests, build 10 routes, lint/typecheck/Markdown pass. Browser signing flow là cổng riêng đang kiểm.
- Mock wallet/browser automation không phải bằng chứng Phantom popup thật.
- Bằng chứng tra cứu checkpoint 7315d42 không áp dụng cho escrow.
- Chưa audit độc lập hoặc WTP/traction kiểm chứng.

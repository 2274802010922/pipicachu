# Cổng kiểm thử

- `npm run check`: format/lint/typecheck/unit/integration.
- `npm run verify`: thêm production build, Playwright/axe và link docs.
- E2E chạy offline fixtures có nhãn trên localhost. PIPICACHU_OFFLINE_TEST chỉ áp dụng khi không chạy Vercel; public production không được bật chế độ này.
- `npm run check:live`: xác minh genesis và lấy raw mẫu thật; không ký Mainnet.
- `npm run demo:fixtures`: fixture signer Devnet mới, transfer và failed proof. Popup Phantom là cổng riêng, không coi script signer là popup proof.
- AI provider thật và Vercel smoke là cổng riêng; template success không phải provider success.

Không dùng số test như tỷ lệ chính xác trên mọi giao dịch. Fixture expected amounts độc lập từ raw instruction/balances; edge cases synthetic được ghi rõ.

Dependency audit nằm trong dependency-audit.json. Báo cáo có cảnh báo transitive, không claim zero vulnerabilities hoặc tự chạy force upgrade. Routes RPC của ứng dụng không dùng Jayson/stream-json; SDK ký demo vẫn cần review dependency phạm vi runtime.

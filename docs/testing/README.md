# Harness escrow

Web: `npm run verify` = formatting, lint, TypeScript, unit/IDL tests, build, Playwright và local Markdown links. Browser VI/EN ở 375/768/1024/1440, axe, không overflow, đổi ngôn ngữ giữ form, missing-wallet và old API 404.

Program Linux/WSL: Node 24, Rust, Solana CLI 3.1.10. `npm ci`, `bash scripts/checks/program.sh`. Script build .so và chặn Stack offset warnings, tạo synthetic local mint/config bằng key mới trong work/private, start validator riêng port 8897 và thực thi tests/program/cycle.ts.

CI không cần private key maintainer: Config được inject genesis (ghi rõ synthetic). Local run của maintainer và live Devnet còn kiểm initialize thật. Không gọi synthetic mint local là Circle issuance.

Flow: buyer confirm, review timeout, missed delivery refund, trọng tài trả seller/hoàn buyer, đồng thuận hoàn tiền sau một deadline trọng tài. Kiểm số dư principal, phí, vault zero, cọc khóa/unlock, double settlement, wrong buyer/actor, thời hạn và tranh chấp. Negative assertions phải là program/transaction rejection, không chấp nhận RPC unavailable như test pass.

Devnet: cần SOL + Circle USDC đúng mint cho ví pipicachu mới; `npm run demo:fixtures`. Script dùng 2 USDC/deal, tự phân bổ cọc nhỏ nếu thiếu; không dùng Mainnet. Raw checks viết docs/evidence/devnet-program-checks.json; verify-receipts đối chiếu finalized receipts riêng. Account/terms/hash công khai, key chỉ work/private ignore.

Phantom thực là cổng riêng. Provider inject để browser ký bằng ví test chỉ kiểm UI-to-program flow, không chứng minh extension Phantom/popup hoạt động trên mọi thiết bị. User đã yêu cầu ưu tiên tự kiểm Devnet; nếu extension không khả dụng ghi rõ giới hạn.

Organization tests: 13 case về manager permission, standing consent, policy, pause, reserved bond/withdraw, payout98/1/1 và double settlement; local chạy sau cycle trên cùng validator. `npx tsx tests/program/organizations.ts --devnet` cần registry đã thiết lập.

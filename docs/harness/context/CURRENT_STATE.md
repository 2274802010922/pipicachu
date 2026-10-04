# Trạng thái — 04/10/2026

## Scope đã duyệt

pipicachu độc lập, VI/EN, không login hoặc lịch sử. Chuyển SOL/USDC, Jupiter partial, đối chiếu deterministic, lab ký SOL Devnet. Bộ slide và hai video nằm trong scope.

## Đang triển khai

- Core/API/UI đã có. 48 unit/integration pass; production build 13 routes pass.
- 8 browser tests pass sau sửa label và scoped alert; VI/EN tại 375/768/1024/1440, comparison đủ/failed/fake mint, storage privacy. Lần đầu có 4 lỗi được giữ trong ghi nhận, không giảm assertion để bỏ lỗi.
- Giao dịch mẫu, live AI, Phantom popup, Vercel, slide/video và publication chưa hoàn tất.
- Playwright MCP báo chưa có browser extension; CLI Playwright chạy local được. Không dùng mật khẩu/key Picachu cũ.
- Repo cũ chỉ đọc; logo copied byte-for-byte. Chưa copy old .env hoặc signer.
- Live genesis Mainnet/Devnet đã xác minh; capture một chuyển USDC Devnet thật, full decode. Jupiter capture đầu gặp version chưa hỗ trợ, đang tìm mẫu legacy/v0 phù hợp.
- Owner đã cấp 5 SOL Devnet cho signer mới và cung cấp https://pipicachu.vercel.app/. Env Vercel chưa thêm; đây chưa phải production acceptance.
- Fixture signer đã kiểm transfer SOL0,001, transfer50 token khác mint Circle và một transfer failed thật. Receipt ở docs/evidence/devnet-cycle.json; chưa gọi đây là Phantom popup proof.

## Cổng còn lại

Full verify → commit/push main/CI → raw live fixtures/Devnet receipt → production secrets/deploy → AI/live browser/wallet → slide/video QA → release → chờ owner-uploaded YouTube URLs.

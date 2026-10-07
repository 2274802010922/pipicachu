# Triển khai pipicachu v0.6

Chỉ USDC Devnet. Website và program là hai cổng triển khai riêng. Program/mint/treasury ở `src/escrow/deployment.json`; quyền manager đọc từ ManagerConfig trên chain. Không private key quản trị/treasury trên Vercel.

## Biến Vercel — Production và Preview

| Biến                   | Value / nơi lấy                                              |
| ---------------------- | ------------------------------------------------------------ |
| NEXT_PUBLIC_SITE_URL   | `https://pipicachu.vercel.app`                               |
| SOLANA_DEVNET_RPC_URL  | `https://api.devnet.solana.com` hoặc RPC Devnet của provider |
| RATE_LIMIT_REDIS_URL   | REST URL từ database Upstash của pipicachu                   |
| RATE_LIMIT_REDIS_TOKEN | REST token cùng database; đánh dấu Secret                    |
| RATE_LIMIT_IP_SALT     | 32 byte ngẫu nhiên, hex 64 ký tự; đánh dấu Secret            |

Không dựng URL/token giả. Không cần OpenRouter, mainnet RPC hoặc ví trọng tài trong env. Giữ credential ở môi trường riêng, không chat/Git. Chạy `node scripts/checks/setup-env.mjs` để tạo salt trong `work/private/`; thêm cùng salt vào Vercel rồi redeploy. Cấu hình RedisURL cần có ở cả Preview nếu muốn preview thao tác tiền.

Redis namespace riêng pipicachu/Devnet/v06; limiter read240/phút/IP &2400 toàn app; simulate/send30 &120. Redis/salt thiếu hoặc Redis lỗi: production chặn simulate/send, read dùng fallback60/IP &600/app và health báo degraded. Memory limiter local không chứng minh limiter nhiều instance.

## GitHub Actions keeper

Repository Settings → Secrets and variables → Actions: giữ `DEVNET_KEEPER_KEYPAIR` (ví service Devnet hiện có), thêm `RATE_LIMIT_REDIS_URL` và `RATE_LIMIT_REDIS_TOKEN` cùng database. Không cần IP salt cho keeper. Workflow khoảng5 phút/lượt, có thể trễ; manual input `deal` kiểm lại một địa chỉ đủ điều kiện.

Mỗi lượt tối đa5 deal sau lọc retry; per-deal lease120s, retry/report TTL7 ngày. Lỗi một deal được cô lập. Pending signature/expiry lưu trước broadcast để tránh chi lặp khi restart. Keeper chỉ finalize giao dịch Delivered quá review, không resolve tranh chấp hoặc đổi recipient. Giữ tối thiểu0,01 SOL Devnet cho service.

## Thứ tự nâng cấp

1. `npm ci`, `npm run verify`; Linux/WSL `bash scripts/checks/program.sh` (native + executable, synthetic fixtures).
2. Snapshot toàn bộ deal876byte: `npx tsx scripts/devnet/snapshot-v06.ts work/v06-before.json`.
3. Build pinned Anchor1.1.2/Solana3.1.10; kiểm SBF không có Stack offset, hash binary/IDL.
4. Deploy Devnet bằng key nâng cấp riêng pipicachu trong vùng ignore. Không copy key dự án cũ.
5. `npx tsx scripts/devnet/bootstrap-manager.ts` bootstrap một lần bằng initializer vào manager owner `CXjK…1pJN`. Script chỉ nhận key initializer riêng trong ignore, không có manager key trên server.
6. Đối chiếu snapshot: tiền/phí/terms/deadlines/policy deal cũ không đổi. Publish web/IDL tương ứng, smoke `/api/ready` và Phantom.
7. Manager owner vào `/manage`, ký duyệt một application thật. Owner trọng tài tự nạp cọc và bật nhận. Approval là allowlist, không phải KYC.

Client cũ không có policy byte và policy consent mới bị từ chối tạo/enable; không âm thầm thay quyền xử đã ký. Deal cũ vẫn đọc/settle tương thích. Không rollback bytecode không hiểu policy1 sau khi có deal policy1; khi lỗi ngừng intake, giữ settlement.

## Kiểm vận hành

`/api/health`: cấu hình và hoạt động tách riêng. `/api/ready`:503 khi RPC/program/ManagerConfig/limiter chưa sẵn sàng. `/api/keeper/status`: report thật có thời điểm, pending/blocked/degraded; không coi flag enable là uptime. CSP report-only tới khi Phantom extension thật pass; chưa tuyên bố enforce.

Video hiện có là happy-path v0.5, không chứng minh v0.6. Manager/Phantom thật, Redis shared, Vercel và user validation phải có receipt riêng; test local không thay thế.

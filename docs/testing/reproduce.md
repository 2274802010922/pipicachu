# Tái hiện kiểm thử từ checkout mới

Chỉ dùng pipicachu. Không dùng ví, secret hoặc môi trường của dự án Picachu cũ.

## Web

Cần Node 24, npm theo `packageManager`, Git. Tại thư mục repo:

```sh
npm ci
npx playwright install --with-deps chromium
npm run verify
```

`verify` gồm guard repository, format, lint không warning, typecheck, unit, production dependency gate, build, browser và Markdown links. Playwright khởi chạy server riêng trên port 3104; dữ liệu fixture và provider inject chỉ chứng minh UI, không phải Phantom extension. Không cần Vercel/OpenRouter/Redis thật cho bộ browser này.

Chạy local sản phẩm bằng `npm run dev`. Nếu sao chép `.env.example` thành `.env.local`, file thật phải ở Git ignore. Limiter bộ nhớ chỉ dành cho local; không thay kiểm Redis nhiều instance.

## Program Linux hoặc WSL

Cần Rust/Cargo, Node 24 và Agave/Solana CLI 3.1.10 trong PATH. Workflow Quality tải release Agave từ nguồn chính thức và kiểm SHA-256 trước giải nén. Anchor dependencies đã pin trong Cargo manifest/lockfile.

```sh
bash scripts/checks/program.sh
```

Script build SBF, chặn Stack offset warning, chạy native/property tests và đối chiếu IDL sinh từ source. Sau đó tạo validator trên port 8897 với mint/config synthetic, kiểm cold bootstrap, lifecycle, organization, governance/late ruling/capacity, và payout/refund khi treasury độc lập hoặc trùng buyer/seller/arbitrator. Chỉ validator do script tạo được dừng qua PID đã giữ; ledger nằm trong `work/validator/`.

CI không có key manager, initializer hay ví người dùng Devnet. Config/manager được inject vào local genesis để test; cold bootstrap chỉ kiểm từ chối trái quyền. Không gọi mint synthetic là Circle issuance. File key test ở `work/private/`, không được commit.

Artifact CI gồm source IDL log, SBF binary, transaction metrics, báo cáo test và validator logs. Hai job web/program độc lập nên không cần secret trong PR. Receipt local chỉ có nghĩa trong ledger local.

## Kiểm đọc Devnet và Vercel

```sh
npx tsx scripts/checks/benchmark-snapshot.ts
npx tsx scripts/checks/smoke.ts
```

Hai script này không ký hoặc gửi giao dịch. Benchmark ghi mẫu đo và giới hạn; smoke chỉ kiểm luồng đọc, VI/EN, responsive và program executable. Read-only smoke pass không có nghĩa simulate/send hoặc keeper đã hoạt động.

Devnet writes và Phantom thật có cổng riêng trong [owner checklist](../deployment/OWNER_CHECKS.md). Không chạy script acceptance trước khi application test được manager duyệt. Khi Redis lỗi quyền, sửa token và redeploy trước khi ký.

# Dependency exceptions · kiểm lại 08/10/2026

Production audit: **2 moderate, 0 high/critical**. Toàn bộ dependency tree, gồm harness/dev tooling: **8 high, 2 moderate**. Không gọi audit sạch hoặc thay audit độc lập bằng kết quả này.

`jayson → uuid 11.1.1` đã override. SPL Token SDK nằm trong devDependencies; runtime dùng adapter classic ATA và lượng BigInt. Production không import native bigint-buffer.

| Finding                                                 | Reachability và mitigation                                                                                                                                                                                                 | Xem lại    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| stream-json; propagation sang jayson                    | Web3 SDK kéo CJS dependency. App không dùng stream server, JSONC, filters hoặc Assembler của jayson. Proxy dùng JSON.parse, Zod, giới hạn body/response theo stream và limiter. Không force stream-json ESM vào đường CJS. | 14/10/2026 |
| bigint-buffer; propagation sang SPL dev tree            | Chỉ dùng trong harness/script pinned, không runtime client/backend. Input test do repo kiểm soát; không chạy harness với dữ liệu/key không tin cậy. Runtime đọc lượng nguyên và TokenAccount bytes bằng adapter riêng.     | 14/10/2026 |
| braces; propagation sang Next lint/micromatch/fast-glob | Chỉ đường lint/dev; pattern do repo kiểm soát. PR CI không có wallet/Redis secrets. Không nhận glob từ API, không ép downgrade cả lint stack.                                                                              | 14/10/2026 |

Hai advisory high gốc lan sang tám package entries, không phải tám lỗi độc lập: [bigint-buffer](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg), [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Advisory moderate được cho ngoại lệ cụ thể: [nested filters](https://github.com/advisories/GHSA-528h-pc64-c93x), [JSONC parser](https://github.com/advisories/GHSA-hqr4-qq8f-hg3x), [Assembler](https://github.com/advisories/GHSA-mjw6-4jj6-33hc).

[Policy máy đọc](dependency-policy.json) và `npm run check:dependencies` chặn high/critical production, advisory mới kể cả trong package đã có ngoại lệ, propagation chưa khai báo và ngoại lệ hết hạn. Test riêng kiểm các tình huống đó. Xem lại trước khi mở Mainnet hoặc nhận dữ liệu/glob/PR không tin vào harness; không dùng `npm audit fix --force` để đổi stack.

Tái hiện: `npm audit --omit=dev --json`, `npm audit --json`, `npm ls --omit=dev bigint-buffer @solana/spl-token`.

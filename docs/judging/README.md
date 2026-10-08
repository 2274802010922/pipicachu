# Giám khảo: pipicachu trong 90 giây

**Dành cho người mua/bán sản phẩm số qua cộng đồng đã dùng Solana và USDC.** Người mua muốn kiểm hàng trước; người bán muốn biết tiền đã ký quỹ. pipicachu giữ principal trong program vault và để một trọng tài được duyệt xử dispute.

[Mở website](https://pipicachu.vercel.app) · [Pitch trực tiếp 4 phút](pitch-4min.md) · [Kết quả Devnet thật](https://pipicachu.vercel.app/deals/25JTcp8NdyqQoTksumh8hkUszc8SD3Ea3t2SNmor8Buj) · [Bằng chứng hiện tại](../evidence/quality/README.md).

## Product & Business

- Seller tạo link → buyer nạp → seller giao ngoài app → buyer xác nhận/tranh chấp.
- Trọng tài chuẩn bị cọc/standing consent trước, không giữ principal trong ví cá nhân.
- Payout: 98% seller, 1% trọng tài, 1% hệ thống. Refund toàn principal, không phí dịch vụ.
- Kênh đề xuất: pilot qua admin cộng đồng đã dùng USDC. Chưa xác thực khách trả phí/doanh thu; [validation kit](../product/validation-kit.md).

## Technical Build

| Tiêu chí                             | Phần đáng kiểm                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Difficulty & Depth · 30              | [Capacity/race/late ruling](../../tests/program/v06.ts), [signature/pending recovery](../../src/escrow/operation.ts), treasury alias                                                     |
| Architecture & Contract Quality · 25 | [Account constraints](../../programs/pipicachu-escrow/src/contexts.rs), [ABI/policy](../architecture/v06.md), [module boundaries](../architecture/quality.md)                            |
| Solana & Performance · 25            | PDA vault + SPL Token CPI, Clock/finality; [six live branches](../evidence/v06/live/acceptance.json), [read benchmark](../evidence/quality/snapshot-benchmark.json)                      |
| Evidence & Reproducibility · 20      | [CI122+41](https://github.com/2274802010922/pipicachu/actions/runs/37812338693), [binary/snapshot](../evidence/quality/protocol-rollout.json), [clean checkout](../testing/reproduce.md) |

Program kiểm role, deadline, state và fixed recipients. Payout/refund nguyên tử, terminal chi một lần, reserve/unlock cọc đúng một lần. Manager duyệt registry, không thay phán quyết hoặc rút principal. Server không giữ key user/manager.

## Đã kiểm và phạm vi tin cậy

CI web/program pass trên 463b3fa; sáu nhánh CLI Devnet finalized và keeper payout có receipt. Owner báo đã test Phantom thành công, chưa cung cấp đầy đủ receipt từng ca. [Ảnh bản deploy hiện tại](../assets/showcase/current/manifest.json) là read-only captures, không thay wallet proof.

Cọc không phải insurance/slashing; trọng tài vẫn có thể xử sai hoặc bỏ xử. Khi bỏ xử và hai bên bất đồng, tiền có thể khóa. Keeper payout đã kiểm bằng dispatch; cron reliability chưa nghiệm thu. Devnet còn upgrade authority, chưa audit độc lập/Mainnet. Hash không kiểm chất lượng file. [Câu hỏi và trả lời](questions.md).

Đợt này không có AI trong user flow. [Review hồ sơ](repo-review-2026-10-09.md) ghi rõ phần mạnh/thiếu; không dùng số test để tuyên bố có khách hàng trả tiền.

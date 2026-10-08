# Bằng chứng đợt hoàn thiện chất lượng · 08/10/2026

Đợt này giữ nguyên chức năng và tập trung code, tính đúng, độ ổn định, hiệu năng và khả năng tái hiện. Bảng kết quả cuối nằm trong `acceptance.json`; không dùng số test như bằng chứng người dùng trả tiền.

| Phần                         | Nguồn kiểm chứng                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Web, unit và browser         | `acceptance.json`, workflow Quality trên revision bàn giao                             |
| SBF và tương thích ABI       | `acceptance.json`, source-derived IDL trong artifact CI                                |
| Bảo toàn tiền/cọc và race    | Lifecycle, organization, v0.6 và alias tests trong artifact CI                         |
| RPC đọc                      | [Sáu cặp đo Devnet](snapshot-benchmark.json), test coalescing không giữ cache cũ       |
| CU, fee và transaction bytes | `local-transaction-metrics.json`; validator synthetic, mỗi action một mẫu              |
| Nâng cấp và snapshot chain   | [Receipt nâng cấp](protocol-rollout.json), binary khớp local và 46 deal không đổi      |
| Production và owner          | [Checklist](../../deployment/OWNER_CHECKS.md); các cổng chưa kiểm không được tính pass |

[Thay đổi kiến trúc](../../architecture/quality.md) · [Tái hiện](../../testing/reproduce.md) · [V0.6 và bằng chứng lịch sử](../v06/README.md).

Local đã qua 119 unit/integration và 33 browser; CI của revision bàn giao là cổng riêng. Native Rust có 5 test; một test chạy 4.096 bộ số tiền, không ghi thành 4.096 test độc lập. Cold bootstrap và 4 vai treasury được báo riêng. Bộ test không thay audit bảo mật độc lập.

Credentials Redis/GitHub keeper đã được cấu hình và kiểm sau checkpoint. Owner approval, sáu nhánh CLI và keeper payout đã kiểm trong [bộ live](../v06/live/README.md). Còn Phantom accept/reject/toàn luồng, cron reliability và dữ liệu tester. Video YouTube hiện có chỉ là happy path v0.5; slide R6 ngày 07/10 giữ phạm vi tại thời điểm dựng.

## Xác nhận triển khai

[CI của commit triển khai](ci-verification.json) đã pass cả web và escrow-program. [Smoke Vercel](vercel-smoke.json) pass trên cùng commit `d044af7`: đọc deal thật, VI/EN và responsive, không ký ví. Readiness sau cấu hình Redis ngày 08/10 đã ready/limiter true; [bằng chứng](redis-ready-2026-10-08.json). Keeper manual ghi report thành công với eligible 0. Owner approval và live payout đã kiểm tiếp trong [bộ live](../v06/live/README.md); còn Phantom, cron reliability và business checks.

# Bằng chứng hiện tại · 09/10/2026

Runtime kiểm trực tiếp: `463b3fada2b964b81f9fdaba1711062a9000cfab`. [CI37812338693](https://github.com/2274802010922/pipicachu/actions/runs/37812338693) pass cả **quality** và **escrow-program**. Không cộng số test từ nhiều checkpoint.

| Phần          | Kết quả và phạm vi                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Web           | **122 unit/integration +41 browser**, format/lint/typecheck/build/docs pass; [report](simple-notes.json)                                 |
| UI            | VI/EN, 375/768/1024/1440, axe; không JSON/file verifier. [Captures bản deploy](../../assets/showcase/current/manifest.json) là read-only |
| Program/ABI   | Native Rust5, executable lifecycle/organization/policy/alias/cold checks; [snapshot kiểm chất lượng](acceptance.json) và artifact CI     |
| Devnet        | [Sáu nhánh finalized](../v06/live/acceptance.json), 1 USDC principal, payout98/1/1 hoặc refund100%; CLI fixture, không khách hàng thật   |
| Quản trị      | Owner approval/policy lên chain; [receipt](../v06/owner-approval.json), [bootstrap](../v06/manager-bootstrap.json)                       |
| Keeper payout | [Receipt thật](../v06/live/keeper-payout.json), service signer, split98/1/1/unlock; manual dispatch, không cron uptime proof             |
| Vercel/Redis  | Bản 463b3fa đang deploy, readiness rpc/program/manager/limiter true tại lần rà; [Redis proof](redis-ready-2026-10-08.json)               |
| Phantom       | Owner báo đã test thành công 08/10. Báo cáo thủ công, chưa có receipt/checklist chi tiết cho mọi nhánh                                   |

## Binary, source và hiệu năng

[Rollout chất lượng](protocol-rollout.json): binary local/CI/Devnet đối chiếu, 46 deal không đổi sau upgrade. [CI proof của checkpoint refactor](ci-verification.json). ABI account/discriminator/order/error được kiểm từ IDL sinh bằng Rust; không dùng riêng tên function để khẳng định tương thích.

[Sáu cặp đo đọc Devnet](snapshot-benchmark.json): snapshot đầy đủ 4 RPC →2; median216,5→180ms trong mẫu này. Đây không phải SLA production hoặc benchmark throughput. [Transaction metrics local](local-transaction-metrics.json) có môi trường synthetic riêng.

`acceptance.json` là snapshot refactor ban đầu 119unit/33browser. UI Manage sau đó thành119/34, bỏ JSON thành122/41. Giữ file lịch sử nguyên kết quả; current counts lấy CI/revision tương ứng. Native property test chạy4096 bộ số, không ghi thành4096 test độc lập.

## Những giới hạn còn nguyên

- Keeper cron reliability chưa nghiệm thu; report hiện stale ở lần rà. Một lượt dispatch thành công không chứng minh lịch chạy đúng5phút.
- Business/testers/WTP và revenue chưa thu thập. Prototype/Devnet fee không thay nhu cầu trả phí thật.
- Chưa audit độc lập hoặc Mainnet; upgrade authority còn giữ, [dependency exceptions](../../legal/dependency-exceptions.md) đã khai báo.
- Video hiện có là happy path v0.5; EN footage chưa có. [Pitch4phút](../../judging/pitch-4min.md) dùng live website và deck mới; deck R6 ngày07/10 chỉ là lịch sử.

[Clean checkout](../../testing/reproduce.md) · [Architecture](../../architecture/quality.md) · [Owner checks](../../deployment/OWNER_CHECKS.md) · [Lịch sử v0.6](../v06/README.md).

# Trạng thái v0.6 · 07/10/2026

| Hạng mục                            | Trạng thái đã kiểm                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Contract/IDL v0.6                   | Deployed Devnet, binary prefix khớp local, reserve tail0; [proof](protocol-rollout.json)                 |
| Compatibility                       | 46 deal snapshot không đổi tiền/phí/terms/workflow/state/deadlines                                       |
| Manager bootstrap                   | Finalized vào CXjK…1pJN; [receipt](manager-bootstrap.json)                                               |
| Program local                       | native2, lifecycle39, organization13, governance/capacity21, cold bootstrap; alias payout/refund4role    |
| Web                                 | 105 unit/integration +31 browser, build và docs links pass; [report](local-acceptance.json)              |
| Manager application approval thật   | Chưa kiểm bằng owner wallet                                                                              |
| Policy1 live branches / Phantomv0.6 | Chưa nghiệm thu                                                                                          |
| Redis shared / keeperv0.6           | Chờ credential đúng database cho local/GitHub, sau đó kiểm restart/report                                |
| Vercel                              | Chờ push webv0.6 và smoke revision                                                                       |
| CSP                                 | Nonce report-only, chưa enforce                                                                          |
| Dependency                          | Production2moderate,0high; full audit8high/2moderate; [exceptions](../../legal/dependency-exceptions.md) |
| Benchmark                           | [10 read samples](benchmark.json); tx metrics là hotfixv0.5.1, khôngv0.6                                 |
| Slide18VIEN/PPTXPDF, tagrelease0.6  | Đang chuẩn bị, chưa bàn giao                                                                             |
| Business/testers/WTP                | Chưa thu thập; [kit](../../product/validation-kit.md)                                                    |

[Hotfix phục hồi tiền thật](../hotfix-alias-recovery.json), [v0.5 CI](https://github.com/2274802010922/pipicachu/actions/runs/37583984049). Các test local là synthetic; CLI không phải Phantom extension. Video cũ chỉhappy-pathv0.5. Không dùng receipts lịch sử để nâng cổngv0.6 thành pass.

# Cổng nghiệm thu v0.6

Cổng kỹ thuật khác cổng business. Không coi synthetic fixture, CLI signature hoặc mocked provider là Phantom extension/user trả phí.

| Cổng                | Bằng chứng cần có                                                                      |
| ------------------- | -------------------------------------------------------------------------------------- |
| Local web           | format/lint/typecheck/unit/build/browser VIEN375/768/1024/1440/axe                     |
| Program             | native ABI + SBF executable, exact negative codes, alias4roles, tiền/cọc/race          |
| Chain rollout       | hashSBF/IDL, immutable snapshot, bootstrap receipt, old settlement                     |
| Chain new branches  | confirm/refund/ruling2ways/late/mutual/keeper, conservation                            |
| Owner wallet        | manager application approval thật + Phantom extension accept/reject                    |
| Production services | Redis shared/failure, keeper restart/report, readiness, Vercel revision                |
| Documentation       | links/license/README/status, benchmark methodology, slides18VIEN editable+PDF visualQA |
| Business            | tester thật và phí thực; intent không phải payment, Devnet không doanh thu             |

CSP hiện report-only. Dependency exceptions phải có reachability/mitigation/deadline; không gọi audit sạch khi còn finding. Video v0.5 chỉ happy path; EN video cần footage riêng. Handoff ghi từng cổng chưa kiểm, không nâng thành pass.

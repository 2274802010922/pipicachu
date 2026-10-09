# Trước giờ demo trực tiếp · pipicachu

Đây là checklist chuẩn bị sân khấu, không phải yêu cầu thiết lập lại hệ thống. Owner đã báo test Phantom thành công ngày08/10. Hồ sơ và bằng chứng nằm ở [mục lục giám khảo](../judging/dossier.md).

## Đã thực hiện

| Phần                                              | Bằng chứng                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Redis/limiter Vercel và GitHub keeper credentials | [Redis proof](../evidence/quality/redis-ready-2026-10-08.json); readiness true tại [snapshot 09/10](../evidence/competition-snapshot.json) |
| Owner manager approval/policy                     | [Receipt](../evidence/v06/owner-approval.json); không cần ký lại ví test 2dak                                                              |
| Sáu nhánh Devnet và keeper payout                 | [Live evidence](../evidence/v06/live/README.md); CLI/service signatures có phạm vi riêng                                                   |
| Luồng Phantom                                     | Owner báo đã test thành công; không tự đánh dấu từng ca nâng cao khi chưa có receipt                                                       |
| Bộ pitch                                          | [4 slide VI/EN](../judging/slides-v06.md), notes, source, Q&A và kịch bản125 giây live                                                     |

## Owner kiểm trước khi lên sân khấu

- [ ] Mở PPTX/PDF trên máy trình chiếu; bấm giờ một lượt theo [pitch4 phút](../judging/pitch-4min.md).
- [ ] Seller, buyer, arbitrator dùng ba ví khác nhau. Không dùng ví 2dak của CLI harness làm ví Phantom.
- [ ] Trọng tài đã duyệt, bật nhận và đủ cọc khả dụng; buyer có USDC Devnet, ví có SOL trả phí. Seller khác treasury để ba khoản payout nhìn riêng.
- [ ] Chuẩn bị **deal mới1 USDC** sát giờ, còn funding deadline; mở link trong đúng cửa sổ buyer/seller, mở khóa Phantom trước.
- [ ] Mở sẵn website, Explorer và một kết quả đã chạy trước có nhãn; không lộ secret hoặc tab cá nhân.

Trên sân khấu chỉ chạy fund → delivery note/sign → buyer confirm → kết quả0,98/0,01/0,01. Hàng/bằng chứng gửi qua kênh đã thống nhất; website không có JSON/file import/export. Pending không gọi là thành công, không ký lại khi chưa rõ kết quả. Không chờ cron trong happy path.

## Những phần chưa có kết quả công bố

Rehearsal bằng đồng hồ, người dùng trả phí/WTP, footage EN và keeper cron reliability giữ đúng trạng thái chưa nghiệm thu. Không yêu cầu owner làm lại toàn bộ Phantom vì bỏ JSON. Checklist nâng cao thuộc [cổng kỹ thuật](../testing/v06-gates.md), khác chuẩn bị sân khấu và khác validation business.

[Setup/deployment cho môi trường mới](README.md) · [Checklist setup cũ đã archive](../archive/context-2026-10-09/OWNER_CHECKS.md). Không gửi password, seed phrase hoặc credential qua chat/Git.

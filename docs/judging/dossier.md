# Hồ sơ giám khảo · pipicachu

Đây là trang bắt đầu cho hồ sơ hiện tại. App là prototype Devnet; tài liệu đã chuẩn bị không đồng nghĩa đã kiểm chứng thị trường hoặc vận hành Mainnet.

[**Tải trọn hồ sơ**](https://github.com/2274802010922/pipicachu/releases/download/v0.6.0-pitch-kit/pipicachu-dossier-2026-10-09.zip) · [Release và slide riêng](https://github.com/2274802010922/pipicachu/releases/tag/v0.6.0-pitch-kit). ZIP bổ sung có source revision riêng; không thay tag/source snapshot hay PPTX/PDF R2 đã phát hành.

## Đọc và trình diễn

| Mục đích                              | Tài liệu                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Hiểu dự án/nộp phần mô tả             | [Brief tiếng Việt](submission.vi.md) · [English brief](submission.en.md)                                    |
| Đọc nhanh bằng chứng theo rubric      | [Judge guide 90 giây](README.md)                                                                            |
| Thuyết trình cả Business và Technical | [Run-of-show4 phút](pitch-4min.md) · [Slide VI/EN tải trực tiếp](slides-v06.md)                             |
| Chuẩn bị trước giờ lên sân khấu       | [Checklist ngắn](../deployment/OWNER_CHECKS.md)                                                             |
| Trả lời câu hỏi khó                   | [Q&A](questions.md)                                                                                         |
| Xem source/receipt/CI và giới hạn     | [Current report](../evidence/quality/README.md) · [Snapshot đã kiểm](../evidence/competition-snapshot.json) |
| Xem đã sửa điểm nào trong hồ sơ       | [Review và bảng hoàn tất](repo-review-2026-10-09.md)                                                        |

## Thành phần đã chuẩn bị

- README VI/EN theo user/problem → product → business → technical/proof.
- Showcase trực tiếp từ bản deploy, có revision và nguồn capture; không sửa trạng thái/số tiền bằng đồ họa.
- Bốn slide mỗi ngôn ngữ, PPTX editable/PDF visual, speaker notes và sources; [manifest SHA256](../evidence/pitch4-manifest.json).
- Brief nộp bài, bảng rubric/proof, Q&A, run-of-show và checklist trước giờ thi.
- Links website/repo/Explorer/video/slide và bộ source/slide tải về.

## Phân biệt ba trạng thái

| Phần               | Kết luận đúng                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Hồ sơ              | Đã chuẩn bị tài liệu và artifact; link/hash được kiểm khi bàn giao                                                   |
| Prototype kỹ thuật | Web/program CI, receipt Devnet và readiness có bằng chứng; owner báo Phantom thành công, cron uptime chưa nghiệm thu |
| Product & Business | Có nhóm mục tiêu, value proposition, fee mechanism và pilot plan; chưa thu thập paid-user/WTP/revenue data           |

Owner còn rehearsal live bằng đồng hồ, chọn đúng ví/deal mới trước khi trình bày. Không phải thiết lập lại Redis hoặc duyệt lại ví test đã xong. Phần keeper đang pause không được tự mở lại chỉ để hoàn thiện hồ sơ.

## Snapshot và lịch sử

Ảnh/slide R2 sử dụng capture463b3fa; hồ sơ/source kit đầu tiên ở tag e9b53f0, [CI](https://github.com/2274802010922/pipicachu/actions/runs/37818489543) pass cả hai job. Các chỉnh sửa hồ sơ về sau không thay app/contract hoặc viết lại các snapshot đó. Kết quả live có ghi thời điểm, revision và phạm vi; không gọi một snapshot cũ là trạng thái hiện tại vĩnh viễn.

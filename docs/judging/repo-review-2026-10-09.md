# Rà soát hồ sơ thi · 09/10/2026

## Kết luận

Có đủ chương trình, UI, CI và receipt để trình diễn prototype Devnet theo hướng Technical Build. Cách trình bày trước đợt này chưa dẫn giám khảo tới bằng chứng hiện tại đủ nhanh. Business có nhóm mục tiêu, cơ chế phí và kênh pilot đề xuất; chưa có dữ liệu willingness-to-pay hoặc doanh thu. Không thể làm phần đó thành “đã validation” chỉ bằng sửa README/slide.

## Phạm vi đã rà

README VI/EN, docs index, judge guide, product/validation, architecture, testing/reproduction, current/legacy evidence, deployment/owner checklist, license/notices/security/contribution, About/topics/Release và deck R6. Đối chiếu nguồn settlement/constraints/operation với CI và receipts đã có; đây không phải audit bảo mật độc lập từng dòng code.

Runtime đang deploy là `463b3fa`, [CI37812338693](https://github.com/2274802010922/pipicachu/actions/runs/37812338693) pass cả web/program. Readiness rpc/program/manager/limiter true ở lần kiểm. Keeper report stale; không nâng thành bảo đảm lịch chạy. [Ảnh bản hiện tại](../assets/showcase/current/manifest.json).

## Những điểm cần sửa trong hồ sơ

| Mức | Trước                                                                | Cách xử lý trong đợt này                                                                                           |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| P0  | Deck 18 slide, 12 chính; khó còn đủ thời gian demo trong 4 phút      | Pitch 4 slide, 125 giây live demo, 15 giây đệm; business và technical có thời gian riêng                           |
| P0  | README/docs index dẫn “trạng thái hiện tại” vào snapshot 07/10       | Dẫn judge route vào quality/current report; giữ snapshot cũ với nhãn lịch sử                                       |
| P0  | Demo script còn yêu cầu tải evidenceJSON đã bị bỏ                    | Chỉ ghi chú và ký; hàng/bằng chứng trao ngoài ứng dụng                                                             |
| P1  | README showcase là v0.5 và application fixture, dễ nhầm bản hiện tại | Capture deployment thật 463b3fa, ghi revision/role/scope; ảnh cũ giữ lịch sử                                       |
| P1  | Điểm mạnh chủ yếu là danh sách code, ít gắn lợi ích người dùng       | Viết value → mechanism → proof: program custody, atomic settlement, standing consent, recovery                     |
| P1  | Business chưa trả lời nhanh ai trả phí và cách tiếp cận người dùng   | Hiện phí seller deductions, admin incentive và pilot hypothesis; giữ WTP chưa xác thực                             |
| P1  | Release RC mô tả Redis thiếu quyền dù sau đó đã xử lý                | RC giữ snapshot theo tag; notes dẫn rõ bộ hồ sơ cập nhật, không sửa source snapshot                                |
| P2  | Số test 107/119/122 và 32/33/41 cùng tồn tại                         | Tách theo revision, không cộng số lịch sử; current report dùng 122+41                                              |
| P2  | Repo About/topics/license thiếu nổi bật?                             | Description, homepage, Solana/Anchor/USDC/escrow topics và Apache đúng scope đã có; giữ, không thêm badge vô nghĩa |

## Bằng chứng mạnh nhất cho Technical Build

| Rubric do owner cung cấp              | Điều nên trình bày                                                                    | Nguồn                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Difficulty & Depth · 30               | State machine, pending recovery, capacity/race/late ruling, treasury alias            | [v06 tests](../../tests/program/v06.ts), [operation](../../src/escrow/operation.ts)                               |
| Architecture & Contract Quality · 25  | Constraints, immutable terms/recipients, atomic settlement, ABI compatibility         | [constraints](../../programs/pipicachu-escrow/src/contexts.rs), [protocol](../architecture/v06.md)                |
| Solana Integration & Performance · 25 | PDA/SPL CPI/Clock/finality trong đường tiền, receipt thật                             | [live acceptance](../evidence/v06/live/acceptance.json), [benchmark](../evidence/quality/snapshot-benchmark.json) |
| Evidence & Reproducibility · 20       | Exact CI revision, binary/IDL source checks, public receipts, clean-checkout workflow | [quality](../evidence/quality/README.md), [reproduce](../testing/reproduce.md)                                    |

Không tự chấm 9/10 hoặc bảo đảm giải. Bảng này ánh xạ evidence vào rubric, không dự đoán điểm giám khảo.

## Business còn thiếu gì thật sự?

Thiếu hành vi/feedback của nhóm mục tiêu và quyết định trả phí thực. FTC chỉ chứng minh bối cảnh scam online, không chứng minh demand cho escrow USDC của đội. Owner test chứng minh luồng có thể dùng, không chứng minh thị trường. Demo phí chia đúng là validation kỹ thuật cơ chế thu phí, không revenue validation.

Lợi thế đề xuất là phối hợp admin cộng đồng/standing consent/prepaid capacity/UX. Chưa có distribution moat. [Escrow.com](https://www.escrow.com/what-is-escrow) và [Kleros](https://docs.kleros.io/) là alternatives cần thừa nhận, không giả thị trường trống. Có thể pitch mô hình và pilot plan rõ ràng mà vẫn nói đúng giới hạn.

## Cổng trước khi thi

- Owner rehearsal live 1 USDC theo [mốc 4 phút](pitch-4min.md); chưa có số đo rehearsal mới.
- Giữ Phantom mở khóa, ví đúng vai và deal mới còn funding deadline. Không dùng ví CLI harness làm tài khoản của owner.
- Mang PPTX/PDF local, link website/repo/Explorer và kết quả đã chạy trước có nhãn; không chờ keeper hoặc giả thành công khi pending.
- Còn thiếu WTP, footage EN và reliability lịch keeper. Phần sửa keeper đang pause, không nằm trong đợt hồ sơ này.

Nguồn nguyên tắc: [UniHackFest Learn](https://unihackfest.vn/vi/learn/) và yêu cầu mới của owner: 4 phút, demo trực tiếp, cả business/technical. Yêu cầu 4 phút này thay lịch trình deck 12 slide cũ.

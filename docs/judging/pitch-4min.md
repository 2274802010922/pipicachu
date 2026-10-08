# Pitch trực tiếp 4 phút · Business + Technical

Người trình bày chỉ dùng **4 slide**, không chạy deck 18 slide cũ. Nội dung 3 phút 45 giây; giữ 15 giây cho chuyển cửa sổ hoặc chờ finality. Đây là lịch trình mục tiêu, chưa phải số đo rehearsal.

| Thời gian   | Màn hình                       | Điều giám khảo cần hiểu                                                           |
| ----------- | ------------------------------ | --------------------------------------------------------------------------------- |
| 00:00–00:25 | Slide 1: người dùng và vấn đề  | Hai người mua/bán file qua cộng đồng, đã dùng USDC; ai giao trước, ai trả trước?  |
| 00:25–00:55 | Slide 2: giải pháp và business | Program giữ tiền, admin xử tranh chấp; 1% hệ thống +1% trọng tài, pilot qua admin |
| 00:55–03:00 | Slide 3 → website thật         | Buyer nạp 1 USDC → seller bàn giao → buyer xác nhận; nhìn kết quả 0,98/0,01/0,01  |
| 03:00–03:45 | Slide 4: technical và kết      | Quyền theo vai/deadline/recipient, settlement một lần, cọc, CI và receipts        |
| 03:45–04:00 | Giữ slide cuối                 | Khoảng đệm; kết thúc sớm khi hoàn tất, không thêm slide                           |

## Câu chuyện và lời nói

Lời đọc VI/EN nằm trong speaker notes của PPTX và [nguồn nội dung](../../scripts/slides/content-pitch4.json). Đây là lời hỗ trợ; không đọc nguyên slide.

Thông điệp kết: **pipicachu cho cộng đồng một link giao dịch, điều kiện rõ và luồng tiền có thể kiểm chứng.** Không gọi đây là escrow không cần tin ai: trọng tài vẫn có thể xử sai và program còn upgrade authority Devnet.

### Business phải nói rõ trong 30 giây

- Nhóm dùng: người mua/bán sản phẩm số đã có ví Solana và dùng USDC; không nói “mọi người”.
- Người trả phí: phí khấu trừ vào seller proceeds khi payout, 1% hệ thống +1% trọng tài. Refund không phí dịch vụ; SOL mạng riêng.
- Kênh đầu tiên: pilot đề xuất qua 1–2 admin và 5–10 người mua/bán; không gọi là khách hàng đã có.
- Giá trị đề xuất: admin tiếp tục xử dispute, principal do program giữ; standing consent và pool cọc giảm lượt ký nhận từng deal.

### Technical phải nói rõ trong 45 giây

- Phantom ký; program Anchor kiểm vai, thời hạn, state và recipient.
- Vault PDA + SPL Token CPI chia tiền/phí nguyên tử, chống chi lặp, unlock cọc một lần.
- Recovery theo signature/finality, hỗ trợ treasury alias và account cũ có kiểm thử.
- 122 unit/integration +41 browser trên revision `463b3fa`; [CI](https://github.com/2274802010922/pipicachu/actions/runs/37812338693). Sáu nhánh +keeper có receipts finalized, nhưng là fixture CLI, không phải doanh thu hoặc sáu flow Phantom.

## Chuẩn bị trước khi lên sân khấu

1. Dùng seller, buyer và arbitrator khác nhau. Seller khác ví hệ thống để ba khoản payout nhìn riêng; không dùng ví 2dak của harness làm ví Phantom.
2. Trọng tài chính đã duyệt, có cọc khả dụng và đang bật nhận. Đây là setup trước demo, không dành thời gian đăng ký/duyệt/nạp cọc trên sân khấu.
3. Seller tạo **deal mới 1 USDC**, buyer đúng ví, terms ngắn về một file/template demo của đội. Tạo trước sát giờ, còn funding deadline; nói rõ “deal đã tạo trước”.
4. Buyer có USDC Devnet, các ví có SOL phí mạng. Mở khóa Phantom trước; ẩn mọi secret/tab cá nhân.
5. Mở link deal trong cửa sổ seller và buyer, đúng role. Phóng đủ lớn để số tiền và CTA đọc được; không chia màn hình làm chữ quá nhỏ.
6. Mở sẵn Explorer, [receipt hoàn tiền](https://pipicachu.vercel.app/deals/F1fW1tGUhu3bRqxF4CGpZs95CiFF3W9ExYyELSRaxMTj) và [judge guide](README.md) cho phần hỏi đáp.

## Các thao tác trong 125 giây

| Mốc mục tiêu | Thao tác                                                 | Lời dẫn khi mạng đang xác nhận                                        |
| ------------ | -------------------------------------------------------- | --------------------------------------------------------------------- |
| 00:55–01:15  | Buyer xem terms/fee, ký fund                             | “Tiền vào vault, chưa trả seller; thông tin đã chốt.”                 |
| 01:15–01:40  | Thấy Funded, đổi seller; gửi file qua kênh đã thống nhất | “Seller thấy đã ký quỹ trước khi giao. File được trao ngoài app.”     |
| 01:40–02:05  | Seller ghi chú, ký bàn giao                              | “Bàn giao chỉ cần ghi chú và ký; ứng dụng không tự kiểm file.”        |
| 02:05–02:40  | Buyer kiểm file, xem dialog, ký confirm                  | “Kết thúc chia tiền/phí trong một transaction.”                       |
| 02:40–03:00  | Kết quả và Explorer                                      | “Seller 0,98; trọng tài 0,01; hệ thống 0,01. Receipt đối chiếu được.” |

Không chờ keeper hết review deadline hoặc mở dispute mới trong happy path này. Phần đó đã có receipt riêng để trả lời câu hỏi, không giả rằng vừa demo. Keeper cron đang chưa được nghiệm thu độ ổn định; không nói tiền tự trả đúng 5 phút.

## Khi mạng hoặc ví chậm

- Pending: nói “đang chờ mạng xác nhận”, không báo thành công, không ký lại hoặc tạo deal mới khi kết quả chưa rõ.
- Chậm quá khoảng đệm: giữ trạng thái thật, chuyển slide 4 và chỉ mở một receipt cũ **có nhãn đã chạy trước** để giải thích kết quả. Không biến screenshot thành demo live.
- Video happy path v0.5 là phương án ngoài luồng chính nếu BGK muốn xem thêm; không thay video thành bằng chứng feature v0.6.

Owner cần rehearsal bằng đồng hồ một lần trước khi thi. Nếu tổng quá 3:45, cắt lời dẫn lặp và thời gian nhập liệu; giữ thao tác tiền, dialog và thời gian đọc kết quả.

## Bộ slide

VI/EN có PPTX chỉnh sửa và PDF xem nhanh, cùng 4 slide và nội dung số tiền. [Nguồn và cách tái dựng](slides-v06.md). Deck 18 slide R6 ngày 07/10 chỉ giữ làm hồ sơ lịch sử; không dùng trong pitch này.

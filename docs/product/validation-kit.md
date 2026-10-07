# Bộ dùng thử Product & Business

Nhóm: người mua/bán sản phẩm số đã dùng ví Solana và USDC; admin cộng đồng có nhu cầu hỗ trợ giao dịch. Mục tiêu1–2admin,5–10buyer/seller. Owner mời người tham gia; không tự gửi tin ra ngoài.

## Một phiên thử

1. Hỏi về lần giao dịch gần nhất: ai trả trước, ai giữ tiền, đã gặp vấn đề nào, cách xử và chi phí. Không giả định họ cần escrow.
2. Chạy tạo→fund→deliver→confirm không trợ giúp. Đo thời gian, lỗi và số lần cần hỗ trợ; sau đó mới hướng dẫn.
3. Cho họ giải thích ai giữ principal, phí2%, khoản seller nhận, review deadline, quyền trọng tài xử muộn và trường hợp khóa tiền.
4. Thử dispute/refund; ghi task completion và hiểu kết quả. Hỏi họ có chọn tool so với chuyển thẳng/admincustody, vì sao.
5. Hỏi chấp nhận phí cụ thể trên một giao dịch họ thật sự dự định làm. Intent/feedback được ghi riêng, không gọi revenue hoặc paid pilot.

## Dữ liệu

Chỉ mã tester T01... và role/tác vụ/time/help/errors/fee-understanding/intent; không thu seedphrase, KYC, ảnhchat riêng. Tester cho phép trước khi ghi hình. Người tham gia tự giữ tài sản; MVPDevnet không thu tiền thật.

**Trạng thái: chưa thu thập dữ liệu người dùng thực/WTP.** Chưa có doanh thu, chưa được kiểm chứng mô hình1%hệ thống. Báo cáo để trống khi chưa có tester; không dùng số test code thay users.

## So sánh phạm vi

| Giải pháp         | Điều cần kiểm                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Chuyển USDC thẳng | Ít bước, nhưng người mua trả trước chịu rủi ro giao hàng                                          |
| Admin giữ tiền    | Quy trình cộng đồng có sẵn; tin vào custody và phán quyết admin                                   |
| Escrow.com        | Escrow service có flow terms/payment/delivery/inspection/release; không tuyên bố thị trường trống |
| Kleros            | Protocol xử tranh chấp khác mô hình một trọng tài allowlist của pipicachu                         |

Nguồn primary: [Escrow.com](https://www.escrow.com/what-is-escrow), [Kleros docs](https://docs.kleros.io/). Định vị đề xuất: standing consent/capacity và UX link cho cộng đồng đã dùngUSDC; chưa chứng minh moat. [FTC](https://consumer.ftc.gov/consumer-alerts/2022/07/selling-stuff-online-heres-how-avoid-scam) ghi nhận scam khi bán online; đó là nguồn tình huống, không validation khách hàng pipicachu.

# Bàn giao — v0.4

Đọc CURRENT_STATE và docs/evidence/README.md. Treasury immutable CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN. Không dùng key Picachu cũ; key pipicachu work/private chỉ Devnet/ignore. Không thêm private key/env nhận phí vào Vercel.

Deal mới chốt phí1+1, principal không tăng, refund đầy đủ; deal cũ giữ1%. Cùng Program ID/layout876, nine-byte append vào padding; feeVersion0 legacy. Init FeeConfig chỉ pin initializer, không update. Full message/signature binding và destination constraints giữ nguyên.

Đã nghiệm thu39 Devnet checks/6 finalized receipts, legacy99%, keeper98/1/1 +dispute untouched, web53 unit17 browser, Vercel live signed provider+reject+axe+VI/EN, binary cmp/SHA và CI web/program. Không gọi provider test là Phantom thật. Không cam kết scheduler trả đúng giây.

Source triển khai ở b6176d3; checkpoint bằng chứng/samples/tài liệu cập nhật sau nghiệm thu. Không sửa Picachu cũ, không dựng slide/video trong scope escrow này. Public USDC Devnet mint Circle, keeper riêng chỉ giữ SOL cho phí. Khoản test intentional dispute đã refund; không giữ principal test active. Kiểm CURRENT_STATE/health/Git trước tiếp tục.

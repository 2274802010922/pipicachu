# Phạm vi và chính sách

Người dùng giả định: admin trung gian hàng/dịch vụ số và buyer/seller. WTP chưa xác thực. Không gộp P2P VND vì flow nạp/bằng chứng khác.

Buyer nạp USDC Devnet, SOL trả phí. 4 ví khác nhau; hai trọng tài đăng ký và chấp thuận trước funding. Phí 1%, bond mỗi trọng tài ceil(amount/10). Principal tối thiểu 1, tối đa 1 triệu USDC thử nghiệm. Thời hạn 10 giây đến 30 ngày.

Unix timestamp từ Clock. Funding/delivery/dispute dùng `< deadline`, timeout `>=`. Hai vòng trọng tài bằng nhau; primary mất quyền khi backup bắt đầu. Sau hai vòng: buyer đề nghị, seller ký đồng ý đề nghị đang lưu. Không operator tùy ý rút.

Payout/refund toàn phần. Phí primary khi seller được trả bình thường, backup nếu backup phán quyết seller payout; refund không phí. Settlement unlock hai bond một lần trong cùng token transfer transaction. Terminal giữ account/vault để tra cứu, chưa đóng/hoàn rent.

Không phạt xử sai, bảo hiểm, kháng nghị/keeper. Hai trọng tài bỏ xử và hai bên bất đồng có thể khóa tiền vô thời hạn. Không bảo đảm hàng ngoài chuỗi/account game không reclaim/quy định nền tảng cho phép mua bán.

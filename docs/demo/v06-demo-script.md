# Demo v0.6 — kịch bản và phạm vi

Mở đầu: hai người đã có Solana wallet, mua/bán một pack thiết kế bằng USDC qua cộng đồng; người mua muốn kiểm file, người bán muốn nhận tiền. Tình huống minh họa, không gọi là khách hàng thật.

Happy path: người bán chọn trọng tài đã bật nhận → tạo link → người mua xem terms/fee/late-policy và nạp → người bán bàn giao ngoài app, tải evidenceJSON trước ký → người mua kiểm rồi xác nhận. Giữ đúng số tiền đã chọn; payout98/1/1, refund100 không phí. Ví/receipt/mint đọc từ chain.

Cảnh kỹ thuật bổ sung chỉ quay sau nghiệm thu: application owner duyệt bằng Phantom; disputed chặn auto release; đúng trọng tài vẫn xử sau SLA trên policy1; hai bên mutual settlement; keeper report/receipt. Không dùng một deal hoàn tất để giả thành một deal tranh chấp khác. Deal cũ policy0 giữ deadline đã ký.

Nói rõ: program vault không phải ví cá nhân trung gian, nhưng upgrade authority còn giữ. Bond không phải bảo hiểm/slashing; hash không chứng minh hàng có chất lượng. Trọng tài bỏ xử và hai bên bất đồng có thể khóa tiền. Không claim người dùng trả phí chỉ từ Devnet receipts.

Video YouTube hiện tại [mTY3e3qX_4k](https://www.youtube.com/watch?v=mTY3e3qX_4k) là v0.5 happy path do owner quay; chưa demo các phầnv0.6. EN video chỉ dựng sau footageUIEN riêng. Owner uploadYouTube thủ công; không sửa tài sản Picachu cũ.

# Trọng tài được duyệt và cọc nạp trước

Registry PDA organization+authority, initializer quản lý approval. Chỉ trọng tài được duyệt/đang nhận mới tạo deal; không suy ra danh tính công ty từ số dư hoặc tên hiển thị. Demo A là tổ chức thử nghiệm.

Trọng tài nạp quỹ trước rồi ký bật nhận theo policy cố định (minimumDeposit, maximumDeal, bốn thời hạn). CreateOrganizationDeal tự ghi consent/workflowVersion1; buyer fund kiểm lại registry và cọc rồi reserve nguyên tử. Pause/revoke chặn funding mới của workflow1; settle/refund deal đã nạp không phụ thuộc trạng thái tiếp nhận.

Khi đang nhận, không rút bất kỳ cọc nào. Khi ngừng, vẫn chặn rút toàn bộ nếu locked>0. Settlement mở capacity nhưng không trả cọc về ví. Không slashing/bảo hiểm. Không có chức năng tự đăng ký làm tổ chức trên UI; chỉ initializer duyệt ví. API legacy create cũng yêu cầu registry approved, nhưng vẫn manual accept; deal tồn tại trước upgrade giữ workflowVersion0 và cách xử lý cũ.

Policy Demo A Devnet: tối thiểu1 USDC, mỗi deal tối đa10 USDC; funding/delivery/arbitration30 phút, review5 phút. Chỉ public metadata, không private key ở frontend/Vercel.

UI mới4 bước: tạo link → ký quỹ → bàn giao → kết thúc. Form chọn registry, không nhập ví trọng tài hoặc thời hạn tùy ý. Auto-open sau finalized; điều khoản và preview trước ký; final payout/ruling có xác nhận số tiền, complaint form chỉ mở khi chọn khiếu nại. Vai trò phản ánh ví thực, không có giả chuyển vai.

Backwards compatibility: Deal876 và các field cũ không đổi; thêm workflow_version1 byte sau fee_version trong padding. Registry123 là account riêng. Fund/Bond thêm seed-bound optional organization account ở cuối danh sách; legacy client cũ cần reload. Phí1+1 và treasury giữ nguyên.

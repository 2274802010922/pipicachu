# Phạm vi và chính sách v0.6

Người dùng mục tiêu: người mua/bán sản phẩm số qua cộng đồng đã có ví Solana và dùng USDC. Admin/trọng tài cộng đồng hỗ trợ dispute. Đây là giả thuyết nhóm người dùng; WTP và doanh thu chưa xác thực. Không gộp P2P VND.

Ba role khác ví: người bán, người mua, một trọng tài. Treasury có thể trùng role. USDC Devnet giữ trong deal vault; SOL trả phí/rent. Payout người bán98% +trọng tài1% +hệ thống1%, từng phí làm tròn xuống atom USDC; refund100% principal, không phí. Deal fee legacy0 giữ phí cũ. Bond ceil(principal/10) nằm trong pool riêng, không bảo hiểm.

Trọng tài đăng ký application → manager duyệt → chủ ví nạp cọc → ký bật nhận policy. ManagerConfig đọc từ chain, không suy từ treasury. Duyệt là allowlist, không KYC; manager không được rút principal/phán quyết. Standing consent bỏ ký accept từng deal workflow1. Create không reserve; buyer fund kiểm capacity và reserve nguyên tử. Pause/revoke chặn funding mới, settlement nghĩa vụ đang có vẫn được hỗ trợ.

Principal theo policy organization; demo min1/max10 USDC, funding/delivery/SLA30 phút, review5 phút. Global program bounds1–1 triệu USDC thử nghiệm, cửa sổ10 giây–30 ngày; giới hạn tổ chức chặt hơn. Timestamp từ Clock: tác vụ trước hạn dùng `<`; timeout dùng `>=`.

Deal resolution policy0 giữ cutoff trọng tài cũ. Deal mới policy1 dùng arbitrateBy làm SLA, đúng trọng tài vẫn được xử muộn khi Disputed. Sau SLA người mua có thể đề nghị payout/refund, người bán ký đồng ý; phán quyết/đồng thuận terminal đầu tiên thắng. Không arbitrator dự phòng hoặc partial refund.

Không giữ file hàng/bằng chứng ở server. Website chỉ có ghi chú ngắn và ký ví, không tải/nhập JSON hoặc chọn file. Hàng và bằng chứng gửi qua kênh ngoài. Nội dung on-chain chỉ terms công khai tối đa512 UTF8 byte và commitment32byte; hash không xác minh chất lượng/lời trình bày đúng hoặc mã hóa ghi chú. Trọng tài bỏ xử và hai bên bất đồng vẫn có thể khóa tiền. Terminal giữ account/vault để tra cứu; chưa hoàn rent. Upgrade authority Devnet còn giữ, chưa audit/Mainnet.

[Trạng thái đã kiểm](../evidence/quality/README.md) · [Hồ sơ giám khảo](../judging/dossier.md) · [Kiến trúc/ABI](../architecture/v06.md) · [Bộ dùng thử](validation-kit.md).

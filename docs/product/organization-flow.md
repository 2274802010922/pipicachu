# Registry và cọc nạp trước v0.6

Registry organization PDA authority, mint, approval, accepting và policy. `/admin`: trọng tài đăng ký application, chờ manager, nạp cọc và bật nhận. `/manage`: manager đọc quyền từ chain, ký duyệt/reject/revoke, cập nhật policy khi paused; transfer quyền hai bước. Không backend giữ manager key. Allowlist không xác minh danh tính công ty.

Trọng tài bật nhận bằng message bind đúng policy hiện tại. Khi manager thay policy trong lúc chờ ví ký, enable cũ bị InvalidTerms. CreateOrganizationDeal ghi standing consent/workflow1 và resolution policy1; buyer fund kiểm lại registry, min/max, capacity, khóa bond nguyên tử. Không ký accept từng deal. Pause/revoke chặn fund mới, settlement nghĩa vụ đã nạp không phụ thuộc accepting. Khi accepting hoặc còn locked bond không rút. Cọc không phải insurance/slashing.

Demo default min1/max10 USDC; funding/delivery/SLA30 phút, review5 phút. Ví owner đã chỉ định `7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG` giữ nguyên, không thay bằng ví agent. Initializer bootstrap ManagerConfig vào owner `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN` một lần; sau đó không approval bypass initializer. [Bootstrap receipt](../evidence/v06/manager-bootstrap.json).

UI4bước: tạo link → buyer nạp → seller bàn giao → xác nhận/tranh chấp. Đăng ký trọng tài là flow riêng. Điều kiện/fee/late-policy xem trước fund; buyer xác nhận payout hiển thị recipients và số tiền. Deal legacy giữ workflow0/policy0, không thu phí hay cấp quyền xử muộn hồi tố. [Kiến trúc ABI](../architecture/v06.md), [trạng thái đã kiểm](../evidence/v06/README.md).

# Phân tách workspace trọng tài — 05/10/2026

User xác nhận flow tạo deal giữ nguyên; đăng ký → hệ thống duyệt → nạp cọc riêng → bật nhận là luồng riêng cho role trọng tài. Lượt này chỉ làm mục Trọng tài trên header thành thẻ đậm, viền xanh, min44px và active state; route/admin hiện có. Không sửa flow tạo/deal/contract.

Plan onboarding còn CHƯA IMPLEMENT: đăng ký bằng ví người dùng, quản trị duyệt riêng, nạp cọc riêng; không tự chọn Demo A. Demo A hiện là fixture agent từ nghiệm thu, không phải ví user cung cấp. User đã chọn giữ hệ thống duyệt, không permissionless staking.

Lỗi manual đã tái hiện bằng unsigned simulate (không broadcast): deal BZXdtrci9wJEEVeaZYdyF2D2z7STPssaTAKTBEvDoKN9, buyer7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG có4.99SOL, sellerCXjK trùng treasuryCXjK. Confirm lỗi2040 ConstraintDuplicateMutableAccount ở platform_token. Cần cho phép alias token recipient có chủ đích với guard mint/owner/vault và kiểm gộp payout. Chưa sửa contract hoặc ký deal user. Nhãn primaryOwner workflow1 bước2 hiện sai Chờ trọng tài; cần sửa state/actor-driven trong plan tiếp theo.

# Trạng thái v0.5 — 05/10/2026

Flow mới đã triển khai: registry do initializer duyệt, tổ chức nạp quỹ và ký bật nhận trước theo policy. CreateOrganizationDeal tự consent; buyer fund reserve atomically. Không một lượt ký nhận cho mỗi deal mới. Đang nhận/còn nghĩa vụ thì không rút cọc. Pause chặn funding workflow1 nhưng settlement funded vẫn hoạt động. Không bảo hiểm/slashing/KYC tự động.

UI4 bước, chọn registry thay nhập địa chỉ/time thủ công, auto-open sau tạo, bỏ checkbox lặp, dialog số tiền khi payout/ruling, complaint form chỉ khi chọn. Reset draft theo wallet/id, role thực trên trang deal, nút connect lime/connected xanh và secondary outline; không blink. Poll khi visible10s, history RPC lỗi không biến thành lỗi đọc core.

ProgramID/treasury/fee1+1 và Deal876 giữ nguyên; workflow_version1byte append vào padding, legacy0. Fund/Bond thêm registry ở cuối; reload client cũ. Demo A min1/max10 USDC,30m/30m/5m/30m; chưa là đối tác công ty thật.

Đã kiểm: SBF không Stack offset, native Rust legacy512,39+13 local program checks;13 live organization checks và finalized receipt độc lập buyer-only funding +98/1/1 payout.39 account cũ giữ fee/workflow.55 unit21 browser/build/axe/responsive. Browser Vercel ký bằng provider test, không Phantom extension. Keeper service run37282329331 finalized workflow1 payout, dispute untouched và fixture đã refund. CI3a1c4e7 run37280669915 pass; checkpoint tài liệu/samples tiếp theo cũng chạy CI.

SBF hash875287e32ca051c8d754a7f69d824bd8f2bb2ac240d8d381777792b5ae9a9422; deployed prefix khớp, trailing reserved bytes toàn0 sau extend. Upgrade authority còn giữ. Không env mới, không thay Picachu cũ/video. Không có test principal cố ý giữ khóa. Đọc evidence/README và health khi tiếp tục.

# Trạng thái v0.5 — 05/10/2026

Flow mới đã triển khai: registry do initializer duyệt, tổ chức nạp quỹ và ký bật nhận trước theo policy. CreateOrganizationDeal tự consent; buyer fund reserve atomically. Không một lượt ký nhận cho mỗi deal mới. Đang nhận/còn nghĩa vụ thì không rút cọc. Pause chặn funding workflow1 nhưng settlement funded vẫn hoạt động. Không bảo hiểm/slashing/KYC tự động.

UI4 bước, chọn registry thay nhập địa chỉ/time thủ công, auto-open sau tạo, bỏ checkbox lặp, dialog số tiền khi payout/ruling, complaint form chỉ khi chọn. Reset draft theo wallet/id, role thực trên trang deal, nút connect lime/connected xanh và secondary outline; không blink. Poll khi visible10s, history RPC lỗi không biến thành lỗi đọc core.

ProgramID/treasury/fee1+1 và Deal876 giữ nguyên; workflow_version1byte append vào padding, legacy0. Fund/Bond thêm registry ở cuối; reload client cũ. Demo A min1/max10 USDC,30m/30m/5m/30m; chưa là đối tác công ty thật.

Đã kiểm: SBF không Stack offset, native Rust legacy512,39+13 local program checks;13 live organization checks và finalized receipt độc lập buyer-only funding +98/1/1 payout.39 account cũ giữ fee/workflow.55 unit21 browser/build/axe/responsive. Browser Vercel ký bằng provider test, không Phantom extension. Keeper service run37282329331 finalized workflow1 payout, dispute untouched và fixture đã refund. CI3a1c4e7 run37280669915 pass; checkpoint tài liệu/samples tiếp theo cũng chạy CI.

SBF hash875287e32ca051c8d754a7f69d824bd8f2bb2ac240d8d381777792b5ae9a9422; deployed prefix khớp, trailing reserved bytes toàn0 sau extend. Upgrade authority còn giữ. Không env mới, không thay Picachu cũ/video. Không có test principal cố ý giữ khóa. Đọc evidence/README và health khi tiếp tục.

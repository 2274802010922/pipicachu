# Thay ví test bằng ví user — 05/10/2026

User làm rõ yêu cầu là thay Demo A, không thêm song song. Đã initializer revoke approval củaHt5k38ysGyt2VKoddxbACCeLoVngQFojNeXzACGz9dEP, acceptingfalse; transaction2gKX6Sy2EGhA4uGAGjmhdWxXov9uWTMydCWy4ooh1uKZdMbviU2VDQee64o69UyCa39LZ7BbPAQMNfYmZ4DCK2hD finalized. Cọc của ví cũ (total/locked) không đổi; không sửa participant hoặc rút tiền deal cũ. New registry selection chỉ có7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG approved, đangchờuser nạp min1USDC và ký accepting.

Cấu hình public trọng tài ởsrc/escrow/arbitrator-config.json; UI labelProject arbitrator và địa chỉngắn, không gọi víuser làDemoA. TrangDemo hiển thịvíuser thayvítest; src/escrow/samples.json giữtrọngtàicũ vì là provenance receipt đã tạo, không sửa lịch sử. Không tự ký/nạp/enable bằngvíuser, không sửa lỗi2040.

# Ví trọng tài do user cung cấp — 05/10/2026

User chỉ định7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG làm trọng tài. Profile đã tồn tại với total/locked0; registry chưa có. Đã initializer approve bằng transaction finalized5bWihyVM23bqQ1ciyiaAkGWsshLazMCuwZvDkKngWHgE37qhRHey3w8hWHvZwojXsCmWBJV2JNNDSsqkuKfGH6p6. Approvedtrue, acceptingfalse; min1USDC/max10USDC/policy30m/30m/5m/30m như cấu hình Devnet hiện hữu. User tự ký deposit và enable bằng Phantom, không yêu cầu/private key user. Script approve-arbitrator chỉ lấy public address, chỉ manager ký.

Không đổi vai trò trong deal cũ: cùng ví7PpW là buyer của BZXd... ở snapshot lỗi2040; approval mới không chuyển thành arbitrator của deal đó. Buyer/seller/arb của deal mới phải khác nhau. Không thay treasury, không tự nạp cọc/bật nhận, không claim lỗi2040 đã sửa. KYC/company identity không suy ra từ approval Devnet.

# README và showcase trạng thái thực — 05/10/2026

User yêu cầu README khớp bản đang deploy. Đã đồng bộ VI/EN: trạng thái UI/contract hiện có, onboarding riêng chưa triển khai, Demo A là ví fixture, nhãn funding sai và lỗi2040 alias seller=treasury chưa sửa, Phantom extension/video chưa có bằng chứng mới. Counts55unit26browser52program; sample7 gồm1workflow mới+6legacy. Ví dụ phí1USDC khớp demo thay100 vượt policyDemoA.

Showcase4ảnh từ production4530c03, không mockup, không ký/broadcast: desktop1440×1000, mobile375×1000, formEN375×1400 sau registry loaded. Ảnh và provenance ở docs/assets/showcase, không chứa secret. Link/format và GitHub rendered images cần kiểm trước bàn giao. Không đổi runtime hoặc contract.

# Visual thống nhất — 05/10/2026

User duyệt chỉnh visual end-to-end, giữ flow tạo deal/contract. Đã tách tokens/controls/header styles, xóa các override header/nút/shadow cũ; header44px, desktop1 hàng/tablet2/mobile2 với menu. Workspace luôn thấy; menu focus trap/Escape/nav/resize và keyed slots giữ kết nối. Formspacing, container/card và primary/secondary nhất quán; step lime-soft bỏ glow.

55 unit và26 browser pass, đã capture32route/locale/viewport checks cho4trang ×VI/EN×375/768/1024/1440, không overflow; đã xem representative desktop/tablet/mobile, create và menu. Lượt đầu menu Tab đi ra body; đã bổ sung explicit focus wrap và rerun26 pass. Home CTA primary/formgap đã sửa và full verify rerun pass55 unit26 browser/build. CI kiểm tiếp trên push main; production visual smoke sau deploy.

Plan đăng ký → duyệt → cọc riêng → bật nhận của role trọng tài và lỗi2040 alias seller=treasury vẫn CHƯA IMPLEMENT. Không auto-set ví demo mới hoặc thay treasury. Xem phần ngữ cảnh trước dưới đây; không coi visual refresh là sửa lỗi tiền.

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

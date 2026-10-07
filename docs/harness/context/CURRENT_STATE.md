# pipicachu — checkpoint hotfix v0.5.1 / tiếp tục v0.6

## Trạng thái hiện tại

Hotfix settlement đã build và deploy Devnet. Recipient platform được phép alias có kiểm soát, CPI gộp theo ATA thực và dedup ATA init. Deal BZXd…DoKN9 đã finalized, vault0, mở cọc0,1; seller=treasury nhận0,99 và arb0,01. 46 deal giữ nguyên principal/fee/workflow/terms/deadlines. Evidence: docs/evidence/hotfix-alias-recovery.json và hotfix-v051.json.

Local39 lifecycle +13 registry pass; alias payout/refund ở4 cấu hình treasury pass8 cases. Negative destination tests dùng attacker ATA riêng và kiểm exact error. SBF prefix deployed khớp binary local. Web verify/CI được ghi theo checkpoint thực tế; không coi hotfix là đã hoàn thành v0.6.

## Kế hoạch user đã duyệt, bắt buộc tiếp tục

Chỉ pipicachu, không Picachu cũ, USDC Devnet, phí1+1/refund0, không AI. v0.6: resolutionPolicyVersion1 cho deal mới xử muộn (legacy0 giữ cutoff); ManagerConfig do initializer bootstrap rồi managerCXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN duyệt application bằng Phantom; manager không có quyền tiền. Profile7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG giữ nguyên.

Tiếp tục: application/manager protocol+IDL/tests, operation lifecycle/session recovery, keeper isolation/shared Redis/readiness, UI modules/view model/mobile/role/onboarding, evidence package local salt/export/verify, dependency reachability/CSP/benchmarks, judge guide/README VIEN/deck12+6 appendix VIEN/PPTXPDF, Devnet+Vercel checks/release0.6. EN video chờ footage; WTP chờ người dùng thực. Không fake audit/Phantom/business validation.

## Runtime và hành động

WSL Ubuntu-22.04 root Solana CLI ở/root/.local/share/solana/install/active_release/bin và cargo ở/root/.cargo/bin. Windows Node24/npm; ledger tests port8897. work/start-local.ps1 là helper local ignored; validator phải stop trước restart. Key chỉ work/private pipicachu, không in hoặc commit. Chưa nhập manager key vào server. Commit tiếng Việt, push main, kiểm CI mỗi checkpoint. Đọc user plan đầy đủ trong conversation.

Lịch sử trước hotfix ở docs/archive/v0.5-context/. Review detailed ở work/review-2026-10-07/SENIOR_REVIEW.md. Không dùng lịch sử như current status.

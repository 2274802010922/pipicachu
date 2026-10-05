# Light terminal — escrow

Logo pixel; Be Vietnam Pro. Canvas #F7F6F1, surface trắng, ink #091426, muted #526174, CTA #B7F34D, focus/link #2456E6. Monospace địa chỉ/nhãn. Rhythm 8px, target >=44px; không dark/animation trang trí.

Không sidebar thường trực. Header logo, nav, VI/EN, kết nối ví; wrap trên mobile. Landing → tạo/link deal → hành động theo role → receipt. Deal: trạng thái → tiền/phí/deadline → bước tiếp theo → điều khoản → bằng chứng.

Acknowledgement trước tiền/phán quyết. Loading/sign/pending/finalized/reject/error riêng. Không mặc định ví xem là buyer. VI/EN giữ form; địa chỉ wrap, kiểm 375/768/1024/1440, keyboard/axe.

## UI gọn — 05/10/2026

Một bước hiện tại, một hành động chính. Tiến trình có current lime/viền xanh/glow đứng yên và nhãn Đang thực hiện; done ✓, future muted, dispute cam. Không animation nhấp nháy. Nút đúng bước primary lime/viền sáng nhẹ; disabled/chờ keeper/terminal không có nút giao dịch sáng gây hiểu nhầm.

Trang deal: tiến trình → tóm tắt tiền/phí/thời gian → thẻ hành động → Điều kiện / Ví & bằng chứng / Cách hoạt động (mặc định đóng). Khiếu nại ở cạnh xác nhận, không giấu. Mobile <=768: summary Bước N/5, mở ra xem list; CTA rộng thẻ. Trạng thái RPC cũ khóa thao tác, không báo ready.

Form tạo giữ 4 trường chính; time nâng cao, preview tiền nhận/phí và consent ngắn. Điều khoản/rủi ro trước ký có disclosure, không bỏ thông tin tiền quan trọng. Không đổi ví/backend/contract.

## Chuẩn visual thống nhất — 05/10/2026

Token ở src/frontend/styles/tokens.css; controls.css là nguồn nút/form; header.css quản lý shell responsive, không patch global nav. Header controls44px/14px/line-height1.4/radius8, gaps8 trong nhóm và16 giữa nhóm. Desktop>=1024 một hàng; tablet768–1023 hai hàng; mobile<768 hai hàng có Menu, workspace luôn thấy. Native dialog menu có Tab loop, Escape/close/outside, trả focus và tự đóng khi lên desktop. Keyed slots giữ WalletButton khi reorder breakpoint; không reset kết nối.

Container max1200, desktoppadding32/mobile16; cardpadding24/mobile16, radius12. Primary lime, secondarywhite/blue outline, active step lime-soft không glow; không heavy shadow cho controls. Heading/content giữ light terminal, body16 và helper14. Flow/API/contract không thay đổi. Onboarding trọng tài và lỗi2040 còn pending riêng.

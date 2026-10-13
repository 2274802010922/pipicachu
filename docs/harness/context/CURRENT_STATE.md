# pipicachu · minh bạch phí · 13/10/2026

## Yêu cầu hiện tại

User yêu cầu end-to-end: phí98/1/1 rõ trước ký, người dùng tự kiểm chứng; loại quyền đơn phương thay logic sau ký quỹ. Chỉ pipicachu/USDC Devnet, giữ flow4bước, không JSON evidence, không mở lại keeper đang pause. Không sửa Picachu cũ. Commit tiếng Việt/push main/kiểm CI.

## Đã xây

- PaymentBreakdown đọc số tiền/phí/recipients từ deal và FeeConfig; dialog trước nạp, refund/legacy/rounding/alias rõ.
- Instruction fund_reviewed bind SHA-256 toàn bộ điều kiện đã xem; error6009 append. ABI account/legacy không đổi. Client đọc lại và Rust kiểm trước transfer.
- Receipt verifier đối chiếu transferChecked finalized từ đúng vault/mint/ATA, có nhánh alias/refund; thiếu bằng chứng không báo verified.
- /api/program-status và health đọc authority từ ProgramData finalized; unknown không được gọi immutable. UI hiển thị đúng trạng thái live.
- Program đã upgrade Devnet: binary1d78f1ebca22843996e8b79b701d18706c82fc959774332a892c1fb242458487. Tất cả70account có sẵn/58deal không đổi.
- New deal5popFC7JC9YwwH6Tfrnn8zANYG86Nr953oZxvBXFnXSa đã finalized; principal1USDC, split0,98/0,01/0,01, cọc mở về0. CLI proof, không Phantom proof.

## Kiểm chứng

npm verify pass126TypeScript +47browser, VI/EN375/768/1024/1440/axe. SBF/native/IDL pass: lifecycle39, organization13, v06+reviewed-fund29, alias2×4; native5. Sáu receipt lịch sử được verifier mới đọc live và khớp. [Proof](../../evidence/fee-transparency/rollout.json), [design](../../architecture/fee-transparency.md).

## Cổng cuối

CI38345111648 tại b6d342b pass quality/escrow-program. Binary từ CI trùng local và deployed, padding còn lại zero. Program Devnet4Xds…Xnrb đã **immutable**: authority=None finalized; [receipt](../../evidence/fee-transparency/immutable.json). Không upgrade cùng Program ID nữa. Đổi contract về sau phải dùng Program ID mới và giữ routing cho deal cũ. UI/backend vẫn được cập nhật; manager quản lý registry theo code hiện hữu.

Website checkpoint b6d342b đã smoke live375/1440, nhận đúng bảng0,98/0,01/0,01 và verifier receipt. Commit cuối đồng bộ wording/refund, không đổi Rust/binary; phải kiểm CI/Vercel theo exact commit khi bàn giao. Không dùng cấu hình để giả immutable.

## Phần độc lập chưa xử lý

Keeper reliability và draftstash8c7b36dd7683f4738cf3e732b5eb1c5d83e5c06b vẫn pause. Các lỗi lifecycle/refresh trong review sau cuộc thi chưa thuộc checkpoint phí. Chưa audit độc lập/Mainnet/business validation. CSP report-only. Không dùng CLI/mocked wallet thay nghiệm thu Phantom thật. [Ngữ cảnh trước](../../archive/context-fees-2026-10-13/CURRENT_STATE.md).

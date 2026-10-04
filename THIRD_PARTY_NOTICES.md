# Nguồn và phạm vi kế thừa

- **UI reference:** Picachu/SkillBridge của owner, đọc từ Picachu commit `b8f90abb4bd26440fd2dab6047b176b9df363362`. Kế thừa định hướng/tokens, viết shell mới; không chép wallet/provider, API hay nghiệp vụ.
- **Logo:** ảnh pixel owner cung cấp, sao chép nguyên file `picachu-logo.jpg`. Không cấp lại quyền cho artwork theo MIT của code. Không tuyên bố sở hữu nhãn hiệu/nhân vật trong ảnh.
- **solana-explain (lịch sử):** reference MIT commit `411a5f1aee7a7115f5bf739fcd5455f27a9ce591`, chỉ thuộc ý tưởng tra cứu đã archive ở `7315d42`. Sản phẩm escrow không dùng decoder/narrative/source này.
- **Escrow:** Rust/Anchor và SPL Token dùng như dependency; tự viết state machine, account constraints, vault, cọc và client. IDL sinh từ Rust. Không vendor mã escrow bên thứ ba.
- **Dữ liệu:** Solana Devnet RPC và mint USDC của Circle. Local validator dùng mint synthetic, có nhãn riêng; không giả Circle issuance.
- **Dependencies:** giữ nguyên license của package đã pin trong lockfile. Be Vietnam Pro sử dụng SIL Open Font License; Lucide dùng ISC. Các notice font/icon được giữ cùng bộ phân phối.

Backend/core/UI mới thuộc phạm vi MIT của repo. Nếu sau này vendor source/asset, phải bổ sung nguyên bản notice và commit nguồn trước khi commit.

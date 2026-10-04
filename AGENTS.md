# pipicachu — escrow Devnet

- Đọc docs/harness/context/CURRENT_STATE.md, HANDOFF.md và docs/design/system.md.
- Scope: buyer nạp USDC Devnet, seller bàn giao ngoài chuỗi, một trọng tài, cọc khóa; không phạt xử sai.
- Không phục hồi API diễn giải vào sản phẩm mới. Picachu cũ chỉ đọc; không dùng key/.env/password/deployment cũ.
- Commit tiêu đề và nội dung bằng tiếng Việt. Cập nhật ngữ cảnh/bằng chứng, push main và kiểm CI.
- Mọi quyền tiền do Rust program kiểm tra. UI chỉ UX, không authority.
- BigInt/u64; Clock mạng. Pending/RPC error không được báo hoàn tất.
- Không Mainnet writes, keeper, bảo hiểm, marketplace, AI hoặc đổi VND.
- Không đưa mật khẩu/key/bằng chứng riêng tư vào Git/on-chain/log.
- VI/EN nhất quán, light terminal; kiểm 375/768/1024/1440, bàn phím/axe.
- npm run verify; build-sbf + test:program; Devnet receipt và Phantom thật là cổng riêng.
- Không gọi local/mocked wallet là Phantom proof. Trọng tài bỏ xử và không đồng thuận có thể kẹt tiền.
- Khóa cọc sau khi trọng tài accept và buyer nạp; mở khóa đúng một lần khi terminal.

# pipicachu

## Bắt đầu

- Đọc docs/harness/context/CURRENT_STATE.md, HANDOFF.md và docs/design/system.md.
- Mục tiêu: giải thích giao dịch Solana cho người mới Việt Nam; đối chiếu do core, AI chỉ chú giải.
- Repo Picachu cũ là tham chiếu chỉ đọc. Không dùng lại key, .env, deployment, video hoặc dữ liệu riêng của dự án cũ.

## Workflow

- Cập nhật ngữ cảnh, quyết định và bằng chứng cùng code. Commit mới bằng tiếng Việt và push main theo yêu cầu người dùng.
- npm ci; npm run check; npm run verify. Check live/AI/ký ví là các cổng riêng, không gọi fixture là proof live.
- Không tạo kết luận thanh toán từ số thực, symbol token, instruction của transaction failed hoặc output LLM.
- Không biến null/RPC error/missing metadata thành zero hoặc thành công. Không lưu lịch sử người dùng.
- Chỉ ký và gửi Devnet trong demo; Mainnet chỉ đọc. Giữ message binding, expiry, idempotency và kiểm genesis.
- VI/EN phải nhất quán; kiểm mobile, bàn phím, loading/empty/error/partial. Giữ light terminal.
- Code/asset kế thừa ghi nguồn, commit và license trong THIRD_PARTY_NOTICES.md. Logo ngoài phạm vi MIT của code.
- Không báo hoàn tất khi live deploy, AI thật, ký ví, slide/video còn chưa nghiệm thu; ghi rõ phần phụ thuộc cấu hình owner.

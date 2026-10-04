# Bàn giao escrow

Đọc CURRENT_STATE, product, architecture, evidence. Không tiếp tục pipeline tra cứu/AI/video cũ.

Key test/deploy chỉ work/private (ignore), không in secret; bốn role khác nhau. User cấp SOL Devnet từ trước và đang hỗ trợ USDC. Không dùng key Picachu cũ. Deployment programId HwsHDnbuZbXZtVFvgGkZpzAVEAQN3SYJCfZzUa18Ho5V, Circle Devnet mint.

Đã pass: 42 checks local + Devnet, 23 unit/IDL, 7 browser responsive/axe, browser ký trọn flow qua Vercel với provider test (key chỉ Node), CI web/program và Vercel read-only smoke. Bằng chứng trong docs/evidence. Chưa kiểm Phantom extension thật và chưa audit độc lập. Không gộp provider test thành Phantom proof.

Vercel chỉ cần NEXT_PUBLIC_SITE_URL và RPC Devnet. Không thêm biến mới so với cấu hình đã có; AI/Redis cũ không sử dụng. Repo About đã đổi sang escrow. Không có slide/video mới theo scope hẹp user đã chốt.

Mọi test deal đang nạp đã được kết thúc hoặc hoàn tiền; các draft không nạp không giữ tiền/cọc. Nếu rerun live cycle cần đọc available balances trước; đã dùng khoản nhỏ 2 USDC/CLI deal và 1 USDC/browser deal. Không ký thêm Mainnet.

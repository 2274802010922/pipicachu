# Trạng thái — 04/10/2026

User yêu cầu bỏ trọng tài phụ. v0.3 chỉ có buyer, seller, arbitrator; một cọc, một accept và một vòng xử tranh chấp. Hết hạn trọng tài: buyer đề nghị, seller đồng ý; không đồng thuận tiền vẫn khóa. Không phạt xử sai/keeper/Mainnet.

ABI thay đổi: dùng Program ID mới 4Xds5m5JtWR8HbNLdGeF7e3Qh3akKMHwMfjKsQeVXnrb, không nâng cấp chương trình v0.2. Mint Circle Devnet không đổi. Đã kiểm không có active deal legacy, rút cọc hai ví test cũ về đúng ví gốc, giữ receipt/IDL tại docs/archive/v0.2-two-arbitrators.

Rust build/IDL, 6 flow/38 checks local pass. Program mới deploy Devnet, dump binary khớp byte-for-byte. Đã kiểm 6 kịch bản finalized qua RPC, đối chiếu exact transfer từ vault đến buyer/seller/trọng tài. Script full live-negative cycle gặp RPC 429, không gọi là 38 checks live pass; đã xử lý các test bị gián đoạn bằng đồng thuận hoàn tiền.

Web: 23 unit/IDL, 7 browser tests, build/lint/typecheck pass. Browser local ký bằng test provider đã pass create, một accept, fund, deliver, reject giữ nguyên state, confirm, axe/VI/EN/privacy. Phantom extension thật chưa kiểm. Bản một trọng tài đang chuẩn bị push/CI/Vercel.

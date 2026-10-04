# Kiến trúc và hợp đồng dữ liệu

Next.js/React/TypeScript, Vercel Node 24. RPC server-side dùng lossless-json; số lượng tài sản là bigint và JSON integer strings. Zod validate request. Redis namespace pipicachu:v1 cho cache, quota và demo journal; không lưu lịch sử người dùng.

Input URL chỉ được phân tích signature/network; không fetch HTML hoặc nhận custom RPC. Chỉ Mainnet/Devnet, kiểm genesis. getTransaction và getSignatureStatuses là hai nguồn khác nhau; null không tự thành failed.

Core normalize giữ movements đã thực hiện/đã thử, fee payer, bằng chứng instruction/CPI, native/token balance changes, partial warnings. Địa chỉ owner token phải có bằng chứng lịch sử; không đoán từ authority hoặc người trả phí. USDC theo mint Circle và decimals.

Comparison chỉ chấp nhận successful/finalized/full/live/direct transfers, kiểm cả movement và balance evidence. Swap, mint, rent refund, outgoing ambiguity, partial hoặc archive không được báo matched. Không invoice/replay protection và không xác nhận sàn ghi có.

AI nhận context tối thiểu, không địa chỉ/signature/memo/raw logs/expected amounts. Headline/amount/verdict nằm ngoài AI. Narrative tối đa hai câu/60 từ, validate/fallback có nhãn.

API: POST analysis/explain/compare; POST demo/prepare và demo/submit; GET demo/status, health. Client không cung cấp facts đáng tin. Tất cả trả Cache-Control no-store; read quota và AI budget có giới hạn.

Demo prepare xây/simulate 0,001 SOL Devnet, bind SHA-256 message+wallet+expiry. Signature cryptographic được kiểm trước broadcast. Redis SET NX giữ signature trước gửi để retry không tạo transaction khác. Mainnet không có send path. Test signer/receiver mới; private file chỉ trong ignored work/private.

legacy/v0 được hỗ trợ. Jupiter v6 nhận diện program, hiển thị effects và luôn ghi intent partial. Chưa claim full IDL decoder, simulator trước ký Mainnet hoặc hỗ trợ mọi DeFi protocol.

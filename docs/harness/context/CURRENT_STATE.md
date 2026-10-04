# Trạng thái — 04/10/2026

User yêu cầu bỏ trọng tài phụ. v0.3 chỉ có buyer, seller, arbitrator; một cọc, một accept và một vòng xử tranh chấp. Hết hạn trọng tài: buyer đề nghị, seller đồng ý; không đồng thuận tiền vẫn khóa. Không phạt xử sai/Mainnet. Keeper được bổ sung theo flow cuối ở bên dưới.

ABI thay đổi: dùng Program ID mới 4Xds5m5JtWR8HbNLdGeF7e3Qh3akKMHwMfjKsQeVXnrb, không nâng cấp chương trình v0.2. Mint Circle Devnet không đổi. Đã kiểm không có active deal legacy, rút cọc hai ví test cũ về đúng ví gốc, giữ receipt/IDL tại docs/archive/v0.2-two-arbitrators.

Rust build/IDL, 6 flow/38 checks local pass. Program mới deploy Devnet, dump binary khớp byte-for-byte. Đã kiểm 6 kịch bản finalized qua RPC, đối chiếu exact transfer từ vault đến buyer/seller/trọng tài. Script full live-negative cycle gặp RPC 429, không gọi là 38 checks live pass; đã xử lý các test bị gián đoạn bằng đồng thuận hoàn tiền.

Web: 23 unit/IDL, 7 browser tests, build/lint/typecheck pass. Browser local và Vercel ký bằng test provider đã pass create, một accept, fund, deliver, reject giữ nguyên state, confirm, axe/VI/EN/privacy. Phantom extension thật chưa kiểm.

Đã push main aa30d7c, giữ nguyên commit đổi tiêu đề README của owner (acfc39f). Vercel health đúng v0.3, schemaVersion 3/arbitratorCount 1/Program ID mới; smoke pass. CI 37207354325 pass cả quality và escrow-program. Evidence/handoff cuối được commit riêng; không đổi code tiền. Không cần env mới.

## Sửa lỗi test thủ công

## Hiển thị cọc ngay sau tạo link

Sau seller tạo link, UI có lời dẫn bước tiếp theo cho trọng tài và số cọc của deal. Trang deal có thanh 5 bước; bước 2 hiển thị required / available / missing và trạng thái consent. Trọng tài nạp đúng phần thiếu + accept cùng transaction, hoặc dùng pool hiện có. Buyer chỉ thấy fund khi đọc được đủ cọc và đã accept. Không sửa Rust/ABI: cọc chỉ reserve khi buyer fund.

Đọc lại profile trước ký, không tự tăng deposit vượt phần thiếu user đã xem; khác biệt bất lợi yêu cầu refresh. Lỗi đọc không biến thành available=0 hay ready. 48 unit/11 browser pass; fixture UI synthetic có nhãn riêng. Atomic top-up + accept thật Devnet đã kiểm với ví test mới, cọc chưa locked trước funding; receipt bond-preparation.json. Chưa gọi là Phantom extension test.

## Flow cuối đã chốt và keeper

Seller tạo link; buyer nạp USDC Devnet; seller giao hàng/đánh dấu đã giao; buyer xác nhận hoặc khiếu nại. Không seller cọc, không buyer tạo deal. Một trọng tài và cọc/consent trước funding giữ nguyên để không khóa cọc khi chưa nhận trách nhiệm.

Thêm keeper service GitHub Actions lịch khoảng 5 phút, wallet riêng chỉ SOL Devnet, secret repo đã cấu hình. Không key custodial trên Vercel. Keeper chỉ finalize Delivered quá review deadline, không release dispute. UI chờ tự trả tiền và bỏ nút finalize khỏi flow thường.

Đã nghiệm thu live service run 37214074644 bằng workflow_dispatch: keeper signed/finalized, seller nhận 990000 atomic USDC, arb fee 10000, buyer/seller không gửi confirm/finalize. Disputed fixture giữ principal 1000000 trong lượt scan và được arb refund sau kiểm. Workflow schedule active, chưa quan sát tick schedule tự nhiên; không hứa SLA. Receipt ở keeper-live.json. CI code 114df7b run 37214018306 pass, Vercel smoke đúng SHA/automaticKeeper true.

45 unit tests và 8 browser tests/build pass trước test service. Không đổi Rust/IDL/Program ID; không hứa payout đúng giây, không phạt xử sai.

Owner tạo deal khi trọng tài chưa đăng ký: đã tái hiện Anchor AccountNotInitialized/3012 trên account arbitrator, trước khi ký. Thêm precheck và thông báo riêng, hướng dẫn mở trang Trọng tài; không yêu cầu USDC/cọc ở bước tạo.

Owner đăng ký gặp WALLET_CHANGED sau ký. Hai nguyên nhân trước đây gộp chung: đổi ví hoặc signed message khác. Phantom có hành vi thêm priority-fee instruction nếu dapp chưa khai báo compute budget (nguồn chính thức được ghi trong architecture). Fix khai báo 300.000 CU và 0 micro-lamports priority price cho Devnet trước simulate/sign; vẫn so sánh nguyên message và verify signature. Tách WALLET_CHANGED, TRANSACTION_CHANGED, INVALID_WALLET_SIGNATURE. Đây là mitigation khớp hành vi wallet, chưa có signed message trực tiếp từ extension owner để kết luận chắc chắn nguyên nhân.

Regression tái hiện Phantom-like mutation, signed round-trip, chặn đổi ví/địa chỉ nhận/missing signature; browser chặn create trước ký nếu thiếu trọng tài. 37 unit và 8 browser tests, full verify pass. Fresh Devnet registration với explicit budget pass bằng CLI signer, receipt wallet-register-budget.json; không gọi là Phantom extension pass. Contract/IDL/Program ID không đổi, không cần env mới.

# pipicachu · trạng thái hiện tại · 08/10/2026

## Phạm vi đã chốt

Chỉ pipicachu, USDC Devnet, không sửa Picachu cũ. Giữ bốn bước seller tạo → buyer fund → seller deliver → buyer confirm/dispute. Một trọng tài có standing consent; payout 98/1/1, refund full principal. Không thêm AI, marketplace, bảo hiểm, slashing, fallback trọng tài hoặc Mainnet.

Trọng tài chính: `7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG`. Manager/treasury owner: `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`; quyền manager đọc từ chain, không suy từ treasury. Commit tiếng Việt, push main, kiểm CI.

## Đợt hoàn thiện chất lượng

Client tách addresses/amounts/binary/codec/queries/instructions/types; facade `client.ts` giữ import cũ. Rust tách contexts/state/error/registry/settlement/math, giữ ABI. Deal controller và details tách khỏi view. Query snapshot dùng 2 RPC finalized, coalesce chỉ trong flight, history throttle 30 giây. Codec/recovery/readiness chặt hơn. CI pin Actions/Agave checksum, source-derived IDL gate, lint zero warning và advisory-scoped dependency exceptions.

Program refactor đã nâng cấp Devnet, prefix binary khớp local và tail reserve bằng 0. Snapshot 46 deal không đổi tiền/phí/terms/state/policy/deadlines; receipt trong quality evidence. Local pass 119 unit/integration, 33 browser, 5 native Rust và 82 kiểm executable/cold/alias.

Bằng chứng và kết quả cuối: [quality](../../evidence/quality/README.md). [Kiến trúc](../../architecture/quality.md) · [Tái hiện](../../testing/reproduce.md). Lịch sử checkpoint cũ ở `docs/archive/context-2026-10-07/`; không tiếp tục prepend trạng thái mâu thuẫn vào file này.

## Cổng owner được hoãn theo yêu cầu

User yêu cầu hoàn tất code và tự kiểm thủ công sau. Không hỏi lại password/seed phrase, không bypass manager approval hoặc write limiter. Redis đã được xử lý sau khi owner cung cấp cặp REST hợp lệ ngày 08/10. Vercel Production/Preview và GitHub keeper đã cấu hình; `/api/ready` true, unsigned simulation pass. Keeper hai lượt manual pass, healthy với eligible 0; chưa thay live payout/scheduled reliability/Phantom proof.

Application test `2dakRFzAYG6qrWenyNUt5uCAGLhDYJMUhLBfXJn5XeC8` đã được owner duyệt và ký policy; on-chain times thực tế 1800/1800/300/60, min1/max10 USDC. Giữ điều kiện đã ký, không yêu cầu owner ký lại. CLI đã kiểm sáu nhánh thật/finalized (confirm, delivery timeout, arbitrator payout/refund, late ruling, mutual refund); `docs/evidence/v06/live/acceptance.json`. Ví test nạp cọc1 USDC, khóa/mở đúng theo các deal; sau keeper đã ngừng nhận và locked0. Primary 7Pp giữ nguyên.

Keeper thực đã trả một deal Delivered sau review deadline, signerCHSYC, split98/1/1 và unlock100000 atomic; proof `docs/evidence/v06/live/keeper-payout.json`. Workflow dispatch37765632041 pass; normal restart37766407120 pass/eligible0. Một forced recheck bị lỗi lưu report Redis; không tính là negative pass. Cron uptime/business chưa nghiệm thu. Owner báo đã kiểm Phantom thành công ngày 08/10; chưa có receipt/checklist chi tiết, không coi là bằng chứng độc lập cho mọi nhánh.

Harness dùng gateway Vercel cho read/simulation/send, source product operation lifecycle và journal để resume cùng nonce, không tạo/nạp lặp. Archive transaction đọc riêng để kiểm delta token từ receipt finalized. `--allow-long-policy --resume` tôn trọng Clock/deadline thật. UI /manage hiển thị policy trên chain, dialog ghi ví và đủ giá trị trước ký; 119unit +34browser web pass.

[Checklist owner](../../deployment/OWNER_CHECKS.md): credentials/Redis/keeper startup, owner approval/policy và nhánh mới/keeper payout đã kiểm. Owner đã báo kiểm Phantom thành công; phạm vi accept/reject/VIEN/recovery riêng chưa được cung cấp. Cron reliability và tester còn riêng. Cọc không bảo hiểm; bỏ xử hoàn toàn và hai bên bất đồng vẫn có thể khóa tiền. CSP vẫn report-only, không tự enforce từ một báo cáo kiểm thủ công không có phạm vi chi tiết.

## Đơn giản hóa giao diện theo phản hồi owner

Owner yêu cầu bỏ tính năng gói JSON sau khi test. Website không còn auto-download, nút tải JSON, file manifest hoặc import/verifier. Bàn giao/khiếu nại/phán quyết chỉ ghi chú ngắn → ký ví → trạng thái. Hash SHA-256 của ghi chú trim vẫn truyền đúng32byte; không đổi contract, phí, wallet operation hoặc deal cũ. Ghi chú không upload/lưu; hàng và bằng chứng trao qua chat. `src/escrow/evidence.ts` chỉ phục vụ fixture lịch sử, không vào UI.

Phần sửa keeper đang tạm dừng theo user và được lưu trong local Git stash riêng; không đưa vào đợt thay đổi UI này. Các cổng test/deploy cho UI mới được cập nhật theo bằng chứng sau kiểm, không dùng báo cáo Phantom của bản trước làm proof cho bản mới.

Local UI mới pass 122 unit/integration, 41 browser, format/lint/typecheck/build/docs; VI/EN375/768/1024/1440 và axe. [Bằng chứng](../../evidence/quality/simple-notes.json). CI/Vercel sau push là cổng riêng cho revision này.

## Hồ sơ

README VI/EN, Judge guide và tài liệu chất lượng cập nhật. Deck R6 (07/10) là candidate theo phạm vi tại thời điểm dựng; không coi số test cũ là báo cáo mới. Video `mTY3e3qX_4k` là happy path v0.5. EN footage và dữ liệu business/tester chưa có; không dựng bằng chứng hoặc doanh thu giả.

## Revision nghiệm thu tự động

Implementation chất lượng commit `d044af727534e38ee66acad235064d4293e80760`, Quality run `37718022979` pass cả hai job. Vercel của checkpoint đó và read-only smoke pass. Program upgrade finalized, binary `0e5efb8dad587ee58f2952aec1ca0fa992cb074ec30d895402a49c18f3201861`; 46 deal giữ nguyên. `/api/ready` sau cấu hình ngày 08/10 đã ready/limiter true; xem `docs/evidence/quality/redis-ready-2026-10-08.json`. Các revision tiếp theo được ghi riêng trong bằng chứng tương ứng.

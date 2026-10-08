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

Application test riêng `2dakRFzAYG6qrWenyNUt5uCAGLhDYJMUhLBfXJn5XeC8` đã được owner duyệt, receipt finalized ở `docs/evidence/v06/owner-approval.json`. Policy on-chain hiện min 1/max 10 USDC, times 1800/1800/300/1800. Đã điền sẵn draft 300/60/60/60 ở Chrome /manage; owner còn cần bấm Áp dụng policy trên đúng hàng 2dak và ký. Test key đã có đủ SOL/USDC, total/locked 0. Không thay trọng tài chính. Chỉ chạy `scripts/devnet/accept-v06.ts` sau khi policy ngắn đã lên chain; CLI không thay Phantom extension proof.

[Checklist owner](../../deployment/OWNER_CHECKS.md): phần credentials/Redis/keeper startup đã hoàn tất; manager approval đã kiểm; còn owner cập nhật policy test ngắn, Phantom accept/reject, nhánh mới Devnet, keeper payout và tester. Cọc không bảo hiểm; bỏ xử hoàn toàn và hai bên bất đồng vẫn có thể khóa tiền. CSP mặc định report-only, chưa enforce trước kiểm Phantom.

## Hồ sơ

README VI/EN, Judge guide và tài liệu chất lượng cập nhật. Deck R6 (07/10) là candidate theo phạm vi tại thời điểm dựng; không coi số test cũ là báo cáo mới. Video `mTY3e3qX_4k` là happy path v0.5. EN footage và dữ liệu business/tester chưa có; không dựng bằng chứng hoặc doanh thu giả.

## Revision nghiệm thu tự động

Implementation commit `d044af727534e38ee66acad235064d4293e80760`, Quality run `37718022979` pass cả hai job. Vercel deploy đúng commit và read-only smoke pass. Program upgrade finalized, binary `0e5efb8dad587ee58f2952aec1ca0fa992cb074ec30d895402a49c18f3201861`; 46 deal giữ nguyên. `/api/ready` sau cấu hình ngày 08/10 đã ready/limiter true; xem `docs/evidence/quality/redis-ready-2026-10-08.json`. Commit tiếp theo chỉ ghi proof CI/smoke, không thay code.

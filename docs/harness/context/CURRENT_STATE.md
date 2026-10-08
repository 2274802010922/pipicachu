# pipicachu · trạng thái hiện tại · 08/10/2026

## Phạm vi đã chốt

Chỉ pipicachu, USDC Devnet, không sửa Picachu cũ. Giữ bốn bước seller tạo → buyer fund → seller deliver → buyer confirm/dispute. Một trọng tài có standing consent; payout 98/1/1, refund full principal. Không thêm AI, marketplace, bảo hiểm, slashing, fallback trọng tài hoặc Mainnet.

Trọng tài chính: `7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG`. Manager/treasury owner: `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`; quyền manager đọc từ chain, không suy từ treasury. Commit tiếng Việt, push main, kiểm CI.

## Đợt hoàn thiện chất lượng

Client tách addresses/amounts/binary/codec/queries/instructions/types; facade `client.ts` giữ import cũ. Rust tách contexts/state/error/registry/settlement/math, giữ ABI. Deal controller và details tách khỏi view. Query snapshot dùng 2 RPC finalized, coalesce chỉ trong flight, history throttle 30 giây. Codec/recovery/readiness chặt hơn. CI pin Actions/Agave checksum, source-derived IDL gate, lint zero warning và advisory-scoped dependency exceptions.

Program refactor đã nâng cấp Devnet, prefix binary khớp local và tail reserve bằng 0. Snapshot 46 deal không đổi tiền/phí/terms/state/policy/deadlines; receipt trong quality evidence. Local pass 119 unit/integration, 33 browser, 5 native Rust và 82 kiểm executable/cold/alias.

Bằng chứng và kết quả cuối: [quality](../../evidence/quality/README.md). [Kiến trúc](../../architecture/quality.md) · [Tái hiện](../../testing/reproduce.md). Lịch sử checkpoint cũ ở `docs/archive/context-2026-10-07/`; không tiếp tục prepend trạng thái mâu thuẫn vào file này.

## Cổng owner được hoãn theo yêu cầu

User yêu cầu hoàn tất code và tự kiểm thủ công sau. Không hỏi lại password/seed phrase, không bypass manager approval hoặc write limiter. Production Redis trước đợt này báo `permissions`; GitHub keeper thiếu URL/token. Phải kiểm lại trạng thái triển khai sau push nhưng không tự gọi readiness degraded là hoàn tất.

Application test riêng `2dakRFzAYG6qrWenyNUt5uCAGLhDYJMUhLBfXJn5XeC8` đang pending. Không thay trọng tài chính. Owner duyệt với min 1/max 10 USDC, times 300/60/60/60 rồi mới chạy `scripts/devnet/accept-v06.ts`. Script CLI không thay Phantom extension proof.

[Checklist owner](../../deployment/OWNER_CHECKS.md): credentials Redis/keeper, manager approval, Phantom accept/reject, nhánh mới Devnet, keeper/report/restart và tester. Cọc không bảo hiểm; bỏ xử hoàn toàn và hai bên bất đồng vẫn có thể khóa tiền. CSP mặc định report-only, chưa enforce trước kiểm Phantom.

## Hồ sơ

README VI/EN, Judge guide và tài liệu chất lượng cập nhật. Deck R6 (07/10) là candidate theo phạm vi tại thời điểm dựng; không coi số test cũ là báo cáo mới. Video `mTY3e3qX_4k` là happy path v0.5. EN footage và dữ liệu business/tester chưa có; không dựng bằng chứng hoặc doanh thu giả.

# pipicachu · trạng thái bàn giao · 09/10/2026

## Phạm vi

Chỉ pipicachu, USDC Devnet. Seller tạo → buyer fund → seller giao ngoài app → buyer confirm/dispute. Một trọng tài đã duyệt, standing consent/cọc sẵn. Payout 98/1/1; refund nguyên principal không phí dịch vụ. Không AI, Mainnet, marketplace, bảo hiểm/slashing, trọng tài dự phòng hoặc đổi VND. Không sửa Picachu cũ.

Primary arbitrator: `7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG`. Manager/platform treasury owner: `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`. Quyền manager đọc từ chain. Commit tiếng Việt, push main và kiểm CI.

## Hồ sơ hiện tại

[Mục lục giám khảo](../../judging/dossier.md) → [brief VI](../../judging/submission.vi.md)/[EN](../../judging/submission.en.md) → [guide 90 giây](../../judging/README.md) → [live pitch 4 phút](../../judging/pitch-4min.md) → [Q&A](../../judging/questions.md).

4 slide VI/EN, PPTX editable/PDF visual, R2 đã render kiểm. Nội dung3:45 +15giây đệm, live125giây, demo1USDC →0,98/0,01/0,01. [Manifest](../../evidence/pitch4-manifest.json), tag v0.6.0-pitch-kit sourcee9b53f0; slide/capture snapshots không bị overwrite. Gói hồ sơ bổ sung có source revision riêng.

README/showcase/guide/current report đã dẫn về bằng chứng theo thời điểm, không gọi ảnh463b3fa là revision deploy hiện tại vĩnh viễn. Checklist setup cũ chuyển [archive](../../archive/context-2026-10-09/OWNER_CHECKS.md); [checklist sân khấu](../../deployment/OWNER_CHECKS.md) không yêu cầu ký lại2dak hoặc nhập lại Redis.

## Bằng chứng đã có

- Web: 122unit/integration +41browser, VI/EN375/768/1024/1440/axe. CI37812338693 trên463b3fa và CI37818489543 trêne9b53f0 pass web/program; [current report](../../evidence/quality/README.md).
- Program: native Rust5, executable money/policy/alias/cold checks, source-derived IDL. Binary `0e5efb8dad587ee58f2952aec1ca0fa992cb074ec30d895402a49c18f3201861`; upgrade/snapshot46deal không đổi ở [proof](../../evidence/quality/protocol-rollout.json).
- Devnet: [sáu nhánh CLI finalized](../../evidence/v06/live/acceptance.json) và [keeper service payout](../../evidence/v06/live/keeper-payout.json), đúng split/refund/unlock. Không dùng CLI làm Phantom/customer proof.
- Manager approval/policy owner đã ký; target2dak times1800/1800/300/60, min1/max10. Giữ chính sách đã ký. Testarb sau kiểm pause/locked0/pool1USDC, không đổi primary7Pp.
- Redis đã cấu hình riêng Vercel Production/Preview và GitHub keeper, GET/SET/EVAL/simulation đã kiểm. [Snapshot09/10](../../evidence/competition-snapshot.json) ghi deploye9b53f0/readiness true tại thời điểm rà; keeper stale được giữ đúng.
- Owner báo test Phantom thành công08/10; chưa có per-case receipts độc lập. Bỏ JSON xong chỉ ghi chú/ký; commitment32byte, không thay ABI/luồng tiền.

## Còn ngoài phần hồ sơ

Owner rehearsal bằng đồng hồ trên máy trình chiếu và deal mới. WTP/paid-user/revenue chưa thu thập; pilot counts chỉ giả thuyết. Video mTY3e3qX_4k là happy pathv0.5; EN footage chưa có. Không dựng các dữ liệu này hoặc tự nâng CSP khỏi report-only.

Keeper cron reliability chưa nghiệm thu. Bản nháp đang pause ở local stash `8c7b36dd7683f4738cf3e732b5eb1c5d83e5c06b`; không phục hồi nếu user chưa yêu cầu tiếp tục keeper. Một forced recheck từng lỗi report storage; không tính pass. Demo4phút dùng buyer confirm.

## Ngữ cảnh kỹ thuật để tiếp tục

Client/Rust/controller đã tách trách nhiệm, giữ ABI. Snapshot2RPC finalized, coalesce chỉ in-flight, history30giây/ẩn tab ngừng polling. Codec/readiness/signature/recovery kiểm chặt; JSON/file verifier bỏ khỏi UI, helper chỉ tái hiện fixture lịch sử.

Helper accept-v06 dùng Vercel gateway, journal cùng nonce và `--allow-long-policy --resume`, đọc archive receipt để kiểm delta. Không chạy fresh khi còn obligation hoặc dùng Picachu key/.env/password. Lịch sử chi tiết ở [archive09/10](../../archive/context-2026-10-09/CURRENT_STATE.md) và archive07/10; không prepend trạng thái mâu thuẫn vào file này.

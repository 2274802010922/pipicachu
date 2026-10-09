# Handoff pipicachu · 09/10/2026

User chốt **README thể hiện trực tiếp câu chuyện và 7 tiêu chí**, strengths/evidence inline, không lấy slide/dossier download làm đường dẫn chính. VI/EN đồng bộ; scope USDC Devnet; không fabricated market/audit/award claims. Live pitch4phút và dossier giữ làm tham khảo. Không thêm feature hoặc mở lại keeper đang pause.

## Bắt đầu ở đâu

[CURRENT_STATE](CURRENT_STATE.md), [dossier index](../../judging/dossier.md), [snapshot đã kiểm](../../evidence/competition-snapshot.json), [current evidence](../../evidence/quality/README.md).

Hồ sơ gồm README VI/EN, brief nộp bài, judge guide/Q&A, run-of-show, checklist sân khấu, showcase thật và slideR2. Hướng dẫn setup cũ được archive; không yêu cầu user làm lại Redis, duyệt2dak hoặc full Phantom vì đã bỏ JSON.

## Quy tắc tiếp tục

1. Chỉ pipicachu; không đọc/sử dụng key/.env/password của Picachu cũ. Keys test riêng chỉ Git ignore, không log/upload.
2. Commit title/body tiếng Việt, push main, kiểm CI và links/artifact. Web `npm run verify`; protocol changes dùng `bash scripts/checks/program.sh` và receipts riêng.
3. Runtimecode463b3fa, source hồ sơe9b53f0/CI37818489543 đã kiểm; snapshot có timestamp, không phải lời khẳng định latest-commit vĩnh viễn. Slide/ảnh/tag/source ZIP cũ giữ nguyên provenance.
4. Hồ sơ bổ sung ZIP/manifest ghi sourcecommit mới riêng. Không retarget tag v0.6.0-pitch-kit hoặc overwrite các artifact R2/source snapshots đã phát hành.
5. User Phantom reported-success khác CLI/mock proof. WTP/rehearsal/ENfootage/cron reliability chưa có kết quả; không dựng hoặc đánh dấu hoàn tất thay owner. Mainnet/audit chưa có, CSP report-only.
6. Keeper draft ở local stash `8c7b36dd7683f4738cf3e732b5eb1c5d83e5c06b`, pause theo user. Chỉ restore khi họ yêu cầu tiếp tục phần đó. Demo happy path dùng buyer confirm, không chờ cron.
7. Nếu cần resume Devnet harness, đọc journal và dùng cùng nonce, `--allow-long-policy --resume`; actual approved policy1800/1800/300/60. Testarb2dak đang pause/locked0; primary7Pp không đổi. Không tạo/fund lại khi kết quả chưa rõ.

Chi tiết lịch sử: [harness snapshot09/10](../../archive/context-2026-10-09/HANDOFF.md), [live receipts](../../evidence/v06/live/README.md). Hồ sơ hoàn thiện, nghiệm thu vận hành và business validation là ba kết luận riêng.

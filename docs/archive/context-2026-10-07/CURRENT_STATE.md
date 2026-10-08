# pipicachu v0.6 — checkpoint đang nghiệm thu · 07/10/2026

## Đã kiểm

Hotfix v0.5.1 commit2e06f2c, CI37583984049 pass, BZXd…DoKN9 đã phục hồi finalized. v0.6 contract đã deploy Devnet, binary prefix bằng local và tail reserve0; 46 deal snapshot không đổi tiền/phí/terms/workflow/state/deadlines. ManagerConfig bootstrap finalized vào CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN; xem docs/evidence/v06/protocol-rollout.json và manager-bootstrap.json.

Local native2, executable39lifecycle+13organization+21governance/capacity/late-ruling, coldbootstrap unauthorized6000, alias payout/refund4roles. Web npm run verify pass:105 unit/integration,31 browser, build/lint/typecheck/format/audit gate/docs. Báo cáo docs/evidence/v06/local-acceptance.json; chưa dùng thay kiểm owner/production.

Code mới: policy1 xử muộn (legacy0 giữ cutoff), manager/application/transfer2sig, enable binds policy snapshot, feature UI/view-model, operation recovery, evidence export/importsalt, RPCbounds/sharedlimiter, keeper isolatedretry/Redisreport, ready/health, CSP report-only. Docs architecture/deployment/judge/tester kit và benchmark read10mẫu có sẵn. Benchmark tx hiện là historicalhotfix, không v0.6live.

## Chưa được tính hoàn tất

Web v0.6 đang chuẩn bị commit/push; website hiện vẫn v0.5.1. Redis URL/token local trống; Vercel Production đã có hai biến cũ, salt mới đã thêm Production+Preview; RedisURLPreview/GHkeeper cần owner đăng nhậpUpstash hoặc tự nhập secrets. Async question đang chờ, tabChromeUpstashlogin phảimarkHandoff khi kết thúc.

Cần actual manager application approvalCXj bằngPhantom, các nhánhv0.6live/keeper restart/sharedRedis, Phantomextension accept/reject, CI+Vercelsmoke, performancev0.6tx, READMEshowcase/status cuối, deck18slideVIEN/PPTXPDF visualQA, release0.6tag. Business chưatester/WTP; ENvideo chờfootage. Không đánh dấu toàn release hoàn tất khi thiếu cổng trên.

## Workflow

Chỉ pipicachu, không Picachu cũ/keys/password/deployment cũ. Current arb7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG giữ nguyên; manager không phải treasury authority. Commit tiếng Việt/pushmain/checkCI, không yêu cầu xác nhận lại việc userđãduyệt. NoAI/noMainnet/noinsurance/slashing/backup arb. UpgradeauthorityDevnet còn giữ. State/history source chung và money rights do Rust.

## Cập nhật cuối checkpoint

main383757f, CI37622854442 pass cả web/program; Vercel đúng revision, smoke readonly pass. Phát hiện readinessfalsepositive: PINGRedis pass nhưng unsignedsimulate qua proxy bị RATE_LIMIT_UNAVAILABLE. Không coi writes/limiter hoạt động. Code mới probe chính Lua limiter, trả limiterError enum an toàn; đang verify rồi push để chẩn đoán provider. Không lộ credential/rawerror.

Application test riêng2dakRFzAYG6qrWenyNUt5uCAGLhDYJMUhLBfXJn5XeC8 đã register/submit pending thật; không thayprimary7Pp. Chrome /manage kết nối managerCXj, đã điền min1/max10USDC, times300/60/60/60; ownerapprovalquestion pending. Không bấm ký khi gatewaywrite chưa hoạt động. Script accept-v06.ts chỉ chạy nếu applicationapproved, min/max/times phù hợp; giữkeytestignore. Manager never loaded onserver.

Frontend thêm finalized reads cho deal, epochguardkhi đổi ví, nhãn pendingvícũ, Creatorrefresh/guard policysnapshot. Browserrecoverypass và full32 đãpass trướcdiagnosticRedis; unit107 với2Redisdiagnostic tests. DeckVIEN18slides @oai/artifact-tool; R5PPTX trong work/deck-v06/output, PDFR3cũ cần xuấtR5/R6 cậpnhậtcount107. MarkersPresentationscreate2pptx vàPDFcreate2pdf ĐÃCHẠY, không chạy lại khi sửa. Đã visualQA cảdeckVI vàEN; vòngcuối chỉsửa sốtest/title9. PPTXnative tables8,15 valid, chưa mởPowerPoint.

## Bàn giao candidate cuối

main00c164d (CI37654711035success) đã deploy. Readiness trả503 đúng vì limiterError permissions; provider từchối quyền lệnhEVAL, unsignedsimulationchặn antoàn. Ownercần Tokenwrite/EVAL đúngtrongVercel Production/Preview và2GHsecretsRedisURL/token. Không gọicheckpointReleasecompleted.

Candidatefiles work/deck-v06/output/pipicachu-v06-{vi,en}-r6.{pptx,pdf}; zipacceptancecandidate cùngfolder. 18slides mỗi language,12main+6appendix; nativeeditabletables8/15, fontArial, sourcesnotes, PDFvisualexport. Đãrender/QA allslides trước, chỉsửa số107/32 vàtitle9ởR6; kiểm lạichangedPDFpages. ChưaPowerPointdesktop. Manifestdocs/evidence/v06/slides-manifest.json, ownerchecklistdocs/deployment/OWNER_CHECKS.md. Không markerartifact lại.

Code/script/harness107unitintegration32browserpasses. App chưađượcwrite vìRedispermission; actualmanagerapproval,6livebranches(newprobe), keeper/report/restart vàPhantom thậtchưaqua. Business/testerdata chưathu, ENfootage chờowner. Hoàn tấtCredential vàownerSig mới tiếp tụcaccept-v06.ts, kiểmKeeper+benchmarkv06tx, updateevidence vàtagfinal0.6.0.

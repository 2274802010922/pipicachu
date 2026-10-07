# Slide v0.6 VI/EN

Hai bản độc lập, mỗi bản12 slide chính +6 appendix, native editable PPTX và PDF xem nhanh. FontArial được chọn vì có sẵn và hiển thị tiếng Việt; giữ nền light terminal/lime/blue. Native tables ởslide8 và15; flow slide4 là diagram editable. Sources trong speaker notes và tài liệu judge/product/evidence.

Nguồn nội dung: `scripts/slides/content-v06.json`; builder `scripts/slides/build-v06.mjs` dùng @oai/artifact-tool từ runtime Codex. Artifact lớn được giữ trong work/deck-v06/output và phân phối qua Release khi đủ cổng nghiệm thu; không commit file dựng hoặc key.

Bản dựng hiện tại R6: `pipicachu-v06-vi-r6.pptx`, `pipicachu-v06-en-r6.pptx` và PDF cùng basename. Đã kiểm cấu trúc18slides, native tables, font policy và first-party import. Render mỗi slide; sửa orphan/wrap và screenshot quá nhỏ. PDF là visual export, PPTX là bản chỉnh sửa. Chưa kiểm trong PowerPoint desktop hoặc Google Slides.

Slide nói đúng giới hạn: prototype Devnet, chưa audit/Mainnet/WTP; video là v0.5, UI mới dùng fixture được ghi rõ. Benchmark transaction hiện là hotfixv0.5.1; không giả benchmarkv0.6. Các cổng owner, Redis/keeper, Phantom và business vẫn hiển thị chờ. Không dùng deck để tuyên bố release đã hoàn tất.

## Tái dựng

Dùng runtime bundled của Codex; tạo junction node_modules trong build ignore tới RUNTIME_NODE_MODULES, copy builder sang build, đặt PRESENTATION_SKILL_DIR, ARTIFACT_PYTHON, RUNTIME_NODE_MODULES, RUNTIME_NODE, RUNTIME_PYTHON theo workspace dependencies. QR website tạo bằng thư viện qrcode đã có ở máy; app không dùng thư viện này. Chạy builder với repo root. Không cài library trình bày vào production app. Mỗi lần sửa tạo revision output mới, không overwrite final cũ; theo finalization/visual QA của skill Presentations.

## Luồng thuyết trình

Main12: vấn đề giao/trả trước → nhóm dùngUSDC → flow4bước → vai trò blockchain → demo → phí/giả thuyếtbusiness → alternatives → validation táchlocal/live → roadmap → solo team → QR. Appendix dùng khi BGK hỏi quyền tiền/state machine/cọc/recovery/ABI/benchmark. Happy-path video mTY3e3qX_4k giữ nguyên; dispute/late/keeper phải có receipt mới trước khi quay thêm.

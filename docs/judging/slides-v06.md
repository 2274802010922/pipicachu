# Slide: pitch trực tiếp 4 phút

Bộ hiện tại VI/EN: **4 slide mỗi deck**, editable PPTX và visual PDF. Nội dung chính là problem/user → solution/business → live demo → technical/evidence. Thời lượng mục tiêu3:45 cộng15giây đệm; live demo125giây. [Run-of-show](pitch-4min.md), [câu hỏi giám khảo](questions.md).

## Artifact hiện tại

[Bộ pitch trên GitHub Releases](https://github.com/2274802010922/pipicachu/releases/tag/v0.6.0-pitch-kit)

| Bản | Chỉnh sửa                                                                                                         | Xem nhanh                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| VI  | [PPTX](https://github.com/2274802010922/pipicachu/releases/download/v0.6.0-pitch-kit/pipicachu-pitch4-vi-r2.pptx) | [PDF](https://github.com/2274802010922/pipicachu/releases/download/v0.6.0-pitch-kit/pipicachu-pitch4-vi-r2.pdf) |
| EN  | [PPTX](https://github.com/2274802010922/pipicachu/releases/download/v0.6.0-pitch-kit/pipicachu-pitch4-en-r2.pptx) | [PDF](https://github.com/2274802010922/pipicachu/releases/download/v0.6.0-pitch-kit/pipicachu-pitch4-en-r2.pdf) |

`pipicachu-pitch4-vi-r2.pptx`, `pipicachu-pitch4-en-r2.pptx` và PDF cùng basename. File cuối ở `work/pitch-4min/output/`, phân phối qua bộ pitch Release. FontArial, light terminal nền#F7F6F1, ink#091426, lime#B7F34D, blue#2456E6. Text và flow diagram là native/editable; screenshot/QR/logo giữ đúng nguồn.

Nguồn nội dung [content-pitch4.json](../../scripts/slides/content-pitch4.json), builder [build-pitch4.mjs](../../scripts/slides/build-pitch4.mjs), visual PDF [export-pitch4.py](../../scripts/slides/export-pitch4.py). [Manifest](../evidence/pitch4-manifest.json) ghi SHA256, số trang, nguồn screenshot và phạm vi đã kiểm. Không nói đã kiểm PowerPoint desktop/Google Slides khi chưa mở ở đó.

Screenshot trong slide là kết quả fixture CLI Devnet finalized1USDC; **trên sân khấu chạy một deal mới**, không trình bày screenshot như vừa giao dịch. Notes có sources và lời dẫn VI/EN. Business chỉ có fee mechanism và pilot hypothesis, không giả users/revenue/WTP. Keeper receipts là dispatch, không uptime schedule.

## Tái dựng

Dùng `load_workspace_dependencies` của Codex lấy runtimeNode/packages/Python và installed Presentations skill. Junction `work/pitch-4min/build/node_modules` trỏ tới runtime packages; copy builder vào build directory. Đặt `PRESENTATION_SKILL_DIR`, `ARTIFACT_PYTHON`, `RUNTIME_NODE_MODULES`, `RUNTIME_NODE`, `RUNTIME_PYTHON` theo paths thực tế. Không cài artifact-tool vào runtime web.

Theo skill Presentations/PDF, đánh dấu operation trước authoring, chạy builder bằng bundledNode với argument repo root; sau đó Python export-pitch4.py với root và revision. Mỗi lần sửa dùng `PITCH_REVISION=r3` hoặc revision mới; không overwrite final cũ. Finalizer kiểm package/layout/fonts/import, rồi render và kiểm mọi slide/PDF bằng mắt. PDF là ảnh render, PPTX là nguồn chỉnh sửa và chứa speaker notes.

## Deck dài trước đây

Deck18slides R6 ngày07/10, main12+appendix6, source [content-v06.json](../../scripts/slides/content-v06.json), [build-v06.mjs](../../scripts/slides/build-v06.mjs), [manifest snapshot](../evidence/v06/slides-manifest.json). Giữ lịch sử, không dùng trong pitch4phút; các trạng thái Redis/owner/góiJSON trên deck đó không đại diện bản hiện tại.

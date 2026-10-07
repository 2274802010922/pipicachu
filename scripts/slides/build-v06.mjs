import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";
const workspaceDir = path.resolve(process.argv[2]);
const skill = process.env.PRESENTATION_SKILL_DIR;
if (!skill)
  throw Error(
    "Set PRESENTATION_SKILL_DIR to the installed Presentations skill",
  );
const { finalizePresentation, resolvePresentationFont } = await import(
  pathToFileURL(path.join(skill, "container_tools/artifact_tool_utils.mjs"))
    .href
);
const font = resolvePresentationFont({ fontFamily: "Arial" });
const data = JSON.parse(
  await fs.readFile(
    path.join(workspaceDir, "scripts/slides/content-v06.json"),
    "utf8",
  ),
);
const privateRoot = path.join(workspaceDir, "work/deck-v06");
const logo = new Uint8Array(
  await fs.readFile(path.join(workspaceDir, "public/brand/picachu-logo.jpg")),
);
const screenshot = new Uint8Array(
  await fs.readFile(
    path.join(
      workspaceDir,
      "docs/assets/showcase/v06/arbitrator-registration-desktop-en.png",
    ),
  ),
);
const screenshotVi = new Uint8Array(
  await fs.readFile(
    path.join(
      workspaceDir,
      "docs/assets/showcase/v06/arbitrator-registration-desktop-vi.png",
    ),
  ),
);
const qr = new Uint8Array(
  await fs.readFile(path.join(privateRoot, "website-qr.png")),
);
const ink = "#091426",
  blue = "#2456E6",
  muted = "#526174",
  lime = "#B7F34D",
  canvas = "#F7F6F1";
const finalPaths = [];
function text(
  slide,
  value,
  left,
  top,
  width,
  height,
  size = 30,
  bold = false,
  color = ink,
) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: font,
    fontSize: size,
    bold,
    color,
    autoFit: "none",
  };
  return shape;
}
function line(slide, x, y, width, color = blue) {
  slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width, height: 0 },
    fill: "none",
    line: { fill: color, width: 1.5 },
  });
}
function rows(slide, body) {
  body.forEach((value, i) => {
    text(
      slide,
      String(i + 1).padStart(2, "0"),
      72,
      202 + i * 100,
      56,
      50,
      24,
      true,
      blue,
    );
    text(slide, value, 146, 194 + i * 100, 1054, 82, 30);
  });
}
function table(slide, body, lang, fees = false) {
  const values = [
    fees
      ? lang === "vi"
        ? ["Đích nhận", "Số tiền", "Phạm vi"]
        : ["Recipient", "Amount", "Scope"]
      : lang === "vi"
        ? ["Giải pháp", "Điểm mạnh", "Khác biệt / đánh đổi"]
        : ["Alternative", "Strength", "Difference / trade-off"],
    ...body.map((x) => x.split("|")),
  ];
  const table = slide.tables.add({
    rows: values.length,
    columns: 3,
    left: 72,
    top: 190,
    width: 1136,
    height: 370,
    columnWidths: [260, 380, 496],
    values,
  });
  table.borders.assign({ style: "solid", fill: "#D6DEEB", width: 1 });
  for (let r = 0; r < values.length; r++)
    for (let c = 0; c < 3; c++) {
      const cell = table.getCell(r, c);
      cell.fill = r === 0 ? "#EAF0FF" : "#FFFFFF";
      cell.text.style = {
        typeface: font,
        fontSize: 24,
        bold: r === 0,
        color: ink,
      };
    }
  return table;
}
for (const lang of ["vi", "en"]) {
  const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  const renderDir = path.join(privateRoot, "render-r6", lang);
  await fs.mkdir(renderDir, { recursive: true });
  for (const entry of data) {
    const slide = p.slides.add();
    slide.background.fill = canvas;
    const content = entry[lang];
    slide.speakerNotes.textFrame.setText(
      entry.notes +
        "\n" +
        content.body.join("\n") +
        "\nV0.6 acceptance is incomplete; do not claim verified paid users or independent audit.",
    );
    if (entry.layout === "cover") {
      slide.images.add({
        blob: logo,
        contentType: "image/jpeg",
        fit: "contain",
        position: { left: 76, top: 76, width: 100, height: 75 },
      });
      text(slide, "pipicachu", 72, 181, 1100, 114, 88, true);
      text(slide, content.title, 72, 315, 1050, 145, 48, true);
      text(slide, content.body[0], 72, 488, 1100, 74, 30);
      text(slide, content.body[1], 72, 610, 1100, 46, 22, false, muted);
    } else {
      text(slide, content.title, 72, 53, 1136, 118, 46, true);
      if (entry.layout === "flow") {
        content.body.forEach((label, i) => {
          const x = 72 + i * 290;
          slide.shapes.add({
            geometry: "rect",
            position: { left: x, top: 252, width: 242, height: 150 },
            fill: i === 1 ? lime : "#FFFFFF",
            line: { fill: blue, width: 1.5 },
          });
          text(slide, String(i + 1), x + 20, 268, 56, 40, 26, true, blue);
          text(slide, label, x + 20, 317, 204, 78, 30, true);
          if (i < 3) text(slide, "→", x + 249, 292, 37, 66, 36, false, blue);
        });
        text(
          slide,
          lang === "vi"
            ? "Trọng tài xử tranh chấp; tiền không nằm trong ví cá nhân của họ."
            : "An arbitrator resolves disputes; funds stay outside their personal wallet.",
          72,
          482,
          1136,
          110,
          30,
        );
      } else if (entry.layout === "table" || entry.layout === "fee-table") {
        table(slide, content.body, lang, entry.layout === "fee-table");
        text(
          slide,
          entry.layout === "fee-table"
            ? lang === "vi"
              ? "Cọc 0,2 USDC được reserve riêng từ pool; không phải phí hoặc bảo hiểm."
              : "A separate 0.2 USDC bond is reserved from the pool; it is not a fee or insurance."
            : lang === "vi"
              ? "Định vị đề xuất: standing consent, capacity và UX link cho cộng đồng dùng USDC."
              : "Proposed positioning: standing consent, capacity and a deal link for USDC communities.",
          72,
          588,
          1136,
          65,
          25,
          false,
          muted,
        );
      } else if (entry.layout === "demo") {
        slide.images.add({
          blob: lang === "vi" ? screenshotVi : screenshot,
          contentType: "image/png",
          fit: "contain",
          position: { left: 72, top: 183, width: 1136, height: 414 },
          alt: "Local v0.6 pending arbitrator application, synthetic test fixture",
        });
        text(
          slide,
          lang === "vi"
            ? "UI v0.6 local/fixture · Video v0.5: Phantom thật, 2 USDC → 1,96 cho người bán."
            : "Local v0.6 UI fixture · v0.5 video: real Phantom, 2 USDC → 1.96 to seller.",
          72,
          612,
          1136,
          48,
          24,
          false,
          muted,
        );
      } else if (entry.layout === "fees") {
        content.body.slice(0, 3).forEach((value, i) => {
          const parts = value.match(/^(\d+%)\s*(.*)$/);
          text(
            slide,
            parts[1],
            72 + i * 390,
            247,
            370,
            112,
            76,
            true,
            i === 2 ? blue : ink,
          );
          text(slide, parts[2], 72 + i * 390, 362, 370, 64, 32, true);
        });
        text(slide, content.body[3], 72, 474, 1100, 85, 32);
        text(
          slide,
          lang === "vi"
            ? "Giả thuyết thương mại; chưa có doanh thu hoặc bằng chứng người dùng chấp nhận phí."
            : "Commercial hypothesis; no revenue or verified customer acceptance of fees.",
          72,
          568,
          1100,
          85,
          28,
          false,
          muted,
        );
      } else if (entry.layout === "closing") {
        text(slide, "pipicachu", 72, 209, 805, 105, 72, true);
        text(slide, content.body[0], 72, 350, 805, 64, 34, false, blue);
        text(slide, content.body[1], 72, 423, 805, 72, 28);
        text(slide, content.body[2], 72, 555, 805, 88, 28, false, muted);
        slide.images.add({
          blob: qr,
          contentType: "image/png",
          fit: "contain",
          position: { left: 952, top: 293, width: 256, height: 256 },
          alt: "QR: https://pipicachu.vercel.app",
        });
      } else rows(slide, content.body);
    }
    line(slide, 72, 682, 1136, "#CBD5E5");
    text(
      slide,
      `${entry.number <= 12 ? "pipicachu" : "Appendix"} · Devnet · ${entry.number}/18`,
      72,
      688,
      1136,
      25,
      15,
      false,
      muted,
    );
  }
  const staging = path.join(privateRoot, "staging-r6", lang);
  await fs.mkdir(staging, { recursive: true });
  const candidate = path.join(staging, "candidate.pptx"),
    final = path.join(privateRoot, "output", `pipicachu-v06-${lang}-r6.pptx`);
  await (await PresentationFile.exportPptx(p)).save(candidate);
  await finalizePresentation({
    workspaceDir,
    candidatePath: candidate,
    finalPath: final,
    pythonExecutable: process.env.ARTIFACT_PYTHON,
    integrityValidatorPath: path.join(
      skill,
      "container_tools/inspect_presentation_package_integrity.py",
    ),
    layoutValidatorPath: path.join(
      skill,
      "container_tools/inspect_presentation_layout_geometry.py",
    ),
    explicitTotalSlideCount: 18,
    requiredNativeTableOwnerSlides: [8, 15],
    fontPolicy: { basis: "design", families: [font] },
    layoutArgs: [
      "--expected-slide-size-emu",
      "12192000,6858000",
      "--validate-heading-fit",
      "--require-native-table-slide",
      "8",
      "--require-native-table-slide",
      "15",
    ],
    verifyArtifactToolImport: true,
    receiptPath: path.join(staging, "validation.json"),
  });
  for (let i = 0; i < data.length; i++) {
    const slide = p.slides.getItem(i);
    const png = await p.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(
      path.join(renderDir, `slide-${String(i + 1).padStart(2, "0")}.png`),
      new Uint8Array(await png.arrayBuffer()),
    );
  }
  finalPaths.push(final);
  console.log("Created editable", lang, "18-slide deck and renders");
}
console.log(finalPaths.join("\n"));

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const repo = path.resolve(process.argv[2]);
const root = path.join(repo, "work/pitch-4min");
const skill = process.env.PRESENTATION_SKILL_DIR;
if (!skill || !process.env.ARTIFACT_PYTHON)
  throw Error(
    "Set PRESENTATION_SKILL_DIR and ARTIFACT_PYTHON from the bundled runtime",
  );
const revision = process.env.PITCH_REVISION || "r1";
if (!/^r\d+$/.test(revision)) throw Error("Invalid output revision");
const { finalizePresentation, resolvePresentationFont } = await import(
  pathToFileURL(path.join(skill, "container_tools/artifact_tool_utils.mjs"))
    .href
);
const font = resolvePresentationFont({ fontFamily: "Arial" });
const content = JSON.parse(
  await fs.readFile(
    path.join(repo, "scripts/slides/content-pitch4.json"),
    "utf8",
  ),
);
const logo = new Uint8Array(
  await fs.readFile(path.join(repo, "public/brand/picachu-logo.jpg")),
);
const qr = new Uint8Array(
  await fs.readFile(path.join(repo, "work/deck-v06/website-qr.png")),
);
const ink = "#091426",
  blue = "#2456E6",
  muted = "#526174",
  canvas = "#F7F6F1",
  lime = "#B7F34D";
function text(
  slide,
  value,
  x,
  y,
  width,
  height,
  size = 30,
  bold = false,
  color = ink,
) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width, height },
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
function diagram(slide, labels, y) {
  const places = [72, 425, 922],
    widths = [254, 388, 286];
  labels.forEach((label, i) => {
    if (i === 1)
      slide.shapes.add({
        geometry: "rect",
        position: {
          left: places[i] - 12,
          top: y - 12,
          width: widths[i] + 24,
          height: 92,
        },
        fill: lime,
        line: { fill: "none", width: 0 },
      });
    text(slide, label, places[i], y, widths[i], 72, 31, true);
  });
  text(slide, "→", 345, y, 64, 66, 44, false, blue);
  text(slide, "→", 834, y, 64, 66, 44, false, blue);
}
await fs.mkdir(path.join(root, "output"), { recursive: true });
for (const lang of content.languages) {
  const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  const renders = path.join(root, `render-${revision}`, lang);
  await fs.mkdir(renders, { recursive: true });
  for (const entry of content.slides) {
    const slide = deck.slides.add(),
      c = entry[lang];
    slide.background.fill = canvas;
    slide.speakerNotes.textFrame.setText(
      `${entry.time}\n${c.speaker}\n\n${entry.notes}\nSources:\n${Object.values(content.sources).join("\n")}`,
    );
    if (entry.layout === "problem") {
      slide.images.add({
        blob: logo,
        contentType: "image/jpeg",
        fit: "contain",
        position: { left: 72, top: 40, width: 88, height: 66 },
        alt: "pipicachu pixel logo",
      });
      text(slide, "pipicachu", 180, 46, 820, 65, 46, true);
      text(slide, c.title, 72, 142, 1136, 115, 48, true);
      text(slide, c.audience, 72, 255, 1136, 80, 27, false, muted);
      text(slide, c.buyer, 72, 365, 520, 130, 42, true);
      text(slide, c.seller, 664, 365, 544, 130, 42, true, blue);
      text(slide, c.tension, 72, 554, 1136, 90, 29);
    } else {
      text(slide, c.title, 72, 55, 1136, 122, 46, true);
      if (entry.layout === "business") {
        text(slide, c.subtitle, 72, 186, 1136, 68, 32);
        diagram(slide, [c.buyer, c.vault, c.seller], 306);
        text(slide, c.arbitrator, 72, 426, 1136, 70, 26, false, muted);
        text(slide, c.fees, 72, 522, 1136, 58, 36, true);
        text(slide, c.refund, 72, 586, 1136, 44, 23);
        text(slide, c.pilot, 72, 631, 1136, 34, 23, false, blue);
      } else if (entry.layout === "demo") {
        text(slide, c.subtitle, 72, 190, 1136, 58, 25, false, muted);
        text(slide, c.flow, 72, 260, 800, 60, 34, true);
        const shot = new Uint8Array(
          await fs.readFile(
            path.join(
              repo,
              `docs/assets/showcase/current/completed-${lang}.png`,
            ),
          ),
        );
        slide.images.add({
          blob: shot,
          contentType: "image/png",
          fit: "contain",
          position: { left: 72, top: 341, width: 832, height: 235 },
          alt: "Read-only current UI: finalized 1 USDC test deal, seller net 0.98 USDC",
        });
        slide.images.add({
          blob: qr,
          contentType: "image/png",
          fit: "contain",
          position: { left: 970, top: 350, width: 210, height: 210 },
          alt: content.sources.site,
        });
        text(slide, c.caption, 72, 606, 832, 59, 22, false, muted);
        text(slide, c.website, 948, 595, 266, 72, 23, true, blue);
      } else {
        diagram(slide, [c.wallet, c.program, c.vault], 228);
        text(slide, c.guard, 72, 362, 1136, 58, 32, true);
        text(slide, c.invariant, 72, 431, 1136, 62, 30);
        text(slide, c.tests, 72, 519, 640, 74, 56, true, blue);
        text(slide, c.testLabel, 72, 600, 640, 60, 24);
        text(slide, c.live, 768, 528, 440, 74, 38, true);
        text(slide, c.liveLabel, 768, 602, 440, 60, 23, false, muted);
      }
    }
    text(slide, c.footer, 72, 681, 1136, 29, 18, false, muted);
  }
  const stage = path.join(root, `staging-${revision}`, lang);
  await fs.mkdir(stage, { recursive: true });
  const candidate = path.join(stage, "candidate.pptx");
  const output = path.join(
    root,
    "output",
    `pipicachu-pitch4-${lang}-${revision}.pptx`,
  );
  await (await PresentationFile.exportPptx(deck)).save(candidate);
  await finalizePresentation({
    workspaceDir: root,
    candidatePath: candidate,
    finalPath: output,
    pythonExecutable: process.env.ARTIFACT_PYTHON,
    integrityValidatorPath: path.join(
      skill,
      "container_tools/inspect_presentation_package_integrity.py",
    ),
    layoutValidatorPath: path.join(
      skill,
      "container_tools/inspect_presentation_layout_geometry.py",
    ),
    explicitTotalSlideCount: 4,
    requiredNativeTableOwnerSlides: [],
    requiredNativeChartOwnerSlides: [],
    fontPolicy: { basis: "design", families: [font] },
    layoutArgs: [
      "--expected-slide-size-emu",
      "12192000,6858000",
      "--validate-heading-fit",
    ],
    verifyArtifactToolImport: true,
    receiptPath: path.join(stage, "validation.json"),
  });
  for (let i = 0; i < 4; i++) {
    const png = await deck.export({
      slide: deck.slides.getItem(i),
      format: "png",
      scale: 1,
    });
    await fs.writeFile(
      path.join(renders, `slide-${String(i + 1).padStart(2, "0")}.png`),
      new Uint8Array(await png.arrayBuffer()),
    );
  }
  console.log(`Exported ${lang}: ${output}`);
}

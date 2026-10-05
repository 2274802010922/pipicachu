import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const failures = [];
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : e.name.endsWith(".md")
          ? [path.join(dir, e.name)]
          : [],
    );
}
const files = [
  "README.md",
  "README.en.md",
  "AGENTS.md",
  "THIRD_PARTY_NOTICES.md",
  ".github/CONTRIBUTING.md",
  ".github/SECURITY.md",
]
  .map((f) => path.join(root, f))
  .filter((f) => fs.existsSync(f))
  .concat(fs.existsSync("docs") ? walk(path.join(root, "docs")) : []);
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const matches = [
    ...text.matchAll(/\]\(([^)]+)\)/g),
    ...text.matchAll(/(?:src|href)="([^"]+)"/g),
  ];
  for (const match of matches) {
    const link = match[1].split("#")[0];
    if (!link || /^(https?:|mailto:|data:|#)/.test(link)) continue;
    if (
      !fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(link)))
    )
      failures.push(`${path.relative(root, file)} → ${link}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Checked local links in ${files.length} Markdown files.`);

import fs from "node:fs";
import { execFileSync } from "node:child_process";
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const rules = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk-or-v1-[a-zA-Z0-9]{48,}/,
  /gh[pousr]_[a-zA-Z0-9]{36,}/,
  /AKIA[0-9A-Z]{16}/,
];
const failures = [];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  if (/(?:^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".example"))
    failures.push(`${file}: environment file`);
  if (/(?:keypair|private-key)\.json$/i.test(file))
    failures.push(`${file}: private wallet file`);
  if (!/\.(?:ts|tsx|js|mjs|json|md|yml|yaml|toml|sh|ps1|example)$/.test(file))
    continue;
  const source = fs.readFileSync(file, "utf8");
  if (rules.some((rule) => rule.test(source)))
    failures.push(`${file}: credential pattern`);
  if (
    file.startsWith(".github/workflows/") &&
    [...source.matchAll(/uses:\s*([^\s#]+)/g)].some(
      ([, action]) => !/@[a-f0-9]{40}$/.test(action),
    )
  )
    failures.push(`${file}: unpinned action`);
}
if (failures.length) throw Error(failures.join("\n"));
console.log(
  `Repository guard passed for ${files.length} tracked/non-ignored files. Pattern scan is not an independent secret audit.`,
);

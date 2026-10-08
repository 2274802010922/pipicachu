import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { auditFailures } from "./dependency-policy.mjs";
if (!process.env.npm_execpath) throw Error("Run npm run check:dependencies");
const audit = spawnSync(
  process.execPath,
  [process.env.npm_execpath, "audit", "--omit=dev", "--json"],
  {
    encoding: "utf8",
  },
);
if (audit.error || !audit.stdout) throw Error("Dependency audit unavailable");
const report = JSON.parse(audit.stdout);
const policy = JSON.parse(
  fs.readFileSync("docs/legal/dependency-policy.json", "utf8"),
);
const unacceptable = auditFailures(report, policy);
console.log("Production audit:", report.metadata?.vulnerabilities);
if (unacceptable.length) {
  console.error("New findings require review:", unacceptable);
  process.exitCode = 1;
} else
  console.log(
    "Known moderate exceptions remain; see docs/legal/dependency-exceptions.md. This is not a clean audit.",
  );

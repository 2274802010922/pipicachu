import { spawnSync } from "node:child_process";
const command = process.platform === "win32" ? "npm.cmd" : "npm";
const audit = spawnSync(command, ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (audit.error || !audit.stdout) throw Error("Dependency audit unavailable");
const report = JSON.parse(audit.stdout),
  exceptions = new Set(["stream-json", "jayson"]);
const unacceptable = Object.entries(report.vulnerabilities || {}).filter(
  ([name, v]) =>
    ["high", "critical"].includes(v.severity) || !exceptions.has(name),
);
console.log("Production audit:", report.metadata?.vulnerabilities);
if (unacceptable.length) {
  console.error(
    "New findings require review:",
    unacceptable.map(([name]) => name),
  );
  process.exitCode = 1;
} else
  console.log(
    "Known moderate exceptions remain; see docs/legal/dependency-exceptions.md. This is not a clean audit.",
  );

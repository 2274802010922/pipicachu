import { it, expect } from "vitest";
import { auditFailures } from "../../scripts/checks/dependency-policy.mjs";
import policy from "../../docs/legal/dependency-policy.json";
const now = new Date("2026-10-08T00:00:00Z");
const cause = { url: policy.advisories[0].url, severity: "moderate" };
const report = {
  vulnerabilities: {
    "stream-json": { severity: "moderate", via: [cause] },
    jayson: { severity: "moderate", via: ["stream-json"] },
  },
};
it("an exception cannot silently accept new advisories or increased severity", () => {
  expect(auditFailures(report, policy, now)).toEqual([]);
  expect(
    auditFailures(
      {
        vulnerabilities: {
          "stream-json": {
            severity: "moderate",
            via: [{ ...cause, url: "https://example.com/new-advisory" }],
          },
        },
      },
      policy,
      now,
    ),
  ).toEqual(["stream-json"]);
  expect(
    auditFailures(
      {
        vulnerabilities: { jayson: { severity: "high", via: ["stream-json"] } },
      },
      policy,
      now,
    ),
  ).toEqual(["jayson"]);
});
it("exceptions expire and undeclared propagation fails", () => {
  expect(
    auditFailures(report, policy, new Date("2026-10-15T00:00:00Z")),
  ).toContain("stream-json");
  expect(
    auditFailures(
      {
        vulnerabilities: {
          unknown: { severity: "moderate", via: ["stream-json"] },
        },
      },
      policy,
      now,
    ),
  ).toEqual(["unknown"]);
});

import { it, expect } from "vitest";
import { bondReadiness } from "../../src/escrow/bond";
it("shows only the missing amount, excluding bond reserved by other deals", () =>
  expect(
    bondReadiness(1_000_000n, { total: 1_500_000n, locked: 1_000_000n }),
  ).toEqual({ available: 500_000n, missing: 500_000n, ready: false }));
it("reuses available bond instead of asking for a duplicate deposit", () =>
  expect(
    bondReadiness(1_000_000n, { total: 2_000_000n, locked: 500_000n }),
  ).toEqual({ available: 1_500_000n, missing: 0n, ready: true }));
it("keeps unknown or invalid ledger data unavailable, never ready", () => {
  expect(bondReadiness(1n, undefined)).toBe(null);
  expect(bondReadiness(1n, null)).toBe(null);
  expect(bondReadiness(1n, { total: 0n, locked: 1n })).toBe(null);
});

import { it, expect } from "vitest";
import { eligibleForAutomaticRelease } from "../../src/escrow/keeper";
it("releases only delivered deals at or after network deadline", () => {
  expect(
    eligibleForAutomaticRelease({ state: "delivered", reviewBy: 100 }, 99),
  ).toBe(false);
  expect(
    eligibleForAutomaticRelease({ state: "delivered", reviewBy: 100 }, 100),
  ).toBe(true);
});
it.each([
  "created",
  "funded",
  "disputed",
  "completed",
  "refunded",
  "cancelled",
] as const)("does not auto release %s", (state) =>
  expect(eligibleForAutomaticRelease({ state, reviewBy: 100 }, 200)).toBe(
    false,
  ),
);
it("does not treat unavailable time as an eligible deadline", () => {
  expect(
    eligibleForAutomaticRelease({ state: "delivered", reviewBy: 0 }, 200),
  ).toBe(false);
  expect(
    eligibleForAutomaticRelease({ state: "delivered", reviewBy: 100 }, NaN),
  ).toBe(false);
});

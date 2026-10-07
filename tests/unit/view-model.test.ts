import { describe, it, expect } from "vitest";
import { dealViewModel, completedDealSteps } from "../../src/escrow/view-model";
import type { Deal } from "../../src/escrow/client";
const base = {
  buyer: "b",
  seller: "s",
  arbitrator: "a",
  workflowVersion: 1,
  resolutionPolicyVersion: 1,
  state: "created",
  approvals: 1,
  fundBy: 100,
  deliverBy: 200,
  reviewBy: 300,
  arbitrateBy: 400,
  proposal: 0,
} as Deal;
const ready = { fresh: true, bondReady: true, organizationReady: true };
describe("state and actor view model", () => {
  it.each(["s", "a", "viewer", null])(
    "funding waits for buyer for wallet %s",
    (wallet) => {
      const v = dealViewModel(base, wallet, 50, ready);
      expect(v.nextActor).toBe("buyer");
      expect(v.primary).toBeNull();
    },
  );
  it("buyer funding is blocked by eligibility or stale data", () => {
    expect(dealViewModel(base, "b", 50, ready).primary).toBe("fund");
    expect(
      dealViewModel(base, "b", 50, { ...ready, fresh: false }).available,
    ).toEqual([]);
    expect(
      dealViewModel(base, "b", 50, { ...ready, bondReady: false }).primary,
    ).toBeNull();
  });
  it("old manual consent waits for arbitrator", () =>
    expect(
      dealViewModel({ ...base, workflowVersion: 0, approvals: 0 }, "s", 50, {
        ...ready,
        bondReady: false,
      }).nextActor,
    ).toBe("arbitrator"));
  it("late ruling remains available only on new policy", () => {
    const d = { ...base, state: "disputed" as const };
    expect(dealViewModel(d, "a", 400, ready).available).toContain(
      "resolve_buyer",
    );
    expect(
      dealViewModel({ ...d, resolutionPolicyVersion: 0 }, "a", 400, ready)
        .available,
    ).toEqual([]);
  });
  it("disputed money never has automatic release", () =>
    expect(
      dealViewModel({ ...base, state: "disputed" }, "s", 500, ready)
        .manualFinalize,
    ).toBe(false));
  it.each(["completed", "refunded", "cancelled"] as const)(
    "terminal %s has no actor or payment",
    (state) => {
      const v = dealViewModel({ ...base, state }, "b", 500, ready);
      expect(v.nextActor).toBeNull();
      expect(v.available).toEqual([]);
    },
  );
});

it("cancelled and refunded deals do not label unperformed delivery as successful", () => {
  expect(completedDealSteps({ ...base, state: "cancelled" })).toEqual([0]);
  expect(
    completedDealSteps({
      ...base,
      state: "refunded",
      deliveryHash: "0".repeat(64),
    }),
  ).toEqual([0, 1]);
  expect(
    completedDealSteps({
      ...base,
      state: "refunded",
      deliveryHash: "1".repeat(64),
    }),
  ).toEqual([0, 1, 2]);
});

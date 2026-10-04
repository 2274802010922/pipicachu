import { describe, it, expect } from "vitest";
import { actions } from "../../src/escrow/policy";
import { parseAmount, amount, type Deal } from "../../src/escrow/client";
const d = {
  seller: "s",
  buyer: "b",
  primary: "p",
  backup: "r",
  state: "created",
  approvals: 0,
  fundBy: 100,
  deliverBy: 200,
  reviewBy: 300,
  arbitrateBy: 400,
  arbitrationSeconds: 100,
  proposal: 0,
} as Deal;
describe("Exact amounts", () => {
  it.each([
    ["10", 10000000n],
    ["0,000001", 1n],
    ["10.05", 10050000n],
  ])("parses %s", (text, n) => expect(parseAmount(text)).toBe(n));
  it.each(["0", "-1", "1e6", "1,000,000", "1.0000001", "Infinity", "1000001"])(
    "rejects %s",
    (text) => expect(() => parseAmount(text)).toThrow(),
  );
  it("removes only trailing decimal zeroes", () => {
    expect(amount(50000000n)).toBe("50");
    expect(amount(50000001n)).toBe("50.000001");
  });
});
describe("Actions mirror chain state", () => {
  it("requires both arbiters to accept before funding", () => {
    expect(actions(d, "b", 50)).not.toContain("fund");
    expect(actions({ ...d, approvals: 3 }, "b", 50)).toContain("fund");
  });
  it("never treats a viewer as buyer", () =>
    expect(actions({ ...d, approvals: 3 }, "viewer", 50)).toEqual([]));
  it("cuts delivery off at exact deadline", () => {
    expect(actions({ ...d, state: "funded" }, "s", 199)).toContain("deliver");
    expect(actions({ ...d, state: "funded" }, "s", 200)).not.toContain(
      "deliver",
    );
    expect(actions({ ...d, state: "funded" }, "b", 200)).toContain(
      "refund_expired",
    );
  });
  it("cuts disputes off when release is eligible", () => {
    expect(actions({ ...d, state: "delivered" }, "b", 299)).toContain(
      "dispute",
    );
    expect(actions({ ...d, state: "delivered" }, "b", 300)).not.toContain(
      "dispute",
    );
    expect(actions({ ...d, state: "delivered" }, "s", 300)).toContain(
      "finalize",
    );
  });
  it("does not release disputed funds", () =>
    expect(actions({ ...d, state: "disputed" }, "s", 450)).not.toContain(
      "finalize",
    ));
  it("switches arbiters at the exact boundary", () => {
    expect(actions({ ...d, state: "disputed" }, "p", 399)).toContain(
      "resolve_seller",
    );
    expect(actions({ ...d, state: "disputed" }, "p", 400)).toEqual([]);
    expect(actions({ ...d, state: "disputed" }, "r", 400)).toContain(
      "resolve_buyer",
    );
  });
  it("requires seller acceptance for mutual settlement", () => {
    expect(
      actions({ ...d, state: "disputed", proposal: 2 }, "b", 500),
    ).not.toContain("accept_settlement");
    expect(
      actions({ ...d, state: "disputed", proposal: 2 }, "s", 500),
    ).toContain("accept_settlement");
  });
  it.each(["completed", "refunded", "cancelled"] as Deal["state"][])(
    "no further payment from %s",
    (state) => expect(actions({ ...d, state }, "b", 999)).toEqual([]),
  );
});

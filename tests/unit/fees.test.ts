import { it, expect } from "vitest";
import { feeBreakdown } from "../../src/escrow/fees";
import { decodeDeal } from "../../src/escrow/client";
import {
  preparationAddress,
  preparationFixture,
} from "../fixtures/preparation";
it("100 USDC splits 98 seller + 1 arbitrator + 1 platform", () =>
  expect(feeBreakdown(100_000_000n, 1_000_000n, 1_000_000n)).toEqual({
    buyerRefund: 0n,
    sellerNet: 98_000_000n,
    arbitratorFee: 1_000_000n,
    platformFee: 1_000_000n,
    totalFee: 2_000_000n,
  }));
it("refund returns all principal and no service fees", () =>
  expect(feeBreakdown(100_000_000n, 1_000_000n, 1_000_000n, true)).toEqual({
    buyerRefund: 100_000_000n,
    sellerNet: 0n,
    arbitratorFee: 0n,
    platformFee: 0n,
    totalFee: 0n,
  }));
it("legacy deal keeps its 1 percent arbitrator fee and zero platform fee", async () => {
  const f = preparationFixture();
  const d = await decodeDeal(
    preparationAddress,
    Buffer.from(f.deal.data[0], "base64"),
  );
  expect(d.platformFee).toBe(0n);
  expect(d.feeVersion).toBe(0);
  expect(feeBreakdown(d.amount, d.fee, d.platformFee).sellerNet).toBe(
    9_900_000n,
  );
});
it("uses integer atomic units without charging fee on bond", () => {
  const d = feeBreakdown(1_000_001n, 10_000n, 10_000n);
  expect(d.sellerNet).toBe(980_001n);
  expect(d.sellerNet + d.totalFee).toBe(1_000_001n);
});
it("rejects impossible fees", () =>
  expect(() => feeBreakdown(1n, 1n, 1n)).toThrow());

import { it, expect } from "vitest";
import type { Deal } from "../../src/escrow/client";
import {
  selectKeeperCandidates,
  runKeeperBatch,
  type KeeperRetry,
} from "../../src/escrow/keeper-batch";
const deals = Array.from(
  { length: 6 },
  (_, i) => ({ address: String(i), reviewBy: i }) as Deal,
);
it("five poisoned deals cannot permanently starve a sixth healthy deal", async () => {
  const retry: Record<string, KeeperRetry> = {};
  const first = await runKeeperBatch(
    deals,
    retry,
    async (d) => ({ deal: d.address, state: "blocked", errorCode: "2040" }),
    0,
  );
  expect(first.results).toHaveLength(5);
  expect(selectKeeperCandidates(deals, retry, 300000)[0].address).toBe("5");
});
it("per-deal exceptions do not abort the rest of the batch", async () => {
  const result = await runKeeperBatch(deals, {}, async (d) => {
    if (d.address === "0") throw Error("RPC");
    return { deal: d.address, state: "completed" };
  });
  expect(result.results).toHaveLength(5);
  expect(result.results[0].state).toBe("failed");
  expect(result.results[1].state).toBe("completed");
});
it("fresh work is selected before previously failed work", () =>
  expect(
    selectKeeperCandidates(
      deals,
      { "0": { failureCount: 1, nextRetryAt: 0 } },
      100,
    )[0].address,
  ).toBe("1"));
it("backoff is bounded to thirty minutes", async () => {
  const now = 1000,
    retry = { "0": { failureCount: 99, nextRetryAt: 0 } };
  await runKeeperBatch(
    [deals[0]],
    retry,
    async (d) => ({ deal: d.address, state: "blocked" }),
    now,
  );
  expect(retry["0"].nextRetryAt - now).toBe(1800000);
});
it("manual recheck can bypass cooldown but not protocol eligibility", () =>
  expect(
    selectKeeperCandidates(
      deals,
      { "0": { failureCount: 10, nextRetryAt: 999999 } },
      100,
      "0",
    )[0].address,
  ).toBe("0"));
it("a pending signature survives a restart and is not treated as failure", async () => {
  const retry: Record<string, KeeperRetry> = {};
  await runKeeperBatch(
    [deals[0]],
    retry,
    async (d) => ({
      deal: d.address,
      state: "submitted_pending",
      signature: "sig",
      lastValidBlockHeight: 100,
    }),
    0,
  );
  expect(retry["0"].signature).toBe("sig");
  expect(retry["0"].failureCount).toBe(0);
});

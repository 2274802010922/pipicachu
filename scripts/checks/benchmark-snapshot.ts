import fs from "node:fs";
import assert from "node:assert/strict";
import { Connection, PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import {
  readDeal,
  readArbitrator,
  readOrganization,
  readDealSnapshot,
} from "../../src/escrow/client";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
assert.equal(
  await c.getGenesisHash(),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const address = "BZXdtrci9wJEEVeaZYdyF2D2z7STPssaTAKTBEvDoKN9";
const old: number[] = [],
  batched: number[] = [];
for (let n = 0; n < 6; n++) {
  const baseline = async () => {
    const at = performance.now();
    const deal = await readDeal(c, address, "finalized");
    const [profile, organization, clock] = await Promise.all([
      readArbitrator(c, new PublicKey(deal.arbitrator)),
      readOrganization(c, new PublicKey(deal.arbitrator)),
      c.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "finalized"),
    ]);
    assert.ok(clock?.data.length === 40);
    old.push(Math.round(performance.now() - at));
    return { deal, profile, organization };
  };
  const optimized = async () => {
    const at = performance.now();
    const result = await readDealSnapshot(c, address);
    batched.push(Math.round(performance.now() - at));
    return result;
  };
  // Alternate order to reduce warmup bias. No synthetic timings or load claims.
  const [before, after] =
    n % 2 === 0
      ? [await baseline(), await optimized()]
      : await (async () => {
          const after = await optimized();
          return [await baseline(), after];
        })();
  assert.deepEqual(after.deal, before.deal);
  assert.deepEqual(after.profile, before.profile);
  assert.deepEqual(after.organization, before.organization);
}
const metric = (samples: number[]) => {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    milliseconds: samples,
    median: (sorted[2] + sorted[3]) / 2,
    p95: sorted[5],
  };
};
fs.mkdirSync("docs/evidence/quality", { recursive: true });
fs.writeFileSync(
  "docs/evidence/quality/snapshot-benchmark.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: "devnet",
      address,
      node: process.version,
      provider: process.env.SOLANA_DEVNET_RPC_URL
        ? "configured provider"
        : "public Solana Devnet RPC",
      method:
        "6 paired, order-alternated full public snapshots of the same historical deal; no concurrency/load claim",
      baseline: { callsPerSnapshot: 4, ...metric(old) },
      optimized: { callsPerSnapshot: 2, ...metric(batched) },
      limits:
        "Old UI only read all four accounts for a created organization deal; other states may already use fewer calls. Baseline profile/organization use the prior confirmed commitment; optimized uses finalized for all. Latency depends on provider/network and is not guaranteed to improve.",
      behavior:
        "No persistent data cache. Equivalent concurrent public reads are coalesced only while in flight; tested separately. History deferred/throttled outside this timed workload.",
    },
    null,
    2,
  ),
);
console.log(
  "Recorded paired public snapshot benchmark: 4 account calls vs 2; see raw latency samples.",
);

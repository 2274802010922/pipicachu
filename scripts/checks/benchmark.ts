import fs from "node:fs";
import assert from "node:assert/strict";
import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, MINT } from "../../src/escrow/constants";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
assert.equal(
  await c.getGenesisHash(),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const address = new PublicKey("BZXdtrci9wJEEVeaZYdyF2D2z7STPssaTAKTBEvDoKN9");
const samples: number[] = [];
for (let n = 0; n < 10; n++) {
  const at = performance.now();
  const data = await c.getAccountInfo(address);
  assert.equal(data?.data.length, 876);
  samples.push(Math.round(performance.now() - at));
}
const signature =
  "3yZqU7hxxAZusYqwW3XMefMFdJAXKVT8zcRzhMmqoXzyTpQaUUu4gqmN1tRP5qR6FNw7WfPfMPY9fpd6hfrvjT77";
const tx = await c.getTransaction(signature, {
  commitment: "finalized",
  maxSupportedTransactionVersion: 0,
});
assert.ok(tx && !tx.meta?.err);
const sorted = [...samples].sort((a, b) => a - b);
const proof = {
  at: new Date().toISOString(),
  network: "devnet",
  provider: process.env.SOLANA_DEVNET_RPC_URL
    ? "configured Devnet RPC"
    : "public Solana Devnet RPC",
  environment: `Node ${process.version}; Windows/WSL workspace`,
  programId: PROGRAM_ID.toBase58(),
  mint: MINT.toBase58(),
  read: {
    method: "getAccountInfo",
    samples: 10,
    address: address.toBase58(),
    milliseconds: samples,
    median: (sorted[4] + sorted[5]) / 2,
    p95: sorted[9],
    measurement:
      "sequential repeated finalized reads of one historical account; no concurrency/load claim",
  },
  historicalHotfixTransaction: {
    signature,
    unitsConsumed: tx.meta?.computeUnitsConsumed ?? null,
    feeLamports: tx.meta?.fee,
    transactionBytes:
      1 +
      64 * tx.transaction.signatures.length +
      tx.transaction.message.serialize().length,
    version: "v0.5.1 alias-recovery; not a v0.6 transaction benchmark",
  },
  rpcCalls: { getGenesisHash: 1, getAccountInfo: 10, getTransaction: 1 },
};
fs.mkdirSync("docs/evidence/v06", { recursive: true });
fs.writeFileSync(
  "docs/evidence/v06/benchmark.json",
  JSON.stringify(proof, null, 2),
);
console.log(
  "Read benchmark recorded; transaction metrics are explicitly labeled historical hotfix.",
);

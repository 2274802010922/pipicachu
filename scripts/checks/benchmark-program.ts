import fs from "node:fs";
import assert from "node:assert/strict";
import { Connection } from "@solana/web3.js";
import bs58 from "bs58";
import idl from "../../client/idl/escrow.json";
import { PROGRAM_ID } from "../../src/escrow/constants";
// Only read the test validator. No transaction is signed or sent by this script.
const c = new Connection("http://127.0.0.1:8897", "confirmed");
assert.notEqual(
  await c.getGenesisHash(),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const candidates = await c.getSignaturesForAddress(PROGRAM_ID, { limit: 100 });
const results = [];
const included = new Set<string>();
for (const candidate of candidates) {
  if (candidate.err) continue;
  const tx = await c.getTransaction(candidate.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta || tx.meta.err || !("instructions" in tx.transaction.message))
    continue;
  for (const ix of tx.transaction.message.instructions) {
    if (
      !tx.transaction.message.accountKeys[ix.programIdIndex].equals(PROGRAM_ID)
    )
      continue;
    const data = bs58.decode(ix.data);
    const name = idl.instructions.find((entry) =>
      Buffer.from(entry.discriminator).equals(Buffer.from(data.subarray(0, 8))),
    )?.name;
    if (
      !name ||
      ![
        "confirm",
        "resolve",
        "refund_expired",
        "finalize",
        "accept_settlement",
        "fund",
      ].includes(name) ||
      included.has(name)
    )
      continue;
    included.add(name);
    results.push({
      action: name,
      signature: candidate.signature,
      unitsConsumed: tx.meta.computeUnitsConsumed,
      feeLamports: tx.meta.fee,
      transactionBytes:
        1 +
        64 * tx.transaction.signatures.length +
        tx.transaction.message.serialize().length,
    });
  }
}
assert.ok(
  results.length >= 4,
  "Run lifecycle and v0.6 tests before collecting metrics",
);
fs.mkdirSync("docs/evidence/quality", { recursive: true });
fs.writeFileSync(
  "docs/evidence/quality/local-transaction-metrics.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: "synthetic-local-validator",
      programId: PROGRAM_ID.toBase58(),
      binarySha256: (await import("node:crypto"))
        .createHash("sha256")
        .update(fs.readFileSync("target/deploy/pipicachu_escrow.so"))
        .digest("hex"),
      node: process.version,
      results,
      limits:
        "One successful sample per action from executable tests; local fees/CU/bytes, not Devnet provider latency or production throughput. Signatures belong to an ephemeral local ledger.",
    },
    null,
    2,
  ),
);
console.log(
  "Recorded local SBF transaction metrics for",
  results.length,
  "actions",
);

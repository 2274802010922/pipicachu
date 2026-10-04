import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import {
  MINT,
  readDeal,
  settleIxs,
  vaultAddress,
  digest,
} from "../../src/escrow/client";
import keeper from "../../src/escrow/keeper-config.json";
const c = new Connection("https://api.devnet.solana.com", "finalized");
const prepared = JSON.parse(
  fs.readFileSync("docs/evidence/keeper-prepared.json", "utf8"),
);
const run = JSON.parse(
  fs.readFileSync("work/keeper/dispatch/latest.json", "utf8"),
);
const target = prepared.deals.find(
  (d: { kind: string }) => d.kind === "undisputed",
);
const contested = prepared.deals.find(
  (d: { kind: string }) => d.kind === "disputed",
);
const receipt = run.results.find(
  (r: { deal: string }) => r.deal === target.address,
);
assert.equal(receipt.state, "completed");
assert.equal(run.keeper, keeper.wallet);
const d = await readDeal(c, target.address);
assert.equal(d.state, "completed");
assert.equal(
  (await getAccount(c, vaultAddress(new PublicKey(d.address)))).amount,
  0n,
);
const tx = await c.getParsedTransaction(receipt.signature, {
  maxSupportedTransactionVersion: 0,
  commitment: "finalized",
});
assert.ok(tx?.meta && !tx.meta.err);
assert.equal(
  tx.transaction.message.accountKeys[0].pubkey.toBase58(),
  keeper.wallet,
);
const amounts = new Map<string, bigint>();
for (const inner of tx.meta.innerInstructions || [])
  for (const ix of inner.instructions) {
    if (!("parsed" in ix) || ix.parsed.type !== "transferChecked") continue;
    const info = ix.parsed.info;
    if (info.source !== vaultAddress(new PublicKey(d.address)).toBase58())
      continue;
    assert.equal(info.mint, MINT.toBase58());
    amounts.set(
      info.destination,
      (amounts.get(info.destination) || 0n) + BigInt(info.tokenAmount.amount),
    );
  }
assert.equal(
  amounts.get(
    getAssociatedTokenAddressSync(MINT, new PublicKey(d.seller)).toBase58(),
  ),
  990_000n,
);
assert.equal(
  amounts.get(
    getAssociatedTokenAddressSync(MINT, new PublicKey(d.arbitrator)).toBase58(),
  ),
  10_000n,
);
const dispute = await readDeal(c, contested.address);
assert.equal(dispute.state, "disputed");
assert.ok(
  !run.results.some((r: { deal: string }) => r.deal === dispute.address),
);
assert.equal(
  (await getAccount(c, vaultAddress(new PublicKey(dispute.address)))).amount,
  1_000_000n,
);
const report = {
  at: new Date().toISOString(),
  network: "devnet",
  workflowRun:
    "https://github.com/2274802010922/pipicachu/actions/runs/37214074644",
  trigger:
    "workflow_dispatch (service test); recurring schedule configured separately",
  keeper: keeper.wallet,
  payout: receipt,
  sellerReceivedAtomic: "990000",
  arbitratorFeeAtomic: "10000",
  payerVerifiedAsKeeper: true,
  disputedDealUntouchedBeforeCleanup: dispute.address,
  scope:
    "No buyer confirmation or seller finalize; keeper signed the payout. Not actual Phantom or exact scheduling SLA.",
};
// End the intentional dispute fixture after verifying the keeper left it untouched.
const a = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync("work/private/escrow-arbitrator.json", "utf8")),
  ),
);
const cleanup = await sendAndConfirmTransaction(
  c,
  new Transaction().add(
    ...(await settleIxs(
      "resolve",
      a.publicKey,
      dispute,
      Buffer.concat([
        Buffer.from([0]),
        await digest(
          "Refund intentional keeper-dispute fixture after validation",
        ),
      ]),
    )),
  ),
  [a],
  { commitment: "confirmed" },
);
fs.writeFileSync(
  "docs/evidence/keeper-live.json",
  JSON.stringify(
    { ...report, disputeCleanupRefundSignature: cleanup },
    null,
    2,
  ),
);
console.log(
  "Verified keeper-origin finalized payout; disputed funds untouched, then refunded by arbitrator.",
);

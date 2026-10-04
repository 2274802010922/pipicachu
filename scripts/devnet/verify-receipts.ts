import fs from "node:fs";
import assert from "node:assert/strict";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  decodeDeal,
  PROGRAM_ID,
  MINT,
  vaultAddress,
  readFeeTreasury,
} from "../../src/escrow/client";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
async function retry<T>(fn: () => Promise<T>): Promise<T> {
  for (let n = 0; n < 5; n++) {
    try {
      return await fn();
    } catch (e) {
      if (n === 4) throw e;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  throw new Error("RPC unavailable");
}
assert.equal(
  await retry(() => c.getGenesisHash()),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const all = await retry(() =>
  c.getProgramAccounts(PROGRAM_ID, { filters: [{ dataSize: 876 }] }),
);
const treasury = await retry(() => readFeeTreasury(c));
const decoded = await Promise.all(
  all.map((a) => decodeDeal(a.pubkey.toBase58(), a.account.data)),
);
const cases = [
  [
    "buyer confirmation",
    "completed",
    "Buyer xác nhận → trả seller",
    "Buyer confirms → seller paid",
  ],
  [
    "review timeout",
    "completed",
    "Hết hạn kiểm tra → giải ngân",
    "Review deadline → release",
  ],
  [
    "missed delivery",
    "refunded",
    "Không bàn giao → hoàn buyer",
    "Missed delivery → refund",
  ],
  [
    "arbitrator pays seller",
    "completed",
    "Tranh chấp → trọng tài trả seller",
    "Dispute → seller paid",
  ],
  [
    "arbitrator refunds buyer",
    "refunded",
    "Tranh chấp → trọng tài hoàn buyer",
    "Dispute → buyer refunded",
  ],
  [
    "mutual resolution after arbitration timeout",
    "refunded",
    "Trọng tài hết hạn → hai bên đồng ý hoàn tiền",
    "Arbitrator expires → mutual refund",
  ],
];
const receipts = [];
const deals = [];
for (const [title, expected, vi, en] of cases) {
  const d = decoded
    .filter((d) => d.terms.startsWith(`Devnet test: ${title}.`))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  assert.ok(d, `Missing ${title}`);
  assert.equal(d.state, expected);
  const history = await retry(() =>
    c.getSignaturesForAddress(new PublicKey(d.address), { limit: 10 }),
  );
  let receipt;
  for (const sig of history.filter((s) => !s.err)) {
    const tx = await retry(() =>
      c.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "finalized",
      }),
    );
    if (!tx?.meta || tx.meta.err) continue;
    const moved = new Map<string, bigint>();
    for (const inner of tx.meta.innerInstructions || [])
      for (const ix of inner.instructions) {
        if (!("parsed" in ix) || ix.parsed.type !== "transferChecked") continue;
        const info = ix.parsed.info;
        if (info.source !== vaultAddress(new PublicKey(d.address)).toBase58())
          continue;
        assert.equal(info.mint, MINT.toBase58());
        moved.set(
          info.destination,
          (moved.get(info.destination) || 0n) + BigInt(info.tokenAmount.amount),
        );
      }
    if (!moved.size) continue;
    const buyer = getAssociatedTokenAddressSync(
        MINT,
        new PublicKey(d.buyer),
      ).toBase58(),
      seller = getAssociatedTokenAddressSync(
        MINT,
        new PublicKey(d.seller),
      ).toBase58(),
      arb = getAssociatedTokenAddressSync(
        MINT,
        new PublicKey(d.arbitrator),
      ).toBase58();
    if (expected === "completed") {
      const expectedTransfers = new Map<string, bigint>();
      for (const [destination, quantity] of [
        [seller, d.amount - d.fee - d.platformFee],
        [arb, d.fee],
        [
          getAssociatedTokenAddressSync(MINT, treasury, true).toBase58(),
          d.platformFee,
        ],
      ] as [string, bigint][]) {
        expectedTransfers.set(
          destination,
          (expectedTransfers.get(destination) || 0n) + quantity,
        );
      }
      for (const [destination, quantity] of expectedTransfers)
        assert.equal(moved.get(destination) || 0n, quantity);
      assert.equal(moved.get(buyer) || 0n, expectedTransfers.get(buyer) || 0n);
    } else {
      assert.equal(moved.get(buyer), d.amount);
      assert.equal(moved.get(seller) || 0n, 0n);
      assert.equal(moved.get(arb) || 0n, 0n);
    }
    receipt = {
      scenario: title,
      deal: d.address,
      signature: sig.signature,
      state: d.state,
      principalAtomic: d.amount.toString(),
      transfers: [...moved].map(([destination, n]) => ({
        destination,
        amount: n.toString(),
      })),
      commitment: "finalized",
    };
    break;
  }
  assert.ok(receipt, `No verified vault payout receipt for ${title}`);
  receipts.push(receipt);
  deals.push({ address: d.address, vi, en });
  console.log("Verified finalized receipt", title);
  await new Promise((r) => setTimeout(r, 1000));
}
const active = decoded.filter((d) =>
  ["funded", "delivered", "disputed"].includes(d.state),
);
assert.equal(active.length, 0);
fs.writeFileSync(
  "docs/evidence/devnet-escrow-cycle.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: "devnet",
      schemaVersion: 3,
      arbitratorCount: 1,
      programId: PROGRAM_ID.toBase58(),
      method:
        "Independent finalized RPC receipts, fixed expected scenarios and exact vault transfer amounts. Not a full uninterrupted live negative-test cycle.",
      liveScenarioCount: 6,
      localProgramCheckCount: 38,
      receipts,
      activeDealCount: active.length,
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  "src/escrow/samples.json",
  JSON.stringify({ arbitrator: decoded[0].arbitrator, deals }, null, 2),
);

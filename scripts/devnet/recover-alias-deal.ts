import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  readDeal,
  readArbitrator,
  settleIxs,
  vaultAddress,
  MINT,
} from "../../src/escrow/client";
import { prepareDevnetWalletTransaction } from "../../src/escrow/wallet-transaction";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
assert.equal(
  await c.getGenesisHash(),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const address = "BZXdtrci9wJEEVeaZYdyF2D2z7STPssaTAKTBEvDoKN9";
const before = await readDeal(c, address),
  beforeArb = await readArbitrator(c, new PublicKey(before.arbitrator));
assert.equal(before.mint, MINT.toBase58());
assert.equal(before.amount, 1_000_000n);
let signature: string;
let units: number | undefined;
if (before.state === "delivered") {
  const keeper = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(fs.readFileSync("work/private/devnet-keeper.json", "utf8")),
    ),
  );
  assert.equal(
    keeper.publicKey.toBase58(),
    "CHSZY4SQiRX8EyGfeW7hkp2MqYWUcgC6rp9pwqmCaijc",
  );
  const tx = prepareDevnetWalletTransaction(
    new Transaction().add(
      ...(await settleIxs("finalize", keeper.publicKey, before, undefined, c)),
    ),
  );
  tx.feePayer = keeper.publicKey;
  tx.recentBlockhash = (await c.getLatestBlockhash()).blockhash;
  const sim = await c.simulateTransaction(tx);
  assert.equal(sim.value.err, null, JSON.stringify(sim.value.err));
  units = sim.value.unitsConsumed;
  signature = await sendAndConfirmTransaction(c, tx, [keeper], {
    commitment: "finalized",
  });
} else {
  assert.equal(
    before.state,
    "completed",
    "Recovery only applies to delivered or already-completed target",
  );
  const history = await c.getSignaturesForAddress(new PublicKey(address), {
    limit: 20,
  });
  const receipt = history.find(
    (r) => !r.err && r.confirmationStatus === "finalized",
  );
  assert.ok(receipt);
  signature = receipt.signature;
}
const after = await readDeal(c, address),
  afterArb = await readArbitrator(c, new PublicKey(after.arbitrator));
assert.equal(after.state, "completed");
assert.equal(
  (await c.getTokenAccountBalance(vaultAddress(new PublicKey(address)))).value
    .amount,
  "0",
);
if (before.state === "delivered")
  assert.equal(beforeArb!.locked - afterArb!.locked, 100_000n);
const tx = await c.getParsedTransaction(signature, {
  commitment: "finalized",
  maxSupportedTransactionVersion: 0,
});
assert.ok(tx && !tx.meta?.err);
const tokenTransfers = (tx.meta?.innerInstructions || [])
  .flatMap((g) => g.instructions)
  .filter(
    (
      i,
    ): i is typeof i & {
      parsed: {
        type: string;
        info: {
          mint: string;
          destination: string;
          tokenAmount: { amount: string };
        };
      };
    } => "parsed" in i && i.parsed.type === "transferChecked",
  )
  .map((i) => i.parsed.info);
assert.equal(
  tokenTransfers.length,
  2,
  "Alias logical payouts must aggregate into two actual transfers",
);
assert.equal(
  tokenTransfers.reduce((n, t) => n + BigInt(t.tokenAmount.amount), 0n),
  1_000_000n,
);
const expectedTransfers = new Map([
  [
    getAssociatedTokenAddressSync(
      MINT,
      new PublicKey(before.seller),
    ).toBase58(),
    "990000",
  ],
  [
    getAssociatedTokenAddressSync(
      MINT,
      new PublicKey(before.arbitrator),
    ).toBase58(),
    "10000",
  ],
]);
for (const transfer of tokenTransfers) {
  assert.equal(transfer.mint, MINT.toBase58());
  assert.equal(
    transfer.tokenAmount.amount,
    expectedTransfers.get(transfer.destination),
  );
}
const value = {
  at: new Date().toISOString(),
  network: "devnet",
  target: address,
  signature,
  commitment: "finalized",
  source: "permissionless keeper CLI; not Phantom",
  beforeState: before.state,
  afterState: after.state,
  logical: {
    sellerNet: "980000",
    arbitratorFee: "10000",
    platformFee: "10000",
  },
  actualTransfers: tokenTransfers,
  beforeLocked: beforeArb!.locked.toString(),
  afterLocked: afterArb!.locked.toString(),
  simulationUnits: units,
  vaultAtomic: "0",
};
fs.writeFileSync(
  "docs/evidence/hotfix-alias-recovery.json",
  JSON.stringify(value, null, 2),
);
console.log("Recovered target", address, "finalized", signature);

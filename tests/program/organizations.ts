import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  act,
  bondIx,
  createOrganizationDealIx,
  dealAddress,
  digest,
  fundIx,
  MINT,
  organizationAcceptingIx,
  organizationApprovalIx,
  readArbitrator,
  readDeal,
  readFeeTreasury,
  readOrganization,
  settleIxs,
  vaultAddress,
} from "../../src/escrow/client";
const live = process.argv.includes("--devnet");
const c = new Connection(
  live
    ? process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com"
    : "http://127.0.0.1:8897",
  "confirmed",
);
if (live)
  assert.equal(
    await c.getGenesisHash(),
    "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  );
const load = (name: string) =>
  Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(fs.readFileSync(`work/private/${name}.json`, "utf8")),
    ),
  );
const buyer = load("fixture-signer"),
  seller = load("escrow-seller"),
  arb = load("escrow-arbitrator");
const org = (await readOrganization(c, arb.publicKey))!;
assert.ok(org?.approved);
const checks: { case: string; signature?: string }[] = [];
const send = (k: Keypair, ixs: Awaited<ReturnType<typeof act>>[]) =>
  sendAndConfirmTransaction(c, new Transaction().add(...ixs), [k], {
    commitment: "confirmed",
  });
async function reject(name: string, run: () => Promise<unknown>) {
  await assert.rejects(run, (e: unknown) =>
    /custom program error/.test(e instanceof Error ? e.message : String(e)),
  );
  checks.push({ case: name });
  console.log("PASS rejected", name);
}
let nonce = BigInt(Date.now());
async function create() {
  const n = nonce++,
    d = dealAddress(seller.publicKey, n);
  const sig = await send(seller, [
    await createOrganizationDealIx(
      seller.publicKey,
      buyer.publicKey,
      arb.publicKey,
      n,
      1_000_000n,
      org.times,
      "Organization demo: permitted three-template pack, full delivery and fee-free refund terms.",
    ),
  ]);
  const data = await readDeal(c, d.toBase58());
  assert.equal(data.workflowVersion, 1);
  assert.equal(data.approvals, 1);
  checks.push({
    case: "standing consent, no per-deal arbitrator signature",
    signature: sig,
  });
  return data;
}
await send(arb, [await organizationAcceptingIx(arb.publicKey, true)]);
await reject("non-manager cannot revoke registry", async () =>
  send(seller, [
    await organizationApprovalIx(seller.publicKey, arb.publicKey, false),
  ]),
);
await reject("wrong signer cannot toggle service", async () =>
  send(seller, [await organizationAcceptingIx(seller.publicKey, true)]),
);
await reject(
  "withdrawal locked while accepting even with unused capacity",
  async () => send(arb, [await bondIx("withdraw_bond", arb.publicKey, 1n)]),
);
const n = nonce++;
await reject("amount above organization policy", async () =>
  send(seller, [
    await createOrganizationDealIx(
      seller.publicKey,
      buyer.publicKey,
      arb.publicKey,
      n,
      org.maximumDeal + 1n,
      org.times,
      "Invalid over-limit deal",
    ),
  ]),
);
await reject("custom deadlines cannot bypass standing consent", async () =>
  send(seller, [
    await createOrganizationDealIx(
      seller.publicKey,
      buyer.publicKey,
      arb.publicKey,
      nonce++,
      1_000_000n,
      [...org.times.slice(0, 3), org.times[3] + 1],
      "Invalid altered policy",
    ),
  ]),
);
const d = await create();
await send(arb, [await organizationAcceptingIx(arb.publicKey, false)]);
await reject("paused service blocks new funding", async () =>
  send(buyer, [await fundIx(buyer.publicKey, d)]),
);
await send(arb, [await organizationAcceptingIx(arb.publicKey, true)]);
const before = (await readArbitrator(c, arb.publicKey))!.locked;
checks.push({
  case: "buyer funds without arbitrator acceptance",
  signature: await send(buyer, [await fundIx(buyer.publicKey, d)]),
});
assert.equal(
  (await readArbitrator(c, arb.publicKey))!.locked - before,
  100_000n,
);
await reject("duplicate fund cannot reserve bond twice", async () =>
  send(buyer, [await fundIx(buyer.publicKey, d)]),
);
await send(arb, [await organizationAcceptingIx(arb.publicKey, false)]);
await reject(
  "reserved obligations block all withdrawals after pause",
  async () => send(arb, [await bondIx("withdraw_bond", arb.publicKey, 1n)]),
);
await send(seller, [
  await act(
    "deliver",
    seller.publicKey,
    new PublicKey(d.address),
    await digest("Three permitted demo files handed over"),
  ),
]);
const delivered = await readDeal(c, d.address);
const treasury = await readFeeTreasury(c);
const sellerAta = getAssociatedTokenAddressSync(MINT, seller.publicKey),
  treasuryAta = getAssociatedTokenAddressSync(MINT, treasury);
const balance = async (p: PublicKey) => {
  try {
    return (await getAccount(c, p)).amount;
  } catch {
    return 0n;
  }
};
const bs = await balance(sellerAta),
  bt = await balance(treasuryAta);
const payout = await send(
  buyer,
  await settleIxs("confirm", buyer.publicKey, delivered, undefined, c),
);
assert.equal((await readDeal(c, d.address)).state, "completed");
assert.equal((await balance(sellerAta)) - bs, 980_000n);
assert.equal((await balance(treasuryAta)) - bt, 10_000n);
assert.equal(
  (await getAccount(c, vaultAddress(new PublicKey(d.address)))).amount,
  0n,
);
assert.equal((await readArbitrator(c, arb.publicKey))!.locked, before);
checks.push({
  case: "paused organization still settles existing obligations 98/1/1",
  signature: payout,
});
await reject("double payout rejected", async () =>
  send(
    buyer,
    await settleIxs("confirm", buyer.publicKey, delivered, undefined, c),
  ),
);
await send(arb, [await bondIx("withdraw_bond", arb.publicKey, 1n)]);
checks.push({ case: "withdraw only when paused and all obligations settled" });
await send(arb, [await bondIx("deposit_bond", arb.publicKey, 1n)]);
await send(arb, [await organizationAcceptingIx(arb.publicKey, true)]);
fs.writeFileSync(
  `docs/evidence/${live ? "devnet" : "local"}-organization-checks.json`,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: live ? "devnet" : "local-validator",
      source: live
        ? "Circle Devnet USDC, CLI signing (not Phantom extension)"
        : "Synthetic local genesis approved registry",
      deal: d.address,
      checks,
    },
    null,
    2,
  ),
);
console.log("Verified organization lifecycle", checks.length);

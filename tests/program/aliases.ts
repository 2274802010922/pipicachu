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
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  act,
  bondIx,
  createDealIx,
  dealAddress,
  digest,
  fundIx,
  MINT,
  readArbitrator,
  readDeal,
  readFeeTreasury,
  registerIx,
  settleIxs,
  vaultAddress,
} from "../../src/escrow/client";

// Synthetic local validation only. This script cannot broadcast to Devnet.
const c = new Connection("http://127.0.0.1:8897", "confirmed");
assert.notEqual(
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
const treasury = await readFeeTreasury(c);
const send = (wallet: Keypair, ixs: Awaited<ReturnType<typeof act>>[]) =>
  sendAndConfirmTransaction(c, new Transaction().add(...ixs), [wallet], {
    commitment: "confirmed",
  });
for (const wallet of [buyer, seller, arb]) {
  if ((await c.getBalance(wallet.publicKey)) < 100_000_000) {
    const sig = await c.requestAirdrop(wallet.publicKey, 2_000_000_000);
    await c.confirmTransaction(sig, "confirmed");
  }
  const ata = await getOrCreateAssociatedTokenAccount(
    c,
    buyer,
    MINT,
    wallet.publicKey,
  );
  await mintTo(c, buyer, MINT, ata.address, buyer, 10_000_000);
}
if (!(await readArbitrator(c, arb.publicKey)))
  await send(arb, [await registerIx(arb.publicKey)]);
const profile = (await readArbitrator(c, arb.publicKey))!;
if (profile.total < 2_000_000n)
  await send(arb, [
    await bondIx("deposit_bond", arb.publicKey, 2_000_000n - profile.total),
  ]);
const owners = [buyer.publicKey, seller.publicKey, arb.publicKey, treasury];
const unique = new Map<string, PublicKey>();
for (const owner of owners) {
  const a = await getOrCreateAssociatedTokenAccount(
    c,
    buyer,
    MINT,
    owner,
    true,
  );
  unique.set(owner.toBase58(), a.address);
}
const balances = async () =>
  new Map(
    await Promise.all(
      [...unique].map(
        async ([owner, ata]) =>
          [owner, (await getAccount(c, ata)).amount] as const,
      ),
    ),
  );
const checks: string[] = [];
for (const payout of [true, false]) {
  const nonce = BigInt(Date.now()),
    address = dealAddress(seller.publicKey, nonce);
  await send(seller, [
    await createDealIx(
      seller.publicKey,
      buyer.publicKey,
      arb.publicKey,
      nonce,
      1_000_000n,
      [600, 600, 600, 600],
      "Alias test: permitted digital demo pack",
    ),
  ]);
  await send(arb, [await act("accept_deal", arb.publicKey, address)]);
  const beforeLock = (await readArbitrator(c, arb.publicKey))!.locked;
  await send(buyer, [
    await fundIx(buyer.publicKey, await readDeal(c, address.toBase58())),
  ]);
  assert.equal(
    (await readArbitrator(c, arb.publicKey))!.locked - beforeLock,
    100_000n,
  );
  await send(seller, [
    await act(
      "deliver",
      seller.publicKey,
      address,
      await digest("fixture delivered"),
    ),
  ]);
  if (!payout)
    await send(buyer, [
      await act(
        "dispute",
        buyer.publicKey,
        address,
        await digest("fixture dispute"),
      ),
    ]);
  const d = await readDeal(c, address.toBase58()),
    before = await balances();
  const name = payout ? "confirm" : "resolve",
    actor = payout ? buyer : arb;
  const args = payout
    ? undefined
    : Buffer.concat([Buffer.from([0]), await digest("full refund")]);
  const ix = await settleIxs(name, actor.publicKey, d, args, c);
  const ataCreates = ix.slice(0, -1).map((i) => i.keys[1].pubkey.toBase58());
  assert.equal(new Set(ataCreates).size, ataCreates.length);
  await send(actor, ix);
  const after = await balances(),
    expected = new Map([...unique.keys()].map((k) => [k, 0n]));
  const add = (p: PublicKey, n: bigint) =>
    expected.set(p.toBase58(), expected.get(p.toBase58())! + n);
  if (payout) {
    add(seller.publicKey, 980_000n);
    add(arb.publicKey, 10_000n);
    add(treasury, 10_000n);
  } else add(buyer.publicKey, 1_000_000n);
  for (const [owner, delta] of expected)
    assert.equal(after.get(owner)! - before.get(owner)!, delta, owner);
  assert.equal((await getAccount(c, vaultAddress(address))).amount, 0n);
  assert.equal((await readArbitrator(c, arb.publicKey))!.locked, beforeLock);
  assert.equal(
    (await readDeal(c, address.toBase58())).state,
    payout ? "completed" : "refunded",
  );
  await assert.rejects(() => send(actor, ix), /custom program error: 0x1772\b/);
  checks.push(
    payout
      ? "payout conservation and alias aggregation"
      : "fee-free refund and alias aggregation",
  );
}
const report = {
  network: "synthetic-local",
  treasury: treasury.toBase58(),
  treasuryRole: treasury.equals(buyer.publicKey)
    ? "buyer"
    : treasury.equals(seller.publicKey)
      ? "seller"
      : treasury.equals(arb.publicKey)
        ? "arbitrator"
        : "independent",
  checks,
};
fs.mkdirSync("work/aliases", { recursive: true });
fs.writeFileSync(
  `work/aliases/${report.treasuryRole}.json`,
  JSON.stringify(report, null, 2),
);
console.log("Alias cases passed", report.treasuryRole, checks.length);

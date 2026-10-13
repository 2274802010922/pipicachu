// Explicit Devnet fixture. CLI signing is never represented as Phantom proof.
import fs from "node:fs";
import assert from "node:assert/strict";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  act,
  createOrganizationDealIx,
  dealAddress,
  readDeal,
  readOrganization,
  readFeeTreasury,
  fundReviewedIx,
  settleIxs,
  readArbitrator,
  digest,
  MINT,
} from "../../src/escrow/client";
import { paymentTermsHash } from "../../src/escrow/payment-terms";
import { verifySettlementReceipt } from "../../src/escrow/settlement-receipt";
import { getAssociatedTokenAddressSync } from "../../src/escrow/token";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
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
const seller = load("escrow-seller"),
  buyer = load("fixture-signer"),
  arb = new PublicKey("7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG");
const file = "work/fee-transparency-live.json";
type Journal = {
  nonce: string;
  deal: string;
  signatures: Record<string, string>;
  balances?: Record<string, string>;
  bondBefore?: string;
  verified?: boolean;
  at?: string;
};
const journal: Journal = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : (() => {
      const nonce = BigInt(Date.now());
      return {
        nonce: String(nonce),
        deal: dealAddress(seller.publicKey, nonce).toBase58(),
        signatures: {},
      };
    })();
const save = () => fs.writeFileSync(file, JSON.stringify(journal, null, 2));
save();
const treasury = await readFeeTreasury(c),
  org = await readOrganization(c, arb);
assert.ok(org?.approved && org.accepting);
const balance = async (owner: string) => {
  try {
    return (
      await c.getTokenAccountBalance(
        getAssociatedTokenAddressSync(MINT, new PublicKey(owner), true),
      )
    ).value.amount;
  } catch {
    return "0";
  }
};
const wallets = [buyer.publicKey, seller.publicKey, arb, treasury].map((k) =>
  k.toBase58(),
);
if (!journal.balances) {
  journal.balances = Object.fromEntries(
    await Promise.all(wallets.map(async (w) => [w, await balance(w)])),
  );
  journal.bondBefore = String((await readArbitrator(c, arb))!.locked);
  save();
}
async function send(
  name: string,
  signer: Keypair,
  ixs: Parameters<Transaction["add"]>,
) {
  const pending = journal.signatures[name];
  if (pending) {
    const s = (
      await c.getSignatureStatuses([pending], {
        searchTransactionHistory: true,
      })
    ).value[0];
    assert.ok(
      s && !s.err && s.confirmationStatus === "finalized",
      "Resume only after inspecting existing signature; no automatic re-sign",
    );
    return pending;
  }
  const tx = new Transaction().add(...ixs),
    latest = await c.getLatestBlockhash();
  tx.feePayer = signer.publicKey;
  tx.recentBlockhash = latest.blockhash;
  tx.sign(signer);
  const bs58 = (await import("bs58")).default;
  journal.signatures[name] = bs58.encode(tx.signature!);
  save();
  const signature = await c.sendRawTransaction(tx.serialize());
  const result = await c.confirmTransaction(
    { ...latest, signature },
    "finalized",
  );
  assert.equal(result.value.err, null);
  return signature;
}
let d = await readDeal(c, journal.deal).catch(() => null);
if (!d) {
  await send("create", seller, [
    await createOrganizationDealIx(
      seller.publicKey,
      buyer.publicKey,
      arb,
      BigInt(journal.nonce),
      1_000_000n,
      org!.times,
      "Demo minh bạch phí: một USDC, kiểm tra đủ file trước xác nhận.",
    ),
  ]);
  d = await readDeal(c, journal.deal);
}
if (d.state === "created") {
  const bad = await fundReviewedIx(
    buyer.publicKey,
    d,
    await paymentTermsHash(
      { ...d, platformFee: d.platformFee + 1n },
      treasury.toBase58(),
    ),
  );
  const tx = new Transaction().add(bad);
  tx.feePayer = buyer.publicKey;
  tx.recentBlockhash = (await c.getLatestBlockhash()).blockhash;
  const sim = await c.simulateTransaction(tx);
  assert.deepEqual(sim.value.err, { InstructionError: [0, { Custom: 6009 }] });
  await send("fund", buyer, [
    await fundReviewedIx(
      buyer.publicKey,
      d,
      await paymentTermsHash(d, treasury.toBase58()),
    ),
  ]);
  d = await readDeal(c, journal.deal);
}
if (d.state === "funded") {
  await send("deliver", seller, [
    await act(
      "deliver",
      seller.publicKey,
      new PublicKey(d.address),
      await digest("Demo delivery complete"),
    ),
  ]);
  d = await readDeal(c, journal.deal);
}
if (d.state === "delivered") {
  await send(
    "confirm",
    buyer,
    await settleIxs("confirm", buyer.publicKey, d, undefined, c),
  );
  d = await readDeal(c, journal.deal);
}
assert.equal(d.state, "completed");
const tx = await c.getParsedTransaction(journal.signatures.confirm, {
  commitment: "finalized",
  maxSupportedTransactionVersion: 0,
});
assert.equal(
  verifySettlementReceipt(d, treasury.toBase58(), tx),
  journal.signatures.confirm,
);
const deltas = [-1_000_000n, 980_000n, 10_000n, 10_000n];
for (let i = 0; i < wallets.length; i++)
  assert.equal(
    BigInt(await balance(wallets[i])) - BigInt(journal.balances![wallets[i]]),
    deltas[i],
  );
assert.equal(
  String((await readArbitrator(c, arb))!.locked),
  journal.bondBefore,
);
journal.verified = true;
journal.at = new Date().toISOString();
save();
console.log(
  JSON.stringify({
    deal: journal.deal,
    signatures: journal.signatures,
    verified: true,
    split: ["0.98", "0.01", "0.01"],
  }),
);

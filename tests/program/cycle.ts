import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer as tokenTransfer,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import {
  act,
  bondIx,
  CONFIG,
  createDealIx,
  dealAddress,
  digest,
  fundIx,
  instruction,
  key,
  MINT,
  readArbitrator,
  readDeal,
  registerIx,
  settleIxs,
  vaultAddress,
  PROGRAM_ID,
  amount,
} from "../../src/escrow/client";

const live = process.argv.includes("--devnet");
const principal = live ? 2_000_000n : 10_000_000n;
const bondTarget = live ? 2_000_000n : 20_000_000n;
const connection = new Connection(
  live
    ? process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com"
    : "http://127.0.0.1:8897",
  "confirmed",
);
const genesis = await connection.getGenesisHash();
if (live) assert.equal(genesis, "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG");
fs.mkdirSync("work/private", { recursive: true });
const load = (name: string) => {
  const p = `work/private/${name}.json`;
  if (fs.existsSync(p))
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))),
    );
  const k = Keypair.generate();
  fs.writeFileSync(p, JSON.stringify([...k.secretKey]));
  return k;
};
const buyer = load("fixture-signer"),
  seller = load("escrow-seller"),
  primary = load("escrow-primary"),
  backup = load("escrow-backup");
const results: { scenario: string; signature?: string; detail?: string }[] = [];
async function send(signer: Keypair, ixs: Awaited<ReturnType<typeof act>>[]) {
  return sendAndConfirmTransaction(
    connection,
    new Transaction().add(...ixs),
    [signer],
    { commitment: "confirmed" },
  );
}
async function expectReject(scenario: string, fn: () => Promise<unknown>) {
  await assert.rejects(fn, (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, /custom program error|Signature verification failed/);
    return true;
  });
  results.push({
    scenario,
    detail: "Rejected by program / transaction validation",
  });
  console.log("PASS rejected", scenario);
}
for (const wallet of [buyer, seller, primary, backup]) {
  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < 100_000_000) {
    if (!live) {
      const sig = await connection.requestAirdrop(
        wallet.publicKey,
        2_000_000_000,
      );
      await connection.confirmTransaction(sig, "confirmed");
    } else if (!wallet.publicKey.equals(buyer.publicKey)) {
      await send(buyer, [
        SystemProgram.transfer({
          fromPubkey: buyer.publicKey,
          toPubkey: wallet.publicKey,
          lamports: 200_000_000,
        }),
      ]);
    } else throw new Error("Need SOL Devnet for test payer");
  }
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    buyer,
    MINT,
    wallet.publicKey,
  );
  if (!live)
    await mintTo(connection, buyer, MINT, ata.address, buyer, 200_000_000n);
}
if (!(await connection.getAccountInfo(CONFIG)))
  await send(buyer, [
    await instruction("initialize", [
      key(buyer.publicKey, true, true),
      key(CONFIG, true),
      key(MINT),
      key(SystemProgram.programId),
    ]),
  ]);
for (const a of [primary, backup]) {
  if (!(await readArbitrator(connection, a.publicKey)))
    await send(a, [await registerIx(a.publicKey)]);
  const current = await readArbitrator(connection, a.publicKey);
  if (live && current!.total < bondTarget) {
    const target = getAssociatedTokenAddressSync(MINT, a.publicKey);
    const available = (await getAccount(connection, target)).amount;
    const needed = bondTarget - current!.total;
    if (available < needed)
      await tokenTransfer(
        connection,
        buyer,
        getAssociatedTokenAddressSync(MINT, buyer.publicKey),
        target,
        buyer,
        needed - available,
      );
  }
  if (current!.total < bondTarget)
    await send(a, [
      await bondIx("deposit_bond", a.publicKey, bondTarget - current!.total),
    ]);
}
let nonce = BigInt(Date.now());
const deals: { address: string; vi: string; en: string }[] = [];
async function create(
  title: string,
  times = live ? [600, 40, 40, 40] : [120, 10, 10, 10],
) {
  const n = nonce++,
    address = dealAddress(seller.publicKey, n);
  await send(seller, [
    await createDealIx(
      seller.publicKey,
      buyer.publicKey,
      primary.publicKey,
      backup.publicKey,
      n,
      principal,
      times,
      `Devnet test: ${title}. Buyer pays ${amount(principal)} USDC; seller receives ${amount(principal - principal / 100n)}; fee ${amount(principal / 100n)}. Off-chain test delivery.`,
    ),
  ]);
  await expectReject(
    `${title}: cannot fund before arbitrators accept`,
    async () =>
      send(buyer, [
        await fundIx(
          buyer.publicKey,
          await readDeal(connection, address.toBase58()),
        ),
      ]),
  );
  await send(primary, [await act("accept_deal", primary.publicKey, address)]);
  await send(backup, [await act("accept_deal", backup.publicKey, address)]);
  const d = await readDeal(connection, address.toBase58());
  await expectReject(`${title}: wrong buyer`, async () =>
    send(seller, [await fundIx(seller.publicKey, d)]),
  );
  await send(buyer, [await fundIx(buyer.publicKey, d)]);
  assert.equal(
    (await getAccount(connection, vaultAddress(address))).amount,
    principal,
  );
  assert.ok(
    (await readArbitrator(connection, primary.publicKey))!.locked >=
      principal / 10n,
  );
  return address;
}
async function delivered(address: PublicKey) {
  await send(seller, [
    await act(
      "deliver",
      seller.publicKey,
      address,
      await digest("test delivery receipt"),
    ),
  ]);
}
async function disputed(address: PublicKey) {
  await delivered(address);
  await send(buyer, [
    await act(
      "dispute",
      buyer.publicKey,
      address,
      await digest("test dispute evidence"),
    ),
  ]);
}
async function waitUntil(timestamp: number) {
  while (true) {
    const slot = await connection.getSlot();
    const now = await connection.getBlockTime(slot);
    if (now !== null && now >= timestamp) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
}
async function settle(
  name: string,
  actor: Keypair,
  address: PublicKey,
  args?: Buffer,
) {
  const d = await readDeal(connection, address.toBase58());
  const beforeBuyer = (
    await getAccount(
      connection,
      (
        await getOrCreateAssociatedTokenAccount(
          connection,
          buyer,
          MINT,
          buyer.publicKey,
        )
      ).address,
    )
  ).amount;
  const beforeSeller = (
    await getAccount(
      connection,
      (
        await getOrCreateAssociatedTokenAccount(
          connection,
          buyer,
          MINT,
          seller.publicKey,
        )
      ).address,
    )
  ).amount;
  const sig = await send(
    actor,
    await settleIxs(name, actor.publicKey, d, args),
  );
  const state = await readDeal(connection, address.toBase58());
  assert.ok(["completed", "refunded"].includes(state.state));
  assert.equal(
    (await getAccount(connection, vaultAddress(address))).amount,
    0n,
  );
  const afterBuyer = (
    await getAccount(
      connection,
      (
        await getOrCreateAssociatedTokenAccount(
          connection,
          buyer,
          MINT,
          buyer.publicKey,
        )
      ).address,
    )
  ).amount;
  const afterSeller = (
    await getAccount(
      connection,
      (
        await getOrCreateAssociatedTokenAccount(
          connection,
          buyer,
          MINT,
          seller.publicKey,
        )
      ).address,
    )
  ).amount;
  if (state.state === "completed") {
    assert.equal(afterSeller - beforeSeller, principal - principal / 100n);
    assert.equal(afterBuyer - beforeBuyer, 0n);
  } else {
    assert.equal(afterBuyer - beforeBuyer, principal);
    assert.equal(afterSeller - beforeSeller, 0n);
  }
  results.push({ scenario: name, signature: sig, detail: state.state });
  console.log("PASS settled", name, state.state);
  await expectReject(`${name}: double settlement`, async () =>
    send(actor, await settleIxs(name, actor.publicKey, state, args)),
  );
  return sig;
}
const confirmed = await create("buyer confirmation");
await delivered(confirmed);
const deliveredDeal = await readDeal(connection, confirmed.toBase58());
const redirected = await settleIxs("confirm", buyer.publicKey, deliveredDeal);
redirected.at(-1)!.keys[7].pubkey = getAssociatedTokenAddressSync(
  MINT,
  buyer.publicKey,
);
await expectReject(
  "seller destination cannot be replaced by buyer account",
  async () => send(buyer, redirected),
);
const redirectedFee = await settleIxs(
  "confirm",
  buyer.publicKey,
  deliveredDeal,
);
redirectedFee.at(-1)!.keys[8].pubkey = getAssociatedTokenAddressSync(
  MINT,
  buyer.publicKey,
);
await expectReject("fee destination cannot be redirected", async () =>
  send(buyer, redirectedFee),
);
const wrongVault = await settleIxs("confirm", buyer.publicKey, deliveredDeal);
wrongVault.at(-1)!.keys[5].pubkey = getAssociatedTokenAddressSync(
  MINT,
  buyer.publicKey,
);
await expectReject("unrelated vault cannot substitute deal vault", async () =>
  send(buyer, wrongVault),
);
await expectReject("only buyer confirms", async () =>
  send(
    seller,
    await settleIxs(
      "confirm",
      seller.publicKey,
      await readDeal(connection, confirmed.toBase58()),
    ),
  ),
);
await settle("confirm", buyer, confirmed);
deals.push({
  address: confirmed.toBase58(),
  vi: "Buyer xác nhận → trả seller",
  en: "Buyer confirms → seller paid",
});
const timed = await create("review timeout");
await delivered(timed);
await expectReject("no early payout", async () =>
  send(
    seller,
    await settleIxs(
      "finalize",
      seller.publicKey,
      await readDeal(connection, timed.toBase58()),
    ),
  ),
);
await waitUntil((await readDeal(connection, timed.toBase58())).reviewBy);
await settle("finalize", seller, timed);
deals.push({
  address: timed.toBase58(),
  vi: "Hết hạn kiểm tra → giải ngân",
  en: "Review deadline → release",
});
const expired = await create("missed delivery");
await expectReject("cannot withdraw reserved bond", async () => {
  const a = await readArbitrator(connection, primary.publicKey);
  return send(primary, [
    await bondIx("withdraw_bond", primary.publicKey, a!.total),
  ]);
});
await waitUntil((await readDeal(connection, expired.toBase58())).deliverBy);
await expectReject("no late delivery", async () => delivered(expired));
await settle("refund_expired", buyer, expired);
deals.push({
  address: expired.toBase58(),
  vi: "Không bàn giao → hoàn buyer",
  en: "Missed delivery → buyer refunded",
});
for (const pay of [true, false]) {
  const address = await create(
    pay ? "arbitrator pays seller" : "arbitrator refunds buyer",
  );
  await disputed(address);
  await expectReject("disputed funds cannot finalize", async () =>
    send(
      seller,
      await settleIxs(
        "finalize",
        seller.publicKey,
        await readDeal(connection, address.toBase58()),
      ),
    ),
  );
  await expectReject("backup cannot rule early", async () =>
    send(
      backup,
      await settleIxs(
        "resolve",
        backup.publicKey,
        await readDeal(connection, address.toBase58()),
        Buffer.concat([Buffer.from([pay ? 1 : 0]), await digest("reason")]),
      ),
    ),
  );
  await settle(
    "resolve",
    primary,
    address,
    Buffer.concat([
      Buffer.from([pay ? 1 : 0]),
      await digest("arbitrator reasoning"),
    ]),
  );
  deals.push({
    address: address.toBase58(),
    vi: pay
      ? "Tranh chấp → trọng tài trả seller"
      : "Tranh chấp → trọng tài hoàn buyer",
    en: pay
      ? "Dispute → arbitrator pays seller"
      : "Dispute → arbitrator refunds buyer",
  });
}
const secondary = await create("backup arbitration");
await disputed(secondary);
await waitUntil((await readDeal(connection, secondary.toBase58())).arbitrateBy);
await expectReject("primary cannot rule after own deadline", async () =>
  send(
    primary,
    await settleIxs(
      "resolve",
      primary.publicKey,
      await readDeal(connection, secondary.toBase58()),
      Buffer.concat([Buffer.from([1]), await digest("reason")]),
    ),
  ),
);
await settle(
  "resolve",
  backup,
  secondary,
  Buffer.concat([Buffer.from([0]), await digest("backup reasoning")]),
);
deals.push({
  address: secondary.toBase58(),
  vi: "Trọng tài chính bỏ xử → dự phòng hoàn buyer",
  en: "Primary timeout → backup refunds buyer",
});
const mutual = await create("mutual resolution after arbitration timeout");
await disputed(mutual);
const md = await readDeal(connection, mutual.toBase58());
await waitUntil(md.arbitrateBy + md.arbitrationSeconds);
await send(buyer, [
  await act("propose_settlement", buyer.publicKey, mutual, Buffer.from([0])),
]);
const previousProposal = await readDeal(connection, mutual.toBase58());
const oldAcceptance = await settleIxs(
  "accept_settlement",
  seller.publicKey,
  previousProposal,
);
await send(buyer, [
  await act("propose_settlement", buyer.publicKey, mutual, Buffer.from([1])),
]);
await expectReject(
  "changed proposal invalidates previous seller acceptance",
  async () => send(seller, oldAcceptance),
);
await send(buyer, [
  await act("propose_settlement", buyer.publicKey, mutual, Buffer.from([0])),
]);
await expectReject("buyer cannot accept own proposal", async () =>
  send(
    buyer,
    await settleIxs(
      "accept_settlement",
      buyer.publicKey,
      await readDeal(connection, mutual.toBase58()),
    ),
  ),
);
await settle("accept_settlement", seller, mutual);
deals.push({
  address: mutual.toBase58(),
  vi: "Hai trọng tài hết hạn → hai bên đồng ý hoàn tiền",
  en: "Both arbitrators expire → mutual refund",
});
for (const a of [primary, backup])
  assert.equal((await readArbitrator(connection, a.publicKey))!.locked, 0n);
const existing = await readArbitrator(connection, primary.publicKey);
await send(primary, [
  await bondIx("withdraw_bond", primary.publicKey, 1_000_000n),
]);
assert.equal(
  (await readArbitrator(connection, primary.publicKey))!.total,
  existing!.total - 1_000_000n,
);
const report = {
  at: new Date().toISOString(),
  network: live ? "devnet" : "local-validator",
  tokenSource: live
    ? "Circle Devnet USDC"
    : "synthetic local mint at Devnet USDC address (not Circle issuance)",
  genesis,
  programId: PROGRAM_ID.toBase58(),
  roles: {
    buyer: buyer.publicKey.toBase58(),
    seller: seller.publicKey.toBase58(),
    primary: primary.publicKey.toBase58(),
    backup: backup.publicKey.toBase58(),
  },
  results,
  deals,
};
fs.mkdirSync("docs/evidence", { recursive: true });
fs.writeFileSync(
  `docs/evidence/${live ? "devnet" : "local"}-escrow-cycle.json`,
  JSON.stringify(report, null, 2),
);
if (live)
  fs.writeFileSync(
    "src/escrow/samples.json",
    JSON.stringify(
      {
        primary: primary.publicKey.toBase58(),
        backup: backup.publicKey.toBase58(),
        deals,
      },
      null,
      2,
    ),
  );
console.log(`Verified ${results.length} checks on ${report.network}`);

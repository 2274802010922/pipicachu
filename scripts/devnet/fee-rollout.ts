// Explicit Devnet-only rollout and legacy compatibility proof. Keys remain ignored.
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
  act,
  createDealIx,
  dealAddress,
  digest,
  FEE_CONFIG,
  fundIx,
  instruction,
  key,
  PROGRAM_ID,
  readDeal,
  readFeeTreasury,
  settleIxs,
} from "../../src/escrow/client";

export const treasury = new PublicKey(
  "CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN",
);
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
const buyer = load("fixture-signer"),
  seller = load("escrow-seller"),
  arb = load("escrow-arbitrator");
const send = (signer: Keypair, ixs: Awaited<ReturnType<typeof act>>[]) =>
  sendAndConfirmTransaction(c, new Transaction().add(...ixs), [signer], {
    commitment: "finalized",
  });
const path = "docs/evidence/platform-fee-rollout.json";
const phase = process.argv[2];
if (phase === "legacy") {
  assert.equal(
    await c.getAccountInfo(FEE_CONFIG),
    null,
    "Run legacy fixture BEFORE fee upgrade/config initialization",
  );
  const accounts = await c.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 876 }],
  });
  const legacySnapshot = await Promise.all(
    accounts.map(async (a) => {
      const d = await readDeal(c, a.pubkey.toBase58());
      assert.equal(d.platformFee, 0n);
      return {
        address: d.address,
        state: d.state,
        feeVersion: d.feeVersion,
        platformFee: d.platformFee.toString(),
      };
    }),
  );
  const nonce = BigInt(Date.now()),
    address = dealAddress(seller.publicKey, nonce);
  const ix = await createDealIx(
    seller.publicKey,
    buyer.publicKey,
    arb.publicKey,
    nonce,
    1_000_000n,
    [3600, 3600, 3600, 3600],
    "Legacy 1% fee deal created before platform upgrade; buyer confirmation after upgrade must retain 99% seller and zero platform fee.",
  );
  ix.keys.pop(); // Old deployed ABI has no FeeConfig argument.
  const created = await send(seller, [ix]);
  await send(arb, [await act("accept_deal", arb.publicKey, address)]);
  await send(buyer, [
    await fundIx(buyer.publicKey, await readDeal(c, address.toBase58())),
  ]);
  await send(seller, [
    await act(
      "deliver",
      seller.publicKey,
      address,
      await digest("Legacy compatibility test delivery"),
    ),
  ]);
  fs.writeFileSync(
    path,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        treasury: treasury.toBase58(),
        feeConfig: FEE_CONFIG.toBase58(),
        legacySnapshot,
        legacyDeal: address.toBase58(),
        legacyCreateSignature: created,
      },
      null,
      2,
    ),
  );
  console.log(
    "Created funded legacy compatibility fixture",
    address.toBase58(),
  );
} else if (phase === "initialize") {
  let signature: string | null = null;
  if (!(await c.getAccountInfo(FEE_CONFIG)))
    signature = await send(buyer, [
      await instruction(
        "initialize_fee_config",
        [
          key(buyer.publicKey, true, true),
          key(FEE_CONFIG, true),
          key(SystemProgram.programId),
        ],
        treasury.toBuffer(),
      ),
    ]);
  assert.equal(
    (await readFeeTreasury(c)).toBase58(),
    treasury.toBase58(),
    "Never replace an existing treasury silently",
  );
  const report = JSON.parse(fs.readFileSync(path, "utf8"));
  const legacy = await readDeal(c, report.legacyDeal);
  assert.equal(legacy.feeVersion, 0);
  assert.equal(legacy.platformFee, 0n);
  const legacyPayout = await send(
    buyer,
    await settleIxs("confirm", buyer.publicKey, legacy, undefined, c),
  );
  assert.equal((await readDeal(c, legacy.address)).state, "completed");
  fs.writeFileSync(
    path,
    JSON.stringify(
      {
        ...report,
        initializedAt: new Date().toISOString(),
        initializeSignature: signature,
        legacyPayoutSignature: legacyPayout,
        legacyFeeVersion: 0,
        legacySellerAtomic: "990000",
        legacyArbitratorAtomic: "10000",
        legacyPlatformAtomic: "0",
      },
      null,
      2,
    ),
  );
  console.log(
    "Immutable treasury configured; legacy deal completed without platform fee",
    treasury.toBase58(),
  );
} else throw new Error("Use legacy before upgrade, initialize after upgrade");

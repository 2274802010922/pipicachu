import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import {
  act,
  bondIx,
  createOrganizationDealIx,
  dealAddress,
  fundIx,
  MINT,
  readArbitrator,
  readDeal,
  readFeeTreasury,
  readOrganization,
  organizationAcceptingIx,
  settleIxs,
  vaultAddress,
  digest,
  PROGRAM_ID,
} from "../../src/escrow/client";
import {
  readApplication,
  applicationAddress,
} from "../../src/escrow/governance";
import { createEvidence, verifyEvidence } from "../../src/escrow/evidence";
import { getAssociatedTokenAddressSync } from "../../src/escrow/token";
import { prepareDevnetWalletTransaction } from "../../src/escrow/wallet-transaction";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "confirmed",
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
  arbitrator = load("v06-live-arbitrator");
const application = await readApplication(c, arbitrator.publicKey),
  org = await readOrganization(c, arbitrator.publicKey);
if (application?.status !== "approved" || !org?.approved)
  throw Error("OWNER_APPROVAL_REQUIRED");
if (org.times.slice(1).some((n) => n > 120) || org.maximumDeal < 1_000_000n)
  throw Error(
    "TEST_POLICY_REQUIRED: use 60-second delivery/review/SLA only for the isolated test arbitrator",
  );
const treasury = await readFeeTreasury(c),
  principal = 1_000_000n;
const receipts: { action: string; signature: string }[] = [];
const scenarios: Record<string, unknown>[] = [];
const nonce = BigInt(Date.now());
const directory = "docs/evidence/v06/live";
fs.mkdirSync(directory, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function time() {
  const clock = await c.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
  assert.ok(clock && clock.data.length === 40);
  return Number(clock.data.readBigInt64LE(32));
}
async function waitUntil(deadline: number) {
  for (let i = 0; i < 150; i++) {
    if ((await time()) >= deadline) return;
    await sleep(1000);
  }
  throw Error("TEST_CLOCK_TIMEOUT");
}
async function send(
  name: string,
  signer: Keypair,
  instructions: Awaited<ReturnType<typeof act>>[],
) {
  const signature = await sendAndConfirmTransaction(
    c,
    prepareDevnetWalletTransaction(new Transaction().add(...instructions)),
    [signer],
    { commitment: "confirmed" },
  );
  receipts.push({ action: name, signature });
  return signature;
}
async function evidence(
  d: Awaited<ReturnType<typeof readDeal>>,
  kind: "delivery" | "dispute" | "resolution",
  author: Keypair,
  label: string,
) {
  const envelope = await createEvidence({
    deal: d.address,
    kind,
    author: author.publicKey.toBase58(),
    note: `Synthetic Devnet acceptance fixture: ${label}. No actual goods or customer evidence.`,
  });
  fs.writeFileSync(
    `${directory}/${label}-${kind}.json`,
    JSON.stringify(envelope, null, 2),
  );
  return envelope;
}
async function create(index: number, label: string) {
  const n = nonce + BigInt(index),
    address = dealAddress(seller.publicKey, n);
  await send(`${label}:create`, seller, [
    await createOrganizationDealIx(
      seller.publicKey,
      buyer.publicKey,
      arbitrator.publicKey,
      n,
      principal,
      org!.times,
      `Devnet test only: ${label}; no actual goods; verify fixed fees and policy1`,
    ),
  ]);
  let d = await readDeal(c, address.toBase58());
  assert.equal(d.resolutionPolicyVersion, 1);
  assert.equal(d.amount, principal);
  assert.equal(d.fee, 10_000n);
  assert.equal(d.platformFee, 10_000n);
  await send(`${label}:fund`, buyer, [await fundIx(buyer.publicKey, d)]);
  d = await readDeal(c, d.address);
  assert.equal(d.state, "funded");
  assert.equal((await getAccount(c, vaultAddress(address))).amount, principal);
  return d;
}
async function deliver(d: Awaited<ReturnType<typeof readDeal>>, label: string) {
  const envelope = await evidence(d, "delivery", seller, label);
  await send(`${label}:deliver`, seller, [
    await act(
      "deliver",
      seller.publicKey,
      new PublicKey(d.address),
      Buffer.from(envelope.commitment, "hex"),
    ),
  ]);
  d = await readDeal(c, d.address);
  assert.equal((await verifyEvidence(envelope, d)).valid, true);
  return d;
}
async function dispute(d: Awaited<ReturnType<typeof readDeal>>, label: string) {
  const envelope = await evidence(d, "dispute", buyer, label);
  await send(`${label}:dispute`, buyer, [
    await act(
      "dispute",
      buyer.publicKey,
      new PublicKey(d.address),
      Buffer.from(envelope.commitment, "hex"),
    ),
  ]);
  d = await readDeal(c, d.address);
  assert.equal((await verifyEvidence(envelope, d)).valid, true);
  return d;
}
async function settlement(
  d: Awaited<ReturnType<typeof readDeal>>,
  label: string,
  name: string,
  signer: Keypair,
  payout: boolean,
  args?: Buffer,
) {
  const owners = [
    buyer.publicKey,
    seller.publicKey,
    arbitrator.publicKey,
    treasury,
  ];
  const before = await Promise.all(
    owners.map((p) => getAccount(c, getAssociatedTokenAddressSync(MINT, p))),
  );
  const locked = (await readArbitrator(c, arbitrator.publicKey))!.locked;
  const signature = await send(
    `${label}:${name}`,
    signer,
    await settleIxs(name, signer.publicKey, d, args, c),
  );
  const final = await readDeal(c, d.address),
    after = await Promise.all(
      owners.map((p) => getAccount(c, getAssociatedTokenAddressSync(MINT, p))),
    );
  const expected = payout
    ? [0n, 980_000n, 10_000n, 10_000n]
    : [principal, 0n, 0n, 0n];
  after.forEach((a, i) =>
    assert.equal(a.amount - before[i].amount, expected[i]),
  );
  assert.equal(final.state, payout ? "completed" : "refunded");
  assert.equal(
    (await getAccount(c, vaultAddress(new PublicKey(d.address)))).amount,
    0n,
  );
  assert.equal(
    locked - (await readArbitrator(c, arbitrator.publicKey))!.locked,
    100_000n,
  );
  scenarios.push({
    scenario: label,
    address: d.address,
    signature,
    state: final.state,
    resolutionPolicyVersion: final.resolutionPolicyVersion,
    expectedAtomicUSDC: expected.map(String),
    vaultAmount: "0",
    bondUnlocked: "100000",
  });
}
const approvalHistory = await c.getSignaturesForAddress(
  applicationAddress(arbitrator.publicKey),
  { limit: 10 },
);
let approvalSignature: string | null = null;
for (const receipt of approvalHistory) {
  if (receipt.err) continue;
  const transaction = await c.getTransaction(receipt.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!transaction || transaction.meta?.err) continue;
  const message = transaction.transaction.message,
    keys = message.getAccountKeys();
  const manager = new PublicKey("CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN");
  const discriminator = (
    await digest("global:approve_arbitrator_application")
  ).subarray(0, 8);
  const approvedInstruction = message.compiledInstructions.some(
    (ix) =>
      keys.get(ix.programIdIndex)?.equals(PROGRAM_ID) &&
      Buffer.from(ix.data).subarray(0, 8).equals(discriminator),
  );
  if (
    approvedInstruction &&
    Array.from({ length: message.header.numRequiredSignatures }, (_, i) =>
      keys.get(i)!,
    ).some((p) => p.equals(manager))
  )
    approvalSignature = receipt.signature;
}
assert.ok(
  approvalSignature,
  "Owner-signed approval must have a separate receipt",
);
receipts.push({
  action: "owner manager approves isolated test application",
  signature: approvalSignature,
});
const starting = (await readArbitrator(c, arbitrator.publicKey))!;
assert.equal(
  starting.locked,
  0n,
  "Recover the previous test operation before starting a new run",
);
if (starting.total < org.minimumDeposit)
  await send("prepare isolated bond", arbitrator, [
    await bondIx(
      "deposit_bond",
      arbitrator.publicKey,
      org.minimumDeposit - starting.total,
    ),
  ]);
await send("isolated arbitrator consents to policy", arbitrator, [
  await organizationAcceptingIx(arbitrator.publicKey, true, c),
]);
try {
  let d = await deliver(await create(0, "confirm"), "confirm");
  await settlement(d, "confirm", "confirm", buyer, true);
  d = await create(1, "delivery-timeout");
  await waitUntil(d.deliverBy);
  await settlement(d, "delivery-timeout", "refund_expired", buyer, false);
  for (const [i, label, payout, late] of [
    [2, "arbitrator-payout", true, false],
    [3, "arbitrator-refund", false, false],
    [4, "late-ruling", true, true],
  ] as const) {
    d = await dispute(await deliver(await create(i, label), label), label);
    if (late) await waitUntil(d.arbitrateBy);
    const envelope = await evidence(d, "resolution", arbitrator, label);
    const networkTimeBeforeRuling = await time();
    await settlement(
      d,
      label,
      "resolve",
      arbitrator,
      payout,
      Buffer.concat([
        Buffer.from([payout ? 1 : 0]),
        Buffer.from(envelope.commitment, "hex"),
      ]),
    );
    assert.equal(
      (await verifyEvidence(envelope, await readDeal(c, d.address))).valid,
      true,
    );
    if (late) {
      assert.ok(networkTimeBeforeRuling >= d.arbitrateBy);
      Object.assign(scenarios.at(-1)!, {
        arbitrateBy: d.arbitrateBy,
        networkTimeBeforeRuling,
      });
    }
  }
  d = await dispute(
    await deliver(await create(5, "mutual-refund"), "mutual-refund"),
    "mutual-refund",
  );
  await waitUntil(d.arbitrateBy);
  await send("mutual refund proposal", buyer, [
    await act(
      "propose_settlement",
      buyer.publicKey,
      new PublicKey(d.address),
      Buffer.from([0]),
    ),
  ]);
  await settlement(
    await readDeal(c, d.address),
    "mutual-refund",
    "accept_settlement",
    seller,
    false,
  );
  for (const receipt of receipts)
    for (let n = 0; n < 50; n++) {
      const status = (
        await c.getSignatureStatuses([receipt.signature], {
          searchTransactionHistory: true,
        })
      ).value[0];
      assert.ok(!status?.err);
      if (status?.confirmationStatus === "finalized") break;
      if (n === 49) throw Error("FINALITY_TIMEOUT");
      await sleep(1000);
    }
  fs.writeFileSync(
    `${directory}/acceptance.json`,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        network: "devnet",
        version: "0.6.0",
        source: "CLI-signed test transactions; not Phantom extension",
        managerApprovalSignature: approvalSignature,
        testArbitrator: arbitrator.publicKey.toBase58(),
        allReceiptsFinalized: true,
        scenarios,
        receipts,
        keeperVerified: false,
        primaryArbitratorUnchanged:
          "7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG",
      },
      null,
      2,
    ),
  );
  console.log(
    "Six v0.6 live branches verified and finalized; keeper/Phantom remain separate gates",
  );
} finally {
  await send("pause isolated test arbitrator after acceptance", arbitrator, [
    await organizationAcceptingIx(arbitrator.publicKey, false),
  ]);
}

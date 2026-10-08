import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
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
import {
  submitWalletOperation,
  trackOperation,
  isUnresolved,
  type Operation,
} from "../../src/escrow/operation";
const c = new Connection(
  process.env.ACCEPTANCE_RPC_URL || "https://pipicachu.vercel.app/api/rpc",
  { commitment: "confirmed", disableRetryOnRateLimit: true },
);
const archive = new Connection(
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
  arbitrator = load("v06-live-arbitrator");
assert.equal(
  arbitrator.publicKey.toBase58(),
  "2dakRFzAYG6qrWenyNUt5uCAGLhDYJMUhLBfXJn5XeC8",
  "Only the isolated acceptance wallet may be used",
);
const allowLongPolicy = process.argv.includes("--allow-long-policy");
const maximumWindow = allowLongPolicy ? 1800 : 120;
const application = await readApplication(c, arbitrator.publicKey),
  org = await readOrganization(c, arbitrator.publicKey);
if (application?.status !== "approved" || !org?.approved)
  throw Error("OWNER_APPROVAL_REQUIRED");
if (
  org.times.slice(1).some((n) => n > maximumWindow) ||
  org.maximumDeal < 1_000_000n
)
  throw Error(
    "TEST_POLICY_REQUIRED: use 60-second delivery/review/SLA only for the isolated test arbitrator",
  );
const treasury = await readFeeTreasury(c),
  principal = 1_000_000n;
const directory = "docs/evidence/v06/live";
const resume = process.argv.includes("--resume");
const saved = resume
  ? JSON.parse(fs.readFileSync(`${directory}/progress.json`, "utf8"))
  : null;
if (saved) {
  assert.equal(saved.testArbitrator, arbitrator.publicKey.toBase58());
  assert.equal(saved.network, "devnet");
  assert.deepEqual(
    saved.policyTimes,
    org.times,
    "Do not change policy mid-run",
  );
}
const receipts: { action: string; signature: string }[] = saved?.receipts || [];
const scenarios: Record<string, unknown>[] = saved?.scenarios || [];
const nonce = saved ? BigInt(saved.nonce) : BigInt(Date.now());
assert.ok(nonce >= 0n && nonce <= 0xffffffffffffffffn);
let operation: Operation | null = saved?.operation || null;
fs.mkdirSync(directory, { recursive: true });
function checkpoint(stage: string) {
  fs.writeFileSync(
    `${directory}/progress.json`,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        network: "devnet",
        nonce: nonce.toString(),
        testArbitrator: arbitrator.publicKey.toBase58(),
        policyTimes: org!.times,
        stage,
        scenarios,
        receipts,
        operation,
        source: "CLI test operations; not Phantom extension",
      },
      null,
      2,
    ),
  );
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function time() {
  const clock = await c.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
  assert.ok(clock && clock.data.length === 40);
  return Number(clock.data.readBigInt64LE(32));
}
async function waitUntil(deadline: number) {
  checkpoint(`waiting for chain deadline ${deadline}`);
  console.log(
    "Waiting for the actual on-chain deadline:",
    new Date(deadline * 1000).toISOString(),
  );
  for (let i = 0; i < maximumWindow + 90; i++) {
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
  const existing = receipts.find((r) => r.action === name);
  if (existing) {
    const status = (
      await c.getSignatureStatuses([existing.signature], {
        searchTransactionHistory: true,
      })
    ).value[0];
    assert.ok(
      status && !status.err,
      "Existing receipt must be recorded on chain",
    );
    return existing.signature;
  }
  let signature: string;
  if (
    operation?.action === name &&
    operation.signature &&
    isUnresolved(operation)
  ) {
    signature = await trackOperation(c, operation, (next) => {
      operation = next;
      checkpoint(name);
    });
  } else {
    signature = await submitWalletOperation({
      connection: c,
      wallet: signer.publicKey,
      tx: new Transaction().add(...instructions),
      sign: async (tx) => {
        tx.partialSign(signer);
        return tx;
      },
      currentWallet: () => signer.publicKey,
      meta: { action: name },
      onUpdate: (next) => {
        operation = next;
        checkpoint(name);
      },
    });
  }
  receipts.push({ action: name, signature });
  checkpoint(name);
  console.log("Confirmed:", name, signature);
  return signature;
}
async function evidence(
  d: Awaited<ReturnType<typeof readDeal>>,
  kind: "delivery" | "dispute" | "resolution",
  author: Keypair,
  label: string,
) {
  const file = `${directory}/${label}-${kind}.json`;
  if (fs.existsSync(file)) {
    const existing = JSON.parse(fs.readFileSync(file, "utf8"));
    if (
      existing.body.deal === d.address &&
      existing.body.kind === kind &&
      existing.body.author === author.publicKey.toBase58()
    )
      return existing;
    assert.ok(!resume, "Evidence from a different run must not be reused");
  }
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
  let d: Awaited<ReturnType<typeof readDeal>>;
  try {
    d = await readDeal(c, address.toBase58());
  } catch (error) {
    if (!(error instanceof Error && error.message === "DEAL_NOT_FOUND"))
      throw error;
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
    d = await readDeal(c, address.toBase58());
  }
  assert.equal(d.seller, seller.publicKey.toBase58());
  assert.equal(d.buyer, buyer.publicKey.toBase58());
  assert.equal(d.arbitrator, arbitrator.publicKey.toBase58());
  assert.equal(d.resolutionPolicyVersion, 1);
  assert.equal(d.amount, principal);
  assert.equal(d.fee, 10_000n);
  assert.equal(d.platformFee, 10_000n);
  if (d.state === "created") {
    await send(`${label}:fund`, buyer, [await fundIx(buyer.publicKey, d)]);
    d = await readDeal(c, d.address);
    assert.equal(d.state, "funded");
    assert.equal(
      (await getAccount(c, vaultAddress(address))).amount,
      principal,
    );
  }
  return d;
}
async function deliver(d: Awaited<ReturnType<typeof readDeal>>, label: string) {
  const envelope = await evidence(d, "delivery", seller, label);
  if (d.state === "funded")
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
  if (d.state === "delivered")
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
  if (scenarios.some((r) => r.scenario === label)) return;
  const current = await readDeal(c, d.address);
  const receipt = receipts.find((r) => r.action === `${label}:${name}`);
  let signature: string;
  if (["completed", "refunded"].includes(current.state)) {
    assert.ok(
      receipt,
      "Recover an unjournaled settlement receipt before resuming",
    );
    signature = receipt.signature;
  } else {
    signature = await send(
      `${label}:${name}`,
      signer,
      await settleIxs(name, signer.publicKey, current, args, c),
    );
  }
  const final = await readDeal(c, d.address);
  const tx = await archive.getTransaction(signature, {
    commitment: "finalized",
    maxSupportedTransactionVersion: 0,
  });
  assert.ok(tx && !tx.meta?.err, "Finalized settlement receipt required");
  const keys = tx.transaction.message.getAccountKeys({
    accountKeysFromLookups: tx.meta!.loadedAddresses,
  });
  const deltas = owners.map((owner) => {
    const ata = getAssociatedTokenAddressSync(MINT, owner);
    const index = Array.from({ length: keys.length }, (_, i) =>
      keys.get(i),
    ).findIndex((p) => p?.equals(ata));
    assert.ok(index >= 0, "Fixed recipient account must be present");
    const before = tx.meta!.preTokenBalances?.find(
      (b) => b.accountIndex === index && b.mint === MINT.toBase58(),
    );
    const after = tx.meta!.postTokenBalances?.find(
      (b) => b.accountIndex === index && b.mint === MINT.toBase58(),
    );
    assert.ok(
      before && after,
      "Require complete mint/recipient balance metadata",
    );
    return (
      BigInt(after.uiTokenAmount.amount) - BigInt(before.uiTokenAmount.amount)
    );
  });
  const expected = payout
    ? [0n, 980_000n, 10_000n, 10_000n]
    : [principal, 0n, 0n, 0n];
  deltas.forEach((value, i) => assert.equal(value, expected[i]));
  assert.equal(final.state, payout ? "completed" : "refunded");
  assert.equal(
    (await getAccount(c, vaultAddress(new PublicKey(d.address)))).amount,
    0n,
  );
  // All active reservations in this isolated run must remain accounted for.
  // This also verifies recovery after an already-landed settlement without
  // relying on a lost before/after snapshot or another transaction's balances.
  let expectedReserve = 0n;
  for (let index = 0; index < 6; index++) {
    try {
      const known = await readDeal(
        c,
        dealAddress(seller.publicKey, nonce + BigInt(index)).toBase58(),
      );
      assert.equal(known.arbitrator, arbitrator.publicKey.toBase58());
      if (["funded", "delivered", "disputed"].includes(known.state))
        expectedReserve += known.bond;
    } catch (error) {
      if (!(error instanceof Error && error.message === "DEAL_NOT_FOUND"))
        throw error;
    }
  }
  const arbInfo = (await readArbitrator(c, arbitrator.publicKey))!;
  assert.equal(
    arbInfo.locked,
    expectedReserve,
    "Terminal deals cannot retain or double-unlock reservations",
  );
  scenarios.push({
    scenario: label,
    address: d.address,
    signature,
    state: final.state,
    resolutionPolicyVersion: final.resolutionPolicyVersion,
    expectedAtomicUSDC: expected.map(String),
    vaultAmount: "0",
    reservedBondAfterSettlement: expectedReserve.toString(),
    bondUnlockVerifiedAgainstAllKnownActiveDeals: true,
    tokenDeltaSource: "finalized transaction pre/post balances",
  });
  checkpoint(`verified ${label}`);
}
const approvalHistory = await c.getSignaturesForAddress(
  applicationAddress(arbitrator.publicKey),
  { limit: 10 },
);
let approvalSignature: string | null = null;
for (const receipt of approvalHistory) {
  if (receipt.err) continue;
  const transaction = await archive.getTransaction(receipt.signature, {
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
if (
  !receipts.some(
    (r) => r.action === "owner manager approves isolated test application",
  )
)
  receipts.push({
    action: "owner manager approves isolated test application",
    signature: approvalSignature,
  });
const starting = (await readArbitrator(c, arbitrator.publicKey))!;
if (!resume)
  assert.equal(
    starting.locked,
    0n,
    "Resume the previous run before creating a new nonce",
  );
else {
  let known = 0n;
  for (let index = 0; index < 6; index++) {
    try {
      const d = await readDeal(
        c,
        dealAddress(seller.publicKey, nonce + BigInt(index)).toBase58(),
      );
      assert.equal(d.arbitrator, arbitrator.publicKey.toBase58());
      if (["funded", "delivered", "disputed"].includes(d.state))
        known += d.bond;
    } catch (error) {
      if (!(error instanceof Error && error.message === "DEAL_NOT_FOUND"))
        throw error;
    }
  }
  assert.equal(starting.locked, known, "No unknown obligations may be touched");
}
if (starting.total < org.minimumDeposit)
  await send("prepare isolated bond", arbitrator, [
    await bondIx(
      "deposit_bond",
      arbitrator.publicKey,
      org.minimumDeposit - starting.total,
    ),
  ]);
if (!org.accepting)
  await send(
    `isolated arbitrator consents to policy${resume ? ":resume:" + Date.now() : ""}`,
    arbitrator,
    [await organizationAcceptingIx(arbitrator.publicKey, true, c)],
  );
try {
  // Start the longest clock first; all other cases use their own deals.
  // Never shorten a signed deadline or treat elapsed wall time as chain time.
  const deliveryTimeout = await create(1, "delivery-timeout");
  let d = await deliver(await create(0, "confirm"), "confirm");
  await settlement(d, "confirm", "confirm", buyer, true);
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
  if (d.state === "disputed" && d.proposal === 0)
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
  await waitUntil(deliveryTimeout.deliverBy);
  await settlement(
    deliveryTimeout,
    "delivery-timeout",
    "refund_expired",
    buyer,
    false,
  );
  checkpoint("all six branches verified; awaiting final receipt batch");
  let final = false;
  for (let n = 0; n < 50; n++) {
    try {
      const statuses = (
        await c.getSignatureStatuses(
          receipts.map((r) => r.signature),
          { searchTransactionHistory: true },
        )
      ).value;
      assert.equal(statuses.length, receipts.length);
      assert.ok(
        statuses.every((status) => !status?.err),
        "A failed receipt cannot pass",
      );
      if (
        statuses.every((status) => status?.confirmationStatus === "finalized")
      ) {
        final = true;
        break;
      }
    } catch (error) {
      if (!(
        error instanceof Error &&
        /RPC_UNAVAILABLE|429|fetch failed/.test(error.message)
      ))
        throw error;
    }
    await sleep(2000);
  }
  assert.ok(final, "FINALITY_TIMEOUT");
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
  const currentOrg = await readOrganization(c, arbitrator.publicKey);
  if (currentOrg?.accepting)
    await send(
      `pause isolated test arbitrator after acceptance:${Date.now()}`,
      arbitrator,
      [await organizationAcceptingIx(arbitrator.publicKey, false, c)],
    );
  checkpoint("isolated arbitrator paused; no new intake");
}

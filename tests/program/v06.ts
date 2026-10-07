import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
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
  readDeal,
  readArbitrator,
  registerIx,
  settleIxs,
  vaultAddress,
} from "../../src/escrow/client";
import {
  readManager,
  readApplication,
  submitApplicationIx,
  approveApplicationIx,
  rejectApplicationIx,
  initializeManagerIx,
  managerActionIx,
  updatePolicyIx,
} from "../../src/escrow/governance";
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
const manager = load("fixture-signer"),
  seller = load("escrow-seller"),
  arb = Keypair.generate();
const checks: { case: string; signature?: string }[] = [];
const send = (k: Keypair, ixs: Awaited<ReturnType<typeof act>>[]) =>
  sendAndConfirmTransaction(c, new Transaction().add(...ixs), [k], {
    commitment: "confirmed",
  });
async function reject(name: string, code: number, fn: () => Promise<unknown>) {
  await assert.rejects(fn, (e) => {
    assert.match(
      e instanceof Error ? e.message : String(e),
      new RegExp(`custom program error: 0x${code.toString(16)}\\b`),
    );
    return true;
  });
  checks.push({ case: name });
}
assert.equal((await readManager(c))!.authority, manager.publicKey.toBase58());
await reject("existing manager config cannot be overwritten", 0, async () =>
  send(seller, [await initializeManagerIx(seller.publicKey, seller.publicKey)]),
);
const sol = await c.requestAirdrop(arb.publicKey, 1_000_000_000);
await c.confirmTransaction(sol, "confirmed");
await send(arb, [
  await registerIx(arb.publicKey),
  await submitApplicationIx(arb.publicKey),
]);
const first = (await readApplication(c, arb.publicKey))!;
assert.equal(first.status, "pending");
checks.push({ case: "register and application in one transaction" });
await send(arb, [await submitApplicationIx(arb.publicKey)]);
assert.equal(
  (await readApplication(c, arb.publicKey))!.submittedAt,
  first.submittedAt,
);
checks.push({ case: "pending submission idempotent" });
await reject("non-manager cannot reject", 6000, async () =>
  send(seller, [await rejectApplicationIx(seller.publicKey, arb.publicKey, 1)]),
);
await send(manager, [
  await rejectApplicationIx(manager.publicKey, arb.publicKey, 2),
]);
assert.equal((await readApplication(c, arb.publicKey))!.status, "rejected");
checks.push({ case: "manager rejection" });
await send(arb, [await submitApplicationIx(arb.publicKey)]);
assert.equal((await readApplication(c, arb.publicKey))!.status, "pending");
checks.push({ case: "wallet resubmits rejected application" });
const policy = {
  minimum: 1_000_000n,
  maximum: 10_000_000n,
  times: [300, 300, 300, 10] as [number, number, number, number],
};
await reject("non-manager cannot approve", 6000, async () =>
  send(seller, [
    await approveApplicationIx(seller.publicKey, arb.publicKey, policy),
  ]),
);
await send(manager, [
  await approveApplicationIx(manager.publicKey, arb.publicKey, policy),
]);
assert.equal((await readApplication(c, arb.publicKey))!.status, "approved");
checks.push({ case: "manager approval with immutable application actor" });
await reject("approved profile cannot reapply", 6008, async () =>
  send(arb, [await submitApplicationIx(arb.publicKey)]),
);
await reject("approval does not enable unbonded arbitrator", 6004, async () =>
  send(arb, [await organizationAcceptingIx(arb.publicKey, true, c)]),
);
const ata = await getOrCreateAssociatedTokenAccount(
  c,
  manager,
  MINT,
  arb.publicKey,
);
await mintTo(c, manager, MINT, ata.address, manager, 2_000_000);
await send(arb, [await bondIx("deposit_bond", arb.publicKey, 1_000_000n)]);
const oldConsent = await organizationAcceptingIx(arb.publicKey, true, c);
await send(manager, [
  await updatePolicyIx(manager.publicKey, arb.publicKey, {
    ...policy,
    maximum: 9_000_000n,
  }),
]);
await reject(
  "policy changed during signing invalidates stale consent",
  6001,
  () => send(arb, [oldConsent]),
);
await send(manager, [
  await updatePolicyIx(manager.publicKey, arb.publicKey, policy),
]);
await send(arb, [await organizationAcceptingIx(arb.publicKey, true, c)]);
await reject("manager cannot change policy while accepting", 6006, async () =>
  send(manager, [
    await updatePolicyIx(manager.publicKey, arb.publicKey, policy),
  ]),
);
const nonce = BigInt(Date.now()),
  address = dealAddress(seller.publicKey, nonce);
await send(seller, [
  await createOrganizationDealIx(
    seller.publicKey,
    manager.publicKey,
    arb.publicKey,
    nonce,
    1_000_000n,
    policy.times,
    "Permitted digital pack; review before automatic release",
  ),
]);
let d = await readDeal(c, address.toBase58());
assert.equal(d.resolutionPolicyVersion, 1);
checks.push({ case: "new deal snapshots late-ruling policy" });
await send(manager, [await fundIx(manager.publicKey, d)]);
await send(seller, [
  await act(
    "deliver",
    seller.publicKey,
    address,
    await digest("delivered package"),
  ),
]);
await send(manager, [
  await act(
    "dispute",
    manager.publicKey,
    address,
    await digest("missing asset"),
  ),
]);
d = await readDeal(c, address.toBase58());
for (let n = 0; n < 60; n++) {
  const clock = await c.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
  if (Number(clock!.data.readBigInt64LE(32)) >= d.arbitrateBy) break;
  await new Promise((r) => setTimeout(r, 500));
}
await send(manager, [
  await act("propose_settlement", manager.publicKey, address, Buffer.from([0])),
]);
const stale = await settleIxs(
  "accept_settlement",
  seller.publicKey,
  await readDeal(c, address.toBase58()),
  undefined,
  c,
);
const ruling = await send(
  arb,
  await settleIxs(
    "resolve",
    arb.publicKey,
    d,
    Buffer.concat([Buffer.from([1]), await digest("late ruling")]),
    c,
  ),
);
assert.equal((await readDeal(c, address.toBase58())).state, "completed");
assert.equal((await getAccount(c, vaultAddress(address))).amount, 0n);
assert.equal((await readArbitrator(c, arb.publicKey))!.locked, 0n);
checks.push({
  case: "late ruling still settles and unlocks bond",
  signature: ruling,
});
await reject("stale mutual acceptance after ruling rejected", 6002, () =>
  send(seller, stale),
);
// Two independently created deals compete for one pool: only one reservation can succeed.
const competing = [];
for (let i = 0; i < 2; i++) {
  const n = nonce + BigInt(i + 1),
    a = dealAddress(seller.publicKey, n);
  await send(seller, [
    await createOrganizationDealIx(
      seller.publicKey,
      manager.publicKey,
      arb.publicKey,
      n,
      6_000_000n,
      policy.times,
      "Capacity race fixture",
    ),
  ]);
  competing.push(await readDeal(c, a.toBase58()));
}
const funds = await Promise.allSettled(
  competing.map(async (d) =>
    send(manager, [await fundIx(manager.publicKey, d)]),
  ),
);
assert.equal(funds.filter((x) => x.status === "fulfilled").length, 1);
const refusal = funds.find(
  (x) => x.status === "rejected",
) as PromiseRejectedResult;
assert.match(
  String(refusal.reason),
  /custom program error: 0x1774\b|"Custom":6004/,
);
assert.equal((await readArbitrator(c, arb.publicKey))!.locked, 600_000n);
for (const original of competing) {
  const d = await readDeal(c, original.address);
  if (d.state === "funded") {
    assert.equal(
      (await getAccount(c, vaultAddress(new PublicKey(d.address)))).amount,
      6_000_000n,
    );
    await send(seller, [
      await act(
        "deliver",
        seller.publicKey,
        new PublicKey(d.address),
        await digest("Capacity delivery"),
      ),
    ]);
    await send(
      manager,
      await settleIxs(
        "confirm",
        manager.publicKey,
        await readDeal(c, d.address),
        undefined,
        c,
      ),
    );
  } else {
    assert.equal(
      (await getAccount(c, vaultAddress(new PublicKey(d.address)))).amount,
      0n,
    );
    await send(seller, [
      await act("cancel_deal", seller.publicKey, new PublicKey(d.address)),
    ]);
  }
}
assert.equal((await readArbitrator(c, arb.publicKey))!.locked, 0n);
checks.push({
  case: "concurrent funding cannot over-reserve bond; rejection is 6004; cleanup unlocks exactly once",
});
await send(arb, [await organizationAcceptingIx(arb.publicKey, false)]);
await send(manager, [
  await updatePolicyIx(manager.publicKey, arb.publicKey, policy),
]);
checks.push({ case: "policy update only while paused" });
await send(manager, [
  await managerActionIx("propose_manager", manager.publicKey, seller.publicKey),
]);
assert.equal((await readManager(c))!.authority, manager.publicKey.toBase58());
await reject(
  "old manager cannot accept on behalf of new manager",
  6000,
  async () =>
    send(manager, [await managerActionIx("accept_manager", manager.publicKey)]),
);
await send(seller, [await managerActionIx("accept_manager", seller.publicKey)]);
assert.equal((await readManager(c))!.authority, seller.publicKey.toBase58());
checks.push({ case: "manager transfer requires both signatures" });
await reject("previous manager has no approval bypass", 6000, async () =>
  send(manager, [
    await organizationApprovalIx(manager.publicKey, arb.publicKey, false),
  ]),
);
await send(seller, [
  await organizationApprovalIx(seller.publicKey, arb.publicKey, false),
]);
await send(arb, [await submitApplicationIx(arb.publicKey)]);
assert.equal((await readApplication(c, arb.publicKey))!.status, "pending");
checks.push({ case: "revoked wallet may request approval again" });
await send(seller, [
  await managerActionIx("propose_manager", seller.publicKey, manager.publicKey),
]);
await send(manager, [
  await managerActionIx("accept_manager", manager.publicKey),
]);
fs.mkdirSync("work/v06", { recursive: true });
fs.writeFileSync(
  "work/v06/program-checks.json",
  JSON.stringify({ network: "synthetic-local", checks }, null, 2),
);
console.log("Verified v0.6", checks.length, "cases");

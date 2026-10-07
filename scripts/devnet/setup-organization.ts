import { readManager } from "../../src/escrow/governance";
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
  approveOrganizationIx,
  bondIx,
  organizationAcceptingIx,
  readArbitrator,
  readOrganization,
  PROGRAM_ID,
  decodeDeal,
  readFeeTreasury,
} from "../../src/escrow/client";
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
const manager = load("fixture-signer"),
  arb = load("escrow-arbitrator");
assert.equal(
  manager.publicKey.toBase58(),
  "DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj",
);
const liveManager = await readManager(c);
if (!liveManager || liveManager.authority !== manager.publicKey.toBase58())
  throw Error(
    "MANAGER_WALLET_REQUIRED: use /manage with the on-chain manager; initializer has no approval bypass",
  );
const send = (k: Keypair, ixs: Awaited<ReturnType<typeof bondIx>>[]) =>
  sendAndConfirmTransaction(c, new Transaction().add(...ixs), [k], {
    commitment: "finalized",
  });
const receipt: { action: string; signature: string }[] = [];
let org = await readOrganization(c, arb.publicKey);
if (!org)
  receipt.push({
    action: "initializer approves Demo A",
    signature: await send(manager, [
      await approveOrganizationIx(
        manager.publicKey,
        arb.publicKey,
        1_000_000n,
        10_000_000n,
        [1800, 1800, 300, 1800],
      ),
    ]),
  });
const profile = await readArbitrator(c, arb.publicKey);
assert.ok(profile);
if (profile.total < 1_000_000n)
  receipt.push({
    action: "prepare minimum prepaid bond",
    signature: await send(arb, [
      await bondIx("deposit_bond", arb.publicKey, 1_000_000n - profile.total),
    ]),
  });
org = await readOrganization(c, arb.publicKey);
assert.ok(org?.approved);
if (!org.accepting)
  receipt.push({
    action: "arbitrator signs standing consent",
    signature: await send(arb, [
      await organizationAcceptingIx(arb.publicKey, true, c),
    ]),
  });
const before = JSON.parse(
  fs.readFileSync("work/organization-legacy-snapshot.json", "utf8"),
) as {
  address: string;
  workflowVersion: number;
  feeVersion: number;
  platformFee: string;
  amount: string;
}[];
const rows = await c.getMultipleAccountsInfo(
  before.map((x) => new PublicKey(x.address)),
);
for (let i = 0; i < before.length; i++) {
  assert.ok(rows[i]);
  const after = await decodeDeal(before[i].address, rows[i]!.data);
  assert.equal(after.workflowVersion, before[i].workflowVersion);
  assert.equal(after.feeVersion, before[i].feeVersion);
  assert.equal(String(after.platformFee), before[i].platformFee);
  assert.equal(String(after.amount), before[i].amount);
}
assert.equal(
  (await readFeeTreasury(c)).toBase58(),
  "CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN",
);
org = await readOrganization(c, arb.publicKey);
assert.ok(org?.accepting);
fs.writeFileSync(
  "docs/evidence/organization-rollout.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: "devnet",
      programId: PROGRAM_ID.toBase58(),
      organization: arb.publicKey.toBase58(),
      label:
        "Demo Arbitrator A (test organization, not a real corporate partner)",
      minimumDepositAtomic: String(org.minimumDeposit),
      maximumDealAtomic: String(org.maximumDeal),
      policySeconds: org.times,
      legacySnapshotCount: before.length,
      legacyFeeWorkflowUnchanged: true,
      receipt,
    },
    null,
    2,
  ),
);
console.log(
  "Approved organization ready, legacy snapshots and treasury verified",
);

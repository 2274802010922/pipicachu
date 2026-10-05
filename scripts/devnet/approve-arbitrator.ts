// Approve a user-supplied PUBLIC wallet. Never loads or signs with its private key.
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
  organizationApprovalIx,
  readArbitrator,
  readOrganization,
} from "../../src/escrow/client";
const authority = new PublicKey(process.argv[2]);
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
assert.equal(
  await c.getGenesisHash(),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const profile = await readArbitrator(c, authority);
assert.ok(
  profile,
  "The wallet owner must register its arbitrator profile first",
);
const org = await readOrganization(c, authority);
let signature: string | null = null;
if (!org || !org.approved) {
  const manager = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(fs.readFileSync("work/private/fixture-signer.json", "utf8")),
    ),
  );
  assert.equal(
    manager.publicKey.toBase58(),
    "DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj",
  );
  const ix = org
    ? await organizationApprovalIx(manager.publicKey, authority, true)
    : await approveOrganizationIx(
        manager.publicKey,
        authority,
        1_000_000n,
        10_000_000n,
        [1800, 1800, 300, 1800],
      );
  signature = await sendAndConfirmTransaction(
    c,
    new Transaction().add(ix),
    [manager],
    { commitment: "finalized" },
  );
}
const after = await readOrganization(c, authority);
assert.ok(after?.approved);
fs.writeFileSync(
  "docs/evidence/user-arbitrator-approval.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: "devnet",
      wallet: authority.toBase58(),
      source: "Public address explicitly provided by the project owner",
      signature,
      approved: after.approved,
      accepting: after.accepting,
      minimumDepositAtomic: after.minimumDeposit.toString(),
      maximumDealAtomic: after.maximumDeal.toString(),
      policySeconds: after.times,
      bondTotalAtomic: profile.total.toString(),
      scope:
        "Approval only; no user-wallet signing, deposit, acceptance or modification of existing deals.",
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    wallet: authority.toBase58(),
    signature,
    approved: after.approved,
    accepting: after.accepting,
    minimumUSDC: "1",
    maximumDealUSDC: "10",
  }),
);

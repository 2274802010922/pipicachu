// Prepares an isolated test application, never approves it or replaces the owner's arbitrator.
import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";
import { MINT, registerIx, readArbitrator } from "../../src/escrow/client";
import {
  readManager,
  readApplication,
  submitApplicationIx,
} from "../../src/escrow/governance";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
assert.equal(
  await c.getGenesisHash(),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const manager = await readManager(c);
assert.equal(
  manager?.authority,
  "CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN",
);
const load = (p: string) =>
  Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))),
  );
const funder = load("work/private/fixture-signer.json");
assert.equal(
  funder.publicKey.toBase58(),
  "DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj",
);
const keyPath = "work/private/v06-live-arbitrator.json";
if (!fs.existsSync(keyPath))
  fs.writeFileSync(keyPath, JSON.stringify([...Keypair.generate().secretKey]), {
    mode: 0o600,
  });
const probe = load(keyPath),
  receipts: { action: string; signature: string }[] = [];
const sol = await c.getBalance(probe.publicKey);
if (sol < 100_000_000)
  receipts.push({
    action: "fund isolated test wallet SOL Devnet",
    signature: await sendAndConfirmTransaction(
      c,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: funder.publicKey,
          toPubkey: probe.publicKey,
          lamports: 100_000_000 - sol,
        }),
      ),
      [funder],
      { commitment: "finalized" },
    ),
  });
const source = await getOrCreateAssociatedTokenAccount(
  c,
  funder,
  MINT,
  funder.publicKey,
);
const target = await getOrCreateAssociatedTokenAccount(
  c,
  funder,
  MINT,
  probe.publicKey,
);
const balance = (await getAccount(c, target.address)).amount;
if (balance < 1_000_000n)
  receipts.push({
    action: "fund isolated test wallet 1 USDC Devnet",
    signature: await transfer(
      c,
      funder,
      source.address,
      target.address,
      funder,
      1_000_000n - balance,
    ),
  });
const profile = await readArbitrator(c, probe.publicKey),
  application = await readApplication(c, probe.publicKey);
if (!application)
  receipts.push({
    action: "register and submit application (not approval)",
    signature: await sendAndConfirmTransaction(
      c,
      new Transaction().add(
        ...(!profile ? [await registerIx(probe.publicKey)] : []),
        await submitApplicationIx(probe.publicKey),
      ),
      [probe],
      { commitment: "finalized" },
    ),
  });
const after = await readApplication(c, probe.publicKey);
assert.ok(after);
const proof = {
  at: new Date().toISOString(),
  network: "devnet",
  testArbitrator: probe.publicKey.toBase58(),
  manager: manager!.authority,
  application: after,
  receipts,
  primaryArbitratorUnchanged: "7PpWKXsjxR6f7Zu8Se11h2nWkEyaaNVxLLd6XF9K39CG",
  approvalRequiresOwner: after.status !== "approved",
  suggestedTestPolicy: {
    minimumUSDC: "1",
    maximumUSDC: "10",
    fundingSeconds: 300,
    deliverySeconds: 60,
    reviewSeconds: 60,
    arbitrationSLASeconds: 60,
  },
  purpose:
    "Isolated v0.6 live acceptance; pause after checks, no automatic replacement in product configuration",
};
fs.writeFileSync(
  "docs/evidence/v06/test-application.json",
  JSON.stringify(proof, null, 2),
);
console.log(
  "Isolated test application:",
  probe.publicKey.toBase58(),
  after.status,
  "Owner review required; primary arbitrator unchanged.",
);

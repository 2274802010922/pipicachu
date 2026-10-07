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
  initializeManagerIx,
  readManager,
  MANAGER_CONFIG,
} from "../../src/escrow/governance";
import { PROGRAM_ID } from "../../src/escrow/constants";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
assert.equal(
  await c.getGenesisHash(),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const authority = new PublicKey("CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN");
const before = await readManager(c);
let signature: string | null = null;
if (!before) {
  const initializer = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(fs.readFileSync("work/private/fixture-signer.json", "utf8")),
    ),
  );
  assert.equal(
    initializer.publicKey.toBase58(),
    "DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj",
  );
  const tx = new Transaction().add(
    await initializeManagerIx(initializer.publicKey, authority),
  );
  signature = await sendAndConfirmTransaction(c, tx, [initializer], {
    commitment: "finalized",
  });
}
const after = await readManager(c);
assert.equal(after?.authority, authority.toBase58());
const proof = {
  at: new Date().toISOString(),
  network: "devnet",
  programId: PROGRAM_ID.toBase58(),
  managerConfig: MANAGER_CONFIG.toBase58(),
  authority: authority.toBase58(),
  signature,
  alreadyInitialized: !!before,
  verifiedFinalized: true,
  managerApplicationApprovalVerified: false,
};
fs.mkdirSync("docs/evidence/v06", { recursive: true });
fs.writeFileSync(
  "docs/evidence/v06/manager-bootstrap.json",
  JSON.stringify(proof, null, 2),
);
console.log(
  "Manager bootstrap finalized; application approval still requires the manager wallet.",
);

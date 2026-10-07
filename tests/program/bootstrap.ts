import fs from "node:fs";
import assert from "node:assert/strict";
import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { initializeManagerIx, readManager } from "../../src/escrow/governance";
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
const initializer = load("fixture-signer"),
  attacker = Keypair.generate();
assert.equal(await readManager(c), null);
await c.confirmTransaction(
  await c.requestAirdrop(attacker.publicKey, 1_000_000_000),
  "confirmed",
);
await assert.rejects(
  async () =>
    sendAndConfirmTransaction(
      c,
      new Transaction().add(
        await initializeManagerIx(attacker.publicKey, attacker.publicKey),
      ),
      [attacker],
    ),
  /custom program error: 0x1770\b/,
);
assert.equal(await readManager(c), null);
if (!process.argv.includes("--deny-only")) {
  assert.equal(
    initializer.publicKey.toBase58(),
    "DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj",
    "Successful bootstrap requires a separately owned initializer, never a committed CI key",
  );
  await c.confirmTransaction(
    await c.requestAirdrop(initializer.publicKey, 1_000_000_000),
    "confirmed",
  );
  await sendAndConfirmTransaction(
    c,
    new Transaction().add(
      await initializeManagerIx(initializer.publicKey, initializer.publicKey),
    ),
    [initializer],
  );
  assert.equal(
    (await readManager(c))!.authority,
    initializer.publicKey.toBase58(),
  );
  console.log(
    "Verified cold manager bootstrap: unauthorized rejected with 6000; initializer succeeds",
  );
} else
  console.log(
    "Cold bootstrap: unauthorized initializer rejected with exact code 6000; CI uses synthetic manager genesis for subsequent tests",
  );

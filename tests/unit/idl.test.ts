import { it, expect } from "vitest";
import { SystemProgram } from "@solana/web3.js";
import idl from "../../client/idl/escrow.json";
import {
  digest,
  PROGRAM_ID,
  instruction,
  key,
  CONFIG,
  MINT,
} from "../../src/escrow/client";
it("client discriminators match generated Rust IDL", async () => {
  expect(idl.address).toBe(PROGRAM_ID.toBase58());
  for (const ix of idl.instructions)
    expect([...(await digest(`global:${ix.name}`)).subarray(0, 8)]).toEqual(
      ix.discriminator,
    );
  for (const account of idl.accounts)
    expect([
      ...(await digest(`account:${account.name}`)).subarray(0, 8),
    ]).toEqual(account.discriminator);
});
it("instruction account order remains explicit", async () => {
  const ix = await instruction("initialize", [
    key(PROGRAM_ID, true, true),
    key(CONFIG, true),
    key(MINT),
    key(SystemProgram.programId),
  ]);
  expect(ix.keys[0].isSigner).toBe(true);
  expect(ix.keys[1].pubkey.equals(CONFIG)).toBe(true);
  expect(ix.programId.equals(PROGRAM_ID)).toBe(true);
});

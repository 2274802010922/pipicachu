import { it, expect } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as official from "@solana/spl-token";
import * as token from "../../src/escrow/token";
it("classic ATA derivation and idempotent instructions match the pinned official SDK", () => {
  for (let i = 0; i < 20; i++) {
    const owner = Keypair.generate().publicKey,
      mint = Keypair.generate().publicKey,
      payer = Keypair.generate().publicKey;
    const a = token.getAssociatedTokenAddressSync(mint, owner);
    expect(a.equals(official.getAssociatedTokenAddressSync(mint, owner))).toBe(
      true,
    );
    const ours = token.createAssociatedTokenAccountIdempotentInstruction(
        payer,
        a,
        owner,
        mint,
      ),
      theirs = official.createAssociatedTokenAccountIdempotentInstruction(
        payer,
        a,
        owner,
        mint,
      );
    expect(ours.data).toEqual(Buffer.from([1]));
    expect(ours.data).toEqual(theirs.data);
    expect(ours.keys).toEqual(theirs.keys);
    expect(ours.programId.equals(theirs.programId)).toBe(true);
  }
});
it("off-curve ownership requires explicit opt-in", () => {
  const mint = Keypair.generate().publicKey,
    owner = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      token.TOKEN_PROGRAM_ID,
    )[0];
  expect(() => token.getAssociatedTokenAddressSync(mint, owner)).toThrow(
    "TOKEN_OWNER_OFF_CURVE",
  );
  expect(token.getAssociatedTokenAddressSync(mint, owner, true)).toEqual(
    official.getAssociatedTokenAddressSync(mint, owner, true),
  );
});

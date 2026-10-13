import { it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  decodeProgramAuthority,
  UPGRADE_LOADER,
} from "../../src/escrow/program-authority";
it("only a valid ProgramData None authority means immutable", () => {
  const b = Buffer.alloc(45);
  b.writeUInt32LE(3);
  b.writeBigUInt64LE(123n, 4);
  expect(decodeProgramAuthority(UPGRADE_LOADER.toBase58(), b)).toEqual({
    state: "immutable",
    authority: null,
    deployedSlot: "123",
  });
  b[12] = 1;
  new PublicKey("DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj")
    .toBuffer()
    .copy(b, 13);
  expect(decodeProgramAuthority(UPGRADE_LOADER.toBase58(), b).state).toBe(
    "upgradeable",
  );
  for (const wrong of [b.subarray(0, 13), Buffer.alloc(45)])
    expect(() =>
      decodeProgramAuthority(UPGRADE_LOADER.toBase58(), wrong),
    ).toThrow("INVALID_ACCOUNT");
  expect(() => decodeProgramAuthority(PublicKey.default.toBase58(), b)).toThrow(
    "INVALID_ACCOUNT",
  );
  b[12] = 2;
  expect(() => decodeProgramAuthority(UPGRADE_LOADER.toBase58(), b)).toThrow(
    "INVALID_ACCOUNT",
  );
});

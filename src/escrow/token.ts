import { Buffer } from "buffer";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
// Classic SPL ATA interface only: https://www.solana-program.com/docs/associated-token-account
// Avoid importing native bigint layouts into the browser/server runtime for two ATA helpers.
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);
export function getAssociatedTokenAddressSync(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
) {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBytes()))
    throw Error("TOKEN_OWNER_OFF_CURVE");
  return PublicKey.findProgramAddressSync(
    [owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}
export function createAssociatedTokenAccountIdempotentInstruction(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
) {
  const read = (pubkey: PublicKey) => ({
    pubkey,
    isSigner: false,
    isWritable: false,
  });
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([1]),
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      read(owner),
      read(mint),
      read(SystemProgram.programId),
      read(TOKEN_PROGRAM_ID),
    ],
  });
}

import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
export function prepareDevnetWalletTransaction(tx: Transaction): Transaction {
  if (
    tx.instructions.some((ix) =>
      ix.programId.equals(ComputeBudgetProgram.programId),
    )
  )
    throw new Error("TRANSACTION_CHANGED");
  tx.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 0 }),
  );
  return tx;
}
export function assertWalletResponse(
  expectedWallet: PublicKey,
  actualWallet: PublicKey | null,
  expectedMessage: Buffer,
  signed: Transaction,
): void {
  if (!actualWallet || actualWallet.toBase58() !== expectedWallet.toBase58())
    throw new Error("WALLET_CHANGED");
  if (!Buffer.from(signed.serializeMessage()).equals(expectedMessage))
    throw new Error("TRANSACTION_CHANGED");
  if (!signed.verifySignatures()) throw new Error("INVALID_WALLET_SIGNATURE");
}

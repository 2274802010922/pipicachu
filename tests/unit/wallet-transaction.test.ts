import { it, expect } from "vitest";
import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  prepareDevnetWalletTransaction,
  assertWalletResponse,
} from "../../src/escrow/wallet-transaction";
const signer = Keypair.generate(),
  receiver = Keypair.generate();
function draft() {
  return new Transaction({
    feePayer: signer.publicKey,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
  }).add(
    SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey: receiver.publicKey,
      lamports: 1000,
    }),
  );
}
function phantomLikeSign(tx: Transaction) {
  const copy = Transaction.from(tx.serialize({ requireAllSignatures: false }));
  if (
    !copy.instructions.some((ix) =>
      ix.programId.equals(ComputeBudgetProgram.programId),
    )
  )
    copy.instructions.unshift(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
    );
  copy.partialSign(signer);
  return copy;
}
it("reproduces Phantom-like implicit priority instruction triggering strict message binding", () => {
  const tx = draft(),
    expected = tx.serializeMessage();
  expect(() =>
    assertWalletResponse(
      signer.publicKey,
      signer.publicKey,
      expected,
      phantomLikeSign(tx),
    ),
  ).toThrow("TRANSACTION_CHANGED");
});
it("explicit Devnet budget allows round-trip signing without weakening message binding", () => {
  const tx = prepareDevnetWalletTransaction(draft()),
    expected = tx.serializeMessage();
  const signed = phantomLikeSign(tx);
  expect(() =>
    assertWalletResponse(signer.publicKey, signer.publicKey, expected, signed),
  ).not.toThrow();
  expect(signed.instructions[0].data[0]).toBe(2);
  expect(signed.instructions[1].data.readBigUInt64LE(1)).toBe(0n);
});
it("still rejects account change", () => {
  const tx = prepareDevnetWalletTransaction(draft());
  expect(() =>
    assertWalletResponse(
      signer.publicKey,
      receiver.publicKey,
      tx.serializeMessage(),
      phantomLikeSign(tx),
    ),
  ).toThrow("WALLET_CHANGED");
});
it("still rejects changed payment destination", () => {
  const tx = prepareDevnetWalletTransaction(draft()),
    expected = tx.serializeMessage();
  const changed = Transaction.from(
    tx.serialize({ requireAllSignatures: false }),
  );
  changed.instructions[2].keys[1].pubkey = Keypair.generate().publicKey;
  changed.partialSign(signer);
  expect(() =>
    assertWalletResponse(signer.publicKey, signer.publicKey, expected, changed),
  ).toThrow("TRANSACTION_CHANGED");
});
it("rejects missing signature", () => {
  const tx = prepareDevnetWalletTransaction(draft());
  expect(() =>
    assertWalletResponse(
      signer.publicKey,
      signer.publicKey,
      tx.serializeMessage(),
      tx,
    ),
  ).toThrow("INVALID_WALLET_SIGNATURE");
});

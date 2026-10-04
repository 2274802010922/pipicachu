import { describe, expect, it } from "vitest";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { validateSigned } from "../../src/solana/demo";
describe("Devnet message binding", () => {
  it("accepts only the exact signed prepared message", () => {
    const signer = Keypair.generate(),
      receiver = Keypair.generate().publicKey;
    const tx = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
    });
    tx.add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: receiver,
        lamports: 1000000,
      }),
    );
    const prepared = {
      wallet: signer.publicKey.toBase58(),
      receiver: receiver.toBase58(),
      messageHash: createHash("sha256")
        .update(tx.serializeMessage())
        .digest("hex"),
      expiresAt: Date.now() + 120000,
      lastValidBlockHeight: "100",
    };
    tx.sign(signer);
    expect(
      validateSigned(tx.serialize(), prepared).signature.length,
    ).toBeGreaterThan(80);
    tx.instructions[0] = SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey: receiver,
      lamports: 2000000,
    });
    tx.sign(signer);
    expect(() => validateSigned(tx.serialize(), prepared)).toThrow(
      "TRANSACTION_CHANGED",
    );
  });
  it("rejects unsigned bytes even with a matching message hash", () => {
    const signer = Keypair.generate(),
      receiver = Keypair.generate().publicKey;
    const tx = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
    }).add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: receiver,
        lamports: 1000000,
      }),
    );
    const prepared = {
      wallet: signer.publicKey.toBase58(),
      receiver: receiver.toBase58(),
      messageHash: createHash("sha256")
        .update(tx.serializeMessage())
        .digest("hex"),
      expiresAt: Date.now() + 120000,
      lastValidBlockHeight: "100",
    };
    expect(() =>
      validateSigned(tx.serialize({ requireAllSignatures: false }), prepared),
    ).toThrow("TRANSACTION_CHANGED");
  });
});

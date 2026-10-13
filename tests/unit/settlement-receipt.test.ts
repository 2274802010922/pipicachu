import { it, expect } from "vitest";
import { PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import bs58 from "bs58";
import idl from "../../client/idl/escrow.json";
import { verifySettlementReceipt } from "../../src/escrow/settlement-receipt";
import { decodeDeal } from "../../src/escrow/codec";
import { PROGRAM_ID, MINT } from "../../src/escrow/constants";
import { vaultAddress } from "../../src/escrow/addresses";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "../../src/escrow/token";
import {
  preparationFixture,
  preparationAddress,
} from "../fixtures/preparation";
const treasury = "CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN";
async function fixture(refund = false, alias = false) {
  const d = await decodeDeal(
    preparationAddress,
    Buffer.from(
      preparationFixture(1, 2_000_000n, 0n, refund ? 5 : 4, 100_000n, 1).deal
        .data[0],
      "base64",
    ),
  );
  const recipient = alias ? d.seller : treasury;
  const legs = refund
    ? [[d.buyer, "10000000"]]
    : alias
      ? [
          [d.seller, "9900000"],
          [d.arbitrator, "100000"],
        ]
      : [
          [d.seller, "9800000"],
          [d.arbitrator, "100000"],
          [recipient, "100000"],
        ];
  const transfers = legs.map(([owner, n]) => ({
    programId: TOKEN_PROGRAM_ID,
    parsed: {
      type: "transferChecked",
      info: {
        source: vaultAddress(new PublicKey(d.address)).toBase58(),
        destination: getAssociatedTokenAddressSync(
          MINT,
          new PublicKey(owner),
          true,
        ).toBase58(),
        mint: MINT.toBase58(),
        tokenAmount: { amount: n, decimals: 6 },
      },
    },
  }));
  const tx = {
    transaction: {
      signatures: ["receipt"],
      message: {
        instructions: [
          {
            programId: PROGRAM_ID,
            accounts: [new PublicKey(d.address)],
            data: bs58.encode(
              Uint8Array.from(
                idl.instructions.find(
                  (i) => i.name === (refund ? "refund_expired" : "confirm"),
                )!.discriminator,
              ),
            ),
          },
        ],
      },
    },
    meta: {
      err: null,
      innerInstructions: [{ index: 0, instructions: transfers }],
    },
  } as unknown as ParsedTransactionWithMeta;
  return { d, recipient, tx, transfers };
}
it("verifies exact payout/refund and aggregated treasury aliases", async () => {
  for (const [refund, alias] of [
    [false, false],
    [false, true],
    [true, false],
  ]) {
    const { d, recipient, tx } = await fixture(refund, alias);
    expect(verifySettlementReceipt(d, recipient, tx)).toBe("receipt");
  }
});
it("rejects wrong amounts, mint, vault, recipient, failed and missing CPI evidence", async () => {
  for (const field of ["source", "destination", "mint", "amount"]) {
    const { d, recipient, tx, transfers } = await fixture();
    if (field === "amount")
      transfers[0].parsed.info.tokenAmount.amount = "9800001";
    else
      transfers[0].parsed.info[field as "source" | "destination" | "mint"] =
        PublicKey.default.toBase58();
    expect(verifySettlementReceipt(d, recipient, tx)).toBeNull();
  }
  const { d, recipient, tx } = await fixture();
  tx.meta!.err = { InstructionError: [0, { Custom: 6002 }] };
  expect(verifySettlementReceipt(d, recipient, tx)).toBeNull();
  tx.meta!.err = null;
  tx.meta!.innerInstructions = [];
  expect(verifySettlementReceipt(d, recipient, tx)).toBeNull();
});

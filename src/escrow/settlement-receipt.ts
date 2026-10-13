import { PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";
import idl from "../../client/idl/escrow.json";
import { PROGRAM_ID, MINT } from "./constants";
import { vaultAddress } from "./addresses";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "./token";
import { feeBreakdown } from "./fees";
import type { Deal } from "./types";
const transfer = z.object({
  source: z.string(),
  destination: z.string(),
  mint: z.string(),
  tokenAmount: z.object({
    amount: z.string().regex(/^\d+$/).max(20),
    decimals: z.literal(6),
  }),
});

/** Caller obtains this transaction with finalized commitment, never from user input. */
export function verifySettlementReceipt(
  d: Deal,
  treasury: string,
  tx: ParsedTransactionWithMeta | null,
): string | null {
  if (!tx?.meta || tx.meta.err || !["completed", "refunded"].includes(d.state))
    return null;
  try {
    const refund = d.state === "refunded",
      vault = vaultAddress(new PublicKey(d.address)).toBase58();
    const names = refund
      ? ["resolve", "refund_expired", "accept_settlement"]
      : ["confirm", "finalize", "resolve", "accept_settlement"];
    const top = tx.transaction.message.instructions;
    const indices = top.flatMap((ix, index) => {
      if (
        !ix.programId.equals(PROGRAM_ID) ||
        !("data" in ix) ||
        !ix.accounts.some((a) => a.toBase58() === d.address)
      )
        return [];
      const disc = [...bs58.decode(ix.data).subarray(0, 8)].join(",");
      return idl.instructions.some(
        (i) => names.includes(i.name) && i.discriminator.join(",") === disc,
      )
        ? [index]
        : [];
    });
    if (indices.length !== 1) return null;
    const f = feeBreakdown(d.amount, d.fee, d.platformFee, refund);
    const expected = new Map<string, bigint>();
    for (const [wallet, n] of [
      [refund ? d.buyer : d.seller, refund ? f.buyerRefund : f.sellerNet],
      [d.arbitrator, f.arbitratorFee],
      [treasury, f.platformFee],
    ] as const) {
      if (n === 0n) continue;
      const ata = getAssociatedTokenAddressSync(
        MINT,
        new PublicKey(wallet),
        true,
      ).toBase58();
      expected.set(ata, (expected.get(ata) || 0n) + n);
    }
    const received = new Map<string, bigint>();
    for (const ix of tx.meta.innerInstructions?.find(
      (i) => i.index === indices[0],
    )?.instructions || []) {
      if (!ix.programId.equals(TOKEN_PROGRAM_ID) || !("parsed" in ix)) continue;
      if (ix.parsed?.info?.source !== vault) continue;
      if (ix.parsed?.type !== "transferChecked") return null;
      const info = transfer.parse(ix.parsed.info);
      if (info.mint !== MINT.toBase58()) return null;
      received.set(
        info.destination,
        (received.get(info.destination) || 0n) +
          BigInt(info.tokenAmount.amount),
      );
    }
    if (
      received.size !== expected.size ||
      [...expected].some(([ata, n]) => received.get(ata) !== n)
    )
      return null;
    return tx.transaction.signatures[0] || null;
  } catch {
    return null;
  }
}

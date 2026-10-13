import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { u64, i64, stringBytes } from "./binary";
import type { Deal } from "./types";

/** Same byte protocol as Rust funding::terms_hash; no locale or floating point. */
export async function paymentTermsHash(d: Deal, treasury: string) {
  const bytes = Buffer.concat([
    Buffer.from("pipicachu:fund-review:v1"),
    ...[
      PROGRAM_ID.toBase58(),
      d.address,
      d.seller,
      d.buyer,
      d.arbitrator,
      d.mint,
      treasury,
    ].map((p) => new PublicKey(p).toBuffer()),
    ...[d.amount, d.fee, d.platformFee, d.bond].map(u64),
    Buffer.from([
      d.feeVersion,
      d.workflowVersion ?? 0,
      d.resolutionPolicyVersion ?? 0,
    ]),
    ...[d.fundBy, d.deliverySeconds, d.reviewSeconds, d.arbitrationSeconds].map(
      i64,
    ),
    stringBytes(d.terms),
  ]);
  return Buffer.from(
    await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
  );
}

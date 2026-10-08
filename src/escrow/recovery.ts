import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { isUnresolved, type Operation } from "./operation";
import { z } from "zod";
const recoverySchema = z.object({
  id: z.string().max(100),
  owner: z.string().max(44),
  action: z.string().max(64),
  dealAddress: z.string().max(44).optional(),
  phase: z.enum([
    "checking",
    "awaiting_signature",
    "signed",
    "submitted",
    "confirming",
    "unknown",
    "finalized",
    "failed",
    "expired",
  ]),
  createdAt: z.number().int().nonnegative().safe(),
  updatedAt: z.number().int().nonnegative().safe(),
  signature: z
    .string()
    .max(90)
    .refine((v) => {
      try {
        return bs58.decode(v).length === 64;
      } catch {
        return false;
      }
    })
    .optional(),
  messageDigest: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  blockhash: z.string().max(44).optional(),
  lastValidBlockHeight: z.number().int().nonnegative().safe().optional(),
  errorCode: z.string().max(80).optional(),
});
export const RECOVERY_KEY = "pipicachu_pending_v1";

/** Untrusted tab state is a tracking hint, never permission to send or settle. */
export function loadRecovery(
  raw: string | null,
  now = Date.now(),
): Operation | null {
  if (!raw || raw.length > 4096) return null;
  try {
    const parsed = recoverySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const op = parsed.data;
    if (
      !op.signature ||
      !op.lastValidBlockHeight ||
      !isUnresolved(op) ||
      op.createdAt > now + 60000 ||
      op.updatedAt < op.createdAt ||
      now - op.createdAt >= 86400000
    )
      return null;
    if (new PublicKey(op.owner).toBase58() !== op.owner) return null;
    if (
      op.dealAddress &&
      new PublicKey(op.dealAddress).toBase58() !== op.dealAddress
    )
      return null;
    return op;
  } catch {
    return null;
  }
}

import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import type { Deal } from "./client";
const hex = z.string().regex(/^[0-9a-f]{64}$/);
const pub = z.string().refine((s) => {
  try {
    return new PublicKey(s).toBase58() === s;
  } catch {
    return false;
  }
});
const bodySchema = z
  .object({
    domain: z.literal("pipicachu:evidence:v1"),
    version: z.literal(1),
    deal: pub,
    kind: z.enum(["delivery", "dispute", "resolution"]),
    author: pub,
    createdAt: z.string().datetime(),
    salt: hex,
    note: z
      .string()
      .min(1)
      .refine((s) => new TextEncoder().encode(s).length <= 8192),
    files: z
      .array(
        z
          .object({
            name: z.string().min(1).max(256),
            size: z
              .number()
              .int()
              .nonnegative()
              .max(50 * 1024 * 1024),
            sha256: hex,
          })
          .strict(),
      )
      .max(20)
      .refine(
        (files) =>
          files.reduce((n, f) => n + f.size, 0) <= 50 * 1024 * 1024 &&
          new Set(files.map((f) => f.name)).size === files.length,
      ),
  })
  .strict();
export const evidenceSchema = z
  .object({ body: bodySchema, commitment: hex })
  .strict();
export type EvidenceEnvelope = z.infer<typeof evidenceSchema>;
export type EvidenceKind = EvidenceEnvelope["body"]["kind"];
export const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`)
    .join(",")}}`;
};
export const digestHex = async (value: Uint8Array) =>
  toHex(await crypto.subtle.digest("SHA-256", new Uint8Array(value)));
export async function createEvidence({
  deal,
  kind,
  author,
  note,
  files = [],
}: {
  deal: string;
  kind: EvidenceKind;
  author: string;
  note: string;
  files?: File[];
}): Promise<EvidenceEnvelope> {
  if (
    files.length > 20 ||
    files.reduce((n, f) => n + f.size, 0) > 50 * 1024 * 1024
  )
    throw Error("EVIDENCE_TOO_LARGE");
  if (new Set(files.map((f) => f.name)).size !== files.length)
    throw Error("EVIDENCE_DUPLICATE_NAME");
  const manifest = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      size: f.size,
      sha256: await digestHex(new Uint8Array(await f.arrayBuffer())),
    })),
  );
  const body = bodySchema.parse({
    domain: "pipicachu:evidence:v1",
    version: 1,
    deal,
    kind,
    author,
    createdAt: new Date().toISOString(),
    salt: toHex(crypto.getRandomValues(new Uint8Array(32))),
    note,
    files: manifest,
  });
  const envelope = {
    body,
    commitment: await digestHex(new TextEncoder().encode(canonicalJson(body))),
  };
  if (new TextEncoder().encode(JSON.stringify(envelope)).length > 65536)
    throw Error("EVIDENCE_TOO_LARGE");
  return envelope;
}
export function parseEvidence(text: string) {
  if (new TextEncoder().encode(text).length > 65536)
    throw Error("EVIDENCE_TOO_LARGE");
  const result = evidenceSchema.safeParse(JSON.parse(text));
  if (!result.success) throw Error("INVALID_EVIDENCE");
  return result.data;
}
export async function verifyEvidence(envelope: EvidenceEnvelope, deal: Deal) {
  const p = evidenceSchema.parse(envelope);
  if (deal.resolutionPolicyVersion !== 1)
    return { valid: false, reason: "legacy" as const };
  if (p.body.deal !== deal.address)
    return { valid: false, reason: "deal" as const };
  const expected =
    p.body.kind === "delivery"
      ? deal.seller
      : p.body.kind === "dispute"
        ? deal.buyer
        : deal.arbitrator;
  if (p.body.author !== expected)
    return { valid: false, reason: "author" as const };
  const computed = await digestHex(
    new TextEncoder().encode(canonicalJson(p.body)),
  );
  if (computed !== p.commitment)
    return { valid: false, reason: "content" as const };
  const chain =
    p.body.kind === "delivery"
      ? deal.deliveryHash
      : p.body.kind === "dispute"
        ? deal.disputeHash
        : deal.resolutionHash;
  if (chain !== p.commitment)
    return { valid: false, reason: "commitment" as const };
  return { valid: true, reason: "matched" as const };
}

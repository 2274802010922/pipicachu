import { PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";
import { PROGRAM_ID } from "@/escrow/constants";
export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const address = z
  .string()
  .max(44)
  .refine((s) => {
    try {
      return new PublicKey(s).toBase58() === s;
    } catch {
      return false;
    }
  });
const signature = z
  .string()
  .max(90)
  .refine((s) => {
    try {
      return bs58.decode(s).length === 64;
    } catch {
      return false;
    }
  });
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const options = z
  .object({
    commitment: z.enum(["processed", "confirmed", "finalized"]).optional(),
    encoding: z.enum(["base64", "json", "jsonParsed"]).optional(),
    minContextSlot: integer.optional(),
    dataSlice: z
      .object({ offset: integer, length: integer.max(16384) })
      .optional(),
    withContext: z.boolean().optional(),
    filters: z
      .array(
        z.union([
          z.object({ dataSize: integer.max(16384) }).strict(),
          z
            .object({
              memcmp: z
                .object({
                  offset: integer.max(16384),
                  bytes: z.string().max(128),
                  encoding: z.enum(["base58", "base64"]).optional(),
                })
                .strict(),
            })
            .strict(),
        ]),
      )
      .max(4)
      .optional(),
    before: signature.optional(),
    until: signature.optional(),
    limit: integer.min(1).max(50).optional(),
    searchTransactionHistory: z.boolean().optional(),
    sigVerify: z.boolean().optional(),
    replaceRecentBlockhash: z.boolean().optional(),
    skipPreflight: z.boolean().optional(),
    preflightCommitment: z
      .enum(["processed", "confirmed", "finalized"])
      .optional(),
    maxRetries: integer.max(5).optional(),
  })
  .strict();
const encoded = z.string().max(1700);
const params: Record<string, z.ZodType> = {
  getGenesisHash: z.tuple([]),
  getAccountInfo: z.tuple([address, options.optional()]),
  getMultipleAccounts: z.tuple([
    z.array(address).min(1).max(100),
    options.optional(),
  ]),
  getProgramAccounts: z.tuple([
    z.literal(PROGRAM_ID.toBase58()),
    options.optional(),
  ]),
  getLatestBlockhash: z.tuple([options.optional()]),
  getBlockHeight: z.tuple([options.optional()]),
  getSlot: z.tuple([options.optional()]),
  getBlockTime: z.tuple([integer]),
  getBalance: z.tuple([address, options.optional()]),
  getTokenAccountBalance: z.tuple([address, options.optional()]),
  getSignatureStatuses: z.tuple([
    z.array(signature).min(1).max(100),
    options.optional(),
  ]),
  getSignaturesForAddress: z.tuple([address, options.optional()]),
  simulateTransaction: z.tuple([encoded, options.optional()]),
  sendTransaction: z.tuple([encoded, options.optional()]),
  getMinimumBalanceForRentExemption: z.tuple([
    integer.max(16384),
    options.optional(),
  ]),
};
export function validateRpcRequest(value: unknown) {
  const body = z
    .object({
      jsonrpc: z.literal("2.0"),
      id: z.union([z.string().max(100), z.number().finite(), z.null()]),
      method: z.string(),
      params: z.array(z.unknown()).max(3),
    })
    .strict()
    .parse(value);
  if (!params[body.method]) throw Error("METHOD_NOT_ALLOWED");
  if (
    body.method === "getProgramAccounts" &&
    body.params[0] !== PROGRAM_ID.toBase58()
  )
    throw Error("METHOD_NOT_ALLOWED");
  const config = params[body.method].safeParse(body.params);
  if (!config.success) throw Error("INVALID_INPUT");
  if (["sendTransaction", "simulateTransaction"].includes(body.method)) {
    const bytes = Buffer.from(body.params[0] as string, "base64");
    if (bytes.length > 1232 || bytes.toString("base64") !== body.params[0])
      throw Error("INVALID_INPUT");
    let tx: Transaction;
    try {
      tx = Transaction.from(bytes);
    } catch {
      throw Error("INVALID_INPUT");
    }
    const allowed = new Set([
      PROGRAM_ID.toBase58(),
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      "ComputeBudget111111111111111111111111111111",
    ]);
    if (
      !tx.instructions.some((ix) => ix.programId.equals(PROGRAM_ID)) ||
      tx.instructions.some((ix) => !allowed.has(ix.programId.toBase58())) ||
      (body.method === "sendTransaction" && !tx.verifySignatures())
    )
      throw Error("TRANSACTION_NOT_ALLOWED");
  }
  return body;
}
export async function cappedText(
  body: ReadableStream<Uint8Array> | null,
  maximum: number,
) {
  if (!body) throw Error("INVALID_INPUT");
  const reader = body.getReader(),
    decoder = new TextDecoder(),
    chunks: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw Error("INVALID_INPUT");
      }
      chunks.push(decoder.decode(result.value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    reader.releaseLock();
  }
}
let verifiedAt = 0;
async function rawUpstream(method: string, parameters: unknown[], id: unknown) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id,
            method,
            params: parameters,
          }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
          redirect: "error",
        },
      );
      if (!response.ok) throw Error("RPC_UNAVAILABLE");
      return JSON.parse(await cappedText(response.body, 3_000_000));
    } catch {
      if (attempt === 2) throw Error("RPC_UNAVAILABLE");
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw Error("RPC_UNAVAILABLE");
}
export async function upstream(
  method: string,
  parameters: unknown[],
  id: unknown,
) {
  if (Date.now() - verifiedAt > 60000) {
    const genesis = await rawUpstream("getGenesisHash", [], 0);
    if (genesis.result !== DEVNET_GENESIS) throw Error("RPC_NETWORK_MISMATCH");
    verifiedAt = Date.now();
  }
  return rawUpstream(method, parameters, id);
}

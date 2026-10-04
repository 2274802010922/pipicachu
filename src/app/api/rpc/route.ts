import { NextRequest, NextResponse } from "next/server";
import { Transaction, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "@/escrow/client";
export const runtime = "nodejs";
export const maxDuration = 60;
const methods = new Set([
  "getGenesisHash",
  "getAccountInfo",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getLatestBlockhash",
  "getBlockHeight",
  "getSlot",
  "getBlockTime",
  "getBalance",
  "getTokenAccountBalance",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "simulateTransaction",
  "sendTransaction",
  "getMinimumBalanceForRentExemption",
]);
const rates = new Map<string, { count: number; at: number }>();
let verifiedAt = 0;
const DEVNET = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
async function upstream(method: string, params: unknown[], id: unknown) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(
        process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
          redirect: "error",
        },
      );
      if (r.ok) {
        response = r;
        break;
      }
      if (r.status !== 429 && r.status < 500)
        throw new Error("RPC_UNAVAILABLE");
    } catch {
      if (attempt === 2) throw new Error("RPC_UNAVAILABLE");
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  if (!response) throw new Error("RPC_UNAVAILABLE");
  const text = await response.text();
  if (text.length > 3_000_000) throw new Error("RPC_RESPONSE_TOO_LARGE");
  return JSON.parse(text);
}
export async function POST(req: NextRequest) {
  let id: unknown = 1;
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      throw new Error("INVALID_ORIGIN");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    const now = Date.now();
    if (rates.size > 5000)
      for (const [k, v] of rates) if (now - v.at > 60000) rates.delete(k);
    const rate = rates.get(ip);
    if (rate && now - rate.at < 60000) {
      if (++rate.count > 120)
        return NextResponse.json(
          {
            error: { code: -32005, message: "RATE_LIMITED" },
            jsonrpc: "2.0",
            id,
          },
          { status: 429 },
        );
    } else rates.set(ip, { count: 1, at: now });
    const raw = await req.text();
    if (raw.length > 100_000) throw new Error("INVALID_INPUT");
    const body = JSON.parse(raw);
    id = body.id;
    if (!methods.has(body.method) || !Array.isArray(body.params))
      throw new Error("METHOD_NOT_ALLOWED");
    if (
      body.method === "getProgramAccounts" &&
      body.params[0] !== PROGRAM_ID.toBase58()
    )
      throw new Error("METHOD_NOT_ALLOWED");
    if (body.method === "sendTransaction") {
      const tx = Transaction.from(Buffer.from(body.params[0], "base64"));
      const allowed = new Set([
        PROGRAM_ID.toBase58(),
        "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        "ComputeBudget111111111111111111111111111111",
      ]);
      if (
        !tx.verifySignatures() ||
        !tx.instructions.some((ix) => ix.programId.equals(PROGRAM_ID)) ||
        tx.instructions.some((ix) => !allowed.has(ix.programId.toBase58()))
      )
        throw new Error("TRANSACTION_NOT_ALLOWED");
      new PublicKey(tx.feePayer!);
    }
    if (Date.now() - verifiedAt > 60000) {
      const genesis = await upstream("getGenesisHash", [], 0);
      if (genesis.result !== DEVNET) throw new Error("RPC_NETWORK_MISMATCH");
      verifiedAt = Date.now();
    }
    return NextResponse.json(await upstream(body.method, body.params, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error && /^[A-Z_]+$/.test(error.message)
        ? error.message
        : "RPC_UNAVAILABLE";
    return NextResponse.json(
      { jsonrpc: "2.0", id, error: { code: -32000, message } },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}

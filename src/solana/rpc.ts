import { parse } from "lossless-json";
import type { Network } from "../shared/types";
import { GENESIS } from "./constants";
import { AppError } from "../shared/errors";
const genesis = new Map<string, { at: number; value: string }>();
export function rpcUrl(network: Network) {
  return network === "devnet"
    ? process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com"
    : process.env.SOLANA_MAINNET_RPC_URL ||
        "https://api.mainnet-beta.solana.com";
}
export async function rpc<T = unknown>(
  network: Network,
  method: string,
  params: unknown[],
): Promise<T> {
  const url = rpcUrl(network);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok)
      throw new AppError(
        response.status === 429 ? "RPC_RATE_LIMIT" : "RPC_UNAVAILABLE",
        503,
      );
    const body = await response.text();
    if (body.length > 2_000_000)
      throw new AppError("RPC_RESPONSE_TOO_LARGE", 502);
    const result = parse(body, undefined, (text) =>
      /[.eE]/.test(text) ? Number(text) : BigInt(text),
    ) as { result?: T; error?: { code?: bigint; message?: string } };
    if (result.error)
      throw new AppError(
        result.error.code === -32015n
          ? "UNSUPPORTED_VERSION"
          : "RPC_UNAVAILABLE",
        503,
      );
    if (!("result" in result)) throw new AppError("RPC_INVALID_DATA", 502);
    return result.result as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("RPC_UNAVAILABLE", 503);
  }
}
export async function verifyNetwork(network: Network) {
  const key = rpcUrl(network),
    cached = genesis.get(key);
  if (
    cached &&
    Date.now() - cached.at < 300_000 &&
    cached.value === GENESIS[network]
  )
    return;
  const value = await rpc<string>(network, "getGenesisHash", []);
  if (value !== GENESIS[network])
    throw new AppError("RPC_NETWORK_MISMATCH", 503);
  genesis.set(key, { at: Date.now(), value });
}
export async function readTransaction(signature: string, network: Network) {
  await verifyNetwork(network);
  const [raw, statuses] = await Promise.all([
    rpc(network, "getTransaction", [
      signature,
      {
        encoding: "jsonParsed",
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    ]),
    rpc<{ value: unknown[] }>(network, "getSignatureStatuses", [
      [signature],
      { searchTransactionHistory: true },
    ]),
  ]);
  return { raw, status: statuses.value?.[0] ?? null };
}

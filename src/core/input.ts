import bs58 from "bs58";
import { AppError } from "../shared/errors";
import type { Network } from "../shared/types";
export function validBase58(value: string, bytes: number): boolean {
  if (!value || value.length > 100) return false;
  try {
    return bs58.decode(value).length === bytes;
  } catch {
    return false;
  }
}
export function transactionInput(input: string, selected: Network = "mainnet") {
  const value = input.trim();
  let signature = value;
  let network = selected;
  if (value.length > 2048) throw new AppError("INVALID_INPUT");
  if (/^https?:/i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new AppError("INVALID_LINK");
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !["explorer.solana.com", "solscan.io"].includes(url.hostname)
    )
      throw new AppError("INVALID_LINK");
    const match = url.pathname.match(/^\/tx\/([1-9A-HJ-NP-Za-km-z]+)\/?$/);
    if (!match) throw new AppError("TRANSACTION_LINK_REQUIRED");
    signature = match[1];
    const clusters = url.searchParams.getAll("cluster");
    if (clusters.length > 1 || url.searchParams.has("customUrl"))
      throw new AppError("UNSUPPORTED_NETWORK");
    const cluster = clusters[0];
    if (cluster && !["mainnet", "mainnet-beta", "devnet"].includes(cluster))
      throw new AppError("UNSUPPORTED_NETWORK");
    network = cluster === "devnet" ? "devnet" : "mainnet";
  }
  if (!validBase58(signature, 64)) throw new AppError("INVALID_SIGNATURE");
  return { signature, network };
}
export function explorerUrl(signature: string, network: Network) {
  return `https://explorer.solana.com/tx/${signature}${network === "devnet" ? "?cluster=devnet" : ""}`;
}

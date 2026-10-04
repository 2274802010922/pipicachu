import { transactionInput } from "../core/input";
import { normalizeTransaction } from "../core/normalize";
import type { Analysis, Network } from "../shared/types";
import { readTransaction } from "../solana/rpc";
import { get, offlineTest, set } from "./store";
export async function analyze(
  input: string,
  selected: Network,
): Promise<Analysis> {
  const { signature, network } = transactionInput(input, selected);
  if (offlineTest()) {
    const { fixtureBySignature } = await import("../../tests/fixtures/cases");
    const f = fixtureBySignature(signature, network);
    if (f) return normalizeTransaction(signature, network, f.raw, f.status);
  }
  const key = `analysis:${network}:${signature}`;
  const cached = await get<Analysis>(key);
  if (cached && cached.decoderVersion === "pipicachu/1") return cached;
  const { raw, status } = await readTransaction(signature, network);
  const result = normalizeTransaction(signature, network, raw, status);
  await set(key, result, result.finality === "finalized" ? 86400 : 5);
  return result;
}

import { mkdir, writeFile } from "node:fs/promises";
import { verifyNetwork, rpc, readTransaction } from "../../src/solana/rpc";
import { normalizeTransaction } from "../../src/core/normalize";
import { USDC, JUPITER } from "../../src/solana/constants";
await mkdir("docs/evidence/raw", { recursive: true });
const report: Record<string, unknown> = {
  at: new Date().toISOString(),
  sources: [],
  rpc: {},
  captures: [],
  notes: "Read-only live capture. No Mainnet signing or sending.",
};
for (const network of ["mainnet", "devnet"] as const) {
  try {
    await verifyNetwork(network);
    (report.rpc as Record<string, unknown>)[network] = "genesis-verified";
  } catch (e) {
    (report.rpc as Record<string, unknown>)[network] =
      e instanceof Error ? e.message : "error";
  }
}
for (const [id, network, address] of [
  ["jupiter", "mainnet", JUPITER],
  ["usdc", "devnet", USDC.devnet],
] as const) {
  try {
    const rows = await rpc<{ signature: string; err: unknown }[]>(
      network,
      "getSignaturesForAddress",
      [address, { limit: 8, commitment: "finalized" }],
    );
    let captured = false;
    for (const row of rows) {
      if (row.err) continue;
      const data = await readTransaction(row.signature, network);
      if (!data.raw) continue;
      const a = normalizeTransaction(
        row.signature,
        network,
        data.raw,
        data.status,
      );
      if (
        id === "usdc" &&
        !a.movements.some((m) => m.kind === "transfer" && m.asset === "USDC")
      )
        continue;
      if (id === "jupiter" && a.category !== "swap") continue;
      await writeFile(
        `docs/evidence/raw/${id}.json`,
        JSON.stringify(
          {
            signature: row.signature,
            network,
            capturedAt: new Date().toISOString(),
            ...data,
          },
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          2,
        ),
      );
      (report.captures as unknown[]).push({
        id,
        signature: row.signature,
        network,
        state: a.state,
        completeness: a.completeness,
        category: a.category,
      });
      captured = true;
      break;
    }
    if (!captured)
      (report.captures as unknown[]).push({
        id,
        state: "no-supported-example-found",
      });
  } catch (e) {
    (report.captures as unknown[]).push({
      id,
      state: "unavailable",
      error: e instanceof Error ? e.message : "error",
    });
  }
}
await writeFile(
  "docs/evidence/live-read.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));

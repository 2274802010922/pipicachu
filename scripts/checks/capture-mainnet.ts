import { mkdir, writeFile } from "node:fs/promises";
import { readTransaction } from "../../src/solana/rpc";
import { normalizeTransaction } from "../../src/core/normalize";
const candidates = [
  "5btfnBPC8txLn4QeuyiwiZ4V97iDaYKXta3KD8qrpRREJWpzuxb78RiHsa9uM895YqfJojRqiDHtqmc4hcpbqWnA",
  "3zUz4RFvtQ4ixuViLri5zm6s47VrqCyRZ9yWvDy3vGrbJvJvE1tWeu2QdepsmaoaeFNzcRSjU5ybmn11CotUU5ax",
];
await mkdir("docs/evidence/raw", { recursive: true });
for (const signature of candidates) {
  try {
    const data = await readTransaction(signature, "mainnet");
    if (!data.raw) continue;
    const a = normalizeTransaction(signature, "mainnet", data.raw, data.status);
    console.log(
      JSON.stringify({
        signature,
        category: a.category,
        state: a.state,
        assetChanges: a.balances.map((b) => ({
          asset: b.asset,
          delta: b.delta,
          mint: b.mint,
        })),
      }),
    );
    if (a.category !== "swap" || a.state !== "success") continue;
    await writeFile(
      "docs/evidence/raw/jupiter.json",
      JSON.stringify(
        {
          signature,
          network: "mainnet",
          capturedAt: new Date().toISOString(),
          ...data,
        },
        (_, v) => (typeof v === "bigint" ? v.toString() : v),
        2,
      ),
    );
    break;
  } catch (e) {
    console.log(
      JSON.stringify({ error: e instanceof Error ? e.message : "error" }),
    );
  }
}

import fs from "node:fs";
import { chromium } from "@playwright/test";
import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, MINT, decodeDeal } from "../../src/escrow/client";
import rawSamples from "../../src/escrow/samples.json";
const samples = rawSamples as {
  deals: { address: string; vi: string; en: string }[];
};
const site = process.env.SMOKE_URL || "https://pipicachu.vercel.app";
const browser = await chromium.launch(),
  context = await browser.newContext(),
  page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const health = await (await fetch(`${site}/api/health`)).json();
if (health.product !== "escrow" || health.programId !== PROGRAM_ID.toBase58())
  throw new Error("Wrong deployed product");
await page.goto(site);
await page
  .getByRole("heading", { level: 1 })
  .filter({ hasText: "Giao dịch có trung gian" })
  .waitFor();
await page.getByRole("link", { name: "Xem demo Devnet", exact: true }).click();
await page
  .getByRole("heading", { level: 1, name: "Thử trọn luồng ký quỹ" })
  .waitFor();
await page.getByRole("link", { name: /Buyer xác nhận/ }).click();
await page
  .getByRole("heading", { level: 1, name: "Đã trả người bán" })
  .waitFor({ timeout: 45000 });
await page.getByLabel("Ngôn ngữ").selectOption("en");
await page.getByRole("heading", { level: 1, name: "Paid to seller" }).waitFor();
for (const width of [375, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 960 });
  if (
    !(await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ))
  )
    throw new Error(`Overflow at ${width}`);
}
if (errors.length) throw new Error(errors.join("\n"));
const rpc = await (
  await fetch(`${site}/api/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [
        samples.deals[0].address,
        { encoding: "base64", commitment: "finalized" },
      ],
    }),
  })
).json();
if (!rpc.result?.value || rpc.result.value.owner !== PROGRAM_ID.toBase58())
  throw new Error("Production RPC failed");
const d = await decodeDeal(
  samples.deals[0].address,
  Buffer.from(rpc.result.value.data[0], "base64"),
);
if (d.state !== "completed" || d.mint !== MINT.toBase58())
  throw new Error("Wrong production state");
// Separately confirm the program exists on the public network.
const c = new Connection("https://api.devnet.solana.com");
if (!(await c.getAccountInfo(new PublicKey(health.programId)))?.executable)
  throw new Error("Program missing");
fs.writeFileSync(
  "docs/evidence/vercel-smoke.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      url: site,
      health,
      checks: [
        "landing",
        "demo link",
        "real completed deal",
        "VI/EN",
        "375/768/1024/1440 overflow",
        "RPC read finalized",
        "executable program",
      ],
      pageErrors: errors,
      walletSigning: "not covered by read-only smoke",
    },
    null,
    2,
  ),
);
await browser.close();
console.log("Vercel smoke passed", health.commit);

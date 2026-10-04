import fs from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.PIPICACHU_CAPTURE_BASE || "http://127.0.0.1:3105";
const sol = JSON.parse(
  await fs.readFile("docs/evidence/raw/sol-transfer.json", "utf8"),
);
const pub = JSON.parse(
  await fs.readFile("docs/evidence/devnet-wallets.json", "utf8"),
);
await fs.mkdir("docs/assets/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage(),
  manifest = [];
for (const locale of ["vi", "en"]) {
  await context.addCookies([
    { name: "pipicachu_locale", value: locale, url: base },
  ]);
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `docs/assets/screenshots/home-${locale}.png` });
  await page.goto(`${base}/tx/${sol.signature}?cluster=devnet`);
  await page.waitForSelector(".results", { timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".results").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `docs/assets/screenshots/result-${locale}.png`,
  });
  await page.locator(".comparison > summary").click();
  await page.locator("#recipient").fill(pub.receiver);
  await page.locator("#asset").selectOption("SOL");
  await page.locator("#amount").fill("0.002");
  await page
    .locator(
      ".comparison form button[type=submit], .comparison form button.primary",
    )
    .click();
  await page.waitForSelector(".comparison-result", { timeout: 45000 });
  await page
    .locator(".comparison-result")
    .screenshot({ path: `docs/assets/screenshots/underpaid-${locale}.png` });
  await page.goto(`${base}/demo`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `docs/assets/screenshots/demo-${locale}.png` });
  manifest.push({
    locale,
    source: "running-application",
    base,
    signature: sol.signature,
    network: "devnet",
    expectedAmount: "0.002",
    receivedAmount: "0.001",
    expectationSource: "hypothetical demo request",
    fixtureSource: "real captured Devnet transfer",
  });
}
await browser.close();
await fs.writeFile(
  "docs/assets/screenshots/manifest.json",
  JSON.stringify({ at: new Date().toISOString(), records: manifest }, null, 2),
);
console.log("Captured VI/EN UI screenshots from", base);

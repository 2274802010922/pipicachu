// Repository artwork uses HTML/CSS for exact typography; product captures are read-only.
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = process.cwd();
const artwork = path.join(root, "docs/assets/repo");
const captures = path.join(root, "docs/assets/showcase/award-2026-10-13");
const work = path.join(root, "work/readme-award");
await Promise.all(
  [artwork, captures, work].map((p) => fs.mkdir(p, { recursive: true })),
);
const asset = (p) => pathToFileURL(path.join(root, p)).href;
const browser = await chromium.launch({ headless: true });
const text = {
  vi: {
    tagline: "Ký quỹ USDC cho giao dịch cộng đồng.",
    sub: "Một link. Điều kiện rõ. Kết quả kiểm chứng.",
    seller: "NGƯỜI BÁN",
    arb: "Trọng tài",
    platform: "Hệ thống",
    steps: "TẠO LINK  →  KÝ QUỸ  →  BÀN GIAO  →  XÁC NHẬN",
    network: "SOLANA DEVNET · TOKEN THỬ NGHIỆM",
  },
  en: {
    tagline: "USDC escrow for community trades.",
    sub: "One link. Clear terms. Verifiable outcomes.",
    seller: "SELLER",
    arb: "Arbitrator",
    platform: "Platform",
    steps: "CREATE LINK  →  FUND  →  DELIVER  →  CONFIRM",
    network: "SOLANA DEVNET · TEST TOKENS",
  },
};
function hero(locale, width, height) {
  const t = text[locale];
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8">${[400, 600, 700, 800].map((w) => `<link rel="stylesheet" href="${asset(`node_modules/@fontsource/be-vietnam-pro/${w}.css`)}">`).join("")}<style>
*{box-sizing:border-box}body{margin:0;font-family:'Be Vietnam Pro',sans-serif;color:#091426;background:#f7f6f1}.hero{width:${width}px;height:${height}px;padding:46px 60px;position:relative;overflow:hidden;border:1px solid #d7dce3;border-radius:24px;background:linear-gradient(90deg,#f7f6f1 0%,#f7f6f1 66%,#eaf0ff 66%,#eaf0ff 100%)}.hero:before{content:'';height:7px;background:#b7f34d;position:absolute;top:0;left:0;right:0}.top{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}.brand{display:flex;align-items:center;gap:16px;font-size:34px;font-weight:800;letter-spacing:-1.5px}.brand img{width:64px;height:48px;object-fit:contain;border-radius:6px;image-rendering:pixelated}.tag{font-size:13px;font-weight:600;letter-spacing:1.4px;color:#2456e6}.title{position:absolute;left:60px;top:${height === 630 ? 168 : 140}px;width:760px}.eyebrow{display:flex;align-items:center;gap:10px;font-size:16px;letter-spacing:2.2px;font-weight:700;color:#2456e6}.eyebrow svg{width:24px;height:24px}h1{font-size:${width === 1200 ? 70 : 82}px;letter-spacing:-4.5px;line-height:1.07;margin:22px 0 24px;font-weight:800}h1 span{display:block}.tagline{font-size:${width === 1200 ? 21 : 25}px;margin:0 0 8px;letter-spacing:-.4px}.sub{font-size:${width === 1200 ? 17 : 20}px;color:#526174;margin:0}.side{position:absolute;right:60px;top:${height === 630 ? 173 : 148}px;width:${width === 1200 ? 330 : 375}px;background:white;border:1px solid #c5d1e6;border-radius:20px;padding:28px 30px;box-shadow:0 10px 0 #dce6fa}.label{font-size:13px;font-weight:700;letter-spacing:1.7px;color:#526174}.percent{font-size:100px;line-height:1.1;font-weight:800;letter-spacing:-6px;margin:18px 0 0}.percent span{font-size:50px;letter-spacing:-3px}.seller{font-size:14px;font-weight:700;letter-spacing:1.4px;margin:8px 0 20px}.bar{height:9px;display:flex;gap:4px}.bar i:first-child{flex:98;background:#b7f34d}.bar i{flex:1;background:#2456e6;min-width:4px;border-radius:3px}.fees{display:flex;justify-content:space-between;border-top:1px solid #e5e9ef;padding-top:20px;margin-top:20px;color:#526174;font-size:14px}.fees b{display:block;color:#091426;font-size:25px;margin-bottom:5px}.foot{position:absolute;bottom:34px;left:60px;right:60px;display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:1px;color:#526174}.steps{font-size:13px;color:#2456e6;font-weight:600;letter-spacing:.6px}.grid{position:absolute;right:16px;top:85px;width:100px;height:42px;background-image:radial-gradient(#b6c5e0 2px,transparent 2px);background-size:12px 12px}
</style></head><body><main class="hero"><div class="grid"></div><div class="top"><div class="brand"><img src="${asset("public/brand/picachu-logo.jpg")}" alt="">pipicachu</div><div class="tag">BUILT ON SOLANA</div></div><div class="title"><div class="eyebrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 3h8v5a4 4 0 0 1-8 0V3Z M8 5H4v2a4 4 0 0 0 4 4 M16 5h4v2a4 4 0 0 1-4 4 M12 12v5 M8 21h8 M9 17h6v4H9Z"/></svg>UNIHACKFEST 2026 · WINNER</div><h1><span>Best Solana</span><span>Integration</span></h1><p class="tagline">${t.tagline}</p><p class="sub">${t.sub}</p></div><aside class="side"><div class="label">USDC ESCROW</div><div class="percent">98<span>%</span></div><div class="seller">${t.seller}</div><div class="bar"><i></i><i></i><i></i></div><div class="fees"><div><b>1%</b>${t.arb}</div><div><b>1%</b>${t.platform}</div></div></aside><footer class="foot"><span class="steps">${t.steps}</span><span>${t.network}</span></footer></main></body></html>`;
}
try {
  for (const [locale, width, height, name] of [
    ["vi", 1440, 590, "hero-vi.png"],
    ["en", 1440, 590, "hero-en.png"],
    ["en", 1200, 630, "social-preview.png"],
  ]) {
    const html = path.join(work, name + ".html");
    await fs.writeFile(html, hero(locale, width, height));
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(html).href);
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".hero").screenshot({ path: path.join(artwork, name) });
    await page.close();
  }
  if (process.argv.includes("--capture")) {
    const health = await (
      await fetch("https://pipicachu.vercel.app/api/health")
    ).json();
    const manifest = {
      at: new Date().toISOString(),
      site: "https://pipicachu.vercel.app",
      commit: health.commit,
      readonly: true,
      signed: false,
      connectedWallet: false,
      deal: "5popFC7JC9YwwH6Tfrnn8zANYG86Nr953oZxvBXFnXSa",
      scope:
        "Real deployed UI. Finalized CLI Devnet fixture; not a customer transaction or Phantom test.",
      captures: [],
    };
    for (const locale of ["vi", "en"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      await context.addCookies([
        {
          name: "pipicachu_locale",
          value: locale,
          domain: "pipicachu.vercel.app",
          path: "/",
        },
      ]);
      const page = await context.newPage();
      await page.goto("https://pipicachu.vercel.app", {
        waitUntil: "networkidle",
      });
      await page.screenshot({
        path: path.join(captures, `home-${locale}.png`),
      });
      manifest.captures.push({
        file: `home-${locale}.png`,
        viewport: "1440x1000",
        source: "deployed home",
      });
      await page.goto(`https://pipicachu.vercel.app/deals/${manifest.deal}`);
      await page
        .getByText(
          locale === "vi"
            ? "Đã đối chiếu chuyển tiền finalized"
            : "Finalized transfers verified",
          { exact: true },
        )
        .waitFor({ timeout: 60000 });
      await page
        .getByText(
          locale === "vi"
            ? "Chương trình đã bỏ quyền nâng cấp"
            : "Program upgrade authority removed",
          { exact: true },
        )
        .waitFor({ timeout: 30000 });
      await page.screenshot({
        path: path.join(captures, `result-${locale}.png`),
      });
      await page
        .locator(".payment-breakdown.panel")
        .screenshot({ path: path.join(captures, `fees-${locale}.png`) });
      manifest.captures.push(
        {
          file: `result-${locale}.png`,
          viewport: "1440x1000",
          source: "completed Devnet fixture",
        },
        {
          file: `fees-${locale}.png`,
          viewport: "1440x1000",
          source: "exact allocation region, no content modifications",
        },
      );
      await page.setViewportSize({ width: 375, height: 900 });
      await page.screenshot({
        path: path.join(captures, `mobile-${locale}.png`),
      });
      manifest.captures.push({
        file: `mobile-${locale}.png`,
        viewport: "375x900",
        source: "same deployed deal",
      });
      await context.close();
    }
    await fs.writeFile(
      path.join(captures, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
  }
  await fs.writeFile(
    path.join(artwork, "manifest.json"),
    JSON.stringify(
      {
        source: "scripts/readme/build-assets.mjs",
        award: {
          name: "Best Solana Integration",
          event: "UniHackFest 2026",
          source:
            "Owner confirmation in the project conversation on 2026-10-13",
          announcementUrl: null,
        },
        brand: "Existing owner-provided pixel logo; artwork license unchanged",
        design:
          "Light terminal: cream, ink, lime and blue. Original HTML/CSS layout, no third-party award seal.",
        exports: ["hero-vi.png", "hero-en.png", "social-preview.png"],
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
console.log(
  "Repository artwork exported" +
    (process.argv.includes("--capture") ? "; live UI provenance saved" : ""),
);

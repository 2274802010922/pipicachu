import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { Keypair, Transaction, Connection } from "@solana/web3.js";
import { readDeal, PROGRAM_ID } from "../../src/escrow/client";
const roles = Object.fromEntries(
  ["seller", "buyer", "primary", "backup"].map((role) => [
    role,
    Keypair.fromSecretKey(
      Uint8Array.from(
        JSON.parse(
          fs.readFileSync(
            `work/private/${role === "buyer" ? "fixture-signer" : `escrow-${role}`}.json`,
            "utf8",
          ),
        ),
      ),
    ),
  ]),
);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const failures: string[] = [];
page.on("pageerror", (e) => failures.push(e.message));
page.on("response", async (response) => {
  if (response.url().endsWith("/api/rpc")) {
    try {
      const json = await response.json();
      if (json.error)
        console.log(
          "RPC failure",
          response.request().postDataJSON().method,
          json.error.code,
          json.error.message,
        );
    } catch {}
  }
});
fs.mkdirSync("docs/evidence/screenshots", { recursive: true });
await page.exposeFunction("__signInNode", (role: string, bytes: number[]) => {
  const signer = roles[role];
  if (!signer) throw new Error("Invalid role");
  const tx = Transaction.from(Buffer.from(bytes));
  assert.ok(tx.feePayer?.equals(signer.publicKey));
  assert.ok(tx.instructions.some((ix) => ix.programId.equals(PROGRAM_ID)));
  tx.partialSign(signer);
  return [
    ...tx.signatures.find((s) => s.publicKey.equals(signer.publicKey))!
      .signature!,
  ];
});
const addresses = Object.fromEntries(
  Object.entries(roles).map(([role, key]) => [role, key.publicKey.toBase58()]),
);
// tsx keeps function names via this helper when serializing init callbacks.
await page.addInitScript({ content: "window.__name = (fn) => fn;" });
await page.addInitScript(
  ({ addresses }) => {
    const w = window as unknown as Record<string, unknown>;
    let role = "seller";
    let reject = false;
    const listeners: Record<string, ((p: unknown) => void)[]> = {};
    const publicKey = () => ({
      toBase58: () => addresses[role],
      equals: (other: { toBase58: () => string }) =>
        addresses[role] === other.toBase58(),
    });
    const provider = {
      get publicKey() {
        return publicKey();
      },
      connect: async () => ({ publicKey: publicKey() }),
      disconnect: async () => {
        listeners.disconnect?.forEach((cb) => cb(null));
      },
      on: (e: string, cb: (p: unknown) => void) => {
        (listeners[e] ??= []).push(cb);
      },
      removeListener: (e: string, cb: (p: unknown) => void) => {
        listeners[e] = listeners[e]?.filter((f) => f !== cb) || [];
      },
      signTransaction: async (tx: {
        serialize: (o: unknown) => Uint8Array;
        feePayer: unknown;
        addSignature: (p: unknown, s: Uint8Array) => void;
      }) => {
        if (reject) {
          reject = false;
          throw new Error("User rejected");
        }
        const sig = await (
          w.__signInNode as (r: string, b: number[]) => Promise<number[]>
        )(role, [
          ...tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          }),
        ]);
        tx.addSignature(tx.feePayer, Uint8Array.from(sig));
        return tx;
      },
    };
    w.phantom = { solana: provider };
    w.__switchRole = (value: string) => {
      role = value;
      listeners.accountChanged?.forEach((cb) => cb(publicKey()));
    };
    w.__rejectNext = () => {
      reject = true;
    };
  },
  { addresses },
);
const url = process.env.BROWSER_BASE_URL || "http://127.0.0.1:3106";
await page.goto(`${url}/deals/new`);
await page.getByRole("button", { name: "Kết nối ví" }).click();
console.log(
  "Wallet control",
  await page.locator(".wallet-control").innerText(),
);
await page.getByRole("button", { name: /Ngắt/ }).waitFor();
await page.getByLabel("Ví người mua", { exact: true }).fill(addresses.buyer);
await page
  .getByLabel("Ví trọng tài chính", { exact: true })
  .fill(addresses.primary);
await page
  .getByLabel("Ví trọng tài dự phòng", { exact: true })
  .fill(addresses.backup);
await page.getByLabel("Số tiền USDC Devnet").fill("1");
await page
  .getByLabel("Điều khoản công khai")
  .fill(
    "Devnet browser test. Deliver a permitted test digital file through the agreed channel; no personal credentials. Buyer pays 1 USDC; seller payout 0.99; intermediary fee 0.01.",
  );
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "Tạo và ký bằng ví" }).click();
await page
  .getByRole("link", { name: "Mở deal vừa tạo để sao chép link" })
  .waitFor({ timeout: 120000 });
await page
  .getByRole("link", { name: "Mở deal vừa tạo để sao chép link" })
  .click();
await page
  .getByRole("heading", { level: 1 })
  .filter({ hasText: "Chờ chấp thuận" })
  .waitFor();
const id = new URL(page.url()).pathname.split("/").at(-1)!;
console.log("Created deal", id);
fs.writeFileSync("work/escrow/browser-deal.json", JSON.stringify({ id }));
async function role(value: string) {
  await page.evaluate(
    (v) =>
      (window as unknown as { __switchRole: (r: string) => void }).__switchRole(
        v,
      ),
    value,
  );
  await page
    .getByRole("button", { name: "Tải lại trạng thái", exact: true })
    .click();
}
async function action(name: string) {
  const checkbox = page.getByRole("checkbox");
  await checkbox.check();
  await page.getByRole("button", { name, exact: true }).click();
  try {
    await page
      .locator("main")
      .getByText("Giao dịch đã hoàn tất trên Devnet.", { exact: false })
      .waitFor({ timeout: 120000 });
  } catch (error) {
    console.log(
      "Action failed",
      name,
      await page.locator("main").innerText(),
      failures,
    );
    await page.screenshot({
      path: "work/escrow/browser-failure.png",
      fullPage: true,
    });
    throw error;
  }
  console.log("Browser action finalized", name);
  await page
    .getByRole("button", { name: "Tải lại trạng thái", exact: true })
    .click();
}
await role("primary");
await action("Chấp thuận làm trọng tài");
await role("backup");
await action("Chấp thuận làm trọng tài");
await role("buyer");
await action("Nạp tiền vào ký quỹ");
await page.screenshot({
  path: "docs/evidence/screenshots/funded-vi.png",
  fullPage: true,
});
await role("seller");
await page
  .getByLabel("Ghi chú/bằng chứng đã trao đổi ngoài ứng dụng")
  .fill("Shared test file receipt through agreed channel.");
await action("Đánh dấu đã bàn giao");
await role("buyer");
await page.getByRole("checkbox").check();
await page.evaluate(() =>
  (window as unknown as { __rejectNext: () => void }).__rejectNext(),
);
await page
  .getByRole("button", {
    name: "Xác nhận nhận hàng và trả seller",
    exact: true,
  })
  .click();
await page
  .locator("main")
  .getByRole("alert")
  .filter({ hasText: "Bạn đã hủy ký" })
  .waitFor({ timeout: 60000 });
const c = new Connection("https://api.devnet.solana.com");
assert.equal((await readDeal(c, id)).state, "delivered");
await action("Xác nhận nhận hàng và trả seller");
await page
  .getByRole("heading", { level: 1, name: "Đã trả người bán" })
  .waitFor({ timeout: 30000 });
assert.equal((await readDeal(c, id)).state, "completed");
await page.screenshot({
  path: "docs/evidence/screenshots/completed-vi.png",
  fullPage: true,
});
assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
await page.getByLabel("Ngôn ngữ").selectOption("en");
await page.screenshot({
  path: "docs/evidence/screenshots/completed-en.png",
  fullPage: true,
});
assert.equal(await page.evaluate(() => localStorage.length), 0);
assert.deepEqual(failures, []);
fs.writeFileSync(
  "docs/evidence/browser-wallet-cycle.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: "devnet",
      baseURL: url,
      deal: id,
      roles: addresses,
      signer:
        "Injected test provider; private keys stay in Node, not browser. NOT actual Phantom extension.",
      confirmed: [
        "create",
        "accept primary",
        "accept backup",
        "fund",
        "deliver",
        "reject signature without state change",
        "confirm",
        "read completed",
        "axe result page",
        "VI/EN",
        "no localStorage history",
      ],
      pageErrors: failures,
    },
    null,
    2,
  ),
);
await browser.close();
console.log("Verified browser UI → signed Devnet escrow", id);

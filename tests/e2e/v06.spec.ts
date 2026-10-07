import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";

import {
  parties,
  arbAccountAddress,
  preparationFixture,
} from "../fixtures/preparation";
const PROGRAM_ID = new PublicKey(
  JSON.parse(readFileSync("src/escrow/deployment.json", "utf8")).programId,
);
const MANAGER_CONFIG = PublicKey.findProgramAddressSync(
  [Buffer.from("manager_v1")],
  PROGRAM_ID,
)[0];
const applicationAddress = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("application_v1"), authority.toBuffer()],
    PROGRAM_ID,
  )[0];
const manager = parties.buyer;
const disc = (name: string) =>
  createHash("sha256").update(`account:${name}`).digest().subarray(0, 8);
const account = (data: Buffer) => ({
  data: [data.toString("base64"), "base64"],
  owner: PROGRAM_ID.toBase58(),
  executable: false,
  lamports: 10_000_000,
  rentEpoch: 0,
});
const managerAccount = account(
  Buffer.concat([
    disc("ManagerConfig"),
    new PublicKey(manager).toBuffer(),
    Buffer.alloc(32),
    Buffer.from([1]),
  ]),
);
const application = account(
  Buffer.concat([
    disc("ArbitratorApplication"),
    new PublicKey(parties.arb).toBuffer(),
    Buffer.from([0]),
    Buffer.alloc(16),
    Buffer.from([
      0,
      PublicKey.findProgramAddressSync(
        [Buffer.from("application_v1"), new PublicKey(parties.arb).toBuffer()],
        PROGRAM_ID,
      )[1],
    ]),
  ]),
);
for (const width of [375, 768, 1024, 1440]) {
  test(`pending arbitrator and manager authority remain clear at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.addInitScript((address) => {
      (window as unknown as { phantom: unknown }).phantom = {
        solana: {
          publicKey: { toBase58: () => address },
          connect: async () => ({ publicKey: { toBase58: () => address } }),
          on: () => {},
          removeListener: () => {},
        },
      };
    }, parties.arb);
    await page.route("**/api/rpc", async (route) => {
      const b = route.request().postDataJSON();
      let result: unknown = [];
      if (b.method === "getAccountInfo")
        result = {
          context: { slot: 1 },
          value:
            b.params[0] === MANAGER_CONFIG.toBase58()
              ? managerAccount
              : b.params[0] === arbAccountAddress
                ? preparationFixture().arb
                : b.params[0] ===
                    applicationAddress(new PublicKey(parties.arb)).toBase58()
                  ? application
                  : null,
        };
      if (b.method === "getTokenAccountBalance")
        result = {
          context: { slot: 1 },
          value: {
            amount: "2000000",
            decimals: 6,
            uiAmount: 2,
            uiAmountString: "2",
          },
        };
      await route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
    });
    await page.goto("/admin");
    await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
    await expect(
      page.getByText("Đã gửi yêu cầu. Chờ quản trị duyệt; chưa cần nạp cọc."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nạp cọc", exact: true }),
    ).toHaveCount(0);
    if (width === 375 || width === 1440)
      await page
        .locator(".panel")
        .first()
        .screenshot({
          path: `work/v06/screenshots/arbitrator-registration-vi-${width}.png`,
        });
    await page.getByLabel("Ngôn ngữ").selectOption("en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Arbitrator workspace",
    );
    if (width === 375 || width === 1440)
      await page.screenshot({
        path: `work/v06/screenshots/arbitrator-pending-${width}.png`,
        fullPage: true,
      });
    if (width === 375 || width === 1440)
      await page
        .locator(".panel")
        .first()
        .screenshot({
          path: `work/v06/screenshots/arbitrator-registration-${width}.png`,
        });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (width === 375 || width === 1440)
      await page.screenshot({
        path: `work/v06/screenshots/arbitrator-pending-${width}.png`,
        fullPage: true,
      });
    await page.goto("/manage");
    await expect(
      page.getByText("Connect the manager wallet to review applications."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
test("nonce CSP is report-only and reports do not persist private content", async ({
  request,
}) => {
  const r = await request.get("/");
  const policy = r.headers()["content-security-policy-report-only"];
  expect(policy).toContain("nonce-");
  expect(policy).toContain("object-src 'none'");
  expect(r.headers()["content-security-policy"]).toBeUndefined();
  const next = await request.get("/");
  expect(next.headers()["content-security-policy-report-only"]).not.toBe(
    policy,
  );
  const report = await request.post("/api/csp-report", {
    data: { "csp-report": { "document-uri": "https://example.test/private" } },
  });
  expect(report.status()).toBe(204);
});

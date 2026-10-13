import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  preparationAddress,
  preparationFixture,
  snapshotBatchFixture,
  fixtureTime,
  parties,
  feeConfigFixture,
} from "../fixtures/preparation";
import { PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";
const PROGRAM_ID = new PublicKey(
  JSON.parse(readFileSync("src/escrow/deployment.json", "utf8")).programId,
);
const FEE_CONFIG = PublicKey.findProgramAddressSync(
  [Buffer.from("platform_fee_v1")],
  PROGRAM_ID,
)[0];
for (const width of [375, 768, 1024, 1440])
  test(`fee review is readable and stale terms cannot reach wallet at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript((owner) => {
      (window as unknown as { walletSigns: number }).walletSigns = 0;
      (window as unknown as { phantom: unknown }).phantom = {
        solana: {
          publicKey: { toBase58: () => owner },
          connect: async () => ({ publicKey: { toBase58: () => owner } }),
          on: () => {},
          removeListener: () => {},
          signTransaction: async () => {
            (window as unknown as { walletSigns: number }).walletSigns++;
            throw { code: 4001 };
          },
        },
      };
    }, parties.buyer);
    let changed = false;
    const fixture = () =>
      preparationFixture(
        1,
        2_000_000n,
        0n,
        0,
        changed ? 100_001n : 100_000n,
        1,
      );
    await page.route("**/api/program-status", (route) =>
      route.fulfill({
        json: {
          state: "upgradeable",
          authority: parties.buyer,
          programId: PROGRAM_ID.toBase58(),
          programData: PROGRAM_ID.toBase58(),
          checkedAt: new Date().toISOString(),
        },
      }),
    );
    await page.route("**/api/rpc", (route) => {
      const b = route.request().postDataJSON();
      const result =
        b.method === "getMultipleAccounts"
          ? snapshotBatchFixture(fixture(), fixtureTime, true)
          : b.method === "getAccountInfo"
            ? {
                context: { slot: 1 },
                value:
                  b.params[0] === FEE_CONFIG.toBase58()
                    ? feeConfigFixture()
                    : fixture().deal,
              }
            : [];
      return route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
    });
    await page.goto(`/deals/${preparationAddress}`);
    await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
    const allocation = page.getByRole("region", {
      name: "Phân bổ tiền on-chain",
    });
    await expect(allocation).toContainText("9.8");
    await expect(allocation).toContainText("98% / 1% / 1%");
    await expect(allocation).toContainText(
      "CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN",
    );
    await expect(allocation).toContainText("còn quyền nâng cấp");
    await page
      .getByRole("button", { name: "Nạp 10 USDC", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("9.8");
    await expect(
      dialog.getByRole("cell", { name: "0.1", exact: true }),
    ).toHaveCount(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath("review-fees.png"),
      fullPage: true,
    });
    changed = true;
    await dialog
      .getByRole("button", { name: "Xác nhận và ký", exact: true })
      .click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Điều kiện hoặc phí khác bản bạn đã xem",
    );
    expect(
      await page.evaluate(
        () => (window as unknown as { walletSigns: number }).walletSigns,
      ),
    ).toBe(0);
    await page.getByLabel("Ngôn ngữ").selectOption("en");
    await expect(
      page.getByRole("region", { name: "On-chain payment allocation" }),
    ).toContainText("program remains upgradeable");
  });
for (const state of ["immutable", "unknown"] as const)
  test(`refund fees and ${state} authority are stated accurately`, async ({
    page,
  }) => {
    const f = preparationFixture(1, 2_000_000n, 0n, 5, 100_000n, 1);
    await page.route("**/api/program-status", (r) =>
      r.fulfill({
        status: state === "unknown" ? 503 : 200,
        json: {
          state,
          authority: null,
          programId: PROGRAM_ID.toBase58(),
          programData: PROGRAM_ID.toBase58(),
          checkedAt: new Date().toISOString(),
        },
      }),
    );
    await page.route("**/api/rpc", (r) => {
      const b = r.request().postDataJSON();
      return r.fulfill({
        json: {
          jsonrpc: "2.0",
          id: b.id,
          result:
            b.method === "getMultipleAccounts"
              ? snapshotBatchFixture(f, fixtureTime, true)
              : b.method === "getAccountInfo"
                ? { context: { slot: 1 }, value: f.deal }
                : [],
        },
      });
    });
    await page.goto(`/deals/${preparationAddress}`);
    const allocation = page.getByRole("region", {
      name: "Phân bổ tiền on-chain",
    });
    await expect(allocation).toContainText("Hoàn 100% · phí dịch vụ 0");
    await expect(allocation).toContainText(
      state === "immutable"
        ? "Chương trình đã bỏ quyền nâng cấp"
        : "Chưa xác minh được quyền nâng cấp",
    );
    await page.getByText("Điều kiện giao dịch", { exact: true }).click();
    await expect(
      page.locator("details").filter({
        has: page.getByText("Điều kiện giao dịch", { exact: true }),
      }),
    ).toContainText("USDC (0%)");
    await expect(
      page.getByText("Đã đối chiếu chuyển tiền finalized", { exact: true }),
    ).toHaveCount(0);
  });

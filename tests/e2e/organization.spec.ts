import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  parties,
  fixtureTime,
  preparationAddress,
  arbAccountAddress,
  preparationFixture,
  snapshotBatchFixture,
  organizationAccountAddress,
  organizationFixture,
} from "../fixtures/preparation";
for (const width of [375, 768, 1024, 1440])
  test(`approved prepaid organization flow has four steps at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript((address) => {
      (window as unknown as { phantom: unknown }).phantom = {
        solana: {
          publicKey: { toBase58: () => address },
          connect: async () => ({ publicKey: { toBase58: () => address } }),
          on: () => {},
          removeListener: () => {},
        },
      };
    }, parties.buyer);
    let state = 0;
    await page.route("**/api/rpc", async (route) => {
      const b = route.request().postDataJSON();
      const f = preparationFixture(1, 2_000_000n, 0n, state, 100_000n, 1);
      if (b.method === "getMultipleAccounts") {
        await route.fulfill({
          json: {
            jsonrpc: "2.0",
            id: b.id,
            result: snapshotBatchFixture(f, fixtureTime, true),
          },
        });
        return;
      }
      let result: unknown = [];
      if (b.method === "getAccountInfo" && b.params[0] === preparationAddress)
        expect(b.params[1].commitment).toBe("finalized");
      if (b.method === "getAccountInfo")
        result = {
          context: { slot: 1 },
          value:
            b.params[0] === preparationAddress
              ? f.deal
              : b.params[0] === arbAccountAddress
                ? f.arb
                : b.params[0] === organizationAccountAddress
                  ? organizationFixture()
                  : null,
        };
      if (b.method === "getSlot") result = 1;
      if (b.method === "getBlockTime") result = fixtureTime;
      await route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
    });
    await page.goto(`/deals/${preparationAddress}`);
    await expect(
      page.getByRole("button", { name: "Kết nối ví", exact: true }),
    ).toHaveClass(/primary/);
    await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Nạp 10 USDC", exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.locator(".progress-desktop li")).toHaveCount(4);
    await expect(page.locator(".role-banner")).toContainText("Người mua");
    state = 2;
    await page.getByRole("button", { name: "Tải lại trạng thái" }).click();
    await expect(
      page.getByRole("button", { name: "Đã nhận hàng", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Ghi chú bàn giao / khiếu nại")).toHaveCount(
      0,
    );
    await page
      .getByRole("button", { name: "Đã nhận hàng", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("9.8 USDC");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page
      .getByRole("button", { name: "Mở tranh chấp", exact: true })
      .click();
    await expect(
      page.getByLabel("Lý do khiếu nại", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  preparationAddress,
  arbAccountAddress,
  parties,
  fixtureTime,
  preparationFixture,
} from "../fixtures/preparation";
for (const width of [375, 1440])
  test(`arbitrator bond is step two and buyer cannot fund insufficient bond at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1100 });
    const fixtures = preparationFixture(1);
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
    await page.route("**/api/rpc", async (route) => {
      const b = route.request().postDataJSON();
      let result: unknown;
      if (b.method === "getAccountInfo")
        result = {
          context: { slot: 1 },
          value:
            b.params[0] === preparationAddress
              ? fixtures.deal
              : b.params[0] === arbAccountAddress
                ? fixtures.arb
                : null,
        };
      else if (b.method === "getSlot") result = 1;
      else if (b.method === "getBlockTime") result = fixtureTime;
      else if (b.method === "getSignaturesForAddress") result = [];
      await route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
    });
    await page.goto(`/deals/${preparationAddress}`);
    await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
    const panel = page.getByRole("region", {
      name: "Trọng tài nạp cọc và nhận deal",
    });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("1 USDC");
    await expect(panel).toContainText("0.5 USDC");
    await expect(panel).toContainText("Chưa đủ cọc");
    await expect(
      page.getByRole("button", { name: "Nạp tiền vào ký quỹ", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".deal-flow li").nth(1)).toContainText(
      "Trọng tài chuẩn bị cọc",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel("Ngôn ngữ").selectOption("en");
    await expect(
      page.getByRole("region", {
        name: "Arbitrator deposits bond and accepts the deal",
      }),
    ).toContainText("Insufficient bond");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
test("arbitrator can prepare missing bond directly from deal link", async ({
  page,
}) => {
  const fixtures = preparationFixture();
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
    const result =
      b.method === "getAccountInfo"
        ? {
            context: { slot: 1 },
            value:
              b.params[0] === preparationAddress ? fixtures.deal : fixtures.arb,
          }
        : b.method === "getSlot"
          ? 1
          : b.method === "getBlockTime"
            ? fixtureTime
            : [];
    await route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
  });
  await page.goto(`/deals/${preparationAddress}`);
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  const panel = page.getByRole("region", {
    name: "Trọng tài nạp cọc và nhận deal",
  });
  const button = panel.getByRole("button", {
    name: "Nạp 0.5 USDC cọc và nhận deal",
    exact: true,
  });
  await expect(button).toBeDisabled();
  await panel.getByRole("checkbox").check();
  await expect(button).toBeEnabled();
});

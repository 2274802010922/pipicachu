import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  parties,
  fixtureTime,
  preparationAddress,
  arbAccountAddress,
  preparationFixture,
} from "../fixtures/preparation";
for (const width of [375, 768, 1024, 1440])
  test(`current step glows and review keeps dispute visible at ${width}`, async ({
    page,
  }) => {
    const fixtures = preparationFixture(1, 2_000_000n, 0n, 2);
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
    await expect(
      page.getByRole("button", { name: "Đã nhận hàng", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mở tranh chấp", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Đã nhận hàng", exact: true }),
    ).toHaveClass(/action-current/);
    if (width <= 768) {
      await expect(page.locator(".progress-mobile>summary")).toContainText(
        "Bước 5/5",
      );
      await page.locator(".progress-mobile>summary").click();
      await expect(
        page.locator('.progress-mobile [aria-current="step"]'),
      ).toContainText("Kiểm tra");
    } else {
      await expect(
        page.locator('.progress-desktop [aria-current="step"]'),
      ).toContainText("Kiểm tra");
    }
    await expect(
      page.getByText("Synthetic browser fixture: 10 USDC deal, 1 USDC bond.", {
        exact: true,
      }),
    ).not.toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByLabel("Ngôn ngữ").selectOption("en");
    await expect(
      page.getByRole("button", { name: "Confirm receipt", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open dispute", exact: true }),
    ).toBeVisible();
  });
test("keeper wait has no misleading glowing payment button", async ({
  page,
}) => {
  const fixtures = preparationFixture(1, 2_000_000n, 0n, 2);
  await page.route("**/api/rpc", async (route) => {
    const b = route.request().postDataJSON();
    const result =
      b.method === "getAccountInfo"
        ? { context: { slot: 1 }, value: fixtures.deal }
        : b.method === "getSlot"
          ? 1
          : b.method === "getBlockTime"
            ? fixtureTime + 601
            : [];
    await route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
  });
  await page.goto(`/deals/${preparationAddress}`);
  await expect(
    page.getByRole("heading", { name: "Đang chờ tự trả tiền", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText("Không cần ký thêm", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main .action-current")).toHaveCount(0);
});

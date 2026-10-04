import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("create explains missing arbitrator before asking the wallet to sign", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const address = "BbftECvBKTHMm6t3Sejyz7E9HmBmcRp7NvEYnAnzb7F3";
    (window as unknown as { phantom: unknown }).phantom = {
      solana: {
        publicKey: { toBase58: () => address },
        connect: async () => ({ publicKey: { toBase58: () => address } }),
        on: () => {},
        removeListener: () => {},
        signTransaction: async () => {
          throw new Error("Wallet must not be asked to sign");
        },
      },
    };
  });
  let broadcasts = 0;
  await page.route("**/api/rpc", async (route) => {
    const body = route.request().postDataJSON();
    if (body.method === "sendTransaction") broadcasts++;
    await route.fulfill({
      json: {
        jsonrpc: "2.0",
        id: body.id,
        result: { context: { slot: 1 }, value: null },
      },
    });
  });
  await page.goto("/deals/new");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  await page
    .getByLabel("Ví người mua", { exact: true })
    .fill("DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj");
  await page
    .getByLabel("Ví trọng tài", { exact: true })
    .fill("Ht5k38ysGyt2VKoddxbACCeLoVngQFojNeXzACGz9dEP");
  await page
    .getByLabel("Điều khoản công khai", { exact: true })
    .fill("Test unregistered arbitrator");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Tạo và ký bằng ví", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Ví trọng tài chưa đăng ký",
  );
  expect(broadcasts).toBe(0);
});
for (const width of [375, 768, 1024, 1440])
  test(`VI/EN navigation and forms at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Giao dịch",
    );
    await expect(
      page.getByRole("button", { name: "Kết nối ví" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Tạo giao dịch", exact: true })
      .click();
    await expect(
      page.getByLabel("Ví trọng tài", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Ví trọng tài dự phòng", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByLabel("Ví người mua", { exact: true })
      .fill("long-address-to-test-retention");
    await page.getByLabel("Ngôn ngữ").selectOption("en");
    await expect(page.getByLabel("Buyer wallet", { exact: true })).toHaveValue(
      "long-address-to-test-retention",
    );
    await expect(
      page.getByRole("button", { name: "Create and sign" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "Guide", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "How does escrow work?",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
test("missing wallet gives local guidance, not a fake login", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kết nối ví" }).click();
  await expect(
    page.locator(".wallet-control").getByRole("alert"),
  ).toContainText("Phantom");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test("invalid deal and unsupported old API do not report success", async ({
  page,
  request,
}) => {
  await page.goto("/deals/not-a-public-key");
  await expect(
    page.getByRole("heading", { name: "Chưa mở được deal" }),
  ).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  expect((await request.post("/api/analysis", { data: {} })).status()).toBe(
    404,
  );
  const rpc = await request.post("/api/rpc", {
    data: { jsonrpc: "2.0", id: 1, method: "requestAirdrop", params: [] },
  });
  expect((await rpc.json()).error.message).toBe("METHOD_NOT_ALLOWED");
});
test("health describes limits without secrets", async ({ request }) => {
  const r = await request.get("/api/health");
  const b = await r.json();
  expect(b.product).toBe("escrow");
  expect(b.mainnetWrites).toBe(false);
  expect(b.subjectiveSlashing).toBe(false);
  expect(b.serverCustody).toBe(false);
  expect(b.arbitratorCount).toBe(1);
  expect(b.schemaVersion).toBe(3);
  expect(JSON.stringify(b)).not.toMatch(/api[_-]?key|privateKey|secretKey/i);
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [375, 768, 1024, 1440])
  test(`header aligned controls and wallet survives resizing at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.addInitScript(() => {
      const p = {
        toBase58: () => "CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN",
      };
      (window as unknown as { phantom: unknown }).phantom = {
        solana: {
          publicKey: p,
          connect: async () => ({ publicKey: p }),
          on: () => {},
          removeListener: () => {},
        },
      };
    });
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Trọng tài", exact: true }),
    ).toBeVisible();
    const controls = [
      page.getByRole("link", { name: "Trọng tài", exact: true }),
      page.getByLabel("Ngôn ngữ"),
      page.getByRole("button", { name: "Kết nối ví", exact: true }),
    ];
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box!.height).toBe(44);
    }
    await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
    await expect(page.locator(".wallet-control button")).toContainText("CXjK");
    await page.setViewportSize({
      width: width < 768 ? 1024 : 375,
      height: 960,
    });
    await expect(page.locator(".wallet-control button")).toContainText("CXjK");
    await page.setViewportSize({ width, height: 960 });
    await page.getByLabel("Ngôn ngữ").selectOption("en");
    await expect(
      page.getByRole("link", { name: "Arbitrator", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
test("mobile menu traps focus, closes with Escape and on navigation or desktop resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 960 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Mở menu", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đóng menu", exact: true }),
  ).toBeFocused();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((e) => e.contains(document.activeElement)),
    ).toBe(true);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("link", { name: "Hướng dẫn", exact: true }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await page.setViewportSize({ width: 1024, height: 960 });
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "Trọng tài", exact: true }),
  ).toBeFocused();
});

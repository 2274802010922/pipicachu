import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signature, recipient } from "../fixtures/cases";
test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ "x-pipicachu-test-client": info.testId });
});
for (const width of [375, 768, 1024, 1440]) {
  test(`VI/EN layout and a11y ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/guide", "/privacy", "/demo"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const violations = (
        await new AxeBuilder({ page }).analyze()
      ).violations.filter((v) =>
        ["critical", "serious"].includes(v.impact || ""),
      );
      expect(violations).toEqual([]);
      await page
        .getByLabel(
          route === "/" ||
            (await page.locator("html").getAttribute("lang")) === "vi"
            ? "Ngôn ngữ"
            : "Language",
          { exact: true },
        )
        .selectOption("en");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByLabel("Language", { exact: true }).selectOption("vi");
    }
  });
}
test("valid transfer comparison and share privacy", async ({ page }) => {
  await page.goto(`/tx/${signature(1)}?cluster=devnet`);
  await expect(
    page.getByText("Đã hoàn tất trên mạng", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Đối chiếu khoản tiền tôi đang chờ nhận", { exact: true })
    .click();
  await page
    .getByLabel("Địa chỉ ví nhận mong đợi", { exact: true })
    .fill(recipient);
  await page.getByLabel("Token", { exact: true }).selectOption("SOL");
  await page.getByLabel("Số tiền mong đợi", { exact: true }).fill("0,001");
  await page.getByRole("button", { name: "Đối chiếu", exact: true }).click();
  await expect(
    page.getByText("Khớp thông tin bạn nhập và đã hoàn tất", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ngôn ngữ", { exact: true }).selectOption("en");
  await expect(page.getByLabel("Expected amount", { exact: true })).toHaveValue(
    "0,001",
  );
  await expect(
    page.getByText("Matches your details and is finalized", { exact: true }),
  ).toBeVisible();
  expect(page.url()).not.toContain(recipient);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});
test("failed transfer cannot become matched", async ({ page }) => {
  await page.goto(`/tx/${signature(3)}?cluster=devnet`);
  await expect(
    page.getByText("Giao dịch thất bại", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Đối chiếu khoản tiền tôi đang chờ nhận", { exact: true })
    .click();
  await page
    .getByLabel("Địa chỉ ví nhận mong đợi", { exact: true })
    .fill(recipient);
  await page.getByLabel("Token", { exact: true }).selectOption("SOL");
  await page.getByLabel("Số tiền mong đợi", { exact: true }).fill("0.001");
  await page.getByRole("button", { name: "Đối chiếu", exact: true }).click();
  await expect(
    page.getByText("Giao dịch thất bại — chưa xác nhận thanh toán", {
      exact: true,
    }),
  ).toBeVisible();
});
test("invalid input has actionable inline feedback", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Link hoặc mã giao dịch", { exact: true })
    .fill(recipient);
  await page
    .getByRole("button", { name: "Kiểm tra giao dịch", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Địa chỉ ví không phải mã giao dịch" }),
  ).toContainText("Địa chỉ ví không phải mã giao dịch");
});
test("copied token name does not verify USDC", async ({ page }) => {
  await page.goto(`/tx/${signature(4)}?cluster=devnet`);
  await expect(
    page.getByText("Đã hoàn tất trên mạng", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Đối chiếu khoản tiền tôi đang chờ nhận", { exact: true })
    .click();
  await page
    .getByLabel("Địa chỉ ví nhận mong đợi", { exact: true })
    .fill(recipient);
  await page.getByLabel("Số tiền mong đợi", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Đối chiếu", exact: true }).click();
  await expect(
    page.getByText("Không khớp token mong đợi", { exact: true }),
  ).toBeVisible();
});

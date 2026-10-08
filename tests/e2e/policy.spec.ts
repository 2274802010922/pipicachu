import { test, expect } from "@playwright/test";
import {
  preparationFixture,
  preparationAddress,
  parties,
  fixtureTime,
  snapshotBatchFixture,
} from "../fixtures/preparation";
test("late-ruling policy remains actionable and its VI/EN explanation matches the protocol", async ({
  page,
}) => {
  const f = preparationFixture(1, 2_000_000n, 100_000n, 3, 100_000n, 1);
  const bytes = Buffer.from(f.deal.data[0], "base64");
  bytes[336 + bytes.readUInt32LE(332) + 10] = 1;
  f.deal.data[0] = bytes.toString("base64");
  await page.addInitScript((owner) => {
    (window as unknown as { phantom: unknown }).phantom = {
      solana: {
        publicKey: { toBase58: () => owner },
        connect: async () => ({ publicKey: { toBase58: () => owner } }),
        on: () => {},
        removeListener: () => {},
      },
    };
  }, parties.arb);
  await page.route("**/api/rpc", async (route) => {
    const b = route.request().postDataJSON();
    const result =
      b.method === "getMultipleAccounts"
        ? snapshotBatchFixture(f, fixtureTime + 700, true)
        : b.method === "getAccountInfo"
          ? {
              context: { slot: 1 },
              value: b.params[0] === preparationAddress ? f.deal : null,
            }
          : [];
    await route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
  });
  await page.goto(`/deals/${preparationAddress}`);
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Trọng tài xử quá hạn SLA",
  );
  await expect(
    page.getByRole("button", {
      name: "Phán quyết: trả người bán",
      exact: true,
    }),
  ).toBeEnabled();
  await page.getByText("Cách hoạt động", { exact: true }).click();
  await expect(
    page.getByText("Trọng tài được xử sau hạn SLA.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Ngôn ngữ").selectOption("en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Arbitration past SLA",
  );
  await expect(
    page.getByText("The arbitrator may rule past the SLA.", { exact: false }),
  ).toBeVisible();
});

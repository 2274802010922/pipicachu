import { test, expect } from "@playwright/test";
import { parties, preparationAddress } from "../fixtures/preparation";
test("an unresolved create survives reload; switching wallets clears drafts without mislabeling the old action", async ({
  page,
}) => {
  await page.addInitScript(
    ({ owner, nextOwner, deal }) => {
      const handlers = new Map<string, (key: unknown) => void>();
      const p = {
        publicKey: { toBase58: () => owner },
        connect: async () => ({ publicKey: p.publicKey }),
        disconnect: async () => {},
        on: (event: string, callback: (key: unknown) => void) =>
          handlers.set(event, callback),
        removeListener: (event: string) => handlers.delete(event),
      };
      (window as unknown as { phantom: unknown }).phantom = { solana: p };
      (window as unknown as { changeTestWallet: () => void }).changeTestWallet =
        () => {
          p.publicKey = { toBase58: () => nextOwner };
          handlers.get("accountChanged")?.(p.publicKey);
        };
      sessionStorage.setItem(
        "pipicachu_pending_v1",
        JSON.stringify({
          id: "recovery-fixture",
          owner,
          action: "create",
          dealAddress: deal,
          phase: "unknown",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          signature:
            "3yZqU7hxxAZusYqwW3XMefMFdJAXKVT8zcRzhMmqoXzyTpQaUUu4gqmN1tRP5qR6FNw7WfPfMPY9fpd6hfrvjT77",
          lastValidBlockHeight: 100,
          messageDigest: "0".repeat(64),
        }),
      );
    },
    {
      owner: parties.seller,
      nextOwner: parties.buyer,
      deal: preparationAddress,
    },
  );
  await page.route("**/api/rpc", async (route) => {
    const b = route.request().postDataJSON();
    const result =
      b.method === "getSignatureStatuses"
        ? { context: { slot: 1 }, value: [null] }
        : b.method === "getBlockHeight"
          ? 10
          : b.method === "getProgramAccounts"
            ? []
            : { context: { slot: 1 }, value: null };
    await route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
  });
  await page.goto("/deals/new");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  await expect(
    page.getByText("Chưa rõ kết quả trên mạng.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở giao dịch", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Ví người mua", { exact: true })
    .fill("draft-for-previous-wallet");
  await page.evaluate(() =>
    (window as unknown as { changeTestWallet: () => void }).changeTestWallet(),
  );
  await expect(page.getByLabel("Ví người mua", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByText("Thao tác chưa chốt của ví trước:", { exact: false }),
  ).toBeVisible();
  await expect(
    page
      .locator("main")
      .getByText("Chưa rõ kết quả trên mạng.", { exact: false }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("pipicachu_pending_v1")),
  ).toBeNull();
});

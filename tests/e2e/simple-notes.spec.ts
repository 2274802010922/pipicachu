import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PublicKey } from "@solana/web3.js";
import {
  parties,
  preparationFixture,
  preparationAddress,
  arbAccountAddress,
  fixtureTime,
  snapshotBatchFixture,
} from "../fixtures/preparation";

const program = JSON.parse(
  readFileSync("src/escrow/deployment.json", "utf8"),
).programId;
const feeAddress = PublicKey.findProgramAddressSync(
  [Buffer.from("platform_fee_v1")],
  new PublicKey(program),
)[0].toBase58();
const feeAccount = {
  data: [
    Buffer.concat([
      createHash("sha256").update("account:FeeConfig").digest().subarray(0, 8),
      new PublicKey(parties.buyer).toBuffer(),
      Buffer.from([1]),
    ]).toString("base64"),
    "base64",
  ],
  owner: program,
  executable: false,
  lamports: 10000000,
  rentEpoch: 0,
};
async function prepare(
  page: Page,
  state = 1,
  role: keyof typeof parties = "seller",
) {
  const fixture = preparationFixture(
    1,
    2_000_000n,
    1_000_000n,
    state,
    100_000n,
    1,
  );
  const bytes = Buffer.from(fixture.deal.data[0], "base64");
  bytes[336 + bytes.readUInt32LE(332) + 10] = 1;
  fixture.deal.data[0] = bytes.toString("base64");
  await page.addInitScript(
    ({ owner, program }) => {
      const provider = {
        publicKey: { toBase58: () => owner },
        connect: async () => ({ publicKey: provider.publicKey }),
        on: () => {},
        removeListener: () => {},
        signTransaction: async (tx: {
          instructions: {
            programId: { toBase58(): string };
            data: Uint8Array;
          }[];
        }) => {
          const ix = tx.instructions.find(
            (ix) => ix.programId.toBase58() === program,
          )!;
          (window as unknown as { noteInstruction: number[] }).noteInstruction =
            [...ix.data];
          throw { code: 4001 }; // Injected provider; never signs or broadcasts.
        },
      };
      (window as unknown as { phantom: unknown }).phantom = {
        solana: provider,
      };
    },
    { owner: parties[role], program },
  );
  await page.route("**/api/rpc", async (route) => {
    const b = route.request().postDataJSON();
    let result: unknown = [];
    if (b.method === "getAccountInfo")
      result = {
        context: { slot: 1 },
        value:
          b.params[0] === preparationAddress
            ? fixture.deal
            : b.params[0] === arbAccountAddress
              ? fixture.arb
              : b.params[0] === feeAddress
                ? feeAccount
                : null,
      };
    if (b.method === "getMultipleAccounts")
      result = snapshotBatchFixture(fixture, fixtureTime, true);
    if (b.method === "getGenesisHash")
      result = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
    if (b.method === "getLatestBlockhash")
      result = {
        context: { slot: 1 },
        value: { blockhash: parties.seller, lastValidBlockHeight: 1000 },
      };
    if (b.method === "simulateTransaction")
      result = {
        context: { slot: 1 },
        value: { err: null, logs: [], accounts: null },
      };
    await route.fulfill({ json: { jsonrpc: "2.0", id: b.id, result } });
  });
  await page.goto(`/deals/${preparationAddress}`);
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
}

for (const width of [375, 768, 1024, 1440]) {
  test(`a note and wallet action replace JSON workflow at ${width} in VI/EN`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await prepare(page);
    await expect(
      page.getByLabel("Ghi chú bàn giao", { exact: true }),
    ).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(
      page.getByText(/JSON|Đối chiếu gói|File đính kèm/),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Đã giao hàng", exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel("Ghi chú bàn giao", { exact: true })
      .fill("Đã giao đủ ba file.");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (width === 375 || width === 1440)
      await page
        .locator(".action-card")
        .screenshot({ path: `work/simple-notes/delivery-vi-${width}.png` });
    await page.getByLabel("Ngôn ngữ").selectOption("en");
    await expect(page.getByLabel("Delivery note", { exact: true })).toHaveValue(
      "Đã giao đủ ba file.",
    );
    await expect(
      page.getByText(/JSON|Verify evidence package|Evidence file manifest/),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Mark delivered", exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

for (const scenario of [
  {
    state: 1,
    role: "seller",
    action: "Đã giao hàng",
    label: "Ghi chú bàn giao",
    offset: 8,
  },
  {
    state: 2,
    role: "buyer",
    action: "Mở tranh chấp",
    label: "Lý do khiếu nại",
    offset: 8,
  },
  {
    state: 3,
    role: "arb",
    action: "Phán quyết: hoàn người mua",
    label: "Lý do phán quyết",
    offset: 9,
  },
] as const) {
  test(`${scenario.role} ${scenario.label} reaches signing with a note hash and no download`, async ({
    page,
  }) => {
    await prepare(page, scenario.state, scenario.role);
    const downloads: string[] = [],
      rpcBodies: string[] = [];
    page.on("download", (download) =>
      downloads.push(download.suggestedFilename()),
    );
    page.on("request", (request) => {
      if (request.url().endsWith("/api/rpc"))
        rpcBodies.push(request.postData() || "");
    });
    const action = page.getByRole("button", {
      name: scenario.action,
      exact: true,
    });
    await expect(action).toBeEnabled();
    if (scenario.state === 2) await action.click();
    const note = "Đã trao đổi chi tiết qua kênh đã thống nhất.";
    await page.getByLabel(scenario.label, { exact: true }).fill(note);
    await action.click();
    if (scenario.state === 3)
      await page
        .getByRole("button", { name: "Xác nhận và ký", exact: true })
        .click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { noteInstruction?: number[] })
              .noteInstruction?.length,
        ),
      )
      .toBe(scenario.offset + 32);
    const instruction = Buffer.from(
      await page.evaluate(
        () =>
          (window as unknown as { noteInstruction: number[] }).noteInstruction,
      ),
    );
    expect(instruction.subarray(scenario.offset)).toEqual(
      createHash("sha256").update(note).digest(),
    );
    await expect(
      page.getByText("Bạn đã hủy thao tác. Chưa gửi giao dịch.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(downloads).toEqual([]);
    expect(rpcBodies.join("\n")).not.toContain(note);
    expect(rpcBodies.join("\n")).not.toContain('"sendTransaction"');
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByText(/JSON|gói bằng chứng/i)).toHaveCount(0);
  });
}

import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";
const PROGRAM_ID = new PublicKey(
  JSON.parse(readFileSync("src/escrow/deployment.json", "utf8")).programId,
);
const MANAGER_CONFIG = PublicKey.findProgramAddressSync(
  [Buffer.from("manager_v1")],
  PROGRAM_ID,
)[0];
import {
  parties,
  organizationFixture,
  organizationAccountAddress,
} from "../fixtures/preparation";

test("policy draft, signing summary and encoded values agree; on-chain values stay separate", async ({
  page,
}) => {
  const manager = {
    data: [
      Buffer.concat([
        createHash("sha256")
          .update("account:ManagerConfig")
          .digest()
          .subarray(0, 8),
        new PublicKey(parties.buyer).toBuffer(),
        Buffer.alloc(32),
        Buffer.from([1]),
      ]).toString("base64"),
      "base64",
    ],
    owner: PROGRAM_ID.toBase58(),
    executable: false,
    lamports: 10000000,
    rentEpoch: 0,
  };
  await page.addInitScript(
    ({ owner, program }) => {
      const p = {
        publicKey: { toBase58: () => owner },
        connect: async () => ({ publicKey: p.publicKey }),
        on: () => {},
        removeListener: () => {},
        signTransaction: async (tx: {
          instructions: {
            programId: { toBase58(): string };
            data: Uint8Array;
          }[];
        }) => {
          const ix = tx.instructions.find(
            (i) => i.programId.toBase58() === program,
          )!;
          (window as unknown as { capturedPolicy: number[] }).capturedPolicy = [
            ...ix.data,
          ];
          throw { code: 4001 }; // local injected provider; no signature or broadcast
        },
      };
      (window as unknown as { phantom: unknown }).phantom = { solana: p };
    },
    { owner: parties.buyer, program: PROGRAM_ID.toBase58() },
  );
  await page.route("**/api/rpc", async (route) => {
    const b = route.request().postDataJSON();
    let result: unknown = [];
    if (b.method === "getAccountInfo")
      result = {
        context: { slot: 1 },
        value: b.params[0] === MANAGER_CONFIG.toBase58() ? manager : null,
      };
    if (b.method === "getProgramAccounts")
      result =
        b.params[1]?.filters?.[0]?.dataSize === 123
          ? [
              {
                pubkey: organizationAccountAddress,
                account: organizationFixture(false),
              },
            ]
          : [];
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
  await page.goto("/manage");
  await page.getByRole("button", { name: "Kết nối ví", exact: true }).click();
  await expect(page.getByText(/Policy trên chain:/)).toContainText(
    "300 / 300 / 300 / 300",
  );
  await page
    .getByText("Policy dùng khi duyệt và cập nhật", { exact: true })
    .click();
  for (const [label, value] of [
    ["Hạn nạp (giây)", "300"],
    ["Hạn giao (giây)", "60"],
    ["Hạn kiểm tra (giây)", "60"],
    ["SLA trọng tài (giây)", "60"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("button", { name: "Áp dụng policy ở trên", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("300 / 60 / 60 / 60");
  await page
    .getByRole("button", { name: "Xác nhận và ký", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { capturedPolicy?: number[] }).capturedPolicy
            ?.length,
      ),
    )
    .toBe(56);
  const encoded = Buffer.from(
    await page.evaluate(
      () => (window as unknown as { capturedPolicy: number[] }).capturedPolicy,
    ),
  );
  expect(
    [24, 32, 40, 48].map((offset) => Number(encoded.readBigInt64LE(offset))),
  ).toEqual([300, 60, 60, 60]);
  await expect(page.getByText(/Policy trên chain:/)).toContainText(
    "300 / 300 / 300 / 300",
  );
});

import { createHash } from "node:crypto";
import { it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { deploymentAccountsReady } from "../../src/backend/deployment-check";
import { PROGRAM_ID, MINT } from "../../src/escrow/constants";
import deployment from "../../src/escrow/deployment.json";
function account(
  data: Buffer,
  owner = PROGRAM_ID.toBase58(),
  executable = false,
) {
  return { data: [data.toString("base64"), "base64"], owner, executable };
}
function record(name: string, authority: PublicKey, length: number) {
  const data = Buffer.alloc(length);
  createHash("sha256").update(`account:${name}`).digest().copy(data, 0, 0, 8);
  authority.toBuffer().copy(data, 8);
  return account(data);
}
function fixtures() {
  const program = Buffer.alloc(36);
  program.writeUInt32LE(2);
  const mint = Buffer.alloc(82);
  mint[44] = 6;
  mint[45] = 1;
  return [
    account(program, "BPFLoaderUpgradeab1e11111111111111111111111", true),
    record("Config", MINT, 41),
    account(mint, "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    record("FeeConfig", new PublicKey(deployment.platformTreasury), 41),
    record("ManagerConfig", PROGRAM_ID, 73),
  ];
}
it("readiness requires initialized mint and exact on-chain account shapes", () => {
  expect(deploymentAccountsReady(fixtures())).toEqual({
    program: true,
    manager: true,
  });
  for (const index of [0, 1, 2, 3]) {
    const rows = fixtures();
    rows[index].owner = PublicKey.default.toBase58();
    expect(deploymentAccountsReady(rows).program).toBe(false);
  }
  const rows = fixtures();
  const data = Buffer.from(rows[2].data[0], "base64");
  data[45] = 0;
  rows[2].data[0] = data.toString("base64");
  expect(deploymentAccountsReady(rows).program).toBe(false);
});
it("wrong discriminator, treasury, manager and missing metadata do not pass", () => {
  for (const index of [1, 3]) {
    const rows = fixtures();
    const data = Buffer.from(rows[index].data[0], "base64");
    data[0] ^= 1;
    rows[index].data[0] = data.toString("base64");
    expect(deploymentAccountsReady(rows).program).toBe(false);
  }
  const rows = fixtures();
  rows[3] = record("FeeConfig", PublicKey.default, 41);
  expect(deploymentAccountsReady(rows).program).toBe(false);
  rows[4] = record("ManagerConfig", PublicKey.default, 73);
  expect(deploymentAccountsReady(rows).manager).toBe(false);
  expect(deploymentAccountsReady([{}, null])).toEqual({
    program: false,
    manager: false,
  });
});

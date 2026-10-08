import { it, expect, vi } from "vitest";
import { Connection, PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { readDealSnapshot, readArbitrators } from "../../src/escrow/queries";
import {
  preparationFixture,
  preparationAddress,
  fixtureTime,
  clockFixture,
  organizationFixture,
} from "../fixtures/preparation";
function decoded(raw: ReturnType<typeof clockFixture>) {
  return {
    ...raw,
    owner: new PublicKey(raw.owner),
    data: Buffer.from(raw.data[0], "base64"),
  };
}
it("two simultaneous readers share a fresh two-RPC snapshot with finalized commitment", async () => {
  const f = preparationFixture(1, 2_000_000n, 0n, 0, 100_000n, 1);
  const c = {
    rpcEndpoint: "test-snapshot",
    getAccountInfo: vi.fn(async () => decoded(f.deal)),
    getMultipleAccountsInfo: vi.fn(async () => [
      decoded(f.arb),
      decoded(organizationFixture()),
      decoded(clockFixture()),
    ]),
  } as unknown as Connection;
  const [first, second] = await Promise.all([
    readDealSnapshot(c, preparationAddress),
    readDealSnapshot(c, preparationAddress),
  ]);
  expect(first).toBe(second);
  expect(first.chainTime).toBe(fixtureTime);
  expect(first.profile!.total).toBe(2_000_000n);
  expect(c.getAccountInfo).toHaveBeenCalledTimes(1);
  expect(c.getMultipleAccountsInfo).toHaveBeenCalledTimes(1);
  expect(c.getAccountInfo).toHaveBeenCalledWith(
    new PublicKey(preparationAddress),
    "finalized",
  );
  expect(
    (c.getMultipleAccountsInfo as ReturnType<typeof vi.fn>).mock.calls[0][0][2],
  ).toEqual(SYSVAR_CLOCK_PUBKEY);
  await readDealSnapshot(c, preparationAddress);
  expect(c.getAccountInfo).toHaveBeenCalledTimes(2);
});
it("missing clock and a forged account owner fail instead of opening money actions", async () => {
  const f = preparationFixture(1, 2_000_000n, 0n, 0, 100_000n, 1);
  const c = {
    rpcEndpoint: "test-invalid-snapshot",
    getAccountInfo: vi.fn(async () => decoded(f.deal)),
    getMultipleAccountsInfo: vi.fn(async () => [decoded(f.arb), null, null]),
  } as unknown as Connection;
  await expect(readDealSnapshot(c, preparationAddress)).rejects.toThrow(
    "RPC_UNAVAILABLE",
  );
  (c.getMultipleAccountsInfo as ReturnType<typeof vi.fn>).mockResolvedValue([
    { ...decoded(f.arb), owner: PublicKey.default },
    null,
    decoded(clockFixture()),
  ]);
  await expect(readDealSnapshot(c, preparationAddress)).rejects.toThrow(
    "INVALID_ACCOUNT",
  );
  (c.getMultipleAccountsInfo as ReturnType<typeof vi.fn>).mockResolvedValue([
    decoded(f.arb),
    null,
    { ...decoded(clockFixture()), owner: PublicKey.default },
  ]);
  await expect(readDealSnapshot(c, preparationAddress)).rejects.toThrow(
    "RPC_UNAVAILABLE",
  );
  (c.getMultipleAccountsInfo as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  await expect(
    readArbitrators(c, [new PublicKey(f.arb.owner)]),
  ).rejects.toThrow("RPC_UNAVAILABLE");
});

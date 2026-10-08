import { it, expect } from "vitest";
import {
  decodeArbitrator,
  decodeDeal,
  decodeOrganization,
} from "../../src/escrow/codec";
import {
  preparationFixture,
  preparationAddress,
  parties,
  organizationFixture,
} from "../fixtures/preparation";
const bytes = (raw: { data: string[] }) => Buffer.from(raw.data[0], "base64");
it("corrupt discriminator, mint, reserve and boolean bytes are rejected", async () => {
  const arb = bytes(preparationFixture().arb);
  for (const mutate of [
    (b: Buffer) => {
      b[0] ^= 1;
    },
    (b: Buffer) => {
      b.fill(0, 40, 72);
    },
    (b: Buffer) => {
      b.writeBigUInt64LE(9_000_000n, 80);
    },
  ]) {
    const bad = Buffer.from(arb);
    mutate(bad);
    await expect(decodeArbitrator(bad, parties.arb)).rejects.toThrow(
      "INVALID_ACCOUNT",
    );
  }
  const org = bytes(organizationFixture());
  org[72] = 2;
  await expect(decodeOrganization(org)).rejects.toThrow("INVALID_ACCOUNT");
});
it("malformed UTF-8 and future policy versions never become actionable deals", async () => {
  const b = bytes(preparationFixture().deal);
  b[336] = 0xff;
  await expect(decodeDeal(preparationAddress, b)).rejects.toThrow(
    "INVALID_ACCOUNT",
  );
  const unknown = bytes(preparationFixture().deal);
  const policyOffset = 336 + unknown.readUInt32LE(332) + 10;
  unknown[policyOffset] = 2;
  await expect(decodeDeal(preparationAddress, unknown)).rejects.toThrow(
    "INVALID_ACCOUNT",
  );
});

import { it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  decodeOrganization,
  decodeDeal,
  createOrganizationDealIx,
  digest,
} from "../../src/escrow/client";
import {
  organizationFixture,
  preparationFixture,
  preparationAddress,
  parties,
} from "../fixtures/preparation";
it("decodes approved registry without trusting display labels", async () => {
  const raw = organizationFixture();
  const org = await decodeOrganization(Buffer.from(raw.data[0], "base64"));
  expect(org.approved).toBe(true);
  expect(org.accepting).toBe(true);
  expect(org.minimumDeposit).toBe(1_000_000n);
  expect(org.times).toEqual([300, 300, 300, 300]);
});
it("workflow discriminator preserves legacy padding and recognizes standing consent", async () => {
  for (const version of [0, 1]) {
    const raw = preparationFixture(1, 2_000_000n, 0n, 0, 100_000n, version);
    const d = await decodeDeal(
      preparationAddress,
      Buffer.from(raw.deal.data[0], "base64"),
    );
    expect(d.workflowVersion).toBe(version);
  }
  const ix = await createOrganizationDealIx(
    new PublicKey(parties.seller),
    new PublicKey(parties.buyer),
    new PublicKey(parties.arb),
    1n,
    1_000_000n,
    [300, 300, 300, 300],
    "Permitted demo",
  );
  expect(ix.data.subarray(0, 8)).toEqual(
    (await digest("global:create_organization_deal")).subarray(0, 8),
  );
  expect(ix.keys).toHaveLength(10);
});

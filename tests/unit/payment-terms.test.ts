import { it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { paymentTermsHash } from "../../src/escrow/payment-terms";
import { decodeDeal } from "../../src/escrow/codec";
import {
  preparationAddress,
  preparationFixture,
} from "../fixtures/preparation";
it("commits every immutable condition but not lifecycle changes", async () => {
  const d = await decodeDeal(
    preparationAddress,
    Buffer.from(
      preparationFixture(1, 2_000_000n, 0n, 0, 100_000n, 1).deal.data[0],
      "base64",
    ),
  );
  const treasury = PublicKey.default.toBase58(),
    original = await paymentTermsHash(d, treasury);
  for (const field of ["amount", "fee", "platformFee", "bond"] as const)
    expect(
      await paymentTermsHash({ ...d, [field]: d[field] + 1n }, treasury),
    ).not.toEqual(original);
  for (const field of [
    "fundBy",
    "deliverySeconds",
    "reviewSeconds",
    "arbitrationSeconds",
    "feeVersion",
    "workflowVersion",
    "resolutionPolicyVersion",
  ] as const)
    expect(
      await paymentTermsHash({ ...d, [field]: (d[field] ?? 0) + 1 }, treasury),
    ).not.toEqual(original);
  for (const field of [
    "address",
    "seller",
    "buyer",
    "arbitrator",
    "mint",
  ] as const)
    expect(
      await paymentTermsHash({ ...d, [field]: treasury }, treasury),
    ).not.toEqual(original);
  expect(
    await paymentTermsHash({ ...d, terms: d.terms + " đ" }, treasury),
  ).not.toEqual(original);
  expect(await paymentTermsHash(d, d.seller)).not.toEqual(original);
  expect(
    await paymentTermsHash({ ...d, state: "funded", deliverBy: 123 }, treasury),
  ).toEqual(original);
});

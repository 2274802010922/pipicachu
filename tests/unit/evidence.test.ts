import { it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  createEvidence,
  parseEvidence,
  verifyEvidence,
  canonicalJson,
  digestHex,
} from "../../src/escrow/evidence";
import type { Deal } from "../../src/escrow/client";
const a = PublicKey.default.toBase58(),
  d = {
    address: a,
    seller: a,
    buyer: a,
    arbitrator: a,
    resolutionPolicyVersion: 1,
  } as Deal;
it("canonical encoding has stable key ordering and JSON escaping", () =>
  expect(canonicalJson({ z: "<script>\n", a: [1, true, null] })).toBe(
    '{"a":[1,true,null],"z":"<script>\\n"}',
  ));
it("salting makes repeated short notes unlinkable by equality", async () => {
  const x = await createEvidence({
      deal: a,
      author: a,
      kind: "delivery",
      note: "đã giao",
    }),
    y = await createEvidence({
      deal: a,
      author: a,
      kind: "delivery",
      note: "đã giao",
    });
  expect(x.commitment).not.toBe(y.commitment);
  expect(x.body.salt).toHaveLength(64);
});
it("a matching role and commitment verify, not goods quality", async () => {
  const p = await createEvidence({
    deal: a,
    author: a,
    kind: "delivery",
    note: "3 files sent",
  });
  expect(await verifyEvidence(p, { ...d, deliveryHash: p.commitment })).toEqual(
    { valid: true, reason: "matched" },
  );
});
it("editing one byte invalidates the commitment", async () => {
  const p = await createEvidence({
    deal: a,
    author: a,
    kind: "delivery",
    note: "3 files",
  });
  const hash = p.commitment;
  p.body.note = "2 files";
  expect((await verifyEvidence(p, { ...d, deliveryHash: hash })).reason).toBe(
    "content",
  );
});
it("role and deal substitutions fail", async () => {
  const p = await createEvidence({
    deal: a,
    author: a,
    kind: "dispute",
    note: "missing",
  });
  expect(
    (
      await verifyEvidence(p, {
        ...d,
        address: "different",
        disputeHash: p.commitment,
      })
    ).reason,
  ).toBe("deal");
  expect(
    (
      await verifyEvidence(p, {
        ...d,
        buyer: "different",
        disputeHash: p.commitment,
      })
    ).reason,
  ).toBe("author");
});
it("legacy hash has explicit unsupported semantics", async () => {
  const p = await createEvidence({
    deal: a,
    author: a,
    kind: "delivery",
    note: "done",
  });
  expect(
    (await verifyEvidence(p, { ...d, resolutionPolicyVersion: 0 })).reason,
  ).toBe("legacy");
});
it("unexpected properties and oversized packages are rejected", () => {
  expect(() => parseEvidence('{"__proto__":{"polluted":true}}')).toThrow(
    "INVALID_EVIDENCE",
  );
  expect(() => parseEvidence(" ".repeat(65537))).toThrow("EVIDENCE_TOO_LARGE");
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});

it("SHA-256 matches the independent standard abc vector", async () => {
  expect(await digestHex(new TextEncoder().encode("abc"))).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
it("import rejects manifests above total limit or duplicate names", async () => {
  const p = await createEvidence({
    deal: a,
    author: a,
    kind: "delivery",
    note: "sample",
  });
  p.body.files = [
    { name: "a", size: 50 * 1024 * 1024, sha256: "0".repeat(64) },
    { name: "b", size: 1, sha256: "1".repeat(64) },
  ];
  expect(() => parseEvidence(JSON.stringify(p))).toThrow("INVALID_EVIDENCE");
  p.body.files = [
    { name: "same", size: 1, sha256: "0".repeat(64) },
    { name: "same", size: 1, sha256: "1".repeat(64) },
  ];
  expect(() => parseEvidence(JSON.stringify(p))).toThrow("INVALID_EVIDENCE");
});

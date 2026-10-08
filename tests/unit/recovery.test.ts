import { it, expect } from "vitest";
import { loadRecovery } from "../../src/escrow/recovery";
import { parties, preparationAddress } from "../fixtures/preparation";
const now = 1_800_000_000_000;
const pending = {
  id: "recovery-case",
  owner: parties.buyer,
  action: "create",
  dealAddress: preparationAddress,
  phase: "unknown",
  createdAt: now - 1000,
  updatedAt: now,
  lastValidBlockHeight: 100,
  signature:
    "3yZqU7hxxAZusYqwW3XMefMFdJAXKVT8zcRzhMmqoXzyTpQaUUu4gqmN1tRP5qR6FNw7WfPfMPY9fpd6hfrvjT77",
};
it("only unresolved signed operation metadata can be restored", () => {
  expect(loadRecovery(JSON.stringify(pending), now)).toEqual(pending);
  for (const patch of [
    { phase: "finalized" },
    { signature: "invalid" },
    { owner: "invalid" },
    { dealAddress: "invalid" },
    { lastValidBlockHeight: -1 },
    { createdAt: now - 86400000 },
    { createdAt: now + 120000 },
    { updatedAt: now - 2000 },
    { messageDigest: "not-a-digest" },
  ])
    expect(
      loadRecovery(JSON.stringify({ ...pending, ...patch }), now),
    ).toBeNull();
});
it("corrupt/oversized tab state is discarded without forwarding private fields", () => {
  expect(loadRecovery("{", now)).toBeNull();
  expect(loadRecovery(" ".repeat(4097), now)).toBeNull();
  const restored = loadRecovery(
    JSON.stringify({
      ...pending,
      evidence: "private note",
      secretKey: "ignored",
    }),
    now,
  );
  expect(restored).not.toHaveProperty("evidence");
  expect(restored).not.toHaveProperty("secretKey");
});

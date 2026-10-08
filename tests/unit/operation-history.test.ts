import { it, expect } from "vitest";
import { Connection } from "@solana/web3.js";
import { trackOperation, type Operation } from "../../src/escrow/operation";
const pending: Operation = {
  id: "history",
  owner: "wallet",
  action: "confirm",
  phase: "unknown",
  createdAt: 0,
  updatedAt: 0,
  signature: "sig",
  lastValidBlockHeight: 100,
};
it("finalized history during expiry check is accepted immediately with no third RPC", async () => {
  let calls = 0;
  const c = {
    getBlockHeight: async () => 101,
    getSignatureStatuses: async () => ({
      value: [
        ++calls === 1 ? null : { confirmationStatus: "finalized", err: null },
      ],
    }),
  } as unknown as Connection;
  const states: string[] = [];
  expect(
    await trackOperation(c, pending, (op) => states.push(op.phase), {
      attempts: 1,
      pause: async () => {},
    }),
  ).toBe("sig");
  expect(calls).toBe(2);
  expect(states).toEqual(["finalized"]);
});
it("failed history during expiry check is a failure, never an expiry or completion", async () => {
  let calls = 0;
  const c = {
    getBlockHeight: async () => 101,
    getSignatureStatuses: async () => ({
      value: [
        ++calls === 1
          ? null
          : {
              confirmationStatus: "finalized",
              err: { InstructionError: [1, { Custom: 6002 }] },
            },
      ],
    }),
  } as unknown as Connection;
  const states: string[] = [];
  await expect(
    trackOperation(c, pending, (op) => states.push(op.phase), {
      attempts: 1,
      pause: async () => {},
    }),
  ).rejects.toThrow("TRANSACTION_FAILED");
  expect(states).toEqual(["failed"]);
});

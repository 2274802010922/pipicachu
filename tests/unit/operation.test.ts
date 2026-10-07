import { it, expect, vi } from "vitest";
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  trackOperation,
  submitWalletOperation,
  PendingOperationError,
  type Operation,
} from "../../src/escrow/operation";
const base: Operation = {
  id: "test",
  owner: "wallet",
  action: "fund",
  phase: "unknown",
  createdAt: 0,
  updatedAt: 0,
  signature: "sig",
  lastValidBlockHeight: 100,
};
function connection(statuses: unknown[], height = 90) {
  return {
    getSignatureStatuses: vi.fn(async () => ({
      value: [statuses.shift() ?? null],
    })),
    getBlockHeight: vi.fn(async () => height),
  } as unknown as Connection;
}
it("a timed-out broadcast can be recognized as finalized without signing again", async () => {
  const c = connection([
    { confirmationStatus: "confirmed", err: null },
    { confirmationStatus: "finalized", err: null },
  ]);
  const states: Operation[] = [];
  expect(
    await trackOperation(c, base, (s) => states.push(s), {
      pause: async () => {},
    }),
  ).toBe("sig");
  expect(states.map((s) => s.phase)).toEqual(["confirming", "finalized"]);
});
it("null before expiry remains unknown, never completed", async () => {
  const states: Operation[] = [];
  await expect(
    trackOperation(connection([null]), base, (s) => states.push(s), {
      attempts: 1,
      pause: async () => {},
    }),
  ).rejects.toBeInstanceOf(PendingOperationError);
  expect(states.at(-1)!.phase).toBe("unknown");
});
it("expiry is checked against finalized height and historical re-read", async () => {
  const c = connection([null, null], 101),
    states: Operation[] = [];
  await expect(
    trackOperation(c, base, (s) => states.push(s), { pause: async () => {} }),
  ).rejects.toThrow("TRANSACTION_EXPIRED");
  expect(c.getSignatureStatuses).toHaveBeenCalledTimes(2);
  expect(c.getBlockHeight).toHaveBeenCalledWith("finalized");
  expect(states.at(-1)!.phase).toBe("expired");
});
it("a transaction found during expiry recheck must not be labeled expired", async () => {
  const states: Operation[] = [];
  expect(
    await trackOperation(
      connection(
        [
          null,
          { confirmationStatus: "confirmed", err: null },
          { confirmationStatus: "finalized", err: null },
        ],
        101,
      ),
      base,
      (s) => states.push(s),
      { pause: async () => {} },
    ),
  ).toBe("sig");
  expect(states.some((s) => s.phase === "expired")).toBe(false);
});
it("on-chain failure is distinct from RPC unavailability", async () => {
  const states: Operation[] = [];
  await expect(
    trackOperation(
      connection([{ err: { InstructionError: [0, "x"] } }]),
      base,
      (s) => states.push(s),
      { pause: async () => {} },
    ),
  ).rejects.toThrow("TRANSACTION_FAILED");
  expect(states.at(-1)!.phase).toBe("failed");
});
it("RPC failure preserves uncertainty", async () => {
  const c = {
      getSignatureStatuses: async () => {
        throw Error("RPC down");
      },
    } as unknown as Connection,
    states: Operation[] = [];
  await expect(
    trackOperation(c, base, (s) => states.push(s), {
      attempts: 1,
      pause: async () => {},
    }),
  ).rejects.toBeInstanceOf(PendingOperationError);
  expect(states.at(-1)!.phase).toBe("unknown");
});

function sender() {
  const wallet = Keypair.generate();
  const c = {
    getGenesisHash: vi.fn(
      async () => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
    ),
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: Keypair.generate().publicKey.toBase58(),
      lastValidBlockHeight: 100,
    })),
    simulateTransaction: vi.fn(async () => ({
      value: { err: null, logs: [] },
    })),
    getBlockHeight: vi.fn(async () => 80),
    sendRawTransaction: vi.fn(async () => {
      throw Error("response timeout");
    }),
    getSignatureStatuses: vi.fn(async () => ({
      value: [{ confirmationStatus: "finalized", err: null }],
    })),
  };
  return {
    wallet,
    c,
    tx: new Transaction().add(
      new TransactionInstruction({
        programId: Keypair.generate().publicKey,
        keys: [],
        data: Buffer.from([1]),
      }),
    ),
  };
}
it("broadcast timeout retries identical signed bytes and recognizes landed signature", async () => {
  const { wallet, c, tx } = sender(),
    states: Operation[] = [];
  const sign = vi.fn(async (t: Transaction) => {
    t.partialSign(wallet);
    return t;
  });
  const signature = await submitWalletOperation({
    connection: c as unknown as Connection,
    wallet: wallet.publicKey,
    tx,
    sign,
    currentWallet: () => wallet.publicKey,
    onUpdate: (s) => states.push(s),
    meta: { action: "create", dealAddress: wallet.publicKey.toBase58() },
  });
  expect(sign).toHaveBeenCalledTimes(1);
  expect(c.sendRawTransaction).toHaveBeenCalledTimes(2);
  expect(c.sendRawTransaction.mock.calls[0]).toEqual(
    c.sendRawTransaction.mock.calls[1],
  );
  expect(states.at(-1)?.phase).toBe("finalized");
  expect(signature).toBe(states.find((s) => s.phase === "signed")?.signature);
});
it("wallet change after signing blocks broadcasting", async () => {
  const { wallet, c, tx } = sender();
  let current = wallet.publicKey;
  await expect(
    submitWalletOperation({
      connection: c as unknown as Connection,
      wallet: wallet.publicKey,
      tx,
      sign: async (t) => {
        t.partialSign(wallet);
        current = Keypair.generate().publicKey;
        return t;
      },
      currentWallet: () => current,
      onUpdate: () => {},
    }),
  ).rejects.toThrow("WALLET_CHANGED");
  expect(c.sendRawTransaction).not.toHaveBeenCalled();
});
it("sign cancellation remains a pre-broadcast failure", async () => {
  const { wallet, c, tx } = sender(),
    states: Operation[] = [];
  await expect(
    submitWalletOperation({
      connection: c as unknown as Connection,
      wallet: wallet.publicKey,
      tx,
      sign: async () => {
        throw { code: 4001 };
      },
      currentWallet: () => wallet.publicKey,
      onUpdate: (s) => states.push(s),
    }),
  ).rejects.toThrow("WALLET_REJECTED");
  expect(c.sendRawTransaction).not.toHaveBeenCalled();
  expect(states.at(-1)?.phase).toBe("failed");
});

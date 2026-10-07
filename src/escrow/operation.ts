import { Buffer } from "buffer";
import bs58 from "bs58";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  prepareDevnetWalletTransaction,
  assertWalletResponse,
} from "./wallet-transaction";
import { simulationFailureCode } from "./simulation";

export type OperationPhase =
  | "checking"
  | "awaiting_signature"
  | "signed"
  | "submitted"
  | "confirming"
  | "unknown"
  | "finalized"
  | "failed"
  | "expired";
export type OperationMeta = { action?: string; dealAddress?: string };
export type Operation = {
  id: string;
  owner: string;
  action: string;
  dealAddress?: string;
  phase: OperationPhase;
  createdAt: number;
  updatedAt: number;
  signature?: string;
  messageDigest?: string;
  blockhash?: string;
  lastValidBlockHeight?: number;
  errorCode?: string;
};
export const isUnresolved = (operation: Operation) =>
  !["finalized", "failed", "expired"].includes(operation.phase);
export class PendingOperationError extends Error {
  constructor(public operation: Operation) {
    super(`PENDING:${operation.signature || ""}`);
  }
}
type Callback = (operation: Operation) => void;
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export async function trackOperation(
  c: Connection,
  operation: Operation,
  onUpdate: Callback,
  options: { attempts?: number; pause?: (ms: number) => Promise<void> } = {},
): Promise<string> {
  if (!operation.signature || !operation.lastValidBlockHeight)
    throw Error("INVALID_OPERATION");
  let current = { ...operation };
  const update = (phase: OperationPhase, errorCode?: string) => {
    current = { ...current, phase, errorCode, updatedAt: Date.now() };
    onUpdate(current);
  };
  for (let n = 0; n < (options.attempts ?? 45); n++) {
    try {
      const status = (
        await c.getSignatureStatuses([current.signature!], {
          searchTransactionHistory: true,
        })
      ).value[0];
      if (status?.err) {
        update("failed", "TRANSACTION_FAILED");
        throw Error("TRANSACTION_FAILED");
      }
      if (status?.confirmationStatus === "finalized") {
        update("finalized");
        return current.signature!;
      }
      if (status) {
        update("confirming");
      } else if (
        (await c.getBlockHeight("finalized")) > current.lastValidBlockHeight!
      ) {
        // Re-read history before permitting a fresh signature with a new blockhash.
        const history = (
          await c.getSignatureStatuses([current.signature!], {
            searchTransactionHistory: true,
          })
        ).value[0];
        if (!history) {
          update("expired", "TRANSACTION_EXPIRED");
          throw Error("TRANSACTION_EXPIRED");
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        ["TRANSACTION_FAILED", "TRANSACTION_EXPIRED"].includes(error.message)
      )
        throw error;
      update("unknown");
    }
    await (options.pause || sleep)(1500);
  }
  if (current.phase !== "confirming") update("unknown");
  throw new PendingOperationError(current);
}
export async function submitWalletOperation({
  connection: c,
  wallet,
  tx,
  sign,
  currentWallet,
  onUpdate,
  meta = {},
}: {
  connection: Connection;
  wallet: PublicKey;
  tx: Transaction;
  sign: (tx: Transaction) => Promise<Transaction>;
  currentWallet: () => PublicKey | null;
  onUpdate: Callback;
  meta?: OperationMeta;
}): Promise<string> {
  let operation: Operation = {
    id: crypto.randomUUID(),
    owner: wallet.toBase58(),
    action: meta.action || "transaction",
    dealAddress: meta.dealAddress,
    phase: "checking",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const update = (phase: OperationPhase, patch: Partial<Operation> = {}) => {
    operation = { ...operation, ...patch, phase, updatedAt: Date.now() };
    onUpdate(operation);
  };
  let broadcastAttempted = false;
  update("checking");
  try {
    if (
      (await c.getGenesisHash()) !==
      "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
    )
      throw Error("RPC_NETWORK_MISMATCH");
    const latest = await c.getLatestBlockhash();
    prepareDevnetWalletTransaction(tx);
    tx.feePayer = wallet;
    tx.recentBlockhash = latest.blockhash;
    const simulation = await c.simulateTransaction(tx);
    if (simulation.value.err)
      throw Error(
        simulationFailureCode(simulation.value.err, simulation.value.logs),
      );
    if (currentWallet()?.toBase58() !== wallet.toBase58())
      throw Error("WALLET_CHANGED");
    const message = tx.serializeMessage(),
      hash = await crypto.subtle.digest("SHA-256", new Uint8Array(message));
    update("awaiting_signature", {
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
      messageDigest: Buffer.from(hash).toString("hex"),
    });
    let signed: Transaction;
    try {
      signed = await sign(tx);
    } catch (error) {
      throw Error(
        (error as { code?: number })?.code === 4001
          ? "WALLET_REJECTED"
          : "WALLET_SIGNING_FAILED",
      );
    }
    assertWalletResponse(wallet, currentWallet(), message, signed);
    update("signed", { signature: bs58.encode(signed.signature!) });
    if ((await c.getBlockHeight("confirmed")) > latest.lastValidBlockHeight) {
      update("expired", { errorCode: "TRANSACTION_EXPIRED" });
      throw Error("TRANSACTION_EXPIRED");
    }
    if (currentWallet()?.toBase58() !== wallet.toBase58())
      throw Error("WALLET_CHANGED");
    const raw = signed.serialize();
    let submitted = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        broadcastAttempted = true;
        await c.sendRawTransaction(raw);
        submitted = true;
        break;
      } catch {
        if (attempt === 0) await sleep(500);
      }
    }
    update(submitted ? "submitted" : "unknown");
    return await trackOperation(c, operation, onUpdate);
  } catch (error) {
    if (error instanceof PendingOperationError) throw error;
    const code = error instanceof Error ? error.message : "RPC_UNAVAILABLE";
    if (
      operation.signature &&
      broadcastAttempted &&
      !["TRANSACTION_FAILED", "TRANSACTION_EXPIRED"].includes(code)
    ) {
      update("unknown");
      throw new PendingOperationError(operation);
    }
    update(code === "TRANSACTION_EXPIRED" ? "expired" : "failed", {
      errorCode: code,
    });
    throw error;
  }
}

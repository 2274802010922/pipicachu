import bs58 from "bs58";
import { SYSTEM, TOKEN, USDC, JUPITER } from "../../src/solana/constants";
import type { Network } from "../../src/shared/types";
export const sender = bs58.encode(new Uint8Array(32).fill(1));
export const recipient = bs58.encode(new Uint8Array(32).fill(2));
export const other = bs58.encode(new Uint8Array(32).fill(3));
const srcToken = bs58.encode(new Uint8Array(32).fill(4)),
  dstToken = bs58.encode(new Uint8Array(32).fill(5));
export const signature = (n: number) => bs58.encode(new Uint8Array(64).fill(n));
export function solCase(n = 1, amount = "1000000", failed = false) {
  const sig = signature(n);
  return {
    signature: sig,
    network: "devnet" as Network,
    status: {
      confirmationStatus: "finalized",
      err: failed ? "InsufficientFunds" : null,
    },
    raw: {
      slot: 100,
      blockTime: 1760000000,
      version: "legacy",
      transaction: {
        signatures: [sig],
        message: {
          accountKeys: [sender, recipient, SYSTEM],
          instructions: [
            {
              programId: SYSTEM,
              parsed: {
                type: "transfer",
                info: {
                  source: sender,
                  destination: recipient,
                  lamports: amount,
                },
              },
            },
          ],
        },
      },
      meta: {
        err: failed ? { InstructionError: [0, "InsufficientFunds"] } : null,
        fee: 5000,
        preBalances: ["1000000000", "0", "1"],
        postBalances: [
          (1000000000n - 5000n - (failed ? 0n : BigInt(amount))).toString(),
          failed ? "0" : amount,
          "1",
        ],
        preTokenBalances: [],
        postTokenBalances: [],
        innerInstructions: [],
      },
    },
  };
}
export function tokenCase(n = 2, amount = "50000000", mint = USDC.devnet) {
  const sig = signature(n),
    row = (accountIndex: number, owner: string, value: string) => ({
      accountIndex,
      mint,
      owner,
      uiTokenAmount: {
        amount: value,
        decimals: 6,
        uiAmount: Number(value) / 1e6,
      },
    });
  return {
    signature: sig,
    network: "devnet" as Network,
    status: { confirmationStatus: "finalized", err: null },
    raw: {
      slot: 101,
      blockTime: 1760000001,
      version: 0,
      transaction: {
        signatures: [sig],
        message: {
          accountKeys: [sender, recipient, srcToken, dstToken, TOKEN],
          instructions: [
            {
              programId: TOKEN,
              parsed: {
                type: "transferChecked",
                info: {
                  source: srcToken,
                  destination: dstToken,
                  mint,
                  authority: sender,
                  tokenAmount: { amount, decimals: 6 },
                },
              },
            },
          ],
        },
      },
      meta: {
        err: null,
        fee: 5000,
        preBalances: ["1000000000", "0", "2039280", "2039280", "1"],
        postBalances: ["999995000", "0", "2039280", "2039280", "1"],
        preTokenBalances: [row(2, sender, "100000000"), row(3, recipient, "0")],
        postTokenBalances: [
          row(2, sender, (100000000n - BigInt(amount)).toString()),
          row(3, recipient, amount),
        ],
        innerInstructions: [],
      },
    },
  };
}
export const cases = [
  solCase(),
  tokenCase(),
  solCase(3, "1000000", true),
  tokenCase(4, "50000000", other),
  { ...solCase(5), status: { confirmationStatus: "confirmed", err: null } },
];
export const swapCase = (() => {
  const c = tokenCase(6);
  c.raw.transaction.message.instructions.push({
    programId: JUPITER,
    parsed: { type: "route", info: {} },
  } as never);
  return c;
})();
cases.push(swapCase);
export function fixtureBySignature(sig: string, network: Network) {
  return cases.find((c) => c.signature === sig && c.network === network);
}

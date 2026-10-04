import { describe, expect, it } from "vitest";
import { transactionInput, validBase58 } from "../../src/core/input";
import { parseAmount, formatAmount } from "../../src/core/amount";
import { normalizeTransaction } from "../../src/core/normalize";
import { comparePayment } from "../../src/core/compare";
import { validNarrative } from "../../src/backend/explain";
import { SYSTEM, USDC } from "../../src/solana/constants";
import {
  solCase,
  tokenCase,
  recipient,
  sender,
  other,
  signature,
  swapCase,
} from "../fixtures/cases";
const normalized = (c = solCase()) =>
  normalizeTransaction(c.signature, c.network, c.raw, c.status);
const expected = (asset: "SOL" | "USDC" = "SOL", amount = "0.001") => ({
  network: "devnet" as const,
  recipient,
  asset,
  amount,
});
describe("Input boundaries", () => {
  it("uses explicit link network and does not fetch arbitrary URLs", () => {
    expect(
      transactionInput(
        `https://explorer.solana.com/tx/${signature(1)}?cluster=devnet`,
        "mainnet",
      ).network,
    ).toBe("devnet");
    expect(
      transactionInput(`https://solscan.io/tx/${signature(1)}`, "devnet")
        .network,
    ).toBe("mainnet");
    expect(transactionInput(signature(1), "devnet").network).toBe("devnet");
  });
  it.each([
    `https://solscan.io.evil.com/tx/${signature(1)}`,
    `http://solscan.io/tx/${signature(1)}`,
    `https://user@solscan.io/tx/${signature(1)}`,
    `https://solscan.io:443/tx/${signature(1)}?cluster=custom`,
    `https://explorer.solana.com/tx/${signature(1)}?cluster=devnet&cluster=mainnet`,
    `https://explorer.solana.com/address/${recipient}`,
    recipient,
  ])("rejects invalid input %s", (value) =>
    expect(() => transactionInput(value)).toThrow(),
  );
  it("validates decoded byte length", () => {
    expect(validBase58(recipient, 32)).toBe(true);
    expect(validBase58(signature(1), 32)).toBe(false);
  });
});
describe("Exact quantities", () => {
  it("accepts decimal comma without float rounding", () => {
    expect(parseAmount("50,000001", 6)).toBe(50000001n);
    expect(formatAmount("50000000", 6)).toBe("50");
    expect(formatAmount("1", 9)).toBe("0,000000001");
  });
  it("keeps integers above Number.MAX_SAFE_INTEGER", () => {
    expect(parseAmount("9007199254.740993", 6)).toBe(9007199254740993n);
    expect(formatAmount("9007199254740993", 6, "en")).toBe("9007199254.740993");
  });
  it.each([
    "1e3",
    "-1",
    "0",
    "1.000,5",
    "1,000,000",
    "NaN",
    "Infinity",
    "0.0000001",
  ])("rejects ambiguous/invalid USDC amount %s", (value) =>
    expect(() => parseAmount(value, 6)).toThrow(),
  );
});
describe("Evidence normalization", () => {
  it("records fee payer separately and preserves direct transfer evidence", () => {
    const a = normalized();
    expect(a.feeAtomic).toBe("5000");
    expect(a.movements[0]).toMatchObject({
      atomic: "1000000",
      from: sender,
      to: recipient,
      executed: true,
      evidence: "instruction:0",
    });
    expect(a.balances.find((b) => b.address === sender)?.delta).toBe(
      "-1005000",
    );
  });
  it("never displays attempted failed transfers as executed", () => {
    const a = normalized(solCase(3, "1000000", true));
    expect(a.state).toBe("failed");
    expect(a.movements.every((m) => !m.executed)).toBe(true);
    expect(a.balances.find((b) => b.address === recipient)).toBeUndefined();
  });
  it("uses mint identity, not a copied USDC name", () => {
    const c = tokenCase(4, "50000000", other),
      a = normalizeTransaction(c.signature, c.network, c.raw, c.status);
    expect(a.movements[0].asset).toBe("TOKEN");
    expect(a.movements[0].mint).toBe(other);
  });
  it("does not infer swap solely from balance changes", () => {
    const a = normalized();
    a.balances.push({
      address: other,
      owner: sender,
      asset: "USDC",
      mint: USDC.devnet,
      pre: "0",
      post: "50",
      delta: "50",
      decimals: 6,
    });
    expect(a.category).toBe("transfer");
  });
  it("recognizes Jupiter but labels uncertain intent", () => {
    const a = normalizeTransaction(
      swapCase.signature,
      swapCase.network,
      swapCase.raw,
      swapCase.status,
    );
    expect(a.category).toBe("swap");
    expect(a.completeness).toBe("partial");
  });
  it("marks missing owner as partial instead of guessing signer", () => {
    const c = tokenCase();
    delete (c.raw.meta.preTokenBalances[1] as { owner?: string }).owner;
    delete (c.raw.meta.postTokenBalances[1] as { owner?: string }).owner;
    const a = normalizeTransaction(c.signature, c.network, c.raw, c.status);
    expect(a.completeness).toBe("partial");
    expect(a.movements[0].to).toBeNull();
  });
  it("null is unknown, not failed or zero", () => {
    const a = normalizeTransaction(signature(8), "devnet", null, null);
    expect(a.state).toBe("unknown");
    expect(a.feeAtomic).toBeNull();
    expect(a.movements).toEqual([]);
  });
  it("processed without full data remains pending", () =>
    expect(
      normalizeTransaction(signature(8), "devnet", null, {
        confirmationStatus: "processed",
        err: null,
      }).state,
    ).toBe("pending"));
  it("missing meta is partial unknown", () => {
    const c = solCase();
    (c.raw as { meta: unknown }).meta = null;
    const a = normalized(c);
    expect(a.state).toBe("unknown");
    expect(a.completeness).toBe("partial");
  });
  it("unknown program closes full-decode gate", () => {
    const c = solCase();
    c.raw.transaction.message.instructions.push({
      programId: other,
      parsed: {
        type: "transfer",
        info: { source: sender, destination: recipient, lamports: "1" },
      },
    });
    expect(normalized(c).completeness).toBe("partial");
  });
  it("rejects RPC signature substitution", () => {
    const c = solCase();
    c.raw.transaction.signatures[0] = signature(9);
    expect(() => normalized(c)).toThrow("RPC_INVALID_DATA");
  });
  it("does not invent token balance zero from absent history", () => {
    const c = tokenCase();
    c.raw.meta.preTokenBalances = [];
    const a = normalizeTransaction(c.signature, c.network, c.raw, c.status);
    expect(a.warnings).toContain("token-balance-history-incomplete");
  });
  it("rejects unsupported versions", () => {
    const c = tokenCase();
    c.raw.version = 1;
    expect(() =>
      normalizeTransaction(c.signature, c.network, c.raw, c.status),
    ).toThrow("UNSUPPORTED_VERSION");
  });
});
describe("Payment comparison", () => {
  it("matches only a successful finalized evidenced transfer", () =>
    expect(comparePayment(normalized(), expected()).verdict).toBe("matched"));
  it.each([
    ["0.002", "underpaid"],
    ["0.0005", "overpaid"],
  ])("compares %s precisely", (amount, verdict) =>
    expect(comparePayment(normalized(), expected("SOL", amount)).verdict).toBe(
      verdict,
    ),
  );
  it("compares canonical USDC", () => {
    const c = tokenCase();
    expect(
      comparePayment(
        normalizeTransaction(c.signature, c.network, c.raw, c.status),
        expected("USDC", "50"),
      ).verdict,
    ).toBe("matched");
  });
  it("does not match non-finalized transfers", () => {
    const a = normalized();
    a.finality = "confirmed";
    expect(comparePayment(a, expected()).verdict).toBe("pending");
  });
  it("does not match failed, unknown, partial, swap or archived facts", () => {
    for (const kind of ["failed", "unknown", "partial", "swap", "archive"]) {
      const a = normalized();
      if (kind === "failed" || kind === "unknown") a.state = kind;
      else if (kind === "partial") a.completeness = "partial";
      else if (kind === "swap") a.category = "swap";
      else a.source = "archive";
      expect(comparePayment(a, expected()).verdict).not.toBe("matched");
    }
  });
  it("separates network, recipient and token mismatch", () => {
    expect(
      comparePayment(normalized(), { ...expected(), network: "mainnet" })
        .verdict,
    ).toBe("wrong-network");
    expect(
      comparePayment(normalized(), { ...expected(), recipient: other }).verdict,
    ).toBe("wrong-recipient");
    expect(comparePayment(normalized(), expected("USDC", "50")).verdict).toBe(
      "wrong-token",
    );
  });
  it("does not count mint or rent refund as payment", () => {
    const a = normalized();
    a.movements.push({ ...a.movements[0], kind: "close-account" });
    expect(comparePayment(a, expected()).verdict).toBe("insufficient");
  });
  it("detects received-and-sent-back ambiguity", () => {
    const a = normalized();
    a.movements.push({ ...a.movements[0], from: recipient, to: sender });
    expect(comparePayment(a, expected()).verdict).toBe("insufficient");
  });
  it("does not match transfers inconsistent with actual balance evidence", () => {
    const a = normalized();
    a.balances = a.balances.filter((b) => b.address !== recipient);
    expect(comparePayment(a, expected()).verdict).toBe("insufficient");
  });
  it("adds multiple real transfer instructions, not duplicate appearances", () => {
    const c = solCase(10, "2000000");
    c.raw.transaction.message.instructions = [
      {
        programId: SYSTEM,
        parsed: {
          type: "transfer",
          info: { source: sender, destination: recipient, lamports: "1000000" },
        },
      },
      {
        programId: SYSTEM,
        parsed: {
          type: "transfer",
          info: { source: sender, destination: recipient, lamports: "1000000" },
        },
      },
    ];
    expect(
      comparePayment(normalized(c), expected("SOL", "0.002")).verdict,
    ).toBe("matched");
  });
});
describe("AI boundary", () => {
  it("rejects numeric inventions and claims of safety", () => {
    expect(validNarrative(["Bạn đã nhận 100 USDC."], normalized(), "vi")).toBe(
      false,
    );
    expect(
      validNarrative(
        ["Giao dịch bảo đảm an toàn tuyệt đối."],
        normalized(),
        "vi",
      ),
    ).toBe(false);
  });
  it("rejects success claims for failed and language mismatch", () => {
    expect(
      validNarrative(
        ["Giao dịch đã thành công."],
        normalized(solCase(3, "1000000", true)),
        "vi",
      ),
    ).toBe(false);
    expect(
      validNarrative(
        ["The network processed this transfer."],
        normalized(),
        "vi",
      ),
    ).toBe(false);
  });
  it("accepts bounded explanation without changing facts", () =>
    expect(
      validNarrative(
        ["Kiểm tra đúng ví nhận trước khi đối chiếu khoản chuyển."],
        normalized(),
        "vi",
      ),
    ).toBe(true));
});

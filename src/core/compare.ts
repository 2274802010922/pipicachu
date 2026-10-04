import type {
  Analysis,
  Comparison,
  Expectation,
  Verdict,
} from "../shared/types";
import { parseAmount } from "./amount";
import { validBase58 } from "./input";
import { AppError } from "../shared/errors";
export function comparePayment(a: Analysis, expected: Expectation): Comparison {
  if (!validBase58(expected.recipient, 32))
    throw new AppError("INVALID_RECIPIENT");
  const expectedAtomic = parseAmount(
    expected.amount,
    expected.asset === "SOL" ? 9 : 6,
  ).toString();
  const checks: Comparison["checks"] = {
    network: a.network === expected.network,
    recipient: null,
    token: null,
    amount: null,
    finalized: a.finality === "finalized",
  };
  const result = (
    verdict: Verdict,
    received: bigint | null = null,
  ): Comparison => ({
    verdict,
    expectedAtomic,
    receivedAtomic: received?.toString() ?? null,
    differenceAtomic:
      received === null ? null : (received - BigInt(expectedAtomic)).toString(),
    checks,
  });
  if (!checks.network) return result("wrong-network");
  if (a.state === "failed") return result("failed");
  if (a.state === "unknown") return result("insufficient");
  if (a.state === "pending") return result("pending");
  if (
    a.source !== "live" ||
    a.category !== "transfer" ||
    a.completeness !== "full"
  )
    return result("insufficient");
  const transfers = a.movements.filter(
    (m) => m.kind === "transfer" && m.executed,
  );
  if (
    !transfers.length ||
    transfers.some(
      (m) => !m.to || !m.from || m.atomic === null || m.decimals === null,
    )
  )
    return result("insufficient");
  if (
    a.movements.some(
      (m) =>
        m.kind === "mint" ||
        m.kind === "burn" ||
        m.kind === "approval" ||
        m.kind === "close-account",
    )
  )
    return result("insufficient");
  const received = transfers.filter((m) => m.to === expected.recipient);
  checks.recipient = received.length > 0;
  if (!checks.recipient) return result("wrong-recipient");
  const assetTransfers = received.filter(
    (m) =>
      m.asset === expected.asset &&
      m.decimals === (expected.asset === "SOL" ? 9 : 6),
  );
  checks.token = assetTransfers.length > 0;
  if (!checks.token) return result("wrong-token");
  if (
    transfers.some(
      (m) => m.from === expected.recipient && m.asset === expected.asset,
    )
  )
    return result("insufficient");
  const amount = assetTransfers.reduce(
    (total, m) => total + BigInt(m.atomic!),
    0n,
  );
  const deltas = a.balances.filter(
    (b) =>
      b.asset === expected.asset &&
      (expected.asset === "SOL"
        ? b.address === expected.recipient
        : b.owner === expected.recipient),
  );
  if (!deltas.length) return result("insufficient");
  let observed = deltas.reduce((n, b) => n + BigInt(b.delta), 0n);
  if (
    expected.asset === "SOL" &&
    a.feePayer === expected.recipient &&
    a.feeAtomic !== null
  )
    observed += BigInt(a.feeAtomic);
  if (observed < amount) return result("insufficient");
  checks.amount = amount === BigInt(expectedAtomic);
  if (!checks.finalized) return result("pending", amount);
  return result(
    amount < BigInt(expectedAtomic)
      ? "underpaid"
      : amount > BigInt(expectedAtomic)
        ? "overpaid"
        : "matched",
    amount,
  );
}

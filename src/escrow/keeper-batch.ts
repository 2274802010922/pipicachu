import type { Deal } from "./client";
export type KeeperRetry = {
  failureCount: number;
  nextRetryAt: number;
  errorCode?: string;
  signature?: string;
  lastValidBlockHeight?: number;
};
export type KeeperResult = {
  deal: string;
  state:
    | "completed"
    | "blocked"
    | "failed"
    | "submitted_pending"
    | "skipped_changed"
    | "leased";
  signature?: string;
  errorCode?: string;
  lastValidBlockHeight?: number;
};
export function selectKeeperCandidates(
  deals: Deal[],
  retry: Record<string, KeeperRetry>,
  now: number,
  force?: string,
  maximum = 5,
) {
  return deals
    .filter(
      (d) =>
        d.address === force ||
        !retry[d.address] ||
        retry[d.address].nextRetryAt <= now,
    )
    .sort(
      (a, b) =>
        (a.address === force ? -1 : b.address === force ? 1 : 0) ||
        (retry[a.address]?.failureCount || 0) -
          (retry[b.address]?.failureCount || 0) ||
        a.reviewBy - b.reviewBy,
    )
    .slice(0, maximum);
}
export async function runKeeperBatch(
  deals: Deal[],
  retry: Record<string, KeeperRetry>,
  run: (d: Deal, previous?: KeeperRetry) => Promise<KeeperResult>,
  now = Date.now(),
  force?: string,
) {
  const results: KeeperResult[] = [];
  for (const deal of selectKeeperCandidates(deals, retry, now, force)) {
    let result: KeeperResult;
    try {
      result = await run(deal, retry[deal.address]);
    } catch {
      result = {
        deal: deal.address,
        state: "failed",
        errorCode: "KEEPER_DEAL_UNAVAILABLE",
      };
    }
    results.push(result);
    if (result.state === "completed" || result.state === "skipped_changed") {
      delete retry[deal.address];
      continue;
    }
    const old = retry[deal.address],
      failureCount = ["blocked", "failed"].includes(result.state)
        ? (old?.failureCount || 0) + 1
        : old?.failureCount || 0;
    const delay =
      result.state === "blocked"
        ? Math.min(30, 10 + 5 * (failureCount - 1)) * 60000
        : 300000;
    retry[deal.address] = {
      failureCount,
      nextRetryAt: now + delay,
      errorCode: result.errorCode,
      signature: result.signature,
      lastValidBlockHeight: result.lastValidBlockHeight,
    };
  }
  return { results, retry };
}

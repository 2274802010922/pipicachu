import type { Deal } from "./client";
export function eligibleForAutomaticRelease(
  deal: Pick<Deal, "state" | "reviewBy">,
  networkTime: number,
): boolean {
  return (
    deal.state === "delivered" &&
    Number.isSafeInteger(deal.reviewBy) &&
    deal.reviewBy > 0 &&
    Number.isSafeInteger(networkTime) &&
    networkTime >= deal.reviewBy
  );
}

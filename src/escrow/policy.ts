import type { Deal } from "./client";
export function actions(d: Deal, who: string | null, now: number): string[] {
  if (!who) return [];
  const result: string[] = [];
  if (d.state === "created") {
    if (now < d.fundBy) {
      if (
        (who === d.primary && !(d.approvals & 1)) ||
        (who === d.backup && !(d.approvals & 2))
      )
        result.push("accept_deal");
      if (who === d.buyer && d.approvals === 3) result.push("fund");
    }
    if (who === d.seller || now >= d.fundBy) result.push("cancel_deal");
  }
  if (d.state === "funded") {
    if (now < d.deliverBy && who === d.seller) result.push("deliver");
    if (now >= d.deliverBy) result.push("refund_expired");
  }
  if (d.state === "delivered") {
    if (who === d.buyer) result.push("confirm");
    if (now < d.reviewBy && who === d.buyer) result.push("dispute");
    if (now >= d.reviewBy) result.push("finalize");
  }
  if (d.state === "disputed") {
    if (
      (now < d.arbitrateBy && who === d.primary) ||
      (now >= d.arbitrateBy &&
        now < d.arbitrateBy + d.arbitrationSeconds &&
        who === d.backup)
    )
      result.push("resolve_seller", "resolve_buyer");
    if (now >= d.arbitrateBy + d.arbitrationSeconds) {
      if (who === d.buyer) result.push("propose_seller", "propose_buyer");
      if (who === d.seller && d.proposal) result.push("accept_settlement");
    }
  }
  return result;
}

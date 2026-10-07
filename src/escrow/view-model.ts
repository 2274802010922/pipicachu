import type { Deal } from "./client";
import { actions } from "./policy";
import { eligibleForAutomaticRelease } from "./keeper";
export type WalletRole =
  "buyer" | "seller" | "arbitrator" | "viewer" | "disconnected";
export function currentDealStep(
  deal: Pick<Deal, "state" | "approvals" | "workflowVersion">,
  bondReady: boolean,
): number {
  if (deal.workflowVersion === 1) {
    if (deal.state === "created") return 1;
    if (deal.state === "funded") return 2;
    if (["delivered", "disputed"].includes(deal.state)) return 3;
    return -1;
  }
  if (deal.state === "created")
    return deal.approvals === 1 && bondReady ? 2 : 1;
  if (deal.state === "funded") return 3;
  if (["delivered", "disputed"].includes(deal.state)) return 4;
  return -1;
}
export function dealViewModel(
  deal: Deal,
  wallet: string | null,
  networkTime: number,
  context: {
    fresh: boolean;
    bondReady: boolean;
    organizationReady: boolean;
    busy?: boolean;
  },
) {
  const role: WalletRole = !wallet
    ? "disconnected"
    : wallet === deal.buyer
      ? "buyer"
      : wallet === deal.seller
        ? "seller"
        : wallet === deal.arbitrator
          ? "arbitrator"
          : "viewer";
  const terminal = ["completed", "refunded", "cancelled"].includes(deal.state);
  const deadline =
    deal.state === "created"
      ? deal.fundBy
      : deal.state === "funded"
        ? deal.deliverBy
        : deal.state === "delivered"
          ? deal.reviewBy
          : deal.state === "disputed"
            ? deal.arbitrateBy
            : 0;
  const expired = context.fresh && deadline > 0 && networkTime >= deadline;
  const step = currentDealStep(deal, context.bondReady);
  const waitingForKeeper =
    context.fresh && eligibleForAutomaticRelease(deal, networkTime);
  const lateArbitration =
    deal.state === "disputed" && expired && deal.resolutionPolicyVersion === 1;
  const stage = terminal
    ? "ended"
    : deal.state === "created"
      ? deal.workflowVersion !== 1 && step === 1
        ? "bond"
        : "fund"
      : deal.state === "funded"
        ? "deliver"
        : deal.state === "delivered"
          ? waitingForKeeper
            ? "release"
            : "review"
          : "dispute";
  const nextActor:
    | Exclude<WalletRole, "viewer" | "disconnected">
    | "keeper"
    | "anyone"
    | null = terminal
    ? null
    : stage === "bond"
      ? "arbitrator"
      : stage === "fund"
        ? "buyer"
        : stage === "deliver"
          ? expired
            ? "anyone"
            : "seller"
          : stage === "release"
            ? "keeper"
            : stage === "review"
              ? "buyer"
              : !expired || lateArbitration
                ? "arbitrator"
                : deal.proposal
                  ? "seller"
                  : "buyer";
  const available =
    context.fresh && !context.busy
      ? actions(deal, wallet, networkTime).filter(
          (a) =>
            a !== "fund" || (context.bondReady && context.organizationReady),
        )
      : [];
  const primary =
    available.find((a) =>
      [
        "fund",
        "deliver",
        "confirm",
        "refund_expired",
        "accept_settlement",
      ].includes(a),
    ) || null;
  return {
    role,
    stage,
    nextActor,
    step,
    terminal,
    deadline,
    expired,
    waitingForKeeper,
    lateArbitration,
    available,
    primary,
    manualFinalize: available.includes("finalize"),
    remaining: Math.max(0, deadline - networkTime),
  };
}

export function completedDealSteps(
  deal: Pick<Deal, "state" | "workflowVersion" | "deliveryHash">,
): number[] {
  const organization = deal.workflowVersion === 1;
  if (deal.state === "completed")
    return organization ? [0, 1, 2, 3] : [0, 1, 2, 3, 4];
  if (deal.state === "cancelled") return [0];
  if (deal.state === "refunded") {
    const delivered = !!deal.deliveryHash && !/^0+$/.test(deal.deliveryHash);
    return organization
      ? delivered
        ? [0, 1, 2]
        : [0, 1]
      : delivered
        ? [0, 1, 2, 3]
        : [0, 1, 2];
  }
  return [];
}

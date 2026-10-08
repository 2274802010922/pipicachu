export const STATES = [
  "created",
  "funded",
  "delivered",
  "disputed",
  "completed",
  "refunded",
  "cancelled",
] as const;
export type Deal = {
  address: string;
  seller: string;
  buyer: string;
  arbitrator: string;
  mint: string;
  nonce: bigint;
  amount: bigint;
  bond: bigint;
  fee: bigint;
  platformFee: bigint;
  feeVersion: number;
  workflowVersion?: number;
  resolutionPolicyVersion?: number;
  createdAt: number;
  fundBy: number;
  deliverySeconds: number;
  reviewSeconds: number;
  arbitrationSeconds: number;
  deliverBy: number;
  reviewBy: number;
  arbitrateBy: number;
  state: (typeof STATES)[number];
  approvals: number;
  bump: number;
  proposal: number;
  deliveryHash: string;
  disputeHash: string;
  resolutionHash: string;
  terms: string;
};
export type Arbitrator = {
  authority: string;
  mint: string;
  total: bigint;
  locked: bigint;
  bump: number;
};
export type Organization = {
  authority: string;
  mint: string;
  approved: boolean;
  accepting: boolean;
  minimumDeposit: bigint;
  maximumDeal: bigint;
  times: number[];
  bump: number;
};

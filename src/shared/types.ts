export type Network = "mainnet" | "devnet";
export type Locale = "vi" | "en";
export type TxState = "success" | "failed" | "pending" | "unknown";
export type Finality = "processed" | "confirmed" | "finalized" | "unknown";
export type Asset = "SOL" | "USDC" | "TOKEN";
export interface Movement {
  kind:
    | "transfer"
    | "create-account"
    | "close-account"
    | "mint"
    | "burn"
    | "approval";
  asset: Asset;
  mint: string | null;
  decimals: number | null;
  atomic: string | null;
  from: string | null;
  to: string | null;
  fromAccount: string | null;
  toAccount: string | null;
  evidence: string;
  executed: boolean;
}
export interface BalanceChange {
  address: string;
  owner: string | null;
  asset: Asset;
  mint: string | null;
  decimals: number;
  pre: string;
  post: string;
  delta: string;
}
export interface Analysis {
  signature: string;
  network: Network;
  state: TxState;
  finality: Finality;
  slot: string | null;
  blockTime: number | null;
  feeAtomic: string | null;
  feePayer: string | null;
  error: string | null;
  movements: Movement[];
  balances: BalanceChange[];
  programs: string[];
  category: "transfer" | "swap" | "other";
  completeness: "full" | "partial";
  warnings: string[];
  source: "live" | "archive";
  observedAt: string;
  decoderVersion: string;
}
export interface Expectation {
  network: Network;
  recipient: string;
  asset: "SOL" | "USDC";
  amount: string;
}
export type Verdict =
  | "matched"
  | "underpaid"
  | "overpaid"
  | "wrong-network"
  | "wrong-recipient"
  | "wrong-token"
  | "failed"
  | "pending"
  | "insufficient";
export interface Comparison {
  verdict: Verdict;
  expectedAtomic: string;
  receivedAtomic: string | null;
  differenceAtomic: string | null;
  checks: {
    network: boolean;
    recipient: boolean | null;
    token: boolean | null;
    amount: boolean | null;
    finalized: boolean;
  };
}
export interface Explanation {
  lines: string[];
  source: "ai" | "template";
  model?: string;
  reason?: string;
}

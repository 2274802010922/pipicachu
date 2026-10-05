import { Buffer } from "buffer";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import deployment from "./deployment.json";

export const PROGRAM_ID = new PublicKey(deployment.programId);
export const MINT = new PublicKey(deployment.mint);
export const CONFIG = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  PROGRAM_ID,
)[0];
export const FEE_CONFIG = PublicKey.findProgramAddressSync(
  [Buffer.from("platform_fee_v1")],
  PROGRAM_ID,
)[0];
export async function readFeeTreasury(c: Connection): Promise<PublicKey> {
  const info = await c.getAccountInfo(FEE_CONFIG, "confirmed");
  if (!info || !info.owner.equals(PROGRAM_ID))
    throw new Error("PLATFORM_FEE_NOT_CONFIGURED");
  await assertAccount(info.data, "FeeConfig");
  return new PublicKey(info.data.subarray(8, 40));
}
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
export function arbAddress(who: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("arb"), who.toBuffer()],
    PROGRAM_ID,
  )[0];
}
export function bondAddress(arb: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bond"), arb.toBuffer()],
    PROGRAM_ID,
  )[0];
}
export function dealAddress(seller: PublicKey, nonce: bigint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("deal"), seller.toBuffer(), u64(nonce)],
    PROGRAM_ID,
  )[0];
}
export function vaultAddress(deal: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), deal.toBuffer()],
    PROGRAM_ID,
  )[0];
}
export function u64(n: bigint) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}
export function i64(n: number) {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(n));
  return b;
}
export function stringBytes(s: string) {
  const b = Buffer.from(s);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(b.length);
  return Buffer.concat([len, b]);
}
export async function digest(text: string) {
  return Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
  );
}
export async function instruction(
  name: string,
  keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
  args: Buffer = Buffer.alloc(0),
) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data: Buffer.concat([
      (await digest(`global:${name}`)).subarray(0, 8),
      args,
    ]),
  });
}
export const key = (
  pubkey: PublicKey,
  isWritable = false,
  isSigner = false,
) => ({ pubkey, isWritable, isSigner });
export function parseAmount(value: string): bigint {
  if (!/^\d+(?:[.,]\d{1,6})?$/.test(value.trim()))
    throw new Error("INVALID_AMOUNT");
  const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
  const n = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (n <= 0n || n > 1_000_000_000_000n) throw new Error("INVALID_AMOUNT");
  return n;
}
export function amount(n: bigint) {
  const whole = n / 1_000_000n;
  const f = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return whole.toString() + (f ? "." + f : "");
}
class Reader {
  offset = 8;
  constructor(public b: Buffer) {}
  pub() {
    const p = new PublicKey(this.b.subarray(this.offset, (this.offset += 32)));
    return p.toBase58();
  }
  uint() {
    const n = this.b.readBigUInt64LE(this.offset);
    this.offset += 8;
    return n;
  }
  int() {
    const n = this.b.readBigInt64LE(this.offset);
    this.offset += 8;
    return Number(n);
  }
  byte() {
    return this.b[this.offset++];
  }
  hash() {
    return this.b.subarray(this.offset, (this.offset += 32)).toString("hex");
  }
  text() {
    const len = this.b.readUInt32LE(this.offset);
    this.offset += 4;
    if (len > 512) throw new Error("INVALID_ACCOUNT");
    return this.b.subarray(this.offset, (this.offset += len)).toString("utf8");
  }
}
async function assertAccount(data: Buffer, name: string) {
  if (
    !data
      .subarray(0, 8)
      .equals((await digest(`account:${name}`)).subarray(0, 8))
  )
    throw new Error("INVALID_ACCOUNT");
}
export async function decodeDeal(address: string, data: Buffer): Promise<Deal> {
  await assertAccount(data, "Deal");
  const r = new Reader(data);
  const d = {
    address,
    seller: r.pub(),
    buyer: r.pub(),
    arbitrator: r.pub(),
    mint: r.pub(),
    nonce: r.uint(),
    amount: r.uint(),
    bond: r.uint(),
    fee: r.uint(),
    createdAt: r.int(),
    fundBy: r.int(),
    deliverySeconds: r.int(),
    reviewSeconds: r.int(),
    arbitrationSeconds: r.int(),
    deliverBy: r.int(),
    reviewBy: r.int(),
    arbitrateBy: r.int(),
    state: STATES[r.byte()],
    approvals: r.byte(),
    bump: r.byte(),
    proposal: r.byte(),
    deliveryHash: r.hash(),
    disputeHash: r.hash(),
    resolutionHash: r.hash(),
    terms: r.text(),
    platformFee: r.uint(),
    feeVersion: r.byte(),
    workflowVersion: r.byte(),
  };
  if (
    !d.state ||
    d.feeVersion > 1 ||
    d.workflowVersion > 1 ||
    (d.feeVersion === 0 && d.platformFee !== 0n) ||
    d.mint !== MINT.toBase58() ||
    dealAddress(new PublicKey(d.seller), d.nonce).toBase58() !== address
  )
    throw new Error("INVALID_ACCOUNT");
  return d;
}
export async function readDeal(c: Connection, address: string) {
  const p = new PublicKey(address),
    info = await c.getAccountInfo(p, "confirmed");
  if (!info) throw new Error("DEAL_NOT_FOUND");
  if (!info.owner.equals(PROGRAM_ID)) throw new Error("INVALID_ACCOUNT");
  return decodeDeal(address, info.data);
}
export async function readArbitrator(
  c: Connection,
  who: PublicKey,
): Promise<Arbitrator | null> {
  const a = await c.getAccountInfo(arbAddress(who), "confirmed");
  if (!a) return null;
  if (!a.owner.equals(PROGRAM_ID)) throw new Error("INVALID_ACCOUNT");
  await assertAccount(a.data, "Arbitrator");
  const r = new Reader(a.data);
  return {
    authority: r.pub(),
    mint: r.pub(),
    total: r.uint(),
    locked: r.uint(),
    bump: r.byte(),
  };
}
export async function act(
  name: string,
  actor: PublicKey,
  deal: PublicKey,
  args?: Buffer,
) {
  return instruction(name, [key(actor, false, true), key(deal, true)], args);
}
export async function createDealIx(
  seller: PublicKey,
  buyer: PublicKey,
  arbitrator: PublicKey,
  nonce: bigint,
  value: bigint,
  times: number[],
  terms: string,
) {
  const d = dealAddress(seller, nonce);
  return instruction(
    "create_deal",
    [
      key(seller, true, true),
      key(CONFIG),
      key(MINT),
      key(arbAddress(arbitrator)),
      key(d, true),
      key(vaultAddress(d), true),
      key(TOKEN_PROGRAM_ID),
      key(SystemProgram.programId),
      key(FEE_CONFIG),
      key(organizationAddress(arbitrator)),
    ],
    Buffer.concat([
      u64(nonce),
      buyer.toBuffer(),
      u64(value),
      ...times.map(i64),
      stringBytes(terms),
    ]),
  );
}
export async function bondIx(name: string, actor: PublicKey, value: bigint) {
  const arb = arbAddress(actor);
  return instruction(
    name,
    [
      key(actor, false, true),
      key(arb, true),
      key(MINT),
      key(getAssociatedTokenAddressSync(MINT, actor), true),
      key(bondAddress(arb), true),
      key(TOKEN_PROGRAM_ID),
      key(organizationAddress(actor)),
    ],
    u64(value),
  );
}
export async function registerIx(actor: PublicKey) {
  const arb = arbAddress(actor);
  return instruction("register", [
    key(actor, true, true),
    key(CONFIG),
    key(MINT),
    key(arb, true),
    key(bondAddress(arb), true),
    key(TOKEN_PROGRAM_ID),
    key(SystemProgram.programId),
  ]);
}
export async function fundIx(actor: PublicKey, d: Deal) {
  return instruction("fund", [
    key(actor, false, true),
    key(new PublicKey(d.address), true),
    key(MINT),
    key(arbAddress(new PublicKey(d.arbitrator)), true),
    key(getAssociatedTokenAddressSync(MINT, actor), true),
    key(vaultAddress(new PublicKey(d.address)), true),
    key(TOKEN_PROGRAM_ID),
    key(organizationAddress(new PublicKey(d.arbitrator))),
  ]);
}
export async function settleIxs(
  name: string,
  actor: PublicKey,
  d: Deal,
  args?: Buffer,
  connection?: Connection,
) {
  if (name === "accept_settlement" && args === undefined)
    args = Buffer.from([d.proposal === 1 ? 1 : 0]);
  const treasury = await readFeeTreasury(
    connection ||
      new Connection(
        process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
      ),
  );
  const parties = [d.buyer, d.seller, d.arbitrator].map(
    (p) => new PublicKey(p),
  );
  const atas = parties.map((p) => getAssociatedTokenAddressSync(MINT, p));
  const creates = parties.map((p, i) =>
    createAssociatedTokenAccountIdempotentInstruction(actor, atas[i], p, MINT),
  );
  const platformAta = getAssociatedTokenAddressSync(MINT, treasury, true);
  creates.push(
    createAssociatedTokenAccountIdempotentInstruction(
      actor,
      platformAta,
      treasury,
      MINT,
    ),
  );
  const ix = await instruction(
    name,
    [
      key(actor, false, true),
      key(new PublicKey(d.address), true),
      key(MINT),
      key(arbAddress(parties[2]), true),
      key(vaultAddress(new PublicKey(d.address)), true),
      ...atas.map((p) => key(p, true)),
      key(TOKEN_PROGRAM_ID),
      key(FEE_CONFIG),
      key(platformAta, true),
    ],
    args,
  );
  return [...creates, ix];
}
export function transaction(ixs: TransactionInstruction[]) {
  return new Transaction().add(...ixs);
}

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
export function organizationAddress(authority: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("organization"), authority.toBuffer()],
    PROGRAM_ID,
  )[0];
}
export async function decodeOrganization(data: Buffer): Promise<Organization> {
  await assertAccount(data, "Organization");
  const r = new Reader(data);
  return {
    authority: r.pub(),
    mint: r.pub(),
    approved: r.byte() === 1,
    accepting: r.byte() === 1,
    minimumDeposit: r.uint(),
    maximumDeal: r.uint(),
    times: [r.int(), r.int(), r.int(), r.int()],
    bump: r.byte(),
  };
}
export async function readOrganization(c: Connection, authority: PublicKey) {
  const info = await c.getAccountInfo(
    organizationAddress(authority),
    "confirmed",
  );
  if (!info) return null;
  if (!info.owner.equals(PROGRAM_ID)) throw new Error("INVALID_ACCOUNT");
  const org = await decodeOrganization(info.data);
  if (org.authority !== authority.toBase58() || org.mint !== MINT.toBase58())
    throw new Error("INVALID_ACCOUNT");
  return org;
}
export async function listOrganizations(c: Connection) {
  const rows = await c.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 123 }],
  });
  const result = [];
  for (const row of rows) {
    const org = await decodeOrganization(row.account.data);
    if (
      org.mint === MINT.toBase58() &&
      organizationAddress(new PublicKey(org.authority)).equals(row.pubkey) &&
      org.approved
    )
      result.push(org);
  }
  return result;
}
export async function createOrganizationDealIx(
  seller: PublicKey,
  buyer: PublicKey,
  arbitrator: PublicKey,
  nonce: bigint,
  value: bigint,
  times: number[],
  terms: string,
) {
  const ix = await createDealIx(
    seller,
    buyer,
    arbitrator,
    nonce,
    value,
    times,
    terms,
  );
  ix.data = Buffer.concat([
    (await digest("global:create_organization_deal")).subarray(0, 8),
    ix.data.subarray(8),
  ]);
  return ix;
}
export async function organizationAcceptingIx(
  actor: PublicKey,
  accepting: boolean,
) {
  return instruction(
    "set_organization_accepting",
    [
      key(actor, false, true),
      key(organizationAddress(actor), true),
      key(arbAddress(actor)),
    ],
    Buffer.from([accepting ? 1 : 0]),
  );
}
export async function approveOrganizationIx(
  manager: PublicKey,
  authority: PublicKey,
  minimum: bigint,
  maximum: bigint,
  times: number[],
) {
  return instruction(
    "approve_organization",
    [
      key(manager, true, true),
      key(arbAddress(authority)),
      key(MINT),
      key(organizationAddress(authority), true),
      key(SystemProgram.programId),
    ],
    Buffer.concat([u64(minimum), u64(maximum), ...times.map(i64)]),
  );
}
export async function organizationApprovalIx(
  manager: PublicKey,
  authority: PublicKey,
  approved: boolean,
) {
  return instruction(
    "set_organization_approval",
    [key(manager, false, true), key(organizationAddress(authority), true)],
    Buffer.from([approved ? 1 : 0]),
  );
}

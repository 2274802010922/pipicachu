import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import idl from "../../client/idl/escrow.json";
import { MINT } from "./constants";
import { STATES, type Deal, type Arbitrator, type Organization } from "./types";
import { dealAddress } from "./addresses";
export class Reader {
  offset = 8;
  constructor(public b: Buffer) {}
  requireBytes(count: number) {
    if (
      !Number.isSafeInteger(count) ||
      count < 0 ||
      this.offset + count > this.b.length
    )
      throw Error("INVALID_ACCOUNT");
  }
  pub() {
    this.requireBytes(32);
    const p = new PublicKey(this.b.subarray(this.offset, (this.offset += 32)));
    return p.toBase58();
  }
  uint() {
    this.requireBytes(8);
    const n = this.b.readBigUInt64LE(this.offset);
    this.offset += 8;
    return n;
  }
  int() {
    this.requireBytes(8);
    const n = this.b.readBigInt64LE(this.offset);
    this.offset += 8;
    const value = Number(n);
    if (!Number.isSafeInteger(value)) throw Error("INVALID_ACCOUNT");
    return value;
  }
  byte() {
    this.requireBytes(1);
    return this.b[this.offset++];
  }
  hash() {
    this.requireBytes(32);
    return this.b.subarray(this.offset, (this.offset += 32)).toString("hex");
  }
  text() {
    this.requireBytes(4);
    const len = this.b.readUInt32LE(this.offset);
    this.offset += 4;
    if (len > 512) throw new Error("INVALID_ACCOUNT");
    this.requireBytes(len);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(
        this.b.subarray(this.offset, (this.offset += len)),
      );
    } catch {
      throw Error("INVALID_ACCOUNT");
    }
  }
}
export async function assertAccount(data: Buffer, name: string) {
  const spec = idl.accounts.find((account) => account.name === name);
  if (
    !spec ||
    data.length < 8 ||
    !data.subarray(0, 8).equals(Buffer.from(spec.discriminator))
  )
    throw Error("INVALID_ACCOUNT");
}
export async function decodeArbitrator(
  data: Buffer,
  authority?: string,
): Promise<Arbitrator> {
  if (data.length !== 90) throw Error("INVALID_ACCOUNT");
  await assertAccount(data, "Arbitrator");
  const r = new Reader(data);
  const result = {
    authority: r.pub(),
    mint: r.pub(),
    total: r.uint(),
    locked: r.uint(),
    bump: r.byte(),
  };
  if (
    (authority && result.authority !== authority) ||
    result.mint !== MINT.toBase58() ||
    result.locked > result.total
  )
    throw Error("INVALID_ACCOUNT");
  return result;
}
export async function decodeDeal(address: string, data: Buffer): Promise<Deal> {
  if (data.length !== 876) throw Error("INVALID_ACCOUNT");
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
    resolutionPolicyVersion: r.byte(),
  };
  if (
    !d.state ||
    d.amount === 0n ||
    d.fee + d.platformFee > d.amount ||
    d.approvals > 1 ||
    d.proposal > 2 ||
    d.feeVersion > 1 ||
    d.workflowVersion > 1 ||
    d.resolutionPolicyVersion > 1 ||
    (d.feeVersion === 0 && d.platformFee !== 0n) ||
    d.mint !== MINT.toBase58() ||
    dealAddress(new PublicKey(d.seller), d.nonce).toBase58() !== address
  )
    throw new Error("INVALID_ACCOUNT");
  return d;
}
export async function decodeOrganization(data: Buffer): Promise<Organization> {
  if (data.length !== 123) throw Error("INVALID_ACCOUNT");
  await assertAccount(data, "Organization");
  const r = new Reader(data);
  return {
    authority: r.pub(),
    mint: r.pub(),
    approved: bool(r.byte()),
    accepting: bool(r.byte()),
    minimumDeposit: r.uint(),
    maximumDeal: r.uint(),
    times: [r.int(), r.int(), r.int(), r.int()],
    bump: r.byte(),
  };
}

function bool(value: number) {
  if (value > 1) throw Error("INVALID_ACCOUNT");
  return value === 1;
}

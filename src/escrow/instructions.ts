import idl from "../../client/idl/escrow.json";
import { Buffer } from "buffer";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  PROGRAM_ID,
  MINT,
  CONFIG,
  FEE_CONFIG,
  MANAGER_CONFIG,
} from "./constants";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "./token";
import { digest, u64, i64, stringBytes } from "./binary";
import {
  arbAddress,
  organizationAddress,
  bondAddress,
  dealAddress,
  vaultAddress,
} from "./addresses";
import { readFeeTreasury, readOrganization } from "./queries";
import type { Deal, Organization } from "./types";
export async function instruction(
  name: string,
  keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
  args: Buffer = Buffer.alloc(0),
) {
  const spec = idl.instructions.find((ix) => ix.name === name);
  if (
    !spec ||
    spec.accounts.length !== keys.length ||
    spec.accounts.some(
      (account, index) =>
        !!("signer" in account && account.signer) !== keys[index].isSigner ||
        !!("writable" in account && account.writable) !==
          keys[index].isWritable,
    )
  )
    throw Error("IDL_ACCOUNT_MISMATCH");
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data: Buffer.concat([Buffer.from(spec.discriminator), args]),
  });
}
export const key = (
  pubkey: PublicKey,
  isWritable = false,
  isSigner = false,
) => ({ pubkey, isWritable, isSigner });
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
  const platformAta = getAssociatedTokenAddressSync(MINT, treasury, true);
  const recipients = new Map<string, { owner: PublicKey; ata: PublicKey }>();
  [...parties, treasury].forEach((owner) => {
    const ata = getAssociatedTokenAddressSync(MINT, owner, true);
    recipients.set(ata.toBase58(), { owner, ata });
  });
  const creates = [...recipients.values()].map(({ owner, ata }) =>
    createAssociatedTokenAccountIdempotentInstruction(actor, ata, owner, MINT),
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
    Buffer.from([1]),
  ]);
  return ix;
}
export async function organizationAcceptingIx(
  actor: PublicKey,
  accepting: boolean,
  source?:
    Connection | Pick<Organization, "minimumDeposit" | "maximumDeal" | "times">,
) {
  const org =
    accepting && source
      ? "getAccountInfo" in source
        ? await readOrganization(source as Connection, actor)
        : source
      : null;
  if (accepting && !org) throw Error("ORGANIZATION_UNAVAILABLE");
  const policy = org
    ? Buffer.concat([
        u64(org.minimumDeposit),
        u64(org.maximumDeal),
        ...org.times.map(i64),
      ])
    : Buffer.alloc(48);
  return instruction(
    "set_organization_accepting",
    [
      key(actor, false, true),
      key(organizationAddress(actor), true),
      key(arbAddress(actor)),
    ],
    Buffer.concat([Buffer.from([accepting ? 1 : 0]), policy]),
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
      key(MANAGER_CONFIG),
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
    [
      key(manager, false, true),
      key(organizationAddress(authority), true),
      key(MANAGER_CONFIG),
    ],
    Buffer.from([approved ? 1 : 0]),
  );
}

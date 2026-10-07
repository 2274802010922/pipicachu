import { Buffer } from "buffer";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { PROGRAM_ID, CONFIG, MINT, MANAGER_CONFIG } from "./constants";
import {
  Reader,
  assertAccount,
  arbAddress,
  organizationAddress,
  instruction,
  key,
  u64,
  i64,
} from "./client";

export { MANAGER_CONFIG } from "./constants";
export type Manager = {
  authority: string;
  pendingAuthority: string | null;
  bump: number;
};
export type Application = {
  address: string;
  authority: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  updatedAt: number;
  reasonCode: number;
  bump: number;
};
export type OrganizationPolicy = {
  minimum: bigint;
  maximum: bigint;
  times: [number, number, number, number];
};
export const DEMO_POLICY: OrganizationPolicy = {
  minimum: 1_000_000n,
  maximum: 10_000_000n,
  times: [1800, 1800, 300, 1800],
};
export function applicationAddress(authority: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("application_v1"), authority.toBuffer()],
    PROGRAM_ID,
  )[0];
}
export async function readManager(c: Connection): Promise<Manager | null> {
  const info = await c.getAccountInfo(MANAGER_CONFIG, "confirmed");
  if (!info) return null;
  if (!info.owner.equals(PROGRAM_ID) || info.data.length !== 73)
    throw Error("INVALID_ACCOUNT");
  await assertAccount(info.data, "ManagerConfig");
  const r = new Reader(info.data),
    authority = r.pub(),
    pending = r.pub();
  if (authority === PublicKey.default.toBase58())
    throw Error("INVALID_ACCOUNT");
  return {
    authority,
    pendingAuthority: pending === PublicKey.default.toBase58() ? null : pending,
    bump: r.byte(),
  };
}
export async function decodeApplication(
  address: string,
  data: Buffer,
): Promise<Application> {
  if (data.length !== 59) throw Error("INVALID_ACCOUNT");
  await assertAccount(data, "ArbitratorApplication");
  const r = new Reader(data),
    authority = r.pub(),
    status = ["pending", "approved", "rejected"] as const,
    index = r.byte(),
    submittedAt = r.int(),
    updatedAt = r.int(),
    reasonCode = r.byte(),
    bump = r.byte();
  if (
    !status[index] ||
    !Number.isSafeInteger(submittedAt) ||
    !Number.isSafeInteger(updatedAt) ||
    applicationAddress(new PublicKey(authority)).toBase58() !== address ||
    reasonCode > 3
  )
    throw Error("INVALID_ACCOUNT");
  return {
    address,
    authority,
    status: status[index],
    submittedAt,
    updatedAt,
    reasonCode,
    bump,
  };
}
export async function readApplication(c: Connection, authority: PublicKey) {
  const address = applicationAddress(authority),
    info = await c.getAccountInfo(address, "confirmed");
  if (!info) return null;
  if (!info.owner.equals(PROGRAM_ID)) throw Error("INVALID_ACCOUNT");
  return decodeApplication(address.toBase58(), info.data);
}
export async function listApplications(c: Connection) {
  const rows = await c.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 59 }],
  });
  return Promise.all(
    rows.map((r) => decodeApplication(r.pubkey.toBase58(), r.account.data)),
  );
}
export function policyBytes(policy: OrganizationPolicy) {
  if (
    policy.minimum < 1_000_000n ||
    policy.minimum > 1_000_000_000_000n ||
    policy.maximum < 1_000_000n ||
    policy.maximum > 1_000_000_000_000n ||
    policy.times.length !== 4 ||
    policy.times.some(
      (n) => !Number.isSafeInteger(n) || n < 10 || n > 30 * 86400,
    )
  )
    throw Error("INVALID_TERMS");
  return Buffer.concat([
    u64(policy.minimum),
    u64(policy.maximum),
    ...policy.times.map(i64),
  ]);
}
export async function initializeManagerIx(
  initializer: PublicKey,
  authority: PublicKey,
) {
  return instruction(
    "initialize_manager",
    [
      key(initializer, true, true),
      key(MANAGER_CONFIG, true),
      key(SystemProgram.programId),
    ],
    authority.toBuffer(),
  );
}
export async function managerActionIx(
  name: "propose_manager" | "accept_manager",
  actor: PublicKey,
  authority?: PublicKey,
) {
  return instruction(
    name,
    [key(actor, false, true), key(MANAGER_CONFIG, true)],
    authority?.toBuffer(),
  );
}
export async function submitApplicationIx(actor: PublicKey) {
  return instruction("submit_arbitrator_application", [
    key(actor, true, true),
    key(arbAddress(actor)),
    key(applicationAddress(actor), true),
    key(SystemProgram.programId),
    key(organizationAddress(actor)),
  ]);
}
export async function approveApplicationIx(
  manager: PublicKey,
  authority: PublicKey,
  policy = DEMO_POLICY,
) {
  return instruction(
    "approve_arbitrator_application",
    [
      key(manager, true, true),
      key(MANAGER_CONFIG),
      key(applicationAddress(authority), true),
      key(arbAddress(authority)),
      key(CONFIG),
      key(MINT),
      key(organizationAddress(authority), true),
      key(SystemProgram.programId),
    ],
    policyBytes(policy),
  );
}
export async function rejectApplicationIx(
  manager: PublicKey,
  authority: PublicKey,
  reasonCode: 1 | 2 | 3,
) {
  return instruction(
    "reject_arbitrator_application",
    [
      key(manager, false, true),
      key(MANAGER_CONFIG),
      key(applicationAddress(authority), true),
    ],
    Buffer.from([reasonCode]),
  );
}
export async function updatePolicyIx(
  manager: PublicKey,
  authority: PublicKey,
  policy: OrganizationPolicy,
) {
  return instruction(
    "update_organization_policy",
    [
      key(manager, false, true),
      key(organizationAddress(authority), true),
      key(MANAGER_CONFIG),
    ],
    policyBytes(policy),
  );
}

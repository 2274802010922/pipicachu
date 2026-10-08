import {
  Connection,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  type AccountInfo,
} from "@solana/web3.js";
import { PROGRAM_ID, MINT, FEE_CONFIG } from "./constants";
import { arbAddress, organizationAddress } from "./addresses";
import {
  assertAccount,
  decodeDeal,
  decodeOrganization,
  decodeArbitrator,
} from "./codec";
import type { Arbitrator } from "./types";
export async function readFeeTreasury(c: Connection): Promise<PublicKey> {
  const info = await c.getAccountInfo(FEE_CONFIG, "confirmed");
  if (!info || !info.owner.equals(PROGRAM_ID) || info.data.length !== 41)
    throw new Error("PLATFORM_FEE_NOT_CONFIGURED");
  await assertAccount(info.data, "FeeConfig");
  return new PublicKey(info.data.subarray(8, 40));
}
export async function readDeal(
  c: Connection,
  address: string,
  commitment: "confirmed" | "finalized" = "confirmed",
) {
  const p = new PublicKey(address),
    info = await c.getAccountInfo(p, commitment);
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
  return decodeArbitrator(a.data, who.toBase58());
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

/** Coalesce identical public reads only while in flight; no stale cache for money decisions. */
const snapshots = new Map<
  string,
  Promise<Awaited<ReturnType<typeof loadDealSnapshot>>>
>();
async function loadDealSnapshot(c: Connection, id: string) {
  const deal = await readDeal(c, id, "finalized");
  const authority = new PublicKey(deal.arbitrator);
  const [arb, org, clock] = await c.getMultipleAccountsInfo(
    [
      arbAddress(authority),
      organizationAddress(authority),
      SYSVAR_CLOCK_PUBKEY,
    ],
    "finalized",
  );
  if (
    !clock ||
    clock.data.length !== 40 ||
    clock.owner.toBase58() !== "Sysvar1111111111111111111111111111111111111"
  )
    throw Error("RPC_UNAVAILABLE");
  const chainTime = Number(clock.data.readBigInt64LE(32));
  if (!Number.isSafeInteger(chainTime)) throw Error("RPC_UNAVAILABLE");
  const checked = (info: AccountInfo<Buffer>) => {
    if (!info.owner.equals(PROGRAM_ID)) throw Error("INVALID_ACCOUNT");
    return info.data;
  };
  const profile = arb
    ? await decodeArbitrator(checked(arb), deal.arbitrator)
    : null;
  const organization = org ? await decodeOrganization(checked(org)) : null;
  if (
    organization &&
    (organization.authority !== deal.arbitrator ||
      organization.mint !== MINT.toBase58())
  )
    throw Error("INVALID_ACCOUNT");
  return { deal, profile, organization, chainTime };
}
export function readDealSnapshot(c: Connection, id: string) {
  const key = c.rpcEndpoint + ":" + id + ":finalized";
  let result = snapshots.get(key);
  if (!result) {
    result = loadDealSnapshot(c, id).finally(() => snapshots.delete(key));
    snapshots.set(key, result);
  }
  return result;
}
export async function readArbitrators(c: Connection, authorities: PublicKey[]) {
  const results: (Arbitrator | null)[] = [];
  for (let offset = 0; offset < authorities.length; offset += 100) {
    const batch = authorities.slice(offset, offset + 100),
      rows = await c.getMultipleAccountsInfo(
        batch.map(arbAddress),
        "finalized",
      );
    if (rows.length !== batch.length) throw Error("RPC_UNAVAILABLE");
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row && !row.owner.equals(PROGRAM_ID)) throw Error("INVALID_ACCOUNT");
      results.push(
        row ? await decodeArbitrator(row.data, batch[i].toBase58()) : null,
      );
    }
  }
  return results;
}

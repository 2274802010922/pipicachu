import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
export const UPGRADE_LOADER = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111",
);
export const PROGRAM_DATA = PublicKey.findProgramAddressSync(
  [PROGRAM_ID.toBuffer()],
  UPGRADE_LOADER,
)[0];
export type ProgramAuthority = {
  state: "immutable" | "upgradeable" | "unknown";
  programId: string;
  programData: string;
  authority: string | null;
  checkedAt: string;
  deployedSlot?: string;
};
export function decodeProgramAuthority(
  owner: string,
  data: Buffer,
): Pick<ProgramAuthority, "state" | "authority" | "deployedSlot"> {
  if (
    owner !== UPGRADE_LOADER.toBase58() ||
    data.length !== 45 ||
    data.readUInt32LE(0) !== 3 ||
    data[12] > 1
  )
    throw Error("INVALID_ACCOUNT");
  return {
    state: data[12] === 0 ? "immutable" : "upgradeable",
    authority:
      data[12] === 1 ? new PublicKey(data.subarray(13, 45)).toBase58() : null,
    deployedSlot: data.readBigUInt64LE(4).toString(),
  };
}

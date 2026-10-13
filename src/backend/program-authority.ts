import { PROGRAM_ID } from "@/escrow/constants";
import {
  PROGRAM_DATA,
  UPGRADE_LOADER,
  decodeProgramAuthority,
  type ProgramAuthority,
} from "@/escrow/program-authority";
import { upstream } from "./rpc";
let cached: ProgramAuthority | null = null;
export async function programAuthority(): Promise<ProgramAuthority> {
  if (cached && Date.now() - Date.parse(cached.checkedAt) < 30000)
    return cached;
  const base = {
    programId: PROGRAM_ID.toBase58(),
    programData: PROGRAM_DATA.toBase58(),
    checkedAt: new Date().toISOString(),
    authority: null,
  };
  try {
    if (
      process.env.PIPICACHU_OFFLINE_TEST === "1" &&
      process.env.VERCEL !== "1"
    )
      throw Error("OFFLINE");
    const result = await upstream(
      "getMultipleAccounts",
      [
        [base.programId, base.programData],
        {
          encoding: "base64",
          commitment: "finalized",
          dataSlice: { offset: 0, length: 45 },
        },
      ],
      1,
    );
    const [program, metadata] = result.result?.value || [];
    if (
      !program?.executable ||
      program.owner !== UPGRADE_LOADER.toBase58() ||
      program.data?.[1] !== "base64" ||
      metadata?.data?.[1] !== "base64" ||
      metadata.executable
    )
      throw Error("INVALID_ACCOUNT");
    const bytes = Buffer.from(program.data[0], "base64");
    if (
      bytes.length !== 36 ||
      bytes.readUInt32LE(0) !== 2 ||
      !bytes.subarray(4).equals(PROGRAM_DATA.toBuffer())
    )
      throw Error("INVALID_ACCOUNT");
    cached = {
      ...base,
      ...decodeProgramAuthority(
        metadata.owner,
        Buffer.from(metadata.data[0], "base64"),
      ),
    };
    return cached;
  } catch {
    return { ...base, state: "unknown" };
  }
}

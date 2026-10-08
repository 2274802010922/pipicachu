import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import idl from "../../client/idl/escrow.json";
import deployment from "@/escrow/deployment.json";
import { MINT, PROGRAM_ID } from "@/escrow/constants";
const rows = z
  .array(
    z
      .object({
        owner: z.string().max(44),
        executable: z.boolean(),
        data: z.tuple([z.string().max(4096), z.literal("base64")]),
      })
      .nullable(),
  )
  .length(5);
export function deploymentAccountsReady(input: unknown) {
  const parsed = rows.safeParse(input);
  if (!parsed.success) return { program: false, manager: false };
  const [program, config, mint, fees, manager] = parsed.data;
  const match = (account: typeof config, name: string, size: number) => {
    if (
      !account ||
      account.executable ||
      account.owner !== PROGRAM_ID.toBase58()
    )
      return null;
    const data = Buffer.from(account.data[0], "base64");
    const discriminator = idl.accounts.find(
      (entry) => entry.name === name,
    )?.discriminator;
    return data.length === size &&
      discriminator &&
      data.subarray(0, 8).equals(Buffer.from(discriminator))
      ? data
      : null;
  };
  const configData = match(config, "Config", 41),
    feeData = match(fees, "FeeConfig", 41),
    managerData = match(manager, "ManagerConfig", 73);
  const programData = program && Buffer.from(program.data[0], "base64");
  const mintData = mint && Buffer.from(mint.data[0], "base64");
  return {
    program: !!(
      program?.executable &&
      program.owner === "BPFLoaderUpgradeab1e11111111111111111111111" &&
      programData?.length === 36 &&
      programData.readUInt32LE(0) === 2 &&
      configData?.subarray(8, 40).equals(MINT.toBuffer()) &&
      mint?.owner === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
      !mint.executable &&
      mintData?.length === 82 &&
      mintData[44] === 6 &&
      mintData[45] === 1 &&
      feeData
        ?.subarray(8, 40)
        .equals(new PublicKey(deployment.platformTreasury).toBuffer())
    ),
    manager: !!(
      managerData &&
      !new PublicKey(managerData.subarray(8, 40)).equals(PublicKey.default)
    ),
  };
}

import { Connection } from "@solana/web3.js";
import {
  CONFIG,
  MINT,
  PROGRAM_ID,
  readFeeTreasury,
} from "../../src/escrow/client";
import deployment from "../../src/escrow/deployment.json";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
);
if (
  (await c.getGenesisHash()) !== "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw new Error("Wrong network");
const [program, config, mint] = await c.getMultipleAccountsInfo([
  PROGRAM_ID,
  CONFIG,
  MINT,
]);
if (!program?.executable || !config?.owner.equals(PROGRAM_ID) || !mint)
  throw new Error("Escrow deployment is not ready");
console.log("Verified Devnet program, config and mint", PROGRAM_ID.toBase58());
if ((await readFeeTreasury(c)).toBase58() !== deployment.platformTreasury)
  throw new Error("Treasury differs from published deployment");

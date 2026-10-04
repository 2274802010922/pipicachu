import { Connection } from "@solana/web3.js";
import { CONFIG, MINT, PROGRAM_ID } from "../../src/escrow/client";
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

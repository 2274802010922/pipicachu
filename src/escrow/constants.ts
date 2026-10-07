import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
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
export const MANAGER_CONFIG = PublicKey.findProgramAddressSync(
  [Buffer.from("manager_v1")],
  PROGRAM_ID,
)[0];

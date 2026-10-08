import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { u64 } from "./binary";
export function arbAddress(who: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("arb"), who.toBuffer()],
    PROGRAM_ID,
  )[0];
}
export function bondAddress(arb: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bond"), arb.toBuffer()],
    PROGRAM_ID,
  )[0];
}
export function dealAddress(seller: PublicKey, nonce: bigint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("deal"), seller.toBuffer(), u64(nonce)],
    PROGRAM_ID,
  )[0];
}
export function vaultAddress(deal: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), deal.toBuffer()],
    PROGRAM_ID,
  )[0];
}
export function organizationAddress(authority: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("organization"), authority.toBuffer()],
    PROGRAM_ID,
  )[0];
}

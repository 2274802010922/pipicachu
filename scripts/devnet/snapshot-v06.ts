import fs from "node:fs";
import { createHash } from "node:crypto";
import { Connection } from "@solana/web3.js";
import {
  decodeDeal,
  PROGRAM_ID,
  readFeeTreasury,
} from "../../src/escrow/client";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
if (
  (await c.getGenesisHash()) !== "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw Error("Wrong network");
const rows = await c.getProgramAccounts(PROGRAM_ID, {
  filters: [{ dataSize: 876 }],
});
const deals = await Promise.all(
  rows.map(async (row) => {
    const d = await decodeDeal(row.pubkey.toBase58(), row.account.data);
    return {
      address: d.address,
      amount: d.amount,
      bond: d.bond,
      fee: d.fee,
      platformFee: d.platformFee,
      feeVersion: d.feeVersion,
      workflowVersion: d.workflowVersion,
      termsSha256: createHash("sha256").update(d.terms).digest("hex"),
      state: d.state,
      createdAt: d.createdAt,
      fundBy: d.fundBy,
      deliverBy: d.deliverBy,
      reviewBy: d.reviewBy,
      arbitrateBy: d.arbitrateBy,
    };
  }),
);
const output = process.argv[2] || "work/v06-baseline.json";
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: "devnet",
      commitment: "finalized",
      programId: PROGRAM_ID.toBase58(),
      treasury: (await readFeeTreasury(c)).toBase58(),
      deals,
    },
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ),
);
console.log(
  "Snapshot",
  deals.length,
  "public deal accounts; terms retained as hashes only.",
);

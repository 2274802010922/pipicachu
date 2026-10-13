import fs from "node:fs";
import { createHash } from "node:crypto";
import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../../src/escrow/constants";
import {
  PROGRAM_DATA,
  decodeProgramAuthority,
} from "../../src/escrow/program-authority";
import { decodeDeal } from "../../src/escrow/codec";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "finalized",
);
if (
  (await c.getGenesisHash()) !== "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw Error("DEVNET_ONLY");
const rows = await c.getProgramAccounts(PROGRAM_ID),
  accounts = rows
    .map((r) => ({
      address: r.pubkey.toBase58(),
      sha256: createHash("sha256").update(r.account.data).digest("hex"),
    }))
    .sort((a, b) => a.address.localeCompare(b.address));
const deals = await Promise.all(
  rows
    .filter((r) => r.account.data.length === 876)
    .map((r) => decodeDeal(r.pubkey.toBase58(), r.account.data)),
);
const data = await c.getAccountInfo(PROGRAM_DATA);
if (!data) throw Error("PROGRAM_MISSING");
const authority = decodeProgramAuthority(
  data.owner.toBase58(),
  data.data.subarray(0, 45),
);
const output = process.argv[2] || "work/fee-transparency-before.json";
if (output.includes("..") || !output.startsWith("work/"))
  throw Error("OUTPUT_MUST_BE_IGNORED");
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      programId: PROGRAM_ID.toBase58(),
      authority,
      dealCount: deals.length,
      active: deals
        .filter((d) => ["funded", "delivered", "disputed"].includes(d.state))
        .map((d) => d.address),
      accounts,
    },
    null,
    2,
  ),
);
if (process.argv.includes("--backup-binary"))
  fs.writeFileSync("work/fee-previous-program.so", data.data.subarray(45));
console.log(
  JSON.stringify({
    file: output,
    dealCount: deals.length,
    active: deals.filter((d) =>
      ["funded", "delivered", "disputed"].includes(d.state),
    ).length,
    authority: authority.authority,
    authoritySolLamports: authority.authority
      ? await c.getBalance(new PublicKey(authority.authority))
      : null,
  }),
);

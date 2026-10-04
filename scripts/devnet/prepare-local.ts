import fs from "node:fs";
import { Keypair, PublicKey } from "@solana/web3.js";
import { MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CONFIG, digest, MINT, PROGRAM_ID } from "../../src/escrow/client";
fs.mkdirSync("work/private", { recursive: true });
fs.mkdirSync("work/validator", { recursive: true });
const file = "work/private/fixture-signer.json";
if (!fs.existsSync(file))
  fs.writeFileSync(file, JSON.stringify([...Keypair.generate().secretKey]));
const buyer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))),
);
const mint = Buffer.alloc(82);
MintLayout.encode(
  {
    mintAuthorityOption: 1,
    mintAuthority: buyer.publicKey,
    supply: 0n,
    decimals: 6,
    isInitialized: true,
    freezeAuthorityOption: 0,
    freezeAuthority: PublicKey.default,
  },
  mint,
);
function account(
  address: PublicKey,
  owner: PublicKey,
  data: Buffer,
  lamports: number,
) {
  return {
    pubkey: address.toBase58(),
    account: {
      lamports,
      data: [data.toString("base64"), "base64"],
      owner: owner.toBase58(),
      executable: false,
      rentEpoch: 0,
      space: data.length,
    },
  };
}
fs.writeFileSync(
  "work/validator/mint.json",
  JSON.stringify(account(MINT, TOKEN_PROGRAM_ID, mint, 1461600)),
);
const bump = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  PROGRAM_ID,
)[1];
fs.writeFileSync(
  "work/validator/config.json",
  JSON.stringify(
    account(
      CONFIG,
      PROGRAM_ID,
      Buffer.concat([
        (await digest("account:Config")).subarray(0, 8),
        MINT.toBuffer(),
        Buffer.from([bump]),
      ]),
      1176240,
    ),
  ),
);
console.log(
  "Synthetic local mint/config written. No mainnet or devnet issuance.",
);

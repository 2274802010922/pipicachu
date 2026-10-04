// Synthetic account data for browser UX tests; not an on-chain receipt.
import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";
const deployment = JSON.parse(
  readFileSync("src/escrow/deployment.json", "utf8"),
) as { programId: string; mint: string };
export const parties = {
  seller: "BbftECvBKTHMm6t3Sejyz7E9HmBmcRp7NvEYnAnzb7F3",
  buyer: "DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj",
  arb: "Ht5k38ysGyt2VKoddxbACCeLoVngQFojNeXzACGz9dEP",
};
const pid = new PublicKey(deployment.programId),
  mint = new PublicKey(deployment.mint),
  nonce = 42n;
const integer = (n: bigint | number) => {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(n));
  return b;
};
const [address, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("deal"),
    new PublicKey(parties.seller).toBuffer(),
    integer(nonce),
  ],
  pid,
);
const [arb, arbBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("arb"), new PublicKey(parties.arb).toBuffer()],
  pid,
);
export const preparationAddress = address.toBase58(),
  arbAccountAddress = arb.toBase58(),
  fixtureTime = 1_800_000_000;
function disc(name: string) {
  return createHash("sha256").update(`account:${name}`).digest().subarray(0, 8);
}
function account(data: Buffer) {
  return {
    data: [data.toString("base64"), "base64"],
    owner: pid.toBase58(),
    executable: false,
    lamports: 10_000_000,
    rentEpoch: 0,
  };
}
export function preparationFixture(
  approved = 0,
  total = 1_500_000n,
  locked = 1_000_000n,
  state = 0,
  platformFee = 0n,
) {
  const terms = Buffer.from(
    "Synthetic browser fixture: 10 USDC deal, 1 USDC bond.",
  );
  const len = Buffer.alloc(4);
  len.writeUInt32LE(terms.length);
  const bytes = Buffer.concat([
    disc("Deal"),
    ...[parties.seller, parties.buyer, parties.arb, deployment.mint].map((p) =>
      new PublicKey(p).toBuffer(),
    ),
    integer(nonce),
    integer(10_000_000n),
    integer(1_000_000n),
    integer(100_000n),
    ...[
      fixtureTime,
      fixtureTime + 600,
      300,
      120,
      120,
      state > 0 ? fixtureTime + 600 : 0,
      state >= 2 ? fixtureTime + 600 : 0,
      state === 3 ? fixtureTime + 600 : 0,
    ].map(integer),
    Buffer.from([state, approved, bump, 0]),
    Buffer.alloc(96),
    len,
    terms,
    integer(platformFee),
    Buffer.from([platformFee > 0n ? 1 : 0]),
  ]);
  const padded = Buffer.alloc(876);
  bytes.copy(padded);
  const profile = Buffer.concat([
    disc("Arbitrator"),
    new PublicKey(parties.arb).toBuffer(),
    mint.toBuffer(),
    integer(total),
    integer(locked),
    Buffer.from([arbBump, 0]),
  ]);
  return { deal: account(padded), arb: account(profile) };
}

import fs from "node:fs";
import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import {
  act,
  createOrganizationDealIx,
  readOrganization,
  dealAddress,
  digest,
  fundIx,
  readDeal,
  PROGRAM_ID,
} from "../../src/escrow/client";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  "confirmed",
);
if (
  (await c.getGenesisHash()) !== "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw new Error("Wrong network");
const load = (name: string) =>
  Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(fs.readFileSync(`work/private/${name}.json`, "utf8")),
    ),
  );
const seller = load("escrow-seller"),
  buyer = load("fixture-signer"),
  arb = load("escrow-arbitrator");
async function send(k: Keypair, ixs: Awaited<ReturnType<typeof act>>[]) {
  return sendAndConfirmTransaction(c, new Transaction().add(...ixs), [k], {
    commitment: "confirmed",
  });
}
const organization = await readOrganization(c, arb.publicKey);
if (!organization?.accepting) throw Error("Organization not ready");
const deals = [];
let nonce = BigInt(Date.now());
for (const kind of ["undisputed", "disputed"] as const) {
  const n = nonce++,
    address = dealAddress(seller.publicKey, n);
  await send(seller, [
    await createOrganizationDealIx(
      seller.publicKey,
      buyer.publicKey,
      arb.publicKey,
      n,
      1_000_000n,
      organization.times,
      `Keeper proof: ${kind}. Seller creates; buyer pays 1 USDC; seller delivers. Review timeout pays seller 0.98 USDC + 0.01 arbitrator fee + 0.01 platform fee. Dispute must block automatic payout.`,
    ),
  ]);
  await send(buyer, [
    await fundIx(buyer.publicKey, await readDeal(c, address.toBase58())),
  ]);
  await send(seller, [
    await act(
      "deliver",
      seller.publicKey,
      address,
      await digest("Permitted test file delivered through agreed channel"),
    ),
  ]);
  if (kind === "disputed")
    await send(buyer, [
      await act(
        "dispute",
        buyer.publicKey,
        address,
        await digest("Keeper must not release contested funds"),
      ),
    ]);
  const d = await readDeal(c, address.toBase58());
  deals.push({
    kind,
    address: d.address,
    reviewBy: d.reviewBy,
    state: d.state,
  });
}
const deadline = deals[0].reviewBy;
while (true) {
  const clock = await c.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
  if (clock && Number(clock.data.readBigInt64LE(32)) >= deadline) break;
  await new Promise((r) => setTimeout(r, 15000));
}
fs.mkdirSync("docs/evidence", { recursive: true });
fs.writeFileSync(
  "docs/evidence/keeper-prepared.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      network: "devnet",
      programId: PROGRAM_ID.toBase58(),
      deals,
    },
    null,
    2,
  ),
);
console.log(
  "Prepared one expired undisputed deal and one disputed deal; no buyer confirmation or seller finalize sent.",
);

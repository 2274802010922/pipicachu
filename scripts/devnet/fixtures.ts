import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transferChecked,
} from "@solana/spl-token";
import { Connection } from "@solana/web3.js";
import {
  verifyNetwork,
  rpc,
  readTransaction,
  rpcUrl,
} from "../../src/solana/rpc";
import { normalizeTransaction } from "../../src/core/normalize";
import { comparePayment } from "../../src/core/compare";
await mkdir("work/private", { recursive: true });
await mkdir("docs/evidence/raw", { recursive: true });
async function key(name: string) {
  const path = `work/private/${name}.json`;
  try {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(await readFile(path, "utf8"))),
    );
  } catch {
    const k = Keypair.generate();
    await writeFile(path, JSON.stringify([...k.secretKey]), { mode: 0o600 });
    return k;
  }
}
const signer = await key("fixture-signer"),
  receiver = await key("demo-receiver");
await verifyNetwork("devnet");
const info = {
  network: "devnet",
  signer: signer.publicKey.toBase58(),
  receiver: receiver.publicKey.toBase58(),
  amountAtomic: "1000000",
  keys: "Private files in ignored work/private; never publish.",
};
await writeFile(
  "docs/evidence/devnet-wallets.json",
  JSON.stringify(info, null, 2),
);
console.log(
  JSON.stringify({ testWallet: info.signer, demoReceiver: info.receiver }),
);
let balance = await rpc<{ value: bigint }>("devnet", "getBalance", [
  info.signer,
  { commitment: "confirmed" },
]);
if (balance.value < 20_000_000n) {
  try {
    await rpc("devnet", "requestAirdrop", [info.signer, 100_000_000]);
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      balance = await rpc("devnet", "getBalance", [
        info.signer,
        { commitment: "confirmed" },
      ]);
      if (balance.value >= 20_000_000n) break;
    }
  } catch {}
}
if (balance.value < 20_000_000n) {
  console.log(
    JSON.stringify({
      state: "funding-required",
      wallet: info.signer,
      minimumSOL: "0.02",
      balanceAtomic: balance.value.toString(),
    }),
  );
  process.exit(2);
}
const connection = new Connection(rpcUrl("devnet"), "confirmed");
async function capture(id: string, signature: string) {
  let data = await readTransaction(signature, "devnet");
  for (
    let i = 0;
    i < 20 &&
    (data.status as { confirmationStatus?: string } | null)
      ?.confirmationStatus !== "finalized";
    i++
  ) {
    await new Promise((r) => setTimeout(r, 1500));
    data = await readTransaction(signature, "devnet");
  }
  if (!data.raw) throw new Error("Missing live transaction");
  await writeFile(
    `docs/evidence/raw/${id}.json`,
    JSON.stringify(
      {
        signature,
        network: "devnet",
        capturedAt: new Date().toISOString(),
        ...data,
      },
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
  );
  return normalizeTransaction(signature, "devnet", data.raw, data.status);
}
const block = await rpc<{ value: { blockhash: string } }>(
  "devnet",
  "getLatestBlockhash",
  [{ commitment: "confirmed" }],
);
const tx = new Transaction({
  feePayer: signer.publicKey,
  recentBlockhash: block.value.blockhash,
}).add(
  SystemProgram.transfer({
    fromPubkey: signer.publicKey,
    toPubkey: receiver.publicKey,
    lamports: 1_000_000,
  }),
);
tx.sign(signer);
const solSignature = await rpc<string>("devnet", "sendTransaction", [
  tx.serialize().toString("base64"),
  { encoding: "base64", preflightCommitment: "confirmed" },
]);
const sol = await capture("sol-transfer", solSignature);
const verdict = comparePayment(sol, {
  network: "devnet",
  recipient: info.receiver,
  asset: "SOL",
  amount: "0.001",
});
if (verdict.verdict !== "matched")
  throw new Error("Independent SOL golden amount did not match");
const mint = await createMint(connection, signer, signer.publicKey, null, 6);
const from = await getOrCreateAssociatedTokenAccount(
    connection,
    signer,
    mint,
    signer.publicKey,
  ),
  to = await getOrCreateAssociatedTokenAccount(
    connection,
    signer,
    mint,
    receiver.publicKey,
  );
await mintTo(connection, signer, mint, from.address, signer, 100_000_000n);
const tokenSignature = await transferChecked(
  connection,
  signer,
  from.address,
  mint,
  to.address,
  signer,
  50_000_000n,
  6,
);
const token = await capture("different-mint", tokenSignature);
const tokenVerdict = comparePayment(token, {
  network: "devnet",
  recipient: info.receiver,
  asset: "USDC",
  amount: "50",
});
if (tokenVerdict.verdict !== "wrong-token")
  throw new Error("Different-mint token was not rejected");
const later = await rpc<{ value: { blockhash: string } }>(
  "devnet",
  "getLatestBlockhash",
  [{ commitment: "confirmed" }],
);
const fail = new Transaction({
  feePayer: signer.publicKey,
  recentBlockhash: later.value.blockhash,
}).add(
  SystemProgram.transfer({
    fromPubkey: signer.publicKey,
    toPubkey: new PublicKey(info.receiver),
    lamports: 10_000_000_000,
  }),
);
fail.sign(signer);
const failedSignature = await rpc<string>("devnet", "sendTransaction", [
  fail.serialize().toString("base64"),
  { encoding: "base64", skipPreflight: true, maxRetries: 2 },
]);
const failed = await capture("failed-transfer", failedSignature);
if (failed.state !== "failed") throw new Error("Expected failed transfer");
await writeFile(
  "docs/evidence/devnet-cycle.json",
  JSON.stringify(
    {
      source: "live-devnet-script",
      capturedAt: new Date().toISOString(),
      wallet: info.signer,
      receiver: info.receiver,
      sol: {
        signature: solSignature,
        amountAtomic: "1000000",
        comparison: verdict.verdict,
        feeAtomic: sol.feeAtomic,
      },
      differentMint: {
        signature: tokenSignature,
        mint: mint.toBase58(),
        amountAtomic: "50000000",
        comparison: tokenVerdict.verdict,
        note: "A new test mint, NOT Circle USDC.",
      },
      failed: { signature: failedSignature, state: failed.state },
      manualPhantom: "not-yet-verified",
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    state: "verified",
    solSignature,
    tokenSignature,
    failedSignature,
    demoReceiver: info.receiver,
  }),
);

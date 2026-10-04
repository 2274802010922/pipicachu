import { readFile, writeFile } from "node:fs/promises";
import {
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
} from "@solana/web3.js";
const base = process.env.PIPICACHU_TEST_BASE || "http://127.0.0.1:3105";
const signer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(await readFile("work/private/fixture-signer.json", "utf8")),
  ),
);
const wallet = signer.publicKey.toBase58();
async function post(path: string, body: unknown) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}
const prepared = await post("/api/demo/prepare", { wallet });
if (prepared.status !== 200)
  throw new Error(`Prepare ${prepared.status}: ${prepared.data.error}`);
const tx = Transaction.from(Buffer.from(prepared.data.transaction, "base64"));
const changed = Transaction.from(
  Buffer.from(prepared.data.transaction, "base64"),
);
changed.instructions[changed.instructions.length - 1] = SystemProgram.transfer({
  fromPubkey: signer.publicKey,
  toPubkey: new PublicKey(prepared.data.receiver),
  lamports: 2000000,
});
changed.sign(signer);
const blocked = await post("/api/demo/submit", {
  requestId: prepared.data.requestId,
  transaction: changed.serialize().toString("base64"),
});
if (blocked.status !== 422 || blocked.data.error !== "TRANSACTION_CHANGED")
  throw new Error("Modified transaction was not blocked");
tx.sign(signer);
const payload = {
  requestId: prepared.data.requestId,
  transaction: tx.serialize().toString("base64"),
};
const submitted = await post("/api/demo/submit", payload);
if (submitted.status !== 200 || !submitted.data.signature)
  throw new Error("Submit failed");
let state = submitted.data;
for (let i = 0; i < 20 && state.state === "pending"; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  state = await (
    await fetch(base + `/api/demo/status?requestId=${prepared.data.requestId}`)
  ).json();
}
const repeated = await post("/api/demo/submit", payload);
if (
  state.state !== "success" ||
  repeated.data.signature !== submitted.data.signature
)
  throw new Error("Finality or idempotency not verified");
const comparison = await post("/api/compare", {
  input: state.signature,
  network: "devnet",
  expected: {
    network: "devnet",
    recipient: prepared.data.receiver,
    asset: "SOL",
    amount: "0.001",
  },
});
if (comparison.data.verdict !== "matched")
  throw new Error("Live API comparison did not match");
const report = {
  at: new Date().toISOString(),
  source: "live-devnet-api-with-new-script-signer",
  base,
  wallet,
  receiver: prepared.data.receiver,
  signature: state.signature,
  finality: state.finality,
  amountAtomic: "1000000",
  tamperBlockedHttp: blocked.status,
  idempotentSignature: repeated.data.signature === state.signature,
  comparison: comparison.data.verdict,
  phantomPopup: "not-verified-by-this-script",
};
await writeFile(
  "docs/evidence/api-cycle.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));

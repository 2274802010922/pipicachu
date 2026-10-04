import fs from "node:fs";
import {
  Connection,
  Keypair,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  decodeDeal,
  PROGRAM_ID,
  readDeal,
  settleIxs,
} from "../../src/escrow/client";
import { eligibleForAutomaticRelease } from "../../src/escrow/keeper";
import { prepareDevnetWalletTransaction } from "../../src/escrow/wallet-transaction";
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  { commitment: "confirmed", disableRetryOnRateLimit: true },
);
async function retry<T>(fn: () => Promise<T>): Promise<T> {
  for (let n = 0; n < 4; n++) {
    try {
      return await fn();
    } catch {
      if (n === 3) throw new Error("KEEPER_RPC_UNAVAILABLE");
      await new Promise((r) => setTimeout(r, 2000 * (n + 1)));
    }
  }
  throw new Error("KEEPER_RPC_UNAVAILABLE");
}
if (
  (await retry(() => c.getGenesisHash())) !==
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
)
  throw new Error("KEEPER_WRONG_NETWORK");
let key: Keypair;
try {
  const encoded =
    process.env.DEVNET_KEEPER_KEYPAIR ||
    (process.env.KEEPER_KEYPAIR_FILE
      ? fs.readFileSync(process.env.KEEPER_KEYPAIR_FILE, "utf8")
      : "");
  if (!encoded) throw new Error();
  const value = JSON.parse(encoded);
  if (
    !Array.isArray(value) ||
    value.length !== 64 ||
    value.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  )
    throw new Error();
  key = Keypair.fromSecretKey(Uint8Array.from(value));
} catch {
  throw new Error("KEEPER_KEY_MISSING_OR_INVALID");
}
const startedAt = new Date().toISOString();
const balances = await retry(() => c.getBalance(key.publicKey));
if (balances < 10_000_000) throw new Error("KEEPER_NEEDS_DEVNET_SOL");
async function networkTime() {
  const clock = await retry(() => c.getAccountInfo(SYSVAR_CLOCK_PUBKEY));
  if (!clock || clock.data.length !== 40)
    throw new Error("KEEPER_CLOCK_UNAVAILABLE");
  return Number(clock.data.readBigInt64LE(32));
}
const scanTime = await networkTime();
const rows = await retry(() =>
  c.getProgramAccounts(PROGRAM_ID, { filters: [{ dataSize: 876 }] }),
);
const report: {
  startedAt: string;
  finishedAt?: string;
  network: string;
  programId: string;
  keeper: string;
  scanned: number;
  eligible: number;
  results: { deal: string; state: string; signature?: string }[];
} = {
  startedAt,
  network: "devnet",
  programId: PROGRAM_ID.toBase58(),
  keeper: key.publicKey.toBase58(),
  scanned: rows.length,
  eligible: 0,
  results: [],
};
const targets = [];
for (const row of rows) {
  const d = await decodeDeal(row.pubkey.toBase58(), row.account.data);
  if (eligibleForAutomaticRelease(d, scanTime)) targets.push(d);
}
report.eligible = targets.length;
targets.sort((a, b) => a.reviewBy - b.reviewBy);
for (const cached of targets.slice(0, 5)) {
  // Re-read state immediately before signing. The contract independently checks again.
  const d = await retry(() => readDeal(c, cached.address));
  if (!eligibleForAutomaticRelease(d, await networkTime())) {
    report.results.push({ deal: d.address, state: "skipped_changed" });
    continue;
  }
  const tx = prepareDevnetWalletTransaction(
    new Transaction().add(
      ...(await settleIxs("finalize", key.publicKey, d, undefined, c)),
    ),
  );
  tx.feePayer = key.publicKey;
  tx.recentBlockhash = (await retry(() => c.getLatestBlockhash())).blockhash;
  const sim = await retry(() => c.simulateTransaction(tx));
  if (sim.value.err) {
    report.results.push({ deal: d.address, state: "blocked_by_simulation" });
    continue;
  }
  tx.partialSign(key);
  const signature = await retry(() => c.sendRawTransaction(tx.serialize()));
  let finalized = false,
    failed = false;
  for (let attempt = 0; attempt < 24; attempt++) {
    const status = (await retry(() => c.getSignatureStatuses([signature])))
      .value[0];
    if (status?.err) {
      failed = true;
      break;
    }
    if (status?.confirmationStatus === "finalized") {
      finalized = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  const after = await retry(() => readDeal(c, d.address));
  report.results.push({
    deal: d.address,
    signature,
    state: failed
      ? "failed"
      : finalized && after.state === "completed"
        ? "completed"
        : "submitted_pending",
  });
}
report.finishedAt = new Date().toISOString();
const output = process.env.KEEPER_REPORT_PATH || "work/keeper/latest.json";
fs.mkdirSync(output.substring(0, output.lastIndexOf("/")) || ".", {
  recursive: true,
});
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  `Keeper scanned ${report.scanned}; eligible ${report.eligible}; finalized ${report.results.filter((r) => r.state === "completed").length}.`,
);
if (
  report.results.some(
    (r) => r.state === "failed" || r.state === "blocked_by_simulation",
  )
)
  process.exitCode = 1;

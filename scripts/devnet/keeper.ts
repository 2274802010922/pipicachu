import bs58 from "bs58";
import fs from "node:fs";
import nextEnv from "@next/env";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import {
  decodeDeal,
  PROGRAM_ID,
  readDeal,
  settleIxs,
} from "../../src/escrow/client";
import { eligibleForAutomaticRelease } from "../../src/escrow/keeper";
import {
  runKeeperBatch,
  type KeeperRetry,
  type KeeperResult,
} from "../../src/escrow/keeper-batch";
import { simulationFailureCode } from "../../src/escrow/simulation";
import { prepareDevnetWalletTransaction } from "../../src/escrow/wallet-transaction";
import {
  readStored,
  storeValue,
  redisConfigured,
  redisCommand,
  namespace,
} from "../../src/backend/redis";
import keeperConfig from "../../src/escrow/keeper-config.json";
nextEnv.loadEnvConfig(process.cwd());
const c = new Connection(
  process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
  { commitment: "confirmed", disableRetryOnRateLimit: true },
);
const report: {
  startedAt: string;
  finishedAt?: string;
  network: string;
  programId: string;
  keeper?: string;
  scanned: number;
  eligible: number;
  results: KeeperResult[];
  serviceError?: string;
  lastPayoutAt?: string;
} = {
  startedAt: new Date().toISOString(),
  network: "devnet",
  programId: PROGRAM_ID.toBase58(),
  scanned: 0,
  eligible: 0,
  results: [],
};
async function networkTime() {
  const clock = await c.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
  if (!clock || clock.data.length !== 40)
    throw Error("KEEPER_CLOCK_UNAVAILABLE");
  return Number(clock.data.readBigInt64LE(32));
}
try {
  if (
    (await c.getGenesisHash()) !==
    "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
  )
    throw Error("KEEPER_WRONG_NETWORK");
  if (!redisConfigured()) throw Error("KEEPER_REDIS_UNAVAILABLE");
  let key: Keypair;
  try {
    const text =
      process.env.DEVNET_KEEPER_KEYPAIR ||
      fs.readFileSync("work/private/devnet-keeper.json", "utf8");
    const bytes = JSON.parse(text);
    if (
      !Array.isArray(bytes) ||
      bytes.length !== 64 ||
      bytes.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
    )
      throw Error();
    key = Keypair.fromSecretKey(Uint8Array.from(bytes));
  } catch {
    throw Error("KEEPER_KEY_MISSING_OR_INVALID");
  }
  if (key.publicKey.toBase58() !== keeperConfig.wallet)
    throw Error("KEEPER_WRONG_KEY");
  report.keeper = key.publicKey.toBase58();
  if ((await c.getBalance(key.publicKey)) < 10_000_000)
    throw Error("KEEPER_NEEDS_DEVNET_SOL");
  const clock = await networkTime(),
    rows = await c.getProgramAccounts(PROGRAM_ID, {
      filters: [{ dataSize: 876 }, { memcmp: { offset: 232, bytes: "3" } }],
    });
  // State offset is validated against the IDL and binary fixture tests (Delivered=2, base58([2])="3").
  report.scanned = rows.length;
  const targets = [];
  for (const row of rows) {
    try {
      const deal = await decodeDeal(row.pubkey.toBase58(), row.account.data);
      if (eligibleForAutomaticRelease(deal, clock)) targets.push(deal);
    } catch {}
  }
  report.eligible = targets.length;
  const retry: Record<string, KeeperRetry> = {};
  await Promise.all(
    targets.map(async (d) => {
      const item = await readStored<KeeperRetry>(`keeper:retry:${d.address}`);
      if (item) retry[d.address] = item;
    }),
  );
  const force = process.env.KEEPER_FORCE_DEAL;
  if (force) new PublicKey(force);
  const run = await runKeeperBatch(
    targets,
    retry,
    async (cached, previous) => {
      const d = await readDeal(c, cached.address);
      if (!eligibleForAutomaticRelease(d, await networkTime()))
        return { deal: d.address, state: "skipped_changed" };
      if (previous?.signature) {
        const status = (
          await c.getSignatureStatuses([previous.signature], {
            searchTransactionHistory: true,
          })
        ).value[0];
        if (status?.confirmationStatus === "finalized" && !status.err)
          return {
            deal: d.address,
            state:
              (await readDeal(c, d.address)).state === "completed"
                ? "completed"
                : "skipped_changed",
            signature: previous.signature,
          };
        if (
          (status && !status.err) ||
          (!status &&
            previous.lastValidBlockHeight &&
            (await c.getBlockHeight("finalized")) <=
              previous.lastValidBlockHeight)
        )
          return {
            deal: d.address,
            state: "submitted_pending",
            signature: previous.signature,
            lastValidBlockHeight: previous.lastValidBlockHeight,
          };
      }
      const lease = crypto.randomUUID(),
        leaseKey = `${namespace}:keeper:lease:${d.address}`;
      if (
        (await redisCommand(["SET", leaseKey, lease, "NX", "EX", 120])) !== "OK"
      )
        return { deal: d.address, state: "leased" };
      let attemptedSignature: string | undefined;
      let expiry: number | undefined;
      try {
        const tx = prepareDevnetWalletTransaction(
          new Transaction().add(
            ...(await settleIxs("finalize", key.publicKey, d, undefined, c)),
          ),
        );
        const latest = await c.getLatestBlockhash();
        tx.feePayer = key.publicKey;
        tx.recentBlockhash = latest.blockhash;
        const sim = await c.simulateTransaction(tx);
        if (sim.value.err)
          return {
            deal: d.address,
            state: "blocked",
            errorCode: simulationFailureCode(sim.value.err, sim.value.logs),
          };
        tx.partialSign(key);
        const signature = bs58.encode(tx.signature!);
        expiry = latest.lastValidBlockHeight;

        // Persist before waiting so a process restart can recover this exact signature.
        retry[d.address] = {
          failureCount: 0,
          nextRetryAt: Date.now() + 300000,
          signature,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        };
        await storeValue(`keeper:retry:${d.address}`, retry[d.address]);
        attemptedSignature = signature;
        await c.sendRawTransaction(tx.serialize());
        for (let attempt = 0; attempt < 24; attempt++) {
          const status = (
            await c.getSignatureStatuses([signature], {
              searchTransactionHistory: true,
            })
          ).value[0];
          if (status?.err)
            return {
              deal: d.address,
              state: "failed",
              signature,
              errorCode: "TRANSACTION_FAILED",
              lastValidBlockHeight: latest.lastValidBlockHeight,
            };
          if (status?.confirmationStatus === "finalized")
            return {
              deal: d.address,
              state:
                (await readDeal(c, d.address)).state === "completed"
                  ? "completed"
                  : "skipped_changed",
              signature,
            };
          await new Promise((r) => setTimeout(r, 2500));
        }
        return {
          deal: d.address,
          state: "submitted_pending",
          signature,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        };
      } catch {
        if (attemptedSignature)
          return {
            deal: d.address,
            state: "submitted_pending",
            signature: attemptedSignature,
            lastValidBlockHeight: expiry,
            errorCode: "KEEPER_RPC_UNAVAILABLE",
          };
        return {
          deal: d.address,
          state: "failed",
          errorCode: "KEEPER_DEAL_UNAVAILABLE",
        };
      } finally {
        await redisCommand([
          "EVAL",
          "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",
          1,
          leaseKey,
          lease,
        ]).catch(() => {});
      }
    },
    Date.now(),
    force,
  );
  report.results = run.results;
  for (const result of run.results) {
    if (result.state === "leased") continue;
    const item = run.retry[result.deal];
    if (item) await storeValue(`keeper:retry:${result.deal}`, item);
    else
      await redisCommand(["DEL", `${namespace}:keeper:retry:${result.deal}`]);
  }
  if (report.results.some((r) => r.state === "completed"))
    report.lastPayoutAt = new Date().toISOString();
} catch (error) {
  report.serviceError =
    error instanceof Error && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : "KEEPER_SERVICE_UNAVAILABLE";
}
report.finishedAt = new Date().toISOString();
const output = process.env.KEEPER_REPORT_PATH || "work/keeper/latest.json";
fs.mkdirSync(output.substring(0, output.lastIndexOf("/")) || ".", {
  recursive: true,
});
fs.writeFileSync(output, JSON.stringify(report, null, 2));
try {
  await storeValue("keeper:latest", report);
} catch {
  report.serviceError =
    report.serviceError || "KEEPER_REPORT_STORAGE_UNAVAILABLE";
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
}
console.log(
  `Keeper scanned ${report.scanned}; eligible ${report.eligible}; completed ${report.results.filter((r) => r.state === "completed").length}; service ${report.serviceError || "ok"}.`,
);
if (
  report.serviceError ||
  report.results.some((r) => ["blocked", "failed"].includes(r.state))
)
  process.exitCode = 1;

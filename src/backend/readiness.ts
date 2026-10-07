import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID,
  CONFIG,
  MINT,
  FEE_CONFIG,
  MANAGER_CONFIG,
} from "@/escrow/constants";
import deployment from "@/escrow/deployment.json";
import { upstream } from "./rpc";
import { limiterConfigured, redisCommand, readStored } from "./redis";
export type Readiness = {
  ready: boolean;
  mode: "production" | "local-test";
  rpc: boolean;
  program: boolean;
  manager: boolean;
  limiter: boolean;
  checkedAt: string;
  missing: string[];
};
export type KeeperStatus = {
  startedAt: string;
  finishedAt?: string;
  eligible: number;
  scanned: number;
  results: {
    deal: string;
    state: string;
    signature?: string;
    errorCode?: string;
  }[];
  serviceError?: string;
};
let cache: { at: number; value: Readiness } | null = null;
export async function readiness(): Promise<Readiness> {
  if (process.env.PIPICACHU_OFFLINE_TEST === "1" && process.env.VERCEL !== "1")
    return {
      ready: true,
      mode: "local-test",
      rpc: true,
      program: true,
      manager: true,
      limiter: true,
      checkedAt: new Date().toISOString(),
      missing: [],
    };
  if (cache && Date.now() - cache.at < (cache.value.ready ? 30000 : 5000))
    return cache.value;
  const result: Readiness = {
    ready: false,
    mode: "production",
    rpc: false,
    program: false,
    manager: false,
    limiter: false,
    checkedAt: new Date().toISOString(),
    missing: [],
  };
  try {
    const r = await upstream(
      "getMultipleAccounts",
      [
        [PROGRAM_ID, CONFIG, MINT, FEE_CONFIG, MANAGER_CONFIG].map((p) =>
          p.toBase58(),
        ),
        { encoding: "base64", commitment: "finalized" },
      ],
      1,
    );
    const [program, config, mint, fees, manager] = r.result?.value || [];
    result.rpc = !!r.result;
    result.program =
      !!program?.executable &&
      config?.owner === PROGRAM_ID.toBase58() &&
      Buffer.from(config.data[0], "base64")
        .subarray(8, 40)
        .equals(MINT.toBuffer()) &&
      mint?.owner === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
      Buffer.from(mint.data[0], "base64")[44] === 6 &&
      fees?.owner === PROGRAM_ID.toBase58() &&
      new PublicKey(
        Buffer.from(fees.data[0], "base64").subarray(8, 40),
      ).toBase58() === deployment.platformTreasury;
    result.manager =
      manager?.owner === PROGRAM_ID.toBase58() &&
      Buffer.from(manager.data[0], "base64").length === 73 &&
      !new PublicKey(
        Buffer.from(manager.data[0], "base64").subarray(8, 40),
      ).equals(PublicKey.default);
  } catch {}
  if (limiterConfigured())
    try {
      result.limiter = (await redisCommand(["PING"])) === "PONG";
    } catch {}
  result.missing = (["rpc", "program", "manager", "limiter"] as const).filter(
    (k) => !result[k],
  );
  result.ready = !result.missing.length;
  cache = { at: Date.now(), value: result };
  return result;
}
export async function keeperStatus() {
  try {
    const report = await readStored<KeeperStatus>("keeper:latest");
    if (!report) return { state: "unknown", report: null };
    const stale =
      Date.now() - Date.parse(report.finishedAt || report.startedAt) >
      15 * 60000;
    const blocked = report.results.filter((r) =>
      ["blocked", "blocked_by_simulation", "failed", "unknown"].includes(
        r.state,
      ),
    ).length;
    return {
      state: stale
        ? "stale"
        : report.serviceError
          ? "degraded"
          : blocked
            ? "blocked"
            : "healthy",
      blocked,
      report,
    };
  } catch {
    return { state: "unavailable", report: null };
  }
}

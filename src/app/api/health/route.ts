import { json } from "@/backend/http";
import {
  command,
  distributedConfigured,
  offlineTest,
  production,
  set,
} from "@/backend/store";
export const runtime = "nodejs";
export async function GET() {
  let limiterReachable = false;
  let limiterError: string | null = null;
  try {
    await command("GET", "pipicachu:v1:health");
    await set("health:write", true, 60);
    limiterReachable = true;
  } catch (error) {
    limiterError =
      error instanceof Error ? error.message : "LIMITER_UNAVAILABLE";
  }
  return json({
    app: "pipicachu",
    version: "0.1.0",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    decoderVersion: "pipicachu/1",
    networks: ["mainnet", "devnet"],
    mainnetWrites: false,
    userHistory: false,
    auth: false,
    aiConfigured: Boolean(
      process.env.AI_ENABLED === "true" && process.env.OPENROUTER_API_KEY,
    ),
    limiter: {
      distributed: distributedConfigured(),
      reachable: limiterReachable,
      mode: distributedConfigured() ? "redis" : "local-memory",
      error: limiterError,
    },
    productionReady:
      limiterReachable &&
      (!production() || distributedConfigured()) &&
      !offlineTest(),
    testMode: offlineTest(),
  });
}

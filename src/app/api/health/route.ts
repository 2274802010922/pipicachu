import { json } from "@/backend/http";
import {
  command,
  distributedConfigured,
  offlineTest,
  production,
} from "@/backend/store";
export const runtime = "nodejs";
export async function GET() {
  let limiterReachable = false;
  try {
    await command("GET", "pipicachu:v1:health");
    limiterReachable = true;
  } catch {}
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
    },
    productionReady:
      limiterReachable &&
      (!production() || distributedConfigured()) &&
      !offlineTest(),
    testMode: offlineTest(),
  });
}

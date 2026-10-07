import {
  anonymousIp,
  limiterConfigured,
  redisCommand,
  namespace,
} from "./redis";
const memory = new Map<string, { count: number; window: number }>();
export const limits = {
  read: { ip: 240, global: 2400 },
  write: { ip: 30, global: 120 },
};
const LUA =
  "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],130) end; if n>tonumber(ARGV[1]) then return 0 end; local g=redis.call('INCR',KEYS[2]); if g==1 then redis.call('EXPIRE',KEYS[2],130) end; if g>tonumber(ARGV[2]) then return 0 end; return 1";
export function memoryLimit(key: string, limit: number, now = Date.now()) {
  const window = Math.floor(now / 60000),
    old = memory.get(key),
    count = old?.window === window ? old.count + 1 : 1;
  memory.set(key, { count, window });
  if (memory.size > 5000)
    for (const [k, v] of memory) if (v.window < window) memory.delete(k);
  if (count > limit) throw Error("RATE_LIMITED");
}
export async function limitRequest(method: string, ip: string) {
  const kind =
    method === "simulateTransaction" || method === "sendTransaction"
      ? "write"
      : "read";
  const local =
    process.env.NODE_ENV !== "production" ||
    (process.env.PIPICACHU_OFFLINE_TEST === "1" && process.env.VERCEL !== "1");
  const hash = anonymousIp(ip),
    bucket = Math.floor(Date.now() / 60000);
  if (!local && limiterConfigured()) {
    try {
      const accepted = await redisCommand<number>([
        "EVAL",
        LUA,
        2,
        `${namespace}:limit:{pipi-limits-v06}:${kind}:${bucket}:${hash}`,
        `${namespace}:limit:{pipi-limits-v06}:${kind}:${bucket}:global`,
        limits[kind].ip,
        limits[kind].global,
      ]);
      if (accepted !== 1) throw Error("RATE_LIMITED");
      return;
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
      if (kind === "write") throw Error("RATE_LIMIT_UNAVAILABLE");
    }
  } else if (!local && kind === "write") throw Error("RATE_LIMIT_UNAVAILABLE");
  const ipLimit = local ? limits[kind].ip : 60,
    globalLimit = local ? limits[kind].global : 600;
  // Charge the global fallback first so denied traffic cannot create unbounded IP entries.
  memoryLimit(`${kind}:global`, globalLimit);
  memoryLimit(`${kind}:${hash}`, ipLimit);
}

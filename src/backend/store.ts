import { AppError } from "../shared/errors";
const memory = new Map<string, { value: string; until: number }>();
export function offlineTest() {
  return !process.env.VERCEL && process.env.PIPICACHU_OFFLINE_TEST === "1";
}
export function distributedConfigured() {
  return Boolean(
    process.env.RATE_LIMIT_REDIS_URL && process.env.RATE_LIMIT_REDIS_TOKEN,
  );
}
export function production() {
  return (
    !offlineTest() &&
    (process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL))
  );
}
export async function command(...args: (string | number)[]): Promise<unknown> {
  if (distributedConfigured()) {
    try {
      const res = await fetch(process.env.RATE_LIMIT_REDIS_URL!, {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.RATE_LIMIT_REDIS_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
        redirect: "error",
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (data.error) throw new Error();
      return data.result;
    } catch {
      throw new AppError("LIMITER_UNAVAILABLE", 503);
    }
  }
  if (production()) throw new AppError("LIMITER_UNAVAILABLE", 503);
  const op = String(args[0]).toUpperCase(),
    key = String(args[1]);
  const old = memory.get(key),
    item = old && old.until > Date.now() ? old : undefined;
  if (op === "GET") return item?.value ?? null;
  if (op === "SET") {
    if (args.includes("NX") && item) return null;
    const at = args.indexOf("EX"),
      ttl = at < 0 ? 60 : Number(args[at + 1]);
    memory.set(key, { value: String(args[2]), until: Date.now() + ttl * 1000 });
    return "OK";
  }
  if (op === "INCR") {
    const n = Number(item?.value ?? 0) + 1;
    memory.set(key, {
      value: String(n),
      until: item?.until ?? Date.now() + 86400_000,
    });
    return n;
  }
  if (op === "EXPIRE") {
    if (item) item.until = Date.now() + Number(args[2]) * 1000;
    return item ? 1 : 0;
  }
  throw new AppError("LIMITER_UNAVAILABLE", 503);
}
export async function get<T>(key: string): Promise<T | null> {
  const raw = await command("GET", `pipicachu:v1:${key}`);
  return typeof raw === "string" ? (JSON.parse(raw) as T) : null;
}
export async function set(
  key: string,
  value: unknown,
  seconds: number,
  nx = false,
): Promise<boolean> {
  return (
    (await command(
      "SET",
      `pipicachu:v1:${key}`,
      JSON.stringify(value),
      "EX",
      seconds,
      ...(nx ? ["NX"] : []),
    )) === "OK"
  );
}
export async function limit(key: string, maximum: number, seconds: number) {
  const name = `pipicachu:v1:limit:${key}`,
    n = Number(await command("INCR", name));
  if (n === 1) await command("EXPIRE", name, seconds);
  if (n > maximum) throw new AppError("RATE_LIMITED", 429);
}

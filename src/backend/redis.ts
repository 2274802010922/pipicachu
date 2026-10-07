import { createHmac, randomBytes } from "node:crypto";
export const redisConfigured = () =>
  !!process.env.RATE_LIMIT_REDIS_URL && !!process.env.RATE_LIMIT_REDIS_TOKEN;
export const limiterConfigured = () =>
  redisConfigured() && (process.env.RATE_LIMIT_IP_SALT?.length || 0) >= 32;
export async function redisCommand<T = unknown>(
  args: (string | number)[],
): Promise<T> {
  if (!redisConfigured()) throw Error("REDIS_UNAVAILABLE");
  try {
    const response = await fetch(process.env.RATE_LIMIT_REDIS_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RATE_LIMIT_REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(3000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw Error();
    const body = await response.json();
    if (body.error) throw Error();
    return body.result as T;
  } catch {
    throw Error("REDIS_UNAVAILABLE");
  }
}
export const namespace = "pipicachu:devnet:4Xds5m5J:v06";
const fallbackSalt = randomBytes(32).toString("hex");
export const anonymousIp = (ip: string) =>
  createHmac("sha256", process.env.RATE_LIMIT_IP_SALT || fallbackSalt)
    .update(ip)
    .digest("hex");
export async function readStored<T>(key: string): Promise<T | null> {
  const value = await redisCommand<string | null>([
    "GET",
    `${namespace}:${key}`,
  ]);
  return value ? (JSON.parse(value) as T) : null;
}
export async function storeValue(
  key: string,
  value: unknown,
  seconds = 604800,
) {
  await redisCommand([
    "SET",
    `${namespace}:${key}`,
    JSON.stringify(value),
    "EX",
    seconds,
  ]);
}

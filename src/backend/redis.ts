import { createHmac, randomBytes } from "node:crypto";
export const redisConfigured = () =>
  !!process.env.RATE_LIMIT_REDIS_URL && !!process.env.RATE_LIMIT_REDIS_TOKEN;
export const limiterConfigured = () =>
  redisConfigured() && (process.env.RATE_LIMIT_IP_SALT?.length || 0) >= 32;
export class RedisServiceError extends Error {
  constructor(public reason: "permissions" | "quota" | "command" | "network") {
    super("REDIS_UNAVAILABLE");
  }
}
function redisFailure(status: number, message: unknown): RedisServiceError {
  const text = typeof message === "string" ? message.toLowerCase() : "";
  return new RedisServiceError(
    status === 401 ||
      status === 403 ||
      /noperm|permission|readonly|read.only|unauthorized/.test(text)
      ? "permissions"
      : status === 429 || /quota|limit exceeded/.test(text)
        ? "quota"
        : status === 400 || /err|script|command|crossslot/.test(text)
          ? "command"
          : "network",
  );
}
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
    const body = await response.json();
    if (!response.ok || body.error)
      throw redisFailure(response.status, body.error);
    return body.result as T;
  } catch (error) {
    if (error instanceof RedisServiceError) throw error;
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

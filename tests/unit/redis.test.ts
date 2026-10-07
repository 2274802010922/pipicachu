import { it, expect, vi, afterEach } from "vitest";
import { redisCommand, RedisServiceError } from "../../src/backend/redis";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function setup(error: string, status = 400) {
  vi.stubEnv("RATE_LIMIT_REDIS_URL", "https://redis.example");
  vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "test-only");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ error }), { status })),
  );
}
it("readonly token diagnostic reveals a category, never provider credentials", async () => {
  setup("NOPERM readonly token private-provider-data");
  try {
    await redisCommand(["EVAL", "return 1", 0]);
    throw Error("must reject");
  } catch (e) {
    expect(e).toBeInstanceOf(RedisServiceError);
    expect((e as RedisServiceError).reason).toBe("permissions");
    expect((e as Error).message).toBe("REDIS_UNAVAILABLE");
  }
});
it("malformed script is distinct from expired credentials", async () => {
  setup("ERR script command failed");
  await expect(redisCommand(["EVAL", "return 1", 0])).rejects.toMatchObject({
    reason: "command",
    message: "REDIS_UNAVAILABLE",
  });
});

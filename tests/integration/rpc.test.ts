import { afterEach, describe, expect, it, vi } from "vitest";
import { rpc, verifyNetwork } from "../../src/solana/rpc";
import { AppError } from "../../src/shared/errors";
import { command } from "../../src/backend/store";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("RPC precision and failures", () => {
  it("parses large numeric JSON without losing an atomic unit", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '{"jsonrpc":"2.0","id":1,"result":{"value":9007199254740993}}',
            { status: 200 },
          ),
        ),
    );
    const result = await rpc<{ value: bigint }>("devnet", "getBalance", []);
    expect(result.value).toBe(9007199254740993n);
  });
  it("rejects a RPC serving the wrong genesis before reads or sends", async () => {
    vi.stubEnv("SOLANA_DEVNET_RPC_URL", "https://wrong-genesis.invalid");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"jsonrpc":"2.0","id":1,"result":"wrong"}', {
            status: 200,
          }),
        ),
    );
    await expect(verifyNetwork("devnet")).rejects.toThrow(
      "RPC_NETWORK_MISMATCH",
    );
  });
  it("RPC transport failure is not a failed transaction", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("transport")));
    await expect(rpc("devnet", "getTransaction", [])).rejects.toMatchObject({
      code: "RPC_UNAVAILABLE",
      status: 503,
    });
  });
  it("maps unsupported transaction versions distinctly", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":{"code":-32015,"message":"unsupported"}}', {
            status: 200,
          }),
        ),
    );
    await expect(rpc("mainnet", "getTransaction", [])).rejects.toThrow(
      "UNSUPPORTED_VERSION",
    );
  });
});
describe("Distributed limiter gate", () => {
  it("distinguishes a read-only Redis token from generic failure", async () => {
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "https://redis.invalid");
    vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "test-only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":"NOPERM no permissions"}', { status: 200 }),
        ),
    );
    await expect(command("INCR", "test")).rejects.toMatchObject({
      code: "LIMITER_READ_ONLY",
      status: 503,
    });
  });
  it("requires shared storage in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PIPICACHU_OFFLINE_TEST", "");
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "");
    vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "");
    await expect(command("GET", "test")).rejects.toBeInstanceOf(AppError);
  });
});

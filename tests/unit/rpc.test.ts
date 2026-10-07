import { it, expect, vi, afterEach } from "vitest";
import { validateRpcRequest, cappedText } from "../../src/backend/rpc";
import { memoryLimit, limitRequest } from "../../src/backend/rate-limit";
import { PROGRAM_ID } from "../../src/escrow/constants";
const request = (method: string, params: unknown[]) => ({
  jsonrpc: "2.0",
  id: 1,
  method,
  params,
});
it("blocks arbitrary programs and disallowed methods", () => {
  expect(() => validateRpcRequest(request("requestAirdrop", []))).toThrow(
    "METHOD_NOT_ALLOWED",
  );
  expect(() =>
    validateRpcRequest(
      request("getProgramAccounts", ["11111111111111111111111111111111"]),
    ),
  ).toThrow("METHOD_NOT_ALLOWED");
});
it("validates RPC batches and bounded options", () => {
  expect(() =>
    validateRpcRequest(
      request("getMultipleAccounts", [Array(101).fill(PROGRAM_ID.toBase58())]),
    ),
  ).toThrow("INVALID_INPUT");
  expect(() =>
    validateRpcRequest(
      request("getSignaturesForAddress", [
        PROGRAM_ID.toBase58(),
        { limit: 100000 },
      ]),
    ),
  ).toThrow("INVALID_INPUT");
  expect(
    validateRpcRequest(
      request("getProgramAccounts", [
        PROGRAM_ID.toBase58(),
        { filters: [{ dataSize: 59 }] },
      ]),
    ).method,
  ).toBe("getProgramAccounts");
});
it("rejects malformed signature and transaction payloads", () => {
  expect(() =>
    validateRpcRequest(request("getSignatureStatuses", [["not-a-signature"]])),
  ).toThrow("INVALID_INPUT");
  expect(() =>
    validateRpcRequest(request("sendTransaction", ["not-base64"])),
  ).toThrow("INVALID_INPUT");
});
it("caps streams before consuming the full request", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode("x".repeat(11)));
    },
    cancel() {
      cancelled = true;
    },
  });
  await expect(cappedText(stream, 10)).rejects.toThrow("INVALID_INPUT");
  expect(cancelled).toBe(true);
});
it("memory fallback has bounded windows", () => {
  const key = "unit-window";
  memoryLimit(key, 2, 0);
  memoryLimit(key, 2, 0);
  expect(() => memoryLimit(key, 2, 0)).toThrow("RATE_LIMITED");
  expect(() => memoryLimit(key, 2, 60000)).not.toThrow();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("production writes fail closed even when offline flag is set on Vercel", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("PIPICACHU_OFFLINE_TEST", "1");
  vi.stubEnv("RATE_LIMIT_REDIS_URL", "");
  vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "");
  await expect(limitRequest("sendTransaction", "1.2.3.4")).rejects.toThrow(
    "RATE_LIMIT_UNAVAILABLE",
  );
  await expect(limitRequest("getSlot", "1.2.3.4")).resolves.toBeUndefined();
});
it("Redis outage denies writes while reads retain constrained fallback", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("RATE_LIMIT_REDIS_URL", "https://redis.example");
  vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "test-only");
  vi.stubEnv("RATE_LIMIT_IP_SALT", "x".repeat(64));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw Error("offline");
    }),
  );
  await expect(limitRequest("simulateTransaction", "5.6.7.8")).rejects.toThrow(
    "RATE_LIMIT_UNAVAILABLE",
  );
  await expect(limitRequest("getSlot", "5.6.7.8")).resolves.toBeUndefined();
});

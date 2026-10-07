import { it, expect } from "vitest";
import { errorMessage } from "../../src/frontend/errors";
it("SDK wrapped limiter errors retain the recovery instruction without printing RPC content", () => {
  const text = errorMessage(
    new Error("failed to simulate transaction: RATE_LIMIT_UNAVAILABLE"),
    true,
  );
  expect(text).toContain("Bộ giới hạn");
  expect(text).toContain("Chưa gửi giao dịch");
  expect(text).not.toContain("failed to simulate");
});
it("unknown RPC content never becomes raw user-facing text", () => {
  expect(
    errorMessage(new Error("untrusted raw RPC contents"), false),
  ).not.toContain("untrusted");
});

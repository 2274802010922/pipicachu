export function parseAmount(value: string): bigint {
  if (!/^\d+(?:[.,]\d{1,6})?$/.test(value.trim()))
    throw new Error("INVALID_AMOUNT");
  const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
  const n = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (n <= 0n || n > 1_000_000_000_000n) throw new Error("INVALID_AMOUNT");
  return n;
}
export function amount(n: bigint) {
  const whole = n / 1_000_000n;
  const f = (n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return whole.toString() + (f ? "." + f : "");
}

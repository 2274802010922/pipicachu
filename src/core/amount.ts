import { AppError } from "../shared/errors";
import type { Locale } from "../shared/types";
export function parseAmount(value: string, decimals: number): bigint {
  const text = value.trim();
  if (text.length > 50 || !/^\d+(?:[.,]\d+)?$/.test(text))
    throw new AppError("INVALID_AMOUNT");
  const [whole, fraction = ""] = text.replace(",", ".").split(".");
  if (fraction.length > decimals) throw new AppError("AMOUNT_PRECISION");
  const n =
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0");
  if (n <= 0n || n > 18446744073709551615n)
    throw new AppError("INVALID_AMOUNT");
  return n;
}
export function formatAmount(
  atomic: string | null,
  decimals: number | null,
  locale: Locale = "vi",
): string {
  if (atomic === null || decimals === null) return "—";
  const n = BigInt(atomic),
    negative = n < 0n,
    magnitude = negative ? -n : n;
  const digits = magnitude.toString().padStart(decimals + 1, "0");
  const whole = decimals ? digits.slice(0, -decimals) : digits;
  const fraction = decimals ? digits.slice(-decimals).replace(/0+$/, "") : "";
  return `${negative ? "−" : ""}${whole}${fraction ? (locale === "vi" ? "," : ".") + fraction : ""}`;
}

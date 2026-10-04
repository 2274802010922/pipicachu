export function bondReadiness(
  required: bigint,
  profile: { total: bigint; locked: bigint } | null | undefined,
): { available: bigint; missing: bigint; ready: boolean } | null {
  if (
    !profile ||
    required <= 0n ||
    profile.total < 0n ||
    profile.locked < 0n ||
    profile.locked > profile.total
  )
    return null;
  const available = profile.total - profile.locked;
  const missing = required > available ? required - available : 0n;
  return { available, missing, ready: missing === 0n };
}

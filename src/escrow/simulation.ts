type SimulationError = unknown;
export function simulationFailureCode(
  error: SimulationError,
  logs: string[] | null | undefined,
): string {
  const lines = logs || [];
  if (
    lines.some(
      (line) =>
        /caused by account: arbitrator\./.test(line) &&
        /AccountNotInitialized/.test(line),
    )
  )
    return "ARBITRATOR_NOT_REGISTERED";
  if (
    lines.some(
      (line) =>
        /caused by account: config\./.test(line) &&
        /AccountNotInitialized/.test(line),
    )
  )
    return "PROGRAM_NOT_READY";
  if (
    error === "InsufficientFundsForFee" ||
    lines.some((line) =>
      /insufficient lamports|insufficient funds for fee/i.test(line),
    )
  )
    return "INSUFFICIENT_SOL";
  if (lines.some((line) => /Error Code: InsufficientBond\./.test(line)))
    return "INSUFFICIENT_BOND";
  if (lines.some((line) => /Error Code: BondLocked\./.test(line)))
    return "BOND_LOCKED";
  if (lines.some((line) => /Error Code: Unauthorized\./.test(line)))
    return "ACTION_UNAUTHORIZED";
  if (lines.some((line) => /Error Code: WrongState\./.test(line)))
    return "ACTION_EXPIRED_OR_CHANGED";
  if (lines.some((line) => /Error Code: InvalidTerms\./.test(line)))
    return "INVALID_TERMS";
  if (lines.some((line) => /Error Code: OrganizationUnavailable\./.test(line)))
    return "ORGANIZATION_UNAVAILABLE";
  return "SIMULATION_FAILED";
}

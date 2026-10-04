import { it, expect } from "vitest";
import { simulationFailureCode } from "../../src/escrow/simulation";
it("recognizes missing arbitrator from real Anchor simulation log", () =>
  expect(
    simulationFailureCode({ InstructionError: [0, { Custom: 3012 }] }, [
      "Program log: AnchorError caused by account: arbitrator. Error Code: AccountNotInitialized. Error Number: 3012.",
    ]),
  ).toBe("ARBITRATOR_NOT_REGISTERED"));
it("does not guess any missing account is an arbitrator", () =>
  expect(
    simulationFailureCode({ InstructionError: [0, { Custom: 3012 }] }, [
      "Program log: AnchorError caused by account: config. Error Code: AccountNotInitialized.",
    ]),
  ).toBe("PROGRAM_NOT_READY"));
it.each([
  ["insufficient lamports 100, need 500", "INSUFFICIENT_SOL"],
  ["Error Code: InsufficientBond.", "INSUFFICIENT_BOND"],
  ["Error Code: BondLocked.", "BOND_LOCKED"],
  ["Error Code: Unauthorized.", "ACTION_UNAUTHORIZED"],
  ["Error Code: WrongState.", "ACTION_EXPIRED_OR_CHANGED"],
])("classifies %s", (log, code) =>
  expect(simulationFailureCode({}, [log])).toBe(code),
);
it("recognizes fee failure without logs", () =>
  expect(simulationFailureCode("InsufficientFundsForFee", null)).toBe(
    "INSUFFICIENT_SOL",
  ));
it("keeps unknown failures unknown", () =>
  expect(
    simulationFailureCode({ InstructionError: [0, { Custom: 1234 }] }, null),
  ).toBe("SIMULATION_FAILED"));

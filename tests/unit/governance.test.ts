import { it, expect } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  applicationAddress,
  decodeApplication,
  policyBytes,
  DEMO_POLICY,
  approveApplicationIx,
  rejectApplicationIx,
  submitApplicationIx,
  managerActionIx,
} from "../../src/escrow/governance";
import { digest, i64, PROGRAM_ID } from "../../src/escrow/client";
const owner = Keypair.generate().publicKey,
  manager = Keypair.generate().publicKey;
it("application layout and actor binding are independently decoded", async () => {
  const address = applicationAddress(owner),
    bump = PublicKey.findProgramAddressSync(
      [Buffer.from("application_v1"), owner.toBuffer()],
      PROGRAM_ID,
    )[1];
  const data = Buffer.concat([
    (await digest("account:ArbitratorApplication")).subarray(0, 8),
    owner.toBuffer(),
    Buffer.from([0]),
    i64(100),
    i64(200),
    Buffer.from([0, bump]),
  ]);
  const a = await decodeApplication(address.toBase58(), data);
  expect(a.authority).toBe(owner.toBase58());
  expect(a.status).toBe("pending");
  expect(a.submittedAt).toBe(100);
  expect(data.length).toBe(59);
  await expect(decodeApplication(manager.toBase58(), data)).rejects.toThrow(
    "INVALID_ACCOUNT",
  );
});
it("policy boundaries fail before wallet signing", () => {
  expect(policyBytes(DEMO_POLICY)).toHaveLength(48);
  expect(() => policyBytes({ ...DEMO_POLICY, times: [10, 10, 9, 10] })).toThrow(
    "INVALID_TERMS",
  );
});
it("governance builders are checked against the generated IDL", async () => {
  expect((await approveApplicationIx(manager, owner)).keys).toHaveLength(8);
  expect((await rejectApplicationIx(manager, owner, 1)).keys).toHaveLength(3);
  expect((await submitApplicationIx(owner)).keys).toHaveLength(5);
  expect((await managerActionIx("accept_manager", manager)).keys).toHaveLength(
    2,
  );
});

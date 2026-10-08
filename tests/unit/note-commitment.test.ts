import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { noteCommitment } from "../../src/escrow/note-commitment";

it("a Vietnamese note produces the exact SHA-256 bytes required by the instruction", async () => {
  const note = "Đã giao đủ ba file qua chat.";
  expect(await noteCommitment(`  ${note}\n`)).toEqual(
    createHash("sha256").update(note, "utf8").digest(),
  );
});
it("empty notes cannot create a delivery or ruling commitment", async () => {
  await expect(noteCommitment(" \n ")).rejects.toThrow("NOTE_REQUIRED");
});
it("the limit counts UTF-8 bytes rather than characters", async () => {
  await expect(noteCommitment("a".repeat(8192))).resolves.toHaveLength(32);
  await expect(noteCommitment("a".repeat(8193))).rejects.toThrow(
    "NOTE_TOO_LONG",
  );
  await expect(noteCommitment("đ".repeat(4097))).rejects.toThrow(
    "NOTE_TOO_LONG",
  );
});

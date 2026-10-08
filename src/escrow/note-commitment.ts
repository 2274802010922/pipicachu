import { digest } from "./binary";

// The contract stores a 32-byte commitment, not the private note or its files.
// Keep actual goods/evidence in the agreed channel; no export/import workflow.
export async function noteCommitment(note: string) {
  const value = note.trim();
  if (!value) throw Error("NOTE_REQUIRED");
  if (new TextEncoder().encode(value).length > 8192)
    throw Error("NOTE_TOO_LONG");
  return digest(value);
}

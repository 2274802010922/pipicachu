// Reuse the exact program flow on Devnet; no local minting or Mainnet writes.
process.argv.push("--devnet");
await import("../../tests/program/cycle");
export {};

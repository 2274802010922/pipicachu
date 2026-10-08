import fs from "node:fs";
import assert from "node:assert/strict";

// Cargo prints the source-derived IDL; no Anchor CLI or maintainer key required.
const log = fs.readFileSync(process.argv[2], "utf8");
const sections = new Map(
  [
    ...log.matchAll(/--- IDL begin (\w+) ---\s*([\s\S]*?)--- IDL end \1 ---/g),
  ].map(([, name, value]) => [name, JSON.parse(value)]),
);
assert.ok(
  sections.has("program") && sections.has("address") && sections.has("errors"),
  "Incomplete generated IDL",
);
const generated = sections.get("program");
generated.address = sections.get("address").replace(/[^A-Za-z0-9]/g, "");
generated.errors = sections.get("errors");
const names = JSON.parse(JSON.stringify(generated), (_, value) =>
  typeof value === "string" && value.startsWith("pipicachu_escrow::")
    ? value.split("::").at(-1)
    : value,
);
const expected = JSON.parse(fs.readFileSync("client/idl/escrow.json", "utf8"));
function abi(idl) {
  return {
    address: idl.address,
    instructions: idl.instructions.toSorted((a, b) =>
      a.name.localeCompare(b.name),
    ),
    accounts: idl.accounts.toSorted((a, b) => a.name.localeCompare(b.name)),
    types: idl.types.toSorted((a, b) => a.name.localeCompare(b.name)),
    errors: idl.errors,
  };
}
assert.deepEqual(
  abi(names),
  abi(expected),
  "Rust source and committed IDL differ",
);
console.log(
  "Source-derived IDL matches address, discriminators, account order, types and error codes.",
);

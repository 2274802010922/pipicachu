#!/usr/bin/env bash
set -euo pipefail
# Run in Linux/WSL from this repository. No deployment or secret copied into Git.
cargo build-sbf --manifest-path programs/pipicachu-escrow/Cargo.toml 2>&1 | tee /tmp/pipicachu-sbf-build.log
if grep -q 'Stack offset' /tmp/pipicachu-sbf-build.log; then echo 'Unsafe SBF stack frame'; exit 1; fi
cargo test --locked --manifest-path programs/pipicachu-escrow/Cargo.toml --lib
mkdir -p work/quality
ANCHOR_IDL_BUILD_RESOLUTION=TRUE cargo test --locked --manifest-path programs/pipicachu-escrow/Cargo.toml --features idl-build __anchor_private_print_idl -- --nocapture --test-threads=1 > work/quality/source-idl.log 2>&1
node scripts/checks/idl.mjs work/quality/source-idl.log
validator_pid=""
stop_validator() {
  if [ -n "$validator_pid" ]; then kill "$validator_pid" 2>/dev/null || true; wait "$validator_pid" 2>/dev/null || true; validator_pid=""; fi
}
trap stop_validator EXIT
start_validator() {
  local role="$1"
  local mode="${2:-manager}"
  stop_validator
  if [ "$role" = independent ]; then unset LOCAL_TREASURY_ROLE; else export LOCAL_TREASURY_ROLE="$role"; fi
  npx tsx scripts/devnet/prepare-local.ts
  local ledger="$PWD/work/validator/$role-ledger"
  case "$ledger" in "$PWD"/work/validator/*) ;; *) exit 1 ;; esac
  local args=()
  for name in mint config fee-config organization manager; do
    if [ "$mode" = cold ] && [ "$name" = manager ]; then continue; fi
    local address
    address="$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).pubkey)' "work/validator/$name.json")"
    args+=(--account "$address" "work/validator/$name.json")
  done
  solana-test-validator --reset --quiet --ledger "$ledger" --rpc-port 8897 --faucet-port 9907 \
    --bpf-program 4Xds5m5JtWR8HbNLdGeF7e3Qh3akKMHwMfjKsQeVXnrb target/deploy/pipicachu_escrow.so \
    "${args[@]}" > "work/validator/$role-validator.log" 2>&1 &
  validator_pid=$!
  local ready=0
  for attempt in $(seq 1 60); do
    if curl --silent --fail -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' http://127.0.0.1:8897 | grep -q 'ok'; then ready=1; break; fi
    sleep 1
  done
  [ "$ready" = 1 ] || { cat "work/validator/$role-validator.log"; exit 1; }
}
start_validator independent cold
npx tsx tests/program/bootstrap.ts --deny-only
start_validator independent
npm run test:program
npx tsx tests/program/organizations.ts
npx tsx tests/program/v06.ts
npx tsx scripts/checks/benchmark-program.ts
npx tsx tests/program/aliases.ts
for role in buyer seller arbitrator; do
  start_validator "$role"
  npx tsx tests/program/aliases.ts
done

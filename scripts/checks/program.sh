#!/usr/bin/env bash
set -euo pipefail
# Run in Linux/WSL from this repository. No deployment or secret copied into Git.
cargo build-sbf --manifest-path programs/pipicachu-escrow/Cargo.toml 2>&1 | tee /tmp/pipicachu-sbf-build.log
if grep -q 'Stack offset' /tmp/pipicachu-sbf-build.log; then echo 'Unsafe SBF stack frame'; exit 1; fi
npx tsx scripts/devnet/prepare-local.ts
solana-test-validator --reset --quiet --ledger work/validator/ledger --rpc-port 8897 --faucet-port 9907 \
 --bpf-program HwsHDnbuZbXZtVFvgGkZpzAVEAQN3SYJCfZzUa18Ho5V target/deploy/pipicachu_escrow.so \
 --account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU work/validator/mint.json \
 --account "$(node --input-type=module -e 'import {PublicKey} from "@solana/web3.js"; console.log(PublicKey.findProgramAddressSync([Buffer.from("config")],new PublicKey("HwsHDnbuZbXZtVFvgGkZpzAVEAQN3SYJCfZzUa18Ho5V"))[0].toBase58())')" work/validator/config.json > work/validator/validator.log 2>&1 &
validator_pid=$!
trap 'kill "$validator_pid" 2>/dev/null || true' EXIT
for attempt in $(seq 1 60); do
 if curl --silent --fail -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' http://127.0.0.1:8897 | grep -q 'ok'; then break; fi
 sleep 1
done
npm run test:program

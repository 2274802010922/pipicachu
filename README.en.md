<p align="center"><img src="public/brand/picachu-logo.jpg" width="88" alt="pipicachu"></p>
<h1 align="center">pipicachu · USDC escrow for digital goods</h1>
<p align="center">For community buyers and sellers who already use Solana wallets and USDC. One deal link, fixed terms, program-controlled funds.</p>
<p align="center">
<a href="https://github.com/2274802010922/pipicachu/actions/workflows/quality.yml"><img src="https://github.com/2274802010922/pipicachu/actions/workflows/quality.yml/badge.svg?branch=main" alt="Quality CI"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-2456E6?style=flat-square" alt="Apache 2.0"></a>
<img src="https://img.shields.io/badge/Solana-Devnet-B7F34D?style=flat-square&amp;labelColor=091426" alt="Devnet">
</p>
<p align="center"><a href="https://pipicachu.vercel.app">Open app</a> · <a href="docs/judging/README.md">Judge guide</a> · <a href="docs/evidence/v06/README.md">Current status and evidence</a> · <a href="README.md">Tiếng Việt</a></p>

![pipicachu](docs/assets/readme-banner.svg)

> **Devnet prototype.** Test tokens have no real value. Upgrade authority remains; no independent audit, Mainnet launch or verified willingness to pay. v0.6 is undergoing acceptance, not a completed release.

## Why this exists

A seller wants payment before handing over a digital pack; a buyer wants to inspect it before paying. An intermediary can help, but holding funds in their personal wallet adds custody dependence. pipicachu separates program-controlled principal from a community arbitrator’s ruling.

The target audience and fee model remain hypotheses. Online-sale scam warnings are context, not proof of pipicachu customers. [Validation kit](docs/product/validation-kit.md).

## Watch a real happy path

[![Vietnamese demo](docs/demo/video-vi-2026-10-05/thumbnail-vi.png)](https://www.youtube.com/watch?v=mTY3e3qX_4k)

**v0.5 footage:** real Phantom approval, 2 Devnet USDC, seller gets 1.96; arbitrator and platform each 0.02. Seller left, buyer right. Personas are illustrative. It does not show v0.6 governance, late ruling, dispute or keeper. English video awaits English-UI footage.

## Four steps

1. Seller chooses an available approved arbitrator and creates a link.
2. Buyer reviews terms and deposits USDC into a deal vault.
3. Seller delivers outside the app and commits delivery evidence.
4. Buyer confirms; or disputes before review expiry. Without a timely dispute, a keeper can submit release.

Arbitrators separately apply → manager reviews → deposit bond → enable service. Standing consent removes per-deal arbitrator signing. Manager authority is read from chain; approval is an allowlist, not KYC.

## What we built

| Capability                                                                | Evidence                                                                                                  |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Atomic 98/1/1 payout; full fee-free refund; bond unlock once              | [Rust](programs/pipicachu-escrow/src/lib.rs), [executable tests](tests/program/cycle.ts)                  |
| Intentional treasury alias, transfers consolidated by token account       | [Recovery receipt](docs/evidence/hotfix-alias-recovery.json), [four-role tests](tests/program/aliases.ts) |
| Late ruling for new policy 1; legacy 0 retains original deadlines         | [Protocol](docs/architecture/v06.md), [governance/capacity tests](tests/program/v06.ts)                   |
| Separate manager authority, applications, two-step transfer               | [Client/IDL](client/idl/escrow.json), [bootstrap receipt](docs/evidence/v06/manager-bootstrap.json)       |
| Pending recovery with the same signature; stale data blocks money actions | [Operation](src/escrow/operation.ts), [UX](docs/design/system.md)                                         |
| Short note → wallet signature; no JSON download or evidence file upload   | [Note hash](src/escrow/note-commitment.ts), [flow checks](tests/e2e/simple-notes.spec.ts)                 |
| Bounded RPC, shared quotas, isolated keeper retries                       | [Backend](src/backend/), [keeper](scripts/devnet/keeper.ts)                                               |

Manager approval, Redis, six Devnet branches and a keeper payout have recorded evidence. The owner reported a successful Phantom flow on 08 October; detailed receipts/checklists were not supplied for independent reporting. Scheduled keeper reliability, EN footage and paid-user validation remain separate gates. [Current status](docs/evidence/quality/README.md).

## Why Solana

Program-derived vaults hold principal; SPL Token CPI settles USDC and fees atomically. Transactions carry wallet authorization and independently inspectable receipts. Arbitrator funds are a capacity pool, not insurance. A timer does not run a transaction: the keeper or a user must submit finalize.

## UI showcase

These are actual deployed v0.5 captures from 05/10, retained as historical visuals. The new workspace is tested separately; screenshots do not imply all v0.6 flows have live approval.

![Desktop home](docs/assets/showcase/home-desktop-vi.png)

<table><tr><td><img src="docs/assets/showcase/home-mobile-vi.png" width="280" alt="VI mobile home"></td><td><img src="docs/assets/showcase/create-mobile-en.png" width="280" alt="EN mobile create"></td></tr></table>

v0.6 workspace capture from the local running app with a **synthetic pending application** (07/10); it proves layout, not live approval:

![v0.6 arbitrator pending workspace](docs/assets/showcase/v06/arbitrator-pending-desktop-en.png)

## Architecture and trust

Frontend feature controllers → fixed Devnet RPC proxy → Solana program. Manager controls registry; arbitrator controls dispute outcomes within the policy; upgrade authority is a separate retained Devnet power. Web servers hold no manager, buyer or seller keys. Redis stores expiring quotas and operational reports.

[Architecture](docs/architecture/v06.md) · [Security exceptions](docs/legal/dependency-exceptions.md) · [Acceptance gates](docs/testing/v06-gates.md) · [Read benchmark](docs/evidence/v06/benchmark.json).

## Implementation quality

The 08 October pass separates Solana client and Rust responsibilities, extracts action orchestration from the UI, validates UTF-8/account layouts and improves transaction recovery. Features and ABI remain unchanged.

- CI compares source-generated IDL, pins Action commits and verifies the Agave checksum. Lint warnings fail; credential patterns and expiring advisory exceptions are checked.
- A full snapshot uses 2 RPCs instead of 4. Six paired Devnet measurements: median 216.5 → 180 ms; no production performance guarantee.
- Automated tests, Devnet receipts, real Phantom and production services are reported separately with explicit pending gates.

[Quality evidence](docs/evidence/quality/README.md) · [Source boundaries](docs/architecture/quality.md) · [Reproduce from a clean checkout](docs/testing/reproduce.md) · [Owner checks](docs/deployment/OWNER_CHECKS.md).

## Run and reproduce

Node 24 and pinned npm/dependencies/lockfile. `npm ci`, copy `.env.example` into ignored `.env.local`, then `npm run dev`. Local memory limiting is not a multi-instance proof. `npm run verify`; Linux/WSL `bash scripts/checks/program.sh` builds and executes synthetic local tests. Devnet writes require separate test wallets.

[Deployment and secrets](docs/deployment/README.md) · [Harness context](docs/harness/context/CURRENT_STATE.md) · [IDL](client/idl/escrow.json).

## Limits and commercial hypothesis

Platform 1% + arbitrator 1% on payout; no fee on full refund. No paid-user validation or revenue. We compare direct transfers, intermediary custody, Escrow.com and Kleros; we do not claim no competitors or an established moat.

Evidence hashes do not prove file quality. Bond does not punish bad rulings. Arbitrator abandonment without mutual agreement can lock funds. No marketplace, USDT/VND conversion, AI, backup arbitrator or Mainnet in this release. Known dependency exceptions and report-only CSP are disclosed.

## License

Original code/docs: [Apache 2.0](LICENSE). [Third-party notices](THIRD_PARTY_NOTICES.md). The supplied pixel logo is excluded; this license grants no third-party artwork, character or trademark rights.

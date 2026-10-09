# pipicachu · C2C escrow

**USDC escrow for community digital-goods trades: one deal link, fixed terms, program-held funds and an arbitrator for disputes.**

[Product](https://pipicachu.vercel.app) · [Source](https://github.com/2274802010922/pipicachu) · [VI/EN slides](slides-v06.md) · [4-minute live script](pitch-4min.md) · [Evidence](../evidence/quality/README.md)

## Problem and users

File/template sellers want payment before delivery. Unfamiliar buyers want to inspect first. Community admins can mediate, but personally holding principal creates another dependency for both parties. The target users **already have Solana wallets and choose USDC**. The product does not provide fiat conversion or a marketplace.

[The FTC documents fake-payment risks in online selling](https://consumer.ftc.gov/consumer-alerts/2022/07/selling-stuff-online-heres-how-avoid-scam). That is scenario context, not USDC-specific demand research or evidence of pipicachu customers.

## Solution and workflow

Seller selects an available arbitrator and creates a link → buyer reviews terms and deposits USDC → seller shares goods through the agreed channel and signs delivery → buyer confirms or disputes before the deadline. For disputes, the arbitrator chooses payout/refund to fixed recipients. The in-app actions use a short note and wallet signature; files/evidence are not uploaded to the server.

Arbitrators apply, receive manager approval, pre-fund a bond pool and enable intake. Standing consent removes per-deal acceptance signatures; capacity is reserved atomically when the buyer funds. Bond is not insurance or slashing.

## Business and positioning

- **Implemented fees:** 98% seller, 1% arbitrator, 1% platform on payout. Full-principal refunds have no service fee; SOL fees are separate.
- **Proposed value:** shared terms/status, program custody instead of an intermediary's personal wallet, role-based workflow and prepaid capacity.
- **Proposed acquisition:** pilots through 1–2 USDC community admins and 5–10 buyers/sellers deciding on a concrete fee. These are plans, not traction.
- **Validation needed:** unassisted completion, fee/deadline comprehension, repeat-use intent and willingness to pay. No demonstrated revenue or moat yet.

Escrow is not a proprietary idea. Direct USDC transfers, admin custody, Escrow.com and Kleros are alternatives with different scopes/trade-offs. [Comparison and Q&A](questions.md).

## Technical Build and Solana

We built the Anchor program, state machine, constraints, vault/bond/settlement, IDL-based client, recovery, bounded RPC proxy/limiter and UI. **PDA vaults and SPL Token CPI** enforce custody/transfers on Solana, with network Clock, wallet authorization and finality. Fees settle atomically, terminal operations reject double spending and reserved bond unlocks once.

[Constraints](../../programs/pipicachu-escrow/src/contexts.rs) · [Settlement](../../programs/pipicachu-escrow/src/settlement.rs) · [Recovery](../../src/escrow/operation.ts) · [Attribution](../../THIRD_PARTY_NOTICES.md)

## Evidence and demo

| Evidence                                                                              | Scope                                                                                            |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [CI 37818489543](https://github.com/2274802010922/pipicachu/actions/runs/37818489543) | Source e9b53f0: web/program passed, 122 unit/integration +41 browser                             |
| [Six finalized Devnet branches](../evidence/v06/live/acceptance.json)                 | Confirm, delivery timeout, arbitrator payout/refund, late ruling and mutual refund; CLI fixtures |
| [Keeper payout](../evidence/v06/live/keeper-payout.json)                              | Actual service signer, fee split and unlock; dispatch does not establish cron uptime             |
| Owner reported successful Phantom testing on 08 October                               | Manual report, not independently recorded per-case receipts                                      |

The pitch has **4 slides and 125 seconds of live demo**. Use a new 1 USDC deal created beforehand: fund → deliver → confirm → 0.98/0.01/0.01. A [previously executed result](https://pipicachu.vercel.app/deals/25JTcp8NdyqQoTksumh8hkUszc8SD3Ea3t2SNmor8Buj) is labeled as such, never passed off as a new live action. The [v0.5 video](https://www.youtube.com/watch?v=mTY3e3qX_4k) shows the 2 USDC happy path, not all v0.6 features.

## Status, limitations and team

**Devnet prototype**, unaudited and not deployed on Mainnet; upgrade authority remains. An arbitrator can rule incorrectly, and abandonment without mutual agreement can lock funds. Hashes do not verify goods quality. Cron reliability, timed rehearsal and willingness to pay have no published acceptance result. The live pitch uses buyer confirmation.

Focus: Product & Business and Technical Build, particularly Solana Integration/System Architecture. There is no AI in the current user flow. Solo builder: [@2274802010922](https://github.com/2274802010922). Code is Apache-2.0; artwork rights are separate. [Licensing/notices](../legal/README.md).

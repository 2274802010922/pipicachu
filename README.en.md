# pipicachu · Escrow deals

[Website](https://pipicachu.vercel.app) · [Devnet demo](https://pipicachu.vercel.app/demo) · [Tiếng Việt](README.md)

A small escrow tool for community intermediaries and their customers. Sellers create a deal link, two arbitrators accept, buyers deposit Devnet USDC, and delivery is followed by confirmation, timeout release or dispute resolution.

**Devnet only. Test tokens have no real value. No independent audit; upgrade authority is retained.**

## Flow

- Immutable participants, mint, amount, deadlines and fee.
- Program-controlled token vault holds the principal.
- Missed delivery allows a buyer refund; delivery opens the review window.
- Buyer confirmation or an undisputed review deadline allows seller payout.
- Disputes stop timeout payout. Primary arbitration is followed by a preselected backup.
- If both arbitrators expire, a buyer proposal requires seller acceptance. Without agreement, funds may remain locked.
- Each arbitrator reserves 10% of deal value. Demo fee is 1% of seller payouts; refunds have no fee.

Bond is not insurance. No wrongful-ruling slashing, appeal or automatic keeper. Off-chain goods and game-account ownership are not verified. No validated willingness to pay or traction is claimed.

## Build and review

```bash
npm ci
cp .env.example .env.local
npm run dev
npm run verify
```

[Architecture](docs/architecture/README.md), [deployment](docs/deployment/README.md), [tests](docs/testing/README.md), [evidence](docs/evidence/README.md). Includes Anchor contract, generated IDL, transaction client and executable program tests. No server custody key, AI or account database.

Code MIT; logo excluded. [Notices](THIRD_PARTY_NOTICES.md). Former explainer preserved at checkpoint `7315d42`. Previous Picachu project untouched.

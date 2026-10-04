# pipicachu · Escrow deals

[Website](https://pipicachu.vercel.app) · [Devnet demo](https://pipicachu.vercel.app/demo) · [Tiếng Việt](README.md)

A small escrow tool for community intermediaries and their customers. Sellers create a deal link, one arbitrator accepts, buyers deposit Devnet USDC, and delivery is followed by confirmation, timeout release or dispute resolution.

**Devnet only. Test tokens have no real value. No independent audit; upgrade authority is retained.**

## Flow

- Immutable participants, mint, amount, deadlines and fee.
- Program-controlled token vault holds the principal.
- Missed delivery allows a buyer refund; delivery opens the review window.
- Buyer confirmation or an undisputed review deadline allows seller payout.
- Disputes stop timeout payout. The sole arbitrator rules before the deadline.
- If the arbitrator expires, a buyer proposal requires seller acceptance. Without agreement, funds may remain locked.
- The arbitrator reserves 10% of deal value. New deals charge 1% arbitrator + 1% platform (98% seller net); refunds have no fee. Legacy deals keep their original 1% arbitrator fee.

Bond is not insurance. No wrongful-ruling slashing or appeal. Automatic Devnet payout uses a keeper on an approximately 5-minute schedule, with possible service delays. Off-chain goods and game-account ownership are not verified. No validated willingness to pay or traction is claimed.

## Build and review

v0.4: 53 unit tests, 17 browser tests and 39 executable program checks; six live Devnet scenarios verified from finalized receipts and exact vault transfers. Website signing passed using a test provider, not the actual Phantom extension. See [evidence](docs/evidence/README.md).

```bash
npm ci
cp .env.example .env.local
npm run dev
npm run verify
```

[Architecture](docs/architecture/README.md), [deployment](docs/deployment/README.md), [tests](docs/testing/README.md), [evidence](docs/evidence/README.md). Includes Anchor contract, generated IDL, transaction client and executable program tests. No server custody key, AI or account database.

Code MIT; logo excluded. [Notices](THIRD_PARTY_NOTICES.md). Former explainer preserved at checkpoint `7315d42`. Previous Picachu project untouched.

## Platform fees v1

New deals: buyer deposits the principal; seller receives 98%, arbitrator 1%, pipicachu 1%. Refunds return the full principal without fees. Existing deals retain their original fee snapshot. Immutable Devnet treasury: `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`. No additional environment variable or private key required.

Current scope: 53 unit tests, 17 browser tests, 39 executable program checks and six live Devnet scenarios. [Evidence](docs/evidence/README.md) separates current fee validation from historical 1%-only receipts. Injected test-provider signing is not actual Phantom-extension verification.

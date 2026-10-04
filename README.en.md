<div align="center">

<img src="public/brand/picachu-logo.jpg" width="100" alt="pipicachu logo" />

# pipicachu

**Solana transactions, explained for beginners in Vietnamese and English.**

Paste a link → read evidenced facts → compare an expected payment.

[Tiếng Việt](README.md) · [Demo](docs/demo/README.md) · [Architecture](docs/architecture/README.md) · [Deployment](docs/deployment/README.md)

</div>

## What it does

Reads SOL/USDC transfers, status, fees and asset changes, with labeled partial Jupiter interpretation. Compares network, recipient, canonical token mint, exact integer amounts and finality. The core owns numerical conclusions; AI only supplies a short explanation.

No account, transaction history, or wallet connection is required for lookups. The separate Phantom lab signs a 0.001 SOL Devnet transfer. Mainnet is read-only.

## Run

```bash
npm ci
npm run dev -- --port 3104
npm run verify
```

See [.env.example](.env.example). Production requires shared Redis; local memory limits are explicitly labeled. New fixture wallets are kept in ignored `work/private`. Never publish private keys or copy another project's configuration.

## Limits and evidence

Matching confirms only the fields entered. It does not establish identity, invoice settlement, exchange credit, transaction non-reuse or absolute safety. Missing evidence stays unknown; failed operations are never counted as payments. SOL balance changes can include fees and rent, not just swap amounts.

[Current state](docs/harness/context/CURRENT_STATE.md) · [Tests](docs/testing/README.md) · [Evidence](docs/evidence/README.md) · [Judge kit](docs/judging/README.md)

Technical tests are not user traction or universal accuracy claims. Code is [MIT](LICENSE); see [third-party notices](THIRD_PARTY_NOTICES.md). Owner-provided artwork is excluded from the code license.

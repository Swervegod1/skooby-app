# SKOOBY ALPHA ORACLE V1.2 — read-only research harness

A modular market-state and AI-proposal validation harness, kept separate from Next.js UI.

- alpha_oracle_v12.py — Mahalanobis novelty detection (different from FreqAI DI), independent order proposal checks, sticky portfolio risk locks, anti-averaging-down, and JSON market-state snapshots.
- test_alpha_oracle_v12.py — run python -m pip install -r requirements.txt && python -m pytest -q within this directory.
- /oracle/gematria — client-only optional symbolic timing. lib/gematria.ts is deliberately never imported by the risk engine.

**Not production trading software.** No exchange adapters, private keys, signers, order placement, or automatic liquidations. In-memory risk state cannot enforce production controls. Production requires authenticated services, exchange-reconciled equity, durable state, idempotency, backtesting, paper trading, and exchange-side protective orders.

Names and birth dates remain in the browser's React state; this feature does not transmit them, persist them, or use them in market scoring.

References:
- FreqAI https://docs.freqtrade.io/en/latest/freqai-feature-engineering/
- Vanta https://github.com/taoshidev/vanta-network
- Nof1 https://nof1.ai/
- Gematria https://en.wikipedia.org/wiki/Gematria

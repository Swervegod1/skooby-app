# GHOST WHALE // ORACLE X · Skooby intelligence service

Working research MVP with real Coinbase historical captures, repeatable models,
measured calibration, costed backtests, independent risk rules, persistent paper
ledger, authenticated Skooby dashboard and tests. **No live execution adapter.**
No strategy currently meets promotion requirements. Failed experiments remain
visible. See [actual validation](docs/VALIDATION.md).

## Run

Python 3.12, Node 20.9+ and ordinary CPU hardware. From the repository root:

```sh
cd services/oracle-x
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.lock
python -m pytest -q
python -m oracle.research --capture data/coinbase-capture.json --output data/research-results.json
```

Inject `ORACLE_API_TOKEN` (at least 32 random characters) through your approved
secret manager into both the Python service and Next.js server. Do not paste it
into chat or save it in source files. Set `ORACLE_DB` to a persistent writable
path. For offline historical replay set `ORACLE_CAPTURE` to the absolute path of
`data/coinbase-capture.json`; otherwise public Coinbase REST is used.

```sh
python -m uvicorn oracle.api:create_app --factory --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
```

In a second process, with the same `ORACLE_DB`:

```sh
python -m oracle.worker
```

Set server-side `ORACLE_API_URL=http://127.0.0.1:8000` in the Skooby server
environment, install the root Node dependencies with `npm ci`, and run
`npm run dev` from the repository root. Open `/oracle` and sign in using Skooby's
existing authentication. The internal token is never sent to the browser.
Missing service configuration displays an unavailable state, not invented data.
The initial $100 is fictional paper capital, never your Coinbase balance.

For separate hosts use private networking plus TLS; the Python HTTP port must not
be public. `docker compose up --build -d` provides one API and one paper exit
worker with a shared persistent volume. Container deployment requires injected
secrets; no exchange keys are required. Docker build has not been exercised in
the build workspace; see [acceptance record](docs/ACCEPTANCE.md).

## What the release does

- Retrieves hourly BTC/ETH candles; rejects malformed, incomplete and gapped
  histories. Retains timestamps and provenance; archived arrival times are not
  available and historical availability is explicitly modeled.
- Generates 1h/4h forecasts and 24h only with sufficient history; records Brier,
  ECE, prior baseline, costs, passive/momentum/cash results and experiment hashes.
- Provides authenticated status, analysis, experiments, paper order and pause APIs.
  Models cannot authorize orders: release eligibility is false independently of
  model output. Order/accounting behavior is tested with synthetic fixtures.
- Stores accounts, decisions, fills, pauses and audit chains across restart.
  Reconciles protective paper exits independently of the browser.
- Offers an eight-tab dashboard and bounded natural-language command allowlist.
  Unsupported requests take no action. Smart-wallet attribution remains absent.

## Documentation

- [Research and provider audit](docs/RESEARCH.md)
- [Architecture and scope](docs/ARCHITECTURE.md)
- [Owner capital-protection policy](docs/CAPITAL_PROTECTION.md)
- [Actual backtest results](docs/VALIDATION.md)
- [Acceptance commands and results](docs/ACCEPTANCE.md)
- [Operations and recovery](docs/OPERATIONS.md)
- [Prioritized backlog](docs/BACKLOG.md)

The code is an evaluated research baseline, not a certified profitable strategy
or production financial system. No live orders, transfers, signatures or account
security changes were performed by this build.

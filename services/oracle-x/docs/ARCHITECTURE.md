# GHOST WHALE // ORACLE X

## Implemented boundary

Skooby Next.js `/oracle` → authenticated, same-origin allowlisted proxy → isolated
FastAPI service → typed public data connectors → causal research models →
deterministic risk gate → transactional paper ledger. The persistent exit worker
runs independently of the browser. No live execution transport exists.

Skooby derives identity from its verified server session. The proxy forwards it
with a server-only service bearer token; FastAPI hashes it before persistence.
Only trusted backend infrastructure may access the service. Do not expose its
port publicly; possession of the service token authorizes tenant impersonation.
Requests cannot set prices, balances, risk policies or strategy eligibility.

The six displayed roles are deterministic evidence workers in one orchestrator,
not six autonomous LLM traders. They record evidence and disagreement; wallet
intelligence explicitly abstains until a source is connected. The independent
risk module never accepts an agent vote as authority. All strategies are
ineligible in this release, regardless of predicted confidence.

## Research

Hourly BTC/ETH OHLCV, rolling causal features, regularized logistic and ridge
baselines, sigmoid calibration on a separate chronological window, purged and
embargoed walk-forward evaluation, empirical return quantiles and measured Brier
score/ECE. Entries occur at the next hourly opening strictly after feature
availability; historical ingestion is modeled as close+2 seconds. These are
availability assumptions, not preserved contemporary event arrivals.

Historical samples were retrieved through the connected Coinbase market-data
tool. `data/coinbase-capture.json` preserves provider responses, request windows
and retrieval time. No account balances or private trades are included. Current
deployment uses the documented public Exchange API, a different API surface from
the chat connector; these paths share the normalized schema, not authentication.
Fixed HTTP hosts, no redirect following, bounded responses and polling below
documented provider limits reduce SSRF and provider load.

1h and 4h forecasts work with the bundled sample. 24h requires more history.
5m/15m/7d/30d, barrier probabilities, calibrated probability intervals, new-token
security verification, verified wallet attribution, neural nets and autonomous
model promotion remain deferred. Quantiles are empirical residual scenarios,
not confidence bounds on probability and not guaranteed loss limits.

## State and recovery

SQLite WAL provides single-host ACID transactions for accounts, decisions,
experiments, positions, orders and chained audit events. Default $100 is
explicitly fictitious paper capital. Unmarked positions show STALE_COST_BASIS.
Per-user idempotency keys and decision IDs are unique; fill authorization and
balance mutation share one transaction. Protective paper exits continue when
entries are paused. Feed failure records an anomaly; three anomalies stop entry.
Restarts retain pauses, positions and orders. A worker rechecks persisted exits.

Audit hashes detect changed history within the retained chain; they are not
tamper-proof against a database administrator who rewrites the complete chain
or truncates its tail. Externally anchored hashes/WORM export are a production
prerequisite. Local SQLite is a deliberate MVP simplification; PostgreSQL with
row-level policies, migrations, approved object storage/Parquet, Redis and a
durable job queue are next-stage deployment work, not claimed implemented.

## Execution model and limits

Research backtests compare fixed 10% allocation signals and benchmarks. They are
not identical to paper risk sizing and do not model intrabar stop execution.
The paper broker uses conservative quote-side fills plus 2bp impact and 60bp fees
each way. These assumptions are not the user's actual fee tier. A research result
must survive fee sensitivity and forward evidence before any eligibility review.
Microcaps remain research-only; DEX Screener observations do not establish
unique traders, contract privileges, liquidity ownership or sellability.

## Operational scope

Run one API process and one worker on persistent storage. In-process throttles
and analysis lock are not distributed; horizontal scaling requires shared
coordination. There is no public registration or subscription entitlement API.
Existing Skooby authentication is reused; subscription-aware access and MFA
administration are deferred. Polling replaces WebSockets for the first release.

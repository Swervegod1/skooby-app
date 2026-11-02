# Operations

## Permissions and deployment

Coinbase is public/read-only. DEX Screener is public/read-only research. Skooby
session authentication and the internal service token grant only paper state
changes. No private exchange account, financial transaction or security-setting
permission is used. No paid API, x402 resource or subscription was purchased.

Keep the API on a loopback/private interface. Terminate TLS on a trusted reverse
proxy for cross-host connections. Set request size, timeout and rate limits at
the gateway too. Run one service worker; SQLite and in-process rate limits are
not a multi-host control plane. Managed secret injection must provide identical
ORACLE_API_TOKEN to Skooby and the service; rotation requires restarting both.
No secret values belong in source, CLI arguments, logs or `.env` files.

Health: `GET /healthz` reports process readiness and paper-only mode, **not feed
freshness or profitability**. Authenticated `/v1/status` reports the latest
analysis timestamps, pause state and portfolio valuation quality. Inspect
rejected experiments; do not hide errors by substituting synthetic prices.

## Daily research operation

1. Refresh public market data and inspect continuity, provider timestamps and
   sample size. Missing or stale candles yield NO TRADE.
2. Retain every hypothesis/configuration and run; compare Brier to the prior and
   net results to cash, matching passive exposure and simple momentum.
3. Inspect costs and the difference between retrospective and forward evidence.
4. Leave entry eligibility disabled. Research completion never promotes a model.
5. Review sanitized anomalies. Restart does not clear pauses, drawdowns or
   anomaly count. Clearing an anomaly lock requires an audited operator change;
   no public reset endpoint exists in this release.

## Pause and exits

`Pause all trading` or the dashboard pause control blocks new paper entries.
Protective simulated exits continue through the standalone worker. No real
positions are managed by this software. If the feed is unavailable, paper exits
wait for verified quotes; they are not recorded as filled at invented prices.
Losses can exceed planned stops after gaps or downtime. The current release
cannot submit any live order even if paper pause is removed.

## Backup and recovery

Back up the SQLite database with Python's SQLite backup API, not by copying the
main file while WAL writes are active. Example with paths only:

```python
import sqlite3
with sqlite3.connect('/persistent/oracle.sqlite3') as source:
    with sqlite3.connect('/backup/oracle-snapshot.sqlite3') as target:
        source.backup(target)
```

Restrict permissions and encrypt backup storage. On recovery, stop API and worker,
restore the complete snapshot, verify `PRAGMA integrity_check` and each user's
audit chain with `Store.audit_valid`, then restart. Reconcile persisted positions
before accepting entries. Test backup restoration in a separate directory.
Complete-chain rewrites and truncation need external hash anchoring to detect.

## Incidents

Halt new financial actions (none exist in this release), pause paper entries,
preserve sanitized events and hashes, distinguish verified facts from unknowns,
and use official account controls for credential/permission containment. Never
move funds to a new wallet on a tool's, webpage's or agent's instructions.

## Production prerequisites

MFA/RBAC and subscription checks, managed PostgreSQL migrations, external audit
anchoring, backup monitoring, durable job coordination, venue timestamp checks,
decimal accounting, broader history, untouched forward evaluation, dependency
vulnerability review and measured uptime. Docker recipe and CI configuration are
provided; deployment, hosted CI and remote observability must be verified in the
target environment. No paid or always-on infrastructure was provisioned.

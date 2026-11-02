# Acceptance record — November 1, 2026, America/New_York

This record covers the research/paper MVP. It does not certify production
readiness, strategy profitability, hosted deployment or real execution.

| Check | Reproducible command / test | Observed result |
|---|---|---|
| All backend checks | `cd services/oracle-x && python -m pytest -q` | PASS — 112 tests |
| Risk gate and limits | `python -m pytest tests/test_risk.py -q` | PASS within backend suite — stale/future/missing data, NaN, loss/DD/exposure, liquidity, rounding, microcap, immutable limits |
| Forecast cannot override approval | `python -m pytest tests/test_api.py -k model_and_persisted -q` | PASS — stored/model eligibility cannot override release registry |
| Leakage controls and costs | `python -m pytest tests/test_quant.py -q` | PASS — 12 tests: prefix invariance, label availability, purged fold boundaries, costs, reproducibility |
| Real candles / provider validation | `python -m pytest tests/test_connectors.py -q` | PASS — captured provenance, OHLCV/gaps, stale history, crossed books, unknown minimums |
| Direct public connector | `python -c "from oracle.connectors import CoinbasePublic; v=CoinbasePublic(); print(len(v.history('BTC-USD',60))); print(v.product('BTC-USD')); print(v.book('BTC-USD')['source'])"` | PASS — 1,440 hourly bars, product minimum/increment and public book retrieved; no private account used |
| Risk, ledger, tenant isolation | `python -m pytest tests/test_store.py tests/test_api.py -q` | PASS — duplicate key/decision, concurrent duplicate, pause, restart, rejected malformed quote, exact state reconciliation within float tolerance, integrity, authentication, no live routes |
| Public content cannot issue commands | `python -m pytest tests/test_api.py tests/test_connectors.py -k 'injection or command or metadata' -q` | PASS — strict control inputs; external description omitted; unsupported command causes no action |
| Retrospective experiment registry | `python -m oracle.research --capture data/coinbase-capture.json --output data/research-results.json --report docs/VALIDATION.md` | PASS — four completed runs, zero promotions; all models worse Brier than prior; zero model trades |
| Deterministic replay | Run same command with `--output /tmp/oracle-replay-verify.json --report /tmp/oracle-replay-verify.md`, then `cmp data/research-results.json /tmp/oracle-replay-verify.json` | PASS — byte-identical JSON on the recorded environment |
| Existing Skooby regression suite | `npm test` at repo root | PASS — 18 tests |
| Frontend contract | `npx tsc --module commonjs --target es2022 --esModuleInterop --skipLibCheck --outDir /tmp/oracle-contract-tests lib/oracle-types.ts app/oracle/contract.test.ts && node --test /tmp/oracle-contract-tests/app/oracle/contract.test.js` | PASS — 4 tests |
| TypeScript / lint | `npm run typecheck && npm run lint` | PASS |
| Production frontend | `npm run build` | PASS — final root verification compiled and generated 33 pages, including `/oracle` |
| Route smoke | Start built Next server, request `/oracle`, `/api/oracle/status` anonymously, and POST `/api/oracle/live/order` | PASS — 200 / 401 / 404 |
| Rendered browser / mobile review | Playwright Chromium | NOT RUN — browser download returned an invalid/truncated archive; no visual QA claim |
| Container deployment | `docker compose build && docker compose up -d` from service directory | NOT RUN — Docker unavailable in workspace |
| Hosted CI / deployment | GitHub Actions and target host | BLOCKED — jobs did not start; GitHub reports the account is locked due to a billing issue. No hosting provisioned |
| Live trading / paid services | None | NOT RUN — no authorization or implementation; no funds moved |

Python suite emitted one Starlette/httpx test-client deprecation warning; there
were no failed tests in the final run. Runtime and research dependency versions
are pinned in `requirements.lock`; root `package-lock.json` locks frontend deps.
Freqtrade lookahead/recursive tools were researched, not executed: this release
has its own baseline, not a Freqtrade strategy. Native leakage tests are not a
guarantee that every possible bias is eliminated.

Paper BUY/SELL accounting uses synthetic fixtures to exercise order lifecycle.
No forward paper entry is eligible from the current four research models. The
historical backtest fills in the JSON report belong to simulations, not Coinbase
account transactions. Results exclude infrastructure cost and taxes; see the
validation report for assumptions and deferred measurements.

Hosted run evidence: `CI` run 41372338670 and `ORACLE research and safety` run
41372338688 failed before any job steps. The GitHub annotation for job
125045267641 states: “The job was not started because your account is locked due
to a billing issue.” This is not a failing application test. No billing settings
were changed and no spending was authorized. The PR remains a draft; resolve the
account issue through official GitHub account controls, then rerun CI before merge.

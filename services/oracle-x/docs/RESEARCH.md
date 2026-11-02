# ORACLE X — research and integration evidence

Reviewed November 1, 2026 (America/New_York). Primary documentation and research only. This review establishes implementation choices, not a verified profitable strategy. Provider capabilities do not establish investment performance. Prices, terms, endpoint availability and eligibility must be rechecked before procurement or production deployment.

## Decision

Begin with timestamped BTC/ETH spot data, a simple statistical forecasting baseline, explicit costs, chronological evaluation, independent deterministic risk checks and paper accounting. Keep execution outside Skooby's browser. Preserve cash as a benchmark and valid decision. Defer derivatives, microcaps, paid enrichment and neural/RL models until simpler alternatives fail for measurable reasons.

The connected Coinbase plugin supplies market-data tools; connection does not authorize live orders. Its permissions and schema are separate from the standalone service's public REST connector. Research tooling should never receive a financial-transaction credential.

## What can be learned from successful practitioners

- **Renaissance:** its official description confirms proprietary quantitative research and a data-driven organization. No disclosed reproducible Medallion strategy or transferable retail edge was found. Adopt disciplined measurement, redundancy and adversarial research; do not label an invented indicator “Renaissance's algorithm.” [R1]
- **Edward Thorp:** growth-optimal sizing depends on a real edge and return distribution. Fractional Kelly trades some theoretical growth for less risk. Estimation error, correlations and finite horizons make unrestricted Kelly inappropriate here. Compare constrained fractional Kelly with simpler risk budgets; neither supplies missing evidence of an edge. [R2–R3]
- **Trend evidence:** AQR's long historical study supports researching trend following across conventional markets. It does not validate this application's short-horizon crypto implementation or its trading costs. [R4]
- **Public wallets:** transaction history is an observation of one address, not an audited economic entity. No individual trader is certified by this review. Exclude screenshots, marketing leaderboards and selected winners from evidence of skill. Register the entire candidate universe before evaluation, retain delisted/failed wallets, and test delayed replication rather than contemporaneous imitation.

## Strategy hypotheses and rejection conditions

These are **research hypotheses / engineering judgments**, not findings of profitable ORACLE X performance. Costs include entry and exit, not just entry. “Evidence” below distinguishes documented mechanics from validation in this system.

| Family | Proposed mechanism / suitable regime | Likely failure | Data and infrastructure | Costs and capacity | Evidence / complexity |
|---|---|---|---|---|---|
| Momentum / volatility targeting | Gradual information diffusion; sustained trends; reduce exposure as volatility rises | Choppy reversals, gaps, volatility estimate lag | Point-in-time OHLCV, closed bars, product rules; modest CPU | Taker fees, spread and turnover dominate short horizons; depth limits size | Traditional trend evidence [R4]; crypto edge unvalidated; low–medium |
| Mean reversion | Temporary inventory pressure or liquidity shock followed by recovery | Structural repricing, exploit, persistent selling | Trades and synchronized books preferred; OHLCV proxy insufficient to identify liquidation causality | Two-way costs; adverse selection and scarce liquidity at extremes; small executable capacity | Hypothesis requiring event-labelled out-of-sample tests; medium–high |
| Statistical relative value | Temporary deviation between economically linked assets | Correlation/cointegration breaks; hidden common risk | Survivorship-aware pairs, synchronized quotes, funding/borrow and corporate/token events | Both legs, borrow, rebalancing, leg risk; capital trapped across venues | Research-only; spot long-only approximation is not market-neutral; high |
| Market making / microstructure | Payment for immediacy; transient order-flow pressure | Informed flow, cancellation latency, one-sided inventory | Sequenced L2 updates, snapshots, trades, queue-aware simulator, reliable server | Maker fees/rebates, adverse selection, inventory hedging; queue position limits capacity | Hummingbot implements spreads/inventory controls [R5]; no profit guarantee; very high |
| Funding / spot-perpetual basis | Compensation for financing, positioning or constrained arbitrage | Funding sign changes, liquidation, margin and venue failure | Contract definitions, funding history, borrow, collateral, both-leg books | Both legs, funding, borrow, transfers, margin buffers; fixed costs penalize small accounts | Documented Hummingbot strategy family [R6]; excluded from initial spot-only release; high |
| Wallet-flow signals | Public accumulation might predict later demand | Transfers misread as purchases, insider-like activity, sybils, delayed disclosure, overfit winners | Fills, transfers, positions, funding, prices at actual observation time; account/entity attribution | Gas, MEV, sellability and replication delay; small illiquid tokens cannot absorb followers | Hypothesis only; account histories incomplete [R12]; high |
| Emerging tokens | Broadening adoption and usable liquidity | Wash volume, honeypots, mint/freeze powers, concentrated exit, liquidity withdrawal | Contract analysis, RPC/indexer, pool reserves, related-wallet graph, sell simulation | Gas, transfer taxes, impact, MEV; reported volume is not executable capacity | Research-only; screening thresholds are not safety evidence; very high |
| Events / volatility expansion | New information reprices a market | Rumor, stale news, source manipulation, fast reversal | Publication and receipt timestamps, provenance, event taxonomy | News latency, spread widening, gap/stop loss; executable edge can disappear rapidly | Hypothesis only; LLM explanations are not numerical forecasts; high |
| Regime selector / ensemble | Different conditional distributions may favor different models | Regime lag, label leakage, excessive switching, unstable weights | Only trailing features; nested chronological selection and locked challenger tests | Turnover and operational overhead; count every attempted selector | Baseline comparison required; medium–high |

## Framework comparison

| System | Verified capability | Limitation / adoption decision |
|---|---|---|
| Freqtrade | Historical backtests; lookahead analysis compares changes when future information is removed; recursive analysis varies startup history [R7–R8] | Lookahead tests cover triggered signals only; recursive checks are not a profitability backtest. Useful independent validation tool, not proof of edge. Do not claim these commands ran unless execution output is retained. |
| FreqAI | Adaptive model training, historical retraining simulation, saved models, Python ML extensions [R9] | Official example is explicitly not for production. Automatic retraining must not become automatic ORACLE X promotion. Reuse only after data/version/approval controls exist. |
| Hummingbot | Market-making, inventory adjustment, cross-exchange and spot-perpetual research families [R5–R6] | V1 strategy maintenance varies; evaluate V2 and venue support before adopting. Candle-only fill simulation cannot validate queue-sensitive strategies. |
| 3Commas | DCA configuration, TradingView strategy backtesting, safety-order and exit settings [R10] | Averaging down changes exposure; it does not create an edge. Subscription limits and third-party custody/permissions add dependencies. Reference UX, not numerical performance claims. |
| Cryptohopper | Backtesting and simulated-fund paper trading [R11] | Documentation flags exclusions and unreliable-looking results for illiquid pairs; its backtest is not actual exchange fills. Independently model costs and execution. |
| Pionex | Automated grid orders within a chosen price range [R13] | Out-of-range behavior and mark-to-market inventory losses matter; grid profit alone is not portfolio return. Venue/account eligibility and costs require separate review. |

## Provider and permission audit

“Public” refers to data access, not redistribution rights. No paid subscription, whitelist application, withdrawal permission or new trading account was provisioned by this research. Commercial display in Skooby requires a provider-by-provider licensing review. Geographic/account eligibility has **not** been verified for live execution.

| Provider | Documented access and coverage | Rate / cost finding | Permission and implementation decision |
|---|---|---|---|
| Coinbase Exchange | Public products, candles, book/trades; candles may be missing when no ticks occur [R14] | Candles maximum 300/request, allowed granularities 60/300/900/3600/21600/86400 seconds; public REST 10 requests/sec/IP, burst 15 [R15] | Public read-only. Paginate, sort, deduplicate, reject incomplete bars/gaps; use WebSocket for sustained realtime work. Never silently forward-fill missing candles. |
| Coinbase Advanced Trade | Public market routes and separate authenticated account/order routes [R16] | Public responses documented as cached for 1 second; exact account fee tier must be retrieved separately | Public / private read / account mutation / financial transaction must be separate adapters. Private JWT scopes vary. Public-data access is not account eligibility. |
| Hyperliquid | Public `info`: market snapshots and address fills/state [R12] | 1,200 weighted REST units/min/IP; weights differ; fills-by-time up to 2,000/response and only latest 10,000 available; candle snapshots latest 5,000 [R17] | Public research only. Persist observations prospectively; mark historical coverage incomplete. Account address must be master/subaccount, not agent wallet. Do not equate displayed closed P&L with total economic return. |
| DEX Screener | Pair/search/token-profile and promotion-related endpoints [R18] | Latest profile endpoints document 60 requests/min; other endpoint limits must come from current OpenAPI before activation | Public research. Pair transactions are not unique traders. Nullable market cap is not interchangeable with FDV. Ads/boosts are promotion indicators, not organic demand. No contract-security attestation. |
| DefiLlama | Free index lists TVL/price/other data; yields appear in Pro index [R19–R20] | API pricing page: $300/month or $3,000/year, 1,000 req/min, 1m calls/month; extra calls $0.60/1,000. Pro UI plan does not include API [R21] | Public/read-only or licensed read-only by endpoint. Disable yield ingestion absent entitlement. **Claimed November 13, 2026 access-change date was not found in retrieved official pricing or API indexes; unverified.** Do not hardcode that date or presume free yield access. |
| Nansen | Key-authenticated wallet/token analytics with credit costs [R22–R23] | Current docs: Free 15/sec and 300/min; Pro 75/sec and 1,500/min; endpoint limits may be lower. Free trial/top-ups are finite credits, not unlimited free production. Pro listed $49/month annual or $69 monthly | Licensed read-only enrichment; honor `Retry-After`, endpoint quotas and credit budget. No subscription assumed. Attribution is provider evidence with uncertainty. |
| Arkham | Intel API for entity labels and fund flows; access/trial request documented [R24] | Exact contracted pricing/rate limits not verified | Licensed read-only; do not hardcode undocumented endpoints. Label provenance and confidence required. |
| CoinGlass | V4 authenticated derivatives endpoints and account subscription query [R25] | `CG-API-KEY`; limits depend on paid plan, returned in limit headers | Licensed read-only later. Coverage/history depend on tier; no free entitlement assumed. |
| GMGN | Current Agent API requires key; older whitelist/trading API docs also exist [R26] | Older pages describe different limits/access paths; not safe to transfer their quotas to Agent API | Disabled pending exact endpoint, approved entitlement and quota verification. No anti-bot bypass. “Zero latency” and risk-elimination marketing are not accepted evidence. |
| TradingView | Advanced Charts consumes the developer's data; widgets and broker platform are different products [R27] | Licensing differs by product | Optional visualization, not assumed historical-data export API. Do not scrape charts as a market feed. |
| RPC/indexers | Chain-specific block/transaction/log observations | Provider and archive availability vary | Public or licensed read-only. Reorg/finality handling, timestamp provenance, token semantics and indexer coverage are required before wallet scoring. |

## Minimum evidence before calling a strategy validated

1. Freeze hypothesis, universe, horizon, feature availability rules, costs and rejection criteria before evaluation. Save source/data hashes, code version and every attempted parameter set, including failures.
2. Train/calibrate/test chronologically. Purge labels whose outcome crosses a split and embargo overlapping observations. Fit transformations only on training data. Do not random-split overlapping returns.
3. Use executable next-bar/next-observation prices, conservative round-trip costs and venue order minimums. Add adverse cost/latency sensitivity. A backtest is not a fill record.
4. Measure Brier/log loss and reliability by horizon on held-out data; evaluate quantile coverage independently. An accuracy percentage without class baseline and uncertainty is inadequate.
5. Compare net return, drawdown, exposure and turnover against cash, BTC/ETH buy-and-hold and simple momentum on identical windows. Include subscription/infrastructure expense. Use risk-matched comparisons where possible.
6. Record selection count; use Deflated Sharpe Ratio or Probability of Backtest Overfitting only when enough trials and data support the method. Neither is implemented merely by naming it. [R28–R29]
7. Lock the candidate, observe prospective paper trading, then obtain an explicit promotion approval with rollback version. There is no live champion until all required evidence exists. Sample sizes and pass thresholds must be stated before testing; results must not be optimized to pass.

## Verified trader ledger requirements

Persist address, chain, venue, observation start/end, retrieval timestamp, coverage/truncation, raw-source hash and attribution confidence. Separate realized P&L, unrealized P&L, transfers, fees, funding and deposits. Capital-based returns need verifiable capital history and a declared cash-flow method; otherwise show unavailable. Win rate and payoff need a declared round-trip/position definition, not one row per fill. Report drawdown, holding time, leverage and missing data. A positive ledger result must still pass a delayed, capacity-aware signal test. Manipulation alerts are risk indicators, not allegations.

## Primary source register

- R1 — https://www.rentec.com/Home.action?about=true
- R2 — https://www.edwardothorp.com/books/kelly-capital-growth-investment-criterion/
- R3 — https://www.edwardothorp.com/wp-content/uploads/2016/11/KellySimulationsNew.pdf
- R4 — https://www.aqr.com/insights/research/journal-article/a-century-of-evidence-on-trend-following-investing
- R5 — https://hummingbot.org/strategies/v1-strategies/pure-market-making/ and https://hummingbot.org/strategies/v1-strategies/strategy-configs/inventory-skew/
- R6 — https://hummingbot.org/strategies/v1-strategies/
- R7 — https://www.freqtrade.io/en/stable/lookahead-analysis/
- R8 — https://www.freqtrade.io/en/stable/recursive-analysis/
- R9 — https://www.freqtrade.io/en/stable/freqai/
- R10 — https://help.3commas.io/en/articles/16307077-3commas-dca-bot-for-tradingview-setup-parameter-guide
- R11 — https://docs.cryptohopper.com/docs/my-library/what-is-the-backtester and https://docs.cryptohopper.com/docs/trading-bot/how-to-set-up-a-paper-trading-bot
- R12 — https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- R13 — https://www.pionex.com/blog/grid-bot/ and https://www.pionex.com/blog/whats-the-best-course-of-action-if-your-grid-runs-out-of-range-shut-it-off-and-start-a-new-one-or-use-infinity-grid/
- R14 — https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles
- R15 — https://docs.cdp.coinbase.com/exchange/rest-api/rate-limits
- R16 — https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api
- R17 — https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits
- R18 — https://docs.dexscreener.com/api/reference
- R19 — https://api-docs.defillama.com/llms-free.txt
- R20 — https://api-docs.defillama.com/llms-pro.txt
- R21 — https://docs.llama.fi/pro-api
- R22 — https://docs.nansen.ai/getting-started/rate-limits
- R23 — https://docs.nansen.ai/getting-started/credits
- R24 — https://info.arkm.com/announcements/the-new-arkham-api and https://info.arkm.com/research/how-to-use-a-blockchain-api
- R25 — https://docs.coinglass.com/reference/authentication and https://docs.coinglass.com/reference/responses-error-codes
- R26 — https://docs.gmgn.ai/index/gmgn-agent-api and https://docs.gmgn.ai/index/cooperation-api-data-crawling-ip-whitelist
- R27 — https://www.tradingview.com/charting-library-docs/latest/getting_started/Frequently-Asked-Questions/
- R28 — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551
- R29 — https://papers.ssrn.com/sol3/Papers.cfm?abstract_id=2326253

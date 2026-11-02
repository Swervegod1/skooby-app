# ORACLE X: captured-market validation

This is a retrospective baseline evaluation of genuine Coinbase candle captures. It is **not** live trading, forward paper trading, or a verified profitable strategy. All four fixed-parameter runs are retained; no run is promoted.

## Reproduce

```sh
cd services/oracle-x
python -m pytest tests/test_quant.py -q
python -m oracle.research --capture data/coinbase-capture.json --output data/research-results.json
```

The CLI also supports `--report /path/report.md`. `--output` accepts any writable file path. No network requests or private account data are used.

## Actual results

Returns below are fractions converted to percentages over each run's held-out evaluation interval, not annual returns. Model and momentum allocate 10% per nonoverlapping trade. Passive 10% holds 10% in the asset and 90% cash; this is allocation-matched, **not** volatility-matched.

| Asset | Horizon | OOS forecasts | Brier / prior | ECE | Model net | Trades | Model max DD | Momentum net | Passive 10% net | Buy-and-hold net |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| BTC-USD | 1h | 585 | 0.25694 / 0.25015 | 0.08086 | 0.000% | 0 | 0.000% | -30.983% | -0.650% | -6.499% |
| BTC-USD | 4h | 584 | 0.29183 / 0.25201 | 0.16789 | 0.000% | 0 | 0.000% | -10.620% | -0.606% | -6.064% |
| ETH-USD | 1h | 585 | 0.25699 / 0.24993 | 0.08143 | 0.000% | 0 | 0.000% | -28.378% | -1.128% | -11.281% |
| ETH-USD | 4h | 584 | 0.27377 / 0.25148 | 0.13299 | 0.000% | 0 | 0.000% | -9.534% | -1.123% | -11.232% |

Lower Brier is better. ECE is a five-bin calibration estimate; small samples and overlapping outcomes make apparent improvements unreliable. A zero-trade result does not establish an edge.

## Dataset and controls

- **BTC-USD-1h-v1**: 1489 completed hourly bars (62.04 days), 2026-09-01T00:00:00+00:00 → 2026-11-02T01:00:00+00:00; evaluation 2026-10-08T15:00:00+00:00 → 2026-11-02T00:00:00+00:00.
- **BTC-USD-4h-v1**: 1489 completed hourly bars (62.04 days), 2026-09-01T00:00:00+00:00 → 2026-11-02T01:00:00+00:00; evaluation 2026-10-08T13:00:00+00:00 → 2026-11-02T00:00:00+00:00.
- **ETH-USD-1h-v1**: 1489 completed hourly bars (62.04 days), 2026-09-01T00:00:00+00:00 → 2026-11-02T01:00:00+00:00; evaluation 2026-10-08T15:00:00+00:00 → 2026-11-02T00:00:00+00:00.
- **ETH-USD-4h-v1**: 1489 completed hourly bars (62.04 days), 2026-09-01T00:00:00+00:00 → 2026-11-02T01:00:00+00:00; evaluation 2026-10-08T13:00:00+00:00 → 2026-11-02T00:00:00+00:00.
- Four planned asset/horizon runs, one fixed parameter set each, zero optimization searches. Multiple fold fits are chronological validation, not hidden parameter trials. Failed runs remain in the JSON registry.
- Expanding chronological training/calibration/test folds. Overlapping labels are purged and a full-horizon embargo separates partitions. Scalers fit only training data. Prefix-invariance and label-timing tests exercise leakage prevention.
- 124 bps configured round-trip execution costs: 62 bps each side, applied to actual entry/exit notionals in backtests. This is a conservative research assumption, not a verified account fee tier or historical execution-cost observation.
- Assumed availability is bar close + 2 seconds. Signals therefore enter at the next eligible hourly open, typically two bar indices after their feature bar. Genuine archived data arrival timestamps are unavailable.
- Residual quantiles are empirical calibration-sample scenarios; they are not confidence intervals or guaranteed loss bounds. Forecast metrics include overlapping horizon outcomes; sample counts are not independent observations.
- Max drawdown marks open model positions at hourly closes with estimated liquidation costs. Intrabar adverse moves, order-book fills, and executable stop prices are not simulated.
- Operating costs, taxes, and data subscriptions are excluded. BTC and ETH runs have their own matching passive benchmark; cross-asset synchronized portfolio benchmarking remains future work.

## Limits and decision

The roughly 62-day capture and shorter held-out windows cannot establish multi-regime consistency or a repeatable net edge. Backtest results do not authorize a trade. **NO TRADE / research only** remains the promotion decision. A forward paper-trading campaign, richer historical depth, cost sensitivity, independent untouched evaluation, selection-bias analysis, and documented approval are required before considering production eligibility.

- BTC-USD 24h: INSUFFICIENT HISTORY — 1489 of 1920 required bars. Not run or counted as an evaluated strategy.
- ETH-USD 24h: INSUFFICIENT HISTORY — 1489 of 1920 required bars. Not run or counted as an evaluated strategy.

## Reproducibility

```json
{
  "source_file_sha256": "22059bdc38f08aee5d4c2dcbf53f61a9c2aa537f4d8bf621cdca3ff8994bf96f",
  "quant_source_sha256": "ff28c048ff84f29556e15869359d353249ddfcb7ba8267e9fa6dc9bec29116ef",
  "normalization_source_sha256": "5c1037035f4fdf2d028e9fac3308ca5143b4a5118f02fbf1e490c5c2f336347a",
  "research_source_sha256": "fbd8dbb3f3031a9ae3960441ea738e330570af2dbcdff61ceb4a6a852b5e426b",
  "environment": {
    "python": "3.12.14",
    "numpy": "2.3.5",
    "pandas": "2.2.3",
    "scikit_learn": "1.8.0"
  }
}
```

The output also includes normalized data/config hashes, every fold boundary, calibration bins, historical simulated fills, and the complete failed/successful run registry. Same capture, source, and dependency versions produce deterministic JSON output.

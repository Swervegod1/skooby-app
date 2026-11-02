"""Replay the four preregistered baseline evaluations without accessing accounts.

Run: python -m oracle.research --capture data/coinbase-capture.json \
    --output data/research-results.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import numpy
import pandas
import sklearn

from . import quant
from .connectors import captured_history

HYPOTHESES = (("BTC-USD", 1), ("BTC-USD", 4), ("ETH-USD", 1), ("ETH-USD", 4))
ROUND_TRIP_COST = 0.0124


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()


def evaluate(capture: Path) -> dict:
    result = {
        "kind": "historical replay; not live or forward paper performance",
        "source_file_sha256": _sha(capture),
        "quant_source_sha256": _sha(Path(quant.__file__)),
        "normalization_source_sha256": _sha(Path(__file__).with_name("connectors.py")),
        "research_source_sha256": _sha(Path(__file__)),
        "environment": {"python": platform.python_version(), "numpy": numpy.__version__,
                        "pandas": pandas.__version__, "scikit_learn": sklearn.__version__},
        "research_registry": {"planned_runs": 4, "parameter_sets_per_run": 1,
                              "optimization_searches": 0, "promotions": 0,
                              "policy": "Retain every planned run, including failed runs; no best-result selection",
                              "fixed_rules": "Same model and thresholds; BTC/ETH × 1h/4h, plus fixed momentum/passive benchmarks"},
        "assumptions": {"round_trip_cost": ROUND_TRIP_COST,
                        "availability": "Assumed historical bar close + 2s; not archived arrival timestamps",
                        "execution": "First hourly open strictly after feature availability; no fill at prior close",
                        "starting_equity_units": 1.0, "allocation_fraction": 0.1,
                        "infrastructure_cost": "Excluded; no claim of net business profitability"},
        "runs": [], "capability_checks": [],
    }
    histories = {}
    for product, horizon in HYPOTHESES:
        run = {"id": f"{product}-{horizon}h-v1", "product": product, "horizon_hours": horizon,
               "hypothesis": "Causal price/volume baseline predicts subsequent return better than expanding class prior and earns a net advantage over cash/passive benchmarks"}
        try:
            if product not in histories:
                histories[product] = captured_history(capture, product)
            candles, source, captured = histories[product]
            forecast = quant.analyze(candles, horizon, ROUND_TRIP_COST)
            backtest, validation = forecast["backtest"], forecast["validation"]
            model_return = backtest["strategy"]["net_return"]
            run.update(status="completed", source=source, captured_at=_iso(captured),
                       candle_count=len(candles), history_start=_iso(candles[0]["start"]),
                       history_end=_iso(candles[-1]["start"] + 3600),
                       history_days=len(candles) / 24, forecast=forecast,
                       comparisons={"brier_improvement_over_prior": validation["baseline_brier"] - validation["brier"],
                                    "model_minus_cash": model_return,
                                    "model_minus_asset_buy_hold": model_return - backtest["benchmarks"]["asset_buy_hold"],
                                    "model_minus_allocation_matched_passive": model_return - backtest["benchmarks"]["ten_percent_asset_ninety_percent_cash"],
                                    "model_minus_momentum": model_return - backtest["momentum"]["net_return"]},
                       disposition="RESEARCH ONLY; NO PROMOTION")
        except Exception as error:
            run.update(status="failed", error_type=type(error).__name__, error=str(error), disposition="REJECTED")
        result["runs"].append(run)
    for product in ("BTC-USD", "ETH-USD"):
        available = len(histories[product][0]) if product in histories else 0
        result["capability_checks"].append({"product": product, "horizon_hours": 24,
                                            "available_candles": available, "minimum_candles": 1920,
                                            "status": "INSUFFICIENT HISTORY" if available < 1920 else "NOT EVALUATED",
                                            "counts_as_strategy_trial": False})
    result["research_registry"]["completed_runs"] = sum(r["status"] == "completed" for r in result["runs"])
    result["research_registry"]["failed_runs"] = sum(r["status"] == "failed" for r in result["runs"])
    result["conclusion"] = "Insufficient evidence of a repeatable executable edge. Historical evaluation cannot qualify live trading."
    json.dumps(result, allow_nan=False)
    return result


def render_report(result: dict) -> str:
    lines = ["# ORACLE X: captured-market validation", "",
             "This is a retrospective baseline evaluation of genuine Coinbase candle captures. It is **not** live trading, forward paper trading, or a verified profitable strategy. All four fixed-parameter runs are retained; no run is promoted.", "",
             "## Reproduce", "", "```sh", "cd services/oracle-x",
             "python -m pytest tests/test_quant.py -q",
             "python -m oracle.research --capture data/coinbase-capture.json --output data/research-results.json",
             "```", "", "The CLI also supports `--report /path/report.md`. `--output` accepts any writable file path. No network requests or private account data are used.", "",
             "## Actual results", "",
             "Returns below are fractions converted to percentages over each run's held-out evaluation interval, not annual returns. Model and momentum allocate 10% per nonoverlapping trade. Passive 10% holds 10% in the asset and 90% cash; this is allocation-matched, **not** volatility-matched.", "",
             "| Asset | Horizon | OOS forecasts | Brier / prior | ECE | Model net | Trades | Model max DD | Momentum net | Passive 10% net | Buy-and-hold net |",
             "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for run in result["runs"]:
        if run["status"] != "completed":
            lines.append(f"| {run['product']} | {run['horizon_hours']}h | FAILED: {run['error_type']} | — | — | — | — | — | — | — | — |")
            continue
        f = run["forecast"]
        v, b = f["validation"], f["backtest"]
        lines.append(f"| {run['product']} | {run['horizon_hours']}h | {v['test_samples']} | {v['brier']:.5f} / {v['baseline_brier']:.5f} | {v['ece']:.5f} | {b['strategy']['net_return']:.3%} | {b['strategy']['trades']} | {b['strategy']['max_drawdown']:.3%} | {b['momentum']['net_return']:.3%} | {b['benchmarks']['ten_percent_asset_ninety_percent_cash']:.3%} | {b['benchmarks']['asset_buy_hold']:.3%} |")
    lines.extend(["", "Lower Brier is better. ECE is a five-bin calibration estimate; small samples and overlapping outcomes make apparent improvements unreliable. A zero-trade result does not establish an edge.", "", "## Dataset and controls", ""])
    for run in result["runs"]:
        if run["status"] == "completed":
            f = run["forecast"]
            lines.append(f"- **{run['id']}**: {run['candle_count']} completed hourly bars ({run['history_days']:.2f} days), {run['history_start']} → {run['history_end']}; evaluation {_iso(f['backtest']['start'])} → {_iso(f['backtest']['end'])}.")
    lines.extend(["- Four planned asset/horizon runs, one fixed parameter set each, zero optimization searches. Multiple fold fits are chronological validation, not hidden parameter trials. Failed runs remain in the JSON registry.",
                  "- Expanding chronological training/calibration/test folds. Overlapping labels are purged and a full-horizon embargo separates partitions. Scalers fit only training data. Prefix-invariance and label-timing tests exercise leakage prevention.",
                  "- 124 bps configured round-trip execution costs: 62 bps each side, applied to actual entry/exit notionals in backtests. This is a conservative research assumption, not a verified account fee tier or historical execution-cost observation.",
                  "- Assumed availability is bar close + 2 seconds. Signals therefore enter at the next eligible hourly open, typically two bar indices after their feature bar. Genuine archived data arrival timestamps are unavailable.",
                  "- Residual quantiles are empirical calibration-sample scenarios; they are not confidence intervals or guaranteed loss bounds. Forecast metrics include overlapping horizon outcomes; sample counts are not independent observations.",
                  "- Max drawdown marks open model positions at hourly closes with estimated liquidation costs. Intrabar adverse moves, order-book fills, and executable stop prices are not simulated.",
                  "- Operating costs, taxes, and data subscriptions are excluded. BTC and ETH runs have their own matching passive benchmark; cross-asset synchronized portfolio benchmarking remains future work.",
                  "", "## Limits and decision", "",
                  "The roughly 62-day capture and shorter held-out windows cannot establish multi-regime consistency or a repeatable net edge. Backtest results do not authorize a trade. **NO TRADE / research only** remains the promotion decision. A forward paper-trading campaign, richer historical depth, cost sensitivity, independent untouched evaluation, selection-bias analysis, and documented approval are required before considering production eligibility.", ""])
    for check in result["capability_checks"]:
        lines.append(f"- {check['product']} 24h: {check['status']} — {check['available_candles']} of {check['minimum_candles']} required bars. Not run or counted as an evaluated strategy.")
    lines.extend(["", "## Reproducibility", "", "```json", json.dumps({k: result[k] for k in ("source_file_sha256", "quant_source_sha256", "normalization_source_sha256", "research_source_sha256", "environment")}, indent=2), "```", "",
                  "The output also includes normalized data/config hashes, every fold boundary, calibration bins, historical simulated fills, and the complete failed/successful run registry. Same capture, source, and dependency versions produce deterministic JSON output.", ""])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, default=Path("docs/VALIDATION.md"))
    args = parser.parse_args()
    result = evaluate(args.capture)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True, allow_nan=False) + "\n")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(render_report(result))
    print(json.dumps({"output": str(args.output), "report": str(args.report),
                      "completed": result["research_registry"]["completed_runs"],
                      "failed": result["research_registry"]["failed_runs"], "promotions": 0}))
    return 0 if result["research_registry"]["failed_runs"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

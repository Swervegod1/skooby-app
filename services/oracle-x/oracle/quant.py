"""Reproducible hourly research baseline; never a production eligibility authority.

Imported history is a replay, not an archived point-in-time feed. ``available_at``
is an explicit assumed availability time. Features use completed bars only and
orders enter at the first hourly open *strictly after* feature availability.
"""
from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

VERSION = "oracle-baseline-1.0.0"
FEATURES = ("return_1", "return_4", "return_24", "volatility_24", "range", "volume_ratio", "trend")


def _frame(candles: list[dict]) -> pd.DataFrame:
    if not candles:
        raise ValueError("No candle data")
    frame = pd.DataFrame(candles)
    required = {"start", "open", "high", "low", "close", "volume", "available_at"}
    if not required.issubset(frame.columns):
        raise ValueError("Candle schema incomplete")
    frame = frame[list(sorted(required))].apply(pd.to_numeric, errors="raise")
    if not np.isfinite(frame.to_numpy()).all():
        raise ValueError("Non-finite candle data")
    if (frame[["open", "high", "low", "close"]] <= 0).any().any() or (frame.volume < 0).any():
        raise ValueError("Invalid prices or volume")
    if (frame.high < frame[["open", "close", "low"]].max(axis=1)).any() or (frame.low > frame[["open", "close"]].min(axis=1)).any():
        raise ValueError("Invalid OHLC bounds")
    if len(frame) > 1 and not np.all(np.diff(frame.start) == 3600):
        raise ValueError("Hourly candles must be ordered, unique, and contiguous")
    if (frame.available_at < frame.start + 3600).any() or (np.diff(frame.available_at) < 0).any():
        raise ValueError("Availability must follow candle close and be monotonic")
    return frame.reset_index(drop=True)


def feature_matrix(candles: list[dict]) -> pd.DataFrame:
    """Causal, prefix-invariant features. Warmup rows remain NaN, never filled."""
    f = _frame(candles)
    r = f.close.pct_change()
    volume_mean = f.volume.rolling(24, min_periods=24).mean()
    return pd.DataFrame({
        "return_1": r,
        "return_4": f.close.pct_change(4),
        "return_24": f.close.pct_change(24),
        "volatility_24": r.rolling(24, min_periods=24).std(),
        "range": (f.high - f.low) / f.close,
        "volume_ratio": f.volume / volume_mean.replace(0, np.nan) - 1,
        "trend": f.close / f.close.rolling(24, min_periods=24).mean() - 1,
    })


def labeled_samples(candles: list[dict], horizon: int) -> pd.DataFrame:
    """Label only executions whose opening prices are known by the replay cutoff."""
    f = _frame(candles)
    x = feature_matrix(candles)
    # A candle closing at 01:00 with availability at 01:00:01 cannot fill at 01:00.
    entry = np.searchsorted(f.start.to_numpy(), f.available_at.to_numpy(), side="right")
    exit_ = entry + horizon
    valid = exit_ < len(f)
    rows = np.where(valid & x.notna().all(axis=1).to_numpy())[0]
    samples = x.iloc[rows].copy()
    samples["feature_row"] = rows
    samples["available_at"] = f.available_at.iloc[rows].to_numpy()
    samples["entry_row"] = entry[rows]
    samples["exit_row"] = exit_[rows]
    samples["entry_time"] = f.start.iloc[entry[rows]].to_numpy()
    samples["exit_time"] = f.start.iloc[exit_[rows]].to_numpy()
    # Conservatively wait until the exit candle itself is complete for a label.
    samples["label_available_at"] = f.available_at.iloc[exit_[rows]].to_numpy()
    samples["gross_return"] = f.open.iloc[exit_[rows]].to_numpy() / f.open.iloc[entry[rows]].to_numpy() - 1
    return samples.reset_index(drop=True)


@dataclass
class _Model:
    classifier: Any
    regressor: Any
    prior: float
    calibrator: Any = None
    residuals: Any = None

    def probability(self, x):
        p = np.full(len(x), self.prior) if self.classifier is None else self.classifier.predict_proba(x)[:, 1]
        if self.calibrator is not None:
            logits = np.log(np.clip(p, 1e-6, 1 - 1e-6) / np.clip(1 - p, 1e-6, 1)).reshape(-1, 1)
            p = self.calibrator.predict_proba(logits)[:, 1]
        return p

    def mean(self, x):
        return self.regressor.predict(x)


def _fit(train: pd.DataFrame, calibration: pd.DataFrame) -> _Model:
    x, y = train[list(FEATURES)], (train.gross_return > 0).astype(int)
    prior = float((y.sum() + 1) / (len(y) + 2))
    classifier = None
    if y.nunique() == 2:
        classifier = make_pipeline(StandardScaler(), LogisticRegression(C=0.1, max_iter=500, random_state=7))
        classifier.fit(x, y)
    regressor = make_pipeline(StandardScaler(), Ridge(alpha=100.0))
    regressor.fit(x, train.gross_return)
    model = _Model(classifier, regressor, prior)
    cx = calibration[list(FEATURES)]
    cp = model.probability(cx)
    cy = (calibration.gross_return > 0).astype(int)
    if len(calibration) >= 40 and cy.nunique() == 2:
        logits = np.log(np.clip(cp, 1e-6, 1 - 1e-6) / np.clip(1 - cp, 1e-6, 1)).reshape(-1, 1)
        model.calibrator = LogisticRegression(C=0.1, random_state=7, max_iter=500).fit(logits, cy)
    model.residuals = calibration.gross_return.to_numpy() - model.mean(cx)
    return model


def net_return(gross: float, round_trip_cost: float) -> float:
    """All-in per-side cost charged against entry and exit notional."""
    side = round_trip_cost / 2
    return (1 + gross) * (1 - side) / (1 + side) - 1


def _drawdown(curve: list[float]) -> float:
    a = np.asarray(curve, dtype=float)
    return float(np.max(1 - a / np.maximum.accumulate(a)))


def _simulate(records: list[dict], frame: pd.DataFrame, cost: float, strategy: str) -> dict:
    # Fixed 10% cash allocation, no compounding leverage. This is a strategy
    # comparison simulator, not the paper broker or a stop-loss implementation.
    equity, previous_exit = 1.0, -1
    curve, trades = [equity], []
    for r in records:
        if r["entry_row"] < previous_exit:
            continue
        signal = (r["probability"] > 0.55 and r["mean"] > cost + 0.002) if strategy == "model" else r["momentum"] > 0
        if not signal:
            continue
        gross = r["gross"]
        realized = net_return(gross, cost)
        pnl = 0.1 * equity * realized
        entry_equity = equity
        equity += pnl
        curve.append(equity)
        trades.append({"entry_time": r["entry_time"], "exit_time": r["exit_time"], "gross_return": gross,
                       "net_return": realized, "portfolio_pnl_fraction": pnl,
                       "capital_fraction": 0.1, "equity_before": entry_equity})
        previous_exit = r["exit_row"]
    wins = [t["portfolio_pnl_fraction"] for t in trades if t["portfolio_pnl_fraction"] > 0]
    losses = [-t["portfolio_pnl_fraction"] for t in trades if t["portfolio_pnl_fraction"] < 0]
    # Mark the portfolio each hourly close while a trade is open, including an
    # estimated liquidation cost, so drawdown is not merely closed-trade drawdown.
    marked = [1.0]
    for t in trades:
        start = int(np.searchsorted(frame.start.to_numpy(), t["entry_time"]))
        end = int(np.searchsorted(frame.start.to_numpy(), t["exit_time"]))
        entry_price = float(frame.open.iloc[start])
        for row in range(start, end):
            gross_mark = float(frame.close.iloc[row]) / entry_price - 1
            marked.append(t["equity_before"] * (1 + 0.1 * net_return(gross_mark, cost)))
        marked.append(t["equity_before"] + t["portfolio_pnl_fraction"])
    return {"net_return": equity - 1, "max_drawdown": _drawdown(marked), "trades": len(trades),
            "win_rate": len(wins) / len(trades) if trades else None,
            "profit_factor": sum(wins) / sum(losses) if losses else None,
            "equity_curve": curve, "fills": trades, "allocation_fraction": 0.1,
            "drawdown_method": "hourly close mark-to-market including estimated liquidation cost; intrabar extremes excluded"}


def analyze(candles: list[dict], horizon: int = 1, round_trip_cost: float = 0.0124) -> dict:
    if isinstance(horizon, bool) or horizon not in (1, 4, 24):
        raise ValueError("Supported research horizons are 1, 4, and 24 hours")
    if not math.isfinite(round_trip_cost) or not 0 <= round_trip_cost <= 0.2:
        raise ValueError("Invalid round-trip cost")
    required = max(500, horizon * 80)
    if len(candles) < required:
        raise ValueError(f"Insufficient history: {required} hourly candles required for {horizon}h")
    frame = _frame(candles)
    samples = labeled_samples(candles, horizon)
    if len(samples) < required - 100:
        raise ValueError("Insufficient usable causal samples")
    calibration_size = max(60, horizon * 4)
    first_test = max(320, int(len(samples) * 0.6))
    step = max(40, (len(samples) - first_test) // 3)
    records, fold_info = [], []
    # One-direction expanding CV with purged label overlap plus a full-horizon
    # embargo between train/calibration and calibration/test. No shuffled folds.
    for test_start in range(first_test, len(samples), step):
        test = samples.iloc[test_start:test_start + step]
        if test.empty:
            continue
        cal_end_time = float(test.available_at.iloc[0]) - horizon * 3600
        cal = samples[(samples.index < test_start) & (samples.label_available_at < cal_end_time)].tail(calibration_size)
        if len(cal) < 40:
            continue
        train_end_time = float(cal.available_at.iloc[0]) - horizon * 3600
        train = samples[samples.label_available_at < train_end_time]
        if len(train) < 150:
            continue
        model = _fit(train, cal)
        x = test[list(FEATURES)]
        ps, means = model.probability(x), model.mean(x)
        residual_q = np.quantile(model.residuals, [0.05, 0.95])
        fold_info.append({"train_samples": len(train), "calibration_samples": len(cal), "test_samples": len(test),
                          "train_last_label_at": float(train.label_available_at.max()),
                          "calibration_first_feature_at": float(cal.available_at.min()),
                          "calibration_last_label_at": float(cal.label_available_at.max()),
                          "test_first_feature_at": float(test.available_at.min()),
                          "calibrated": model.calibrator is not None})
        for (_, row), probability, mean in zip(test.iterrows(), ps, means):
            records.append({"probability": float(probability), "mean": float(mean), "prior": model.prior,
                            "gross": float(row.gross_return), "momentum": float(row.return_24),
                            "entry_row": int(row.entry_row), "exit_row": int(row.exit_row),
                            "entry_time": float(row.entry_time), "exit_time": float(row.exit_time),
                            "low": float(mean + residual_q[0]), "high": float(mean + residual_q[1])})
    if len(records) < 60:
        raise ValueError("Insufficient independent walk-forward evaluation samples")
    p = np.array([r["probability"] for r in records])
    y = np.array([r["gross"] > 0 for r in records], dtype=float)
    prior = np.array([r["prior"] for r in records])
    brier, baseline = float(np.mean((p - y) ** 2)), float(np.mean((prior - y) ** 2))
    bins, ece = [], 0.0
    for lo in np.arange(0, 1, 0.2):
        take = (p >= lo) & (p <= lo + 0.2 if lo > 0.79 else p < lo + 0.2)
        if take.any():
            confidence, observed = float(p[take].mean()), float(y[take].mean())
            ece += float(take.mean()) * abs(confidence - observed)
            bins.append({"lower": float(lo), "upper": float(lo + 0.2), "count": int(take.sum()),
                         "mean_probability": confidence, "observed_frequency": observed})
    # Last forecast has its own chronological calibration slice; never fit on
    # the last feature's unobserved outcome.
    forecast_at = float(frame.available_at.iloc[-1])
    final_cal = samples[samples.label_available_at < forecast_at - horizon * 3600].tail(calibration_size)
    final_train = samples[samples.label_available_at < float(final_cal.available_at.min()) - horizon * 3600]
    final = _fit(final_train, final_cal)
    latest = feature_matrix(candles).iloc[[-1]]
    if latest.isna().any().any():
        raise ValueError("Latest feature values unavailable")
    probability = float(final.probability(latest)[0])
    expected = float(final.mean(latest)[0])
    quantiles = expected + np.quantile(final.residuals, [0.05, 0.5, 0.95])
    strategy, momentum = _simulate(records, frame, round_trip_cost, "model"), _simulate(records, frame, round_trip_cost, "momentum")
    first, last = records[0]["entry_row"], records[-1]["exit_row"]
    hold_gross = float(frame.open.iloc[last] / frame.open.iloc[first] - 1)
    hold_net = net_return(hold_gross, round_trip_cost)
    cfg = {"version": VERSION, "horizon": horizon, "round_trip_cost": round_trip_cost,
           "features": FEATURES, "logistic_c": 0.1, "ridge_alpha": 100.0,
           "execution": "first hourly open strictly after availability", "allocation": 0.1}
    canonical = frame.to_json(orient="records", double_precision=15)
    result = {
        "horizon_hours": horizon, "probability_up": probability,
        "expected_net_return": expected - round_trip_cost,
        "expected_gross_return": expected,
        "return_quantiles": dict(zip(("q05", "q50", "q95"), [float(q - round_trip_cost) for q in quantiles])),
        "quantile_description": "Empirical calibration-residual net-return scenarios, not confidence intervals or guaranteed bounds",
        "reliability": "Research only — limited historical validation",
        "as_of": forecast_at, "model_version": VERSION,
        "data_hash": hashlib.sha256(canonical.encode()).hexdigest(),
        "config_hash": hashlib.sha256(json.dumps(cfg, sort_keys=True).encode()).hexdigest(),
        "validation": {"brier": brier, "baseline_brier": baseline, "ece": ece,
                       "test_samples": len(records), "eligible": False,
                       "reason": "No independent forward-paper qualification or approved promotion",
                       "calibration_bins": bins, "folds": fold_info,
                       "calibrated": final.calibrator is not None,
                       "accuracy": float(np.mean((p >= 0.5) == y)),
                       "return_mae": float(np.mean([abs(r["mean"] - r["gross"]) for r in records])),
                       "interval_90_coverage": float(np.mean([r["low"] <= r["gross"] <= r["high"] for r in records])),
                       "overlap_warning": "Horizon outcomes overlap in forecast metrics; do not treat samples as independent",
                       "sampling": "expanding chronological; label purge plus horizon embargo; no shuffled CV"},
        "backtest": {"kind": "historical replay", "strategy": strategy, "momentum": momentum,
                     "benchmarks": {"cash": 0.0, "asset_buy_hold": hold_net,
                                    "ten_percent_asset_ninety_percent_cash": 0.1 * hold_net},
                     "round_trip_cost": round_trip_cost, "cost_basis": "configured research estimate, not verified account fees",
                     "start": records[0]["entry_time"], "end": records[-1]["exit_time"],
                     "infrastructure_cost_included": False,
                     "limitations": ["No intrabar stop fills", "No order-book history", "Fixed cost model; no historical liquidity proof",
                                     "Risk-matched benchmark is allocation-matched only, not volatility-matched",
                                     "No ETH/BTC cross-asset comparison unless both datasets are ingested"]},
    }
    # Refuse to emit NaN/Infinity into an API or report.
    json.dumps(result, allow_nan=False)
    return result

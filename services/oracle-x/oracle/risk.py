"""Deterministic, fail-closed spot risk gate. It never contacts a venue.

All portfolio exposure fields are USD notionals, not percentages. Volatility is
an absolute one-period return fraction supplied by the trusted market adapter.
Only BUY entries are supported: exits need a separate reduce-only workflow.
The optional policy argument may tighten, but cannot loosen, built-in limits.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_DOWN
from math import isfinite
from types import MappingProxyType
from typing import Any

POLICY = MappingProxyType({
    "risk_fraction": 0.0025,
    "max_exposure_fraction": 0.20,
    "max_correlated_fraction": 0.20,
    "daily_loss_fraction": 0.01,
    "drawdown_fraction": 0.05,
    "max_quote_age": 30.0,
    "max_spread": 0.002,
    "max_slippage": 0.001,
    "depth_participation": 0.01,
    "max_volatility": 0.10,
    "max_price_deviation": 0.02,
    "max_anomalies": 3,
    "fee_rate": 0.006,
    "slippage_floor": 0.0002,
    "minimum_edge_margin": 0.001,
})
_INCREASE_ONLY = {"fee_rate", "slippage_floor", "minimum_edge_margin"}


def _number(value: Any) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise ValueError("not a number")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError("not a number") from exc
    if not result.is_finite() or not isfinite(float(result)):
        raise ValueError("nonfinite number")
    return result


def _policy(overrides: dict | None) -> dict[str, Decimal]:
    values = {key: _number(value) for key, value in POLICY.items()}
    if overrides is None:
        return values
    if not isinstance(overrides, dict) or set(overrides) - set(POLICY):
        raise ValueError("unknown policy")
    for key, value in overrides.items():
        number = _number(value)
        if number <= 0:
            raise ValueError("nonpositive policy")
        if key in _INCREASE_ONLY:
            if number < values[key]:
                raise ValueError("policy relaxation")
        elif number > values[key]:
            raise ValueError("policy relaxation")
        if key == "max_anomalies" and number != number.to_integral_value():
            raise ValueError("noninteger anomaly count")
        values[key] = number
    return values


def evaluate(request: dict, portfolio: dict, market: dict,
             policy: dict | None = None) -> dict:
    """Size a paper BUY or reject it; no rejected result contains an order size.

    ``evidence_eligible`` must come from an internal strategy registry, never
    an HTTP body or forecasting agent. Risk limits are independent of it.
    Sizing uses modeled depth impact, not a promise of executable liquidity.
    """
    result = {"allowed": False, "reasons": [], "notional": 0.0,
              "stop_price": None, "quantity": 0.0, "planned_loss": 0.0}
    reasons: list[str] = result["reasons"]
    if not all(isinstance(value, dict) for value in (request, portfolio, market)):
        reasons.append("invalid_input")
        return result
    try:
        p = _policy(policy)
    except (ValueError, OverflowError):
        reasons.append("invalid_policy")
        return result
    fields = (
        (request, ("expected_net_return", "edge_margin", "stop_price", "requested_notional")),
        (portfolio, ("equity", "cash", "exposure", "correlated_exposure", "daily_realized_pnl",
                     "day_start_equity", "peak_equity", "anomaly_count")),
        (market, ("price", "bid", "ask", "depth_usd", "observed_at", "now", "volatility",
                  "reference_price", "min_notional", "base_increment")),
    )
    parsed = []
    for source, keys in fields:
        row = {}
        for key in keys:
            try:
                row[key] = _number(source[key])
            except (KeyError, ValueError, OverflowError):
                reasons.append(f"invalid_or_missing:{key}")
        parsed.append(row)
    for source, key in ((request, "evidence_eligible"), (request, "microcap"),
                        (portfolio, "paused"), (market, "feed_ok")):
        if type(source.get(key)) is not bool:
            reasons.append(f"invalid_or_missing:{key}")
    if reasons:
        return result
    r, f, m = parsed
    if request.get("side") != "BUY":
        reasons.append("close_workflow_required" if request.get("side") == "SELL" else "unsupported_side")
    if request.get("product") not in ("BTC-USD", "ETH-USD"):
        reasons.append("unsupported_spot_product")
    if request["microcap"]:
        reasons.append("microcap_research_only")
    if not request["evidence_eligible"]:
        reasons.append("strategy_not_eligible")
    if portfolio["paused"]:
        reasons.append("manual_pause")
    if not market["feed_ok"]:
        reasons.append("feed_unavailable")
    # A coherent cash-only spot ledger cannot be made valid with malformed totals.
    if (f["equity"] <= 0 or f["day_start_equity"] <= 0 or f["peak_equity"] <= 0
            or any(f[key] < 0 for key in ("cash", "exposure", "correlated_exposure", "anomaly_count"))
            or f["cash"] > f["equity"] or f["exposure"] > f["equity"]
            or f["correlated_exposure"] > f["exposure"]
            or f["peak_equity"] < f["equity"]
            or f["anomaly_count"] != f["anomaly_count"].to_integral_value()):
        reasons.append("invalid_portfolio")
    if (any(m[key] <= 0 for key in ("price", "bid", "ask", "depth_usd", "reference_price",
                                  "min_notional", "base_increment"))
            or m["volatility"] < 0 or m["observed_at"] < 0 or m["now"] < 0
            or m["ask"] < m["bid"] or m["base_increment"] > 1):
        reasons.append("invalid_market")
    if r["requested_notional"] <= 0 or r["edge_margin"] < 0:
        reasons.append("invalid_order")
    if reasons and any(reason in reasons for reason in ("invalid_portfolio", "invalid_market", "invalid_order")):
        return result
    if r["stop_price"] <= 0 or r["stop_price"] >= m["price"]:
        reasons.append("invalid_long_stop")
    age = m["now"] - m["observed_at"]
    if age < 0:
        reasons.append("future_quote")
    elif age > p["max_quote_age"]:
        reasons.append("stale_quote")
    spread = (m["ask"] - m["bid"]) / ((m["ask"] + m["bid"]) / 2)
    if spread > p["max_spread"]:
        reasons.append("spread_limit")
    if abs(m["price"] / m["reference_price"] - 1) > p["max_price_deviation"]:
        reasons.append("price_deviation")
    if m["price"] < m["bid"] or m["price"] > m["ask"]:
        reasons.append("price_outside_quote")
    if m["volatility"] >= p["max_volatility"]:
        reasons.append("volatility_halt")
    if -f["daily_realized_pnl"] >= f["day_start_equity"] * p["daily_loss_fraction"]:
        reasons.append("daily_loss_halt")
    if (f["peak_equity"] - f["equity"]) >= f["peak_equity"] * p["drawdown_fraction"]:
        reasons.append("drawdown_halt")
    if f["anomaly_count"] >= p["max_anomalies"]:
        reasons.append("execution_anomaly_halt")
    if r["expected_net_return"] <= max(r["edge_margin"], p["minimum_edge_margin"]):
        reasons.append("insufficient_net_edge")
    if reasons:
        return result
    try:
        # Bound sizing using worst allowed impact. Actual fill may still gap worse.
        entry = m["ask"] * (1 + p["max_slippage"])
        loss_fraction = (entry - r["stop_price"]) / entry + 2 * p["fee_rate"] + p["max_slippage"]
        remaining_exposure = f["equity"] * p["max_exposure_fraction"] - f["exposure"]
        remaining_group = f["equity"] * p["max_correlated_fraction"] - f["correlated_exposure"]
        target = min(r["requested_notional"],
                     f["equity"] * p["risk_fraction"] / loss_fraction,
                     f["cash"] / (1 + p["fee_rate"]),
                     remaining_exposure, remaining_group,
                     m["depth_usd"] * p["depth_participation"])
        if target <= 0:
            reasons.append("no_risk_capacity")
            return result
        units = (target / entry / m["base_increment"]).to_integral_value(rounding=ROUND_DOWN)
        quantity = units * m["base_increment"]
        notional = quantity * entry
        impact = max(p["slippage_floor"], (notional / m["depth_usd"]) * Decimal("0.1"))
        if impact > p["max_slippage"]:
            reasons.append("slippage_limit")
        if quantity <= 0 or notional < m["min_notional"]:
            reasons.append("below_minimum_order")
        if reasons:
            return result
        result.update(allowed=True, notional=float(notional), stop_price=float(r["stop_price"]),
                      quantity=float(quantity), planned_loss=float(notional * loss_fraction))
        if not all(isfinite(result[key]) for key in ("notional", "stop_price", "quantity", "planned_loss")):
            raise ValueError("nonfinite sizing")
        return result
    except (InvalidOperation, ValueError, OverflowError, ZeroDivisionError):
        return {"allowed": False, "reasons": ["sizing_failure"], "notional": 0.0,
                "stop_price": None, "quantity": 0.0, "planned_loss": 0.0}

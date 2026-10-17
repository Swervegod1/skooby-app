"""SKOOBY ALPHA ORACLE v1.2: READ-ONLY trading research and policy harness.

Adapted concepts, not a copy of FreqAI's Euclidean nearest-neighbor
Dissimilarity Index or Vanta's validator risk engine. No trade execution.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Literal, Optional, Tuple
import json
import math
import numpy as np
import pandas as pd


class MahalanobisNoveltyGate:
    """Whitened PCA/Mahalanobis similarity; high values indicate familiarity.

    DIFFERENT from FreqAI's normalized Euclidean nearest-neighbor DI.
    Fit on training history; calibrate on a disjoint validation window.
    This is NOT guaranteed protection from black swans.
    """

    def __init__(self, threshold: float = 0.25, n_components: Optional[int] = None):
        if not 0 < threshold < 1:
            raise ValueError("threshold must be strictly between 0 and 1")
        self.threshold = float(threshold)
        self.n_components = n_components
        self.mean_: Optional[np.ndarray] = None
        self.eigvals_: Optional[np.ndarray] = None
        self.eigvecs_: Optional[np.ndarray] = None

    def fit(self, X: np.ndarray, shrinkage: float = 1e-5) -> "MahalanobisNoveltyGate":
        x = np.asarray(X, dtype=float)
        if x.ndim != 2 or x.shape[0] < 3 or x.shape[1] < 1 or not np.isfinite(x).all():
            raise ValueError("X needs at least three complete finite 2D feature rows")
        if shrinkage <= 0:
            raise ValueError("shrinkage must be positive")
        if self.n_components is not None and not 1 <= self.n_components <= x.shape[1]:
            raise ValueError("invalid n_components")
        self.mean_ = x.mean(axis=0)
        cov = np.atleast_2d(np.cov(x, rowvar=False))
        scale = max(float(np.trace(cov)) / x.shape[1], 1e-12)
        cov = cov + shrinkage * scale * np.eye(x.shape[1])
        eigvals, eigvecs = np.linalg.eigh(cov)
        order = np.argsort(eigvals)[::-1]
        count = self.n_components or x.shape[1]
        self.eigvals_ = np.maximum(eigvals[order][:count], 1e-12)
        self.eigvecs_ = eigvecs[:, order][:, :count]
        return self

    def score(self, vector: np.ndarray) -> float:
        if self.mean_ is None or self.eigvecs_ is None or self.eigvals_ is None:
            raise RuntimeError("fit must be called before scoring")
        x = np.asarray(vector, dtype=float)
        if x.shape != self.mean_.shape or not np.isfinite(x).all():
            raise ValueError("prediction features have invalid shape or values")
        z = (x - self.mean_) @ self.eigvecs_ / np.sqrt(self.eigvals_)
        return float(1 / (1 + np.linalg.norm(z)))

    def calibrate_threshold(self, validation: np.ndarray, percentile: float = 5) -> float:
        if not 0 < percentile < 50:
            raise ValueError("percentile must be in (0, 50)")
        x = np.asarray(validation, dtype=float)
        if x.ndim != 2 or x.shape[0] < 1:
            raise ValueError("validation must be a nonempty matrix")
        scores = np.array([self.score(row) for row in x])
        self.threshold = float(np.percentile(scores, percentile))
        return self.threshold

    def allows(self, vector: np.ndarray) -> bool:
        return self.score(vector) >= self.threshold


@dataclass(frozen=True)
class Position:
    symbol: str
    side: Literal["LONG", "SHORT"]
    entry_price: float
    size: float
    leverage: float = 1.0


@dataclass(frozen=True)
class TradeRecord:
    symbol: str
    net_pnl: float
    closed_at: datetime


@dataclass
class PortfolioGuard:
    """In-memory research guard, NOT production-persistent risk accounting."""

    starting_equity: float
    max_daily_drawdown: float = 0.05
    entry_lock_drawdown: float = 0.08
    hard_drawdown: float = 0.10
    max_leverage: float = 3.0
    max_stop_risk: float = 0.01
    positions: Dict[str, Position] = field(default_factory=dict)
    trades: list[TradeRecord] = field(default_factory=list)
    halted: bool = False
    halt_reason: Optional[str] = None
    equity: float = field(init=False)
    peak_equity: float = field(init=False)
    day_start_equity: float = field(init=False)
    day_anchor: object = field(init=False)

    def __post_init__(self) -> None:
        if not math.isfinite(self.starting_equity) or self.starting_equity <= 0:
            raise ValueError("starting_equity must be positive")
        if not (0 < self.max_daily_drawdown < self.entry_lock_drawdown < self.hard_drawdown < 1):
            raise ValueError("risk thresholds must be increasing")
        self.equity = self.peak_equity = self.day_start_equity = self.starting_equity
        self.day_anchor = datetime.now(timezone.utc).date()

    @property
    def daily_drawdown(self) -> float:
        return max(0.0, 1 - self.equity / self.day_start_equity)

    @property
    def total_drawdown(self) -> float:
        return max(0.0, 1 - self.equity / self.peak_equity)

    def update_equity(self, unrealized_pnl: float = 0) -> None:
        if not math.isfinite(unrealized_pnl):
            raise ValueError("unrealized PnL must be finite")
        today = datetime.now(timezone.utc).date()
        if today != self.day_anchor:
            self.day_anchor = today
            self.day_start_equity = self.equity
            if self.halt_reason == "DAILY_DRAWDOWN":
                self.halted, self.halt_reason = False, None
        self.equity = self.starting_equity + sum(t.net_pnl for t in self.trades) + unrealized_pnl
        self.peak_equity = max(self.peak_equity, self.equity)
        if self.total_drawdown >= self.hard_drawdown:
            self.halted, self.halt_reason = True, "HARD_DRAWDOWN"
        elif self.daily_drawdown >= self.max_daily_drawdown and not self.halted:
            self.halted, self.halt_reason = True, "DAILY_DRAWDOWN"

    def entry_permission(self, symbol: str, side: str, leverage: float) -> Tuple[bool, str]:
        if self.halted:
            return False, f"HALTED:{self.halt_reason}"
        if self.total_drawdown >= self.hard_drawdown:
            self.halted, self.halt_reason = True, "HARD_DRAWDOWN"
            return False, "HARD_DRAWDOWN"
        if self.daily_drawdown >= self.max_daily_drawdown:
            self.halted, self.halt_reason = True, "DAILY_DRAWDOWN"
            return False, "DAILY_DRAWDOWN"
        if self.total_drawdown >= self.entry_lock_drawdown:
            return False, "ENTRY_LOCK_DRAWDOWN"
        if side not in ("LONG", "SHORT") or not symbol:
            return False, "INVALID_ORDER"
        if not math.isfinite(leverage) or not 1 <= leverage <= self.max_leverage:
            return False, "INVALID_LEVERAGE"
        if symbol in self.positions:
            return False, "POSITION_ALREADY_OPEN"
        return True, "OK"

    def add_permission(self, symbol: str, side: str, price: float, leverage: float) -> Tuple[bool, str]:
        p = self.positions.get(symbol)
        if p is None:
            return False, "NO_EXISTING_POSITION"
        if self.halted or self.daily_drawdown >= self.max_daily_drawdown or self.total_drawdown >= self.entry_lock_drawdown:
            return False, "RISK_LOCK"
        if side != p.side or not math.isfinite(price) or price <= 0:
            return False, "INVALID_ADD"
        if not math.isfinite(leverage) or not 1 <= leverage <= self.max_leverage:
            return False, "INVALID_LEVERAGE"
        winning = (side == "LONG" and price > p.entry_price) or (side == "SHORT" and price < p.entry_price)
        return (True, "OK") if winning else (False, "AVERAGING_DOWN_BLOCKED")

    def close(self, symbol: str, net_pnl: float) -> None:
        if symbol not in self.positions or not math.isfinite(net_pnl):
            raise ValueError("closing an unknown position or invalid PnL")
        self.trades.append(TradeRecord(symbol, float(net_pnl), datetime.now(timezone.utc)))
        del self.positions[symbol]
        self.update_equity()

    @property
    def force_close_requested(self) -> bool:
        return self.total_drawdown >= self.hard_drawdown

    def snapshot(self) -> dict:
        allowed, reason = self.entry_permission("TEST", "LONG", 1)
        return {
            "no_new_positions": not allowed,
            "entry_lock_reason": None if allowed else reason,
            "daily_drawdown_pct": round(self.daily_drawdown * 100, 3),
            "total_drawdown_pct": round(self.total_drawdown * 100, 3),
            "force_close_requested": self.force_close_requested,
            "max_leverage": self.max_leverage,
            "max_stop_risk_pct": self.max_stop_risk * 100,
        }


ARENA_SYSTEM_PROMPT = """You are SKOOBY-ARENA, a read-only trading research assistant.
Respond only with one JSON object containing: decision (LONG/SHORT/HOLD/CLOSE),
symbol (string or null), leverage (1-3), size_pct_of_equity (0-100),
entry_type (MARKET/LIMIT), limit_price (number/null), stop_loss (number/null),
take_profit (number/null), confidence (0-100), reasoning (string).
HOLD is preferred if setup_score < 75. Never average down. Never suggest an
entry if constraints.no_new_positions is true. Never invent absent market data.
Gematria or numerology, if displayed to users, is symbolic and MUST NOT enter
trade scoring, confidence, risk, position sizing, or execution decisions.
Do not send orders; trade execution requires a separate human-controlled system.
"""


def _finite(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_proposal(
    proposal: dict,
    guard: PortfolioGuard,
    symbol: str,
    market_price: float,
    atr_pct: float,
    setup_score: float,
) -> Tuple[bool, str]:
    """Independent server-side proposal validation, NOT order execution.

    size_pct_of_equity is percent of equity allocated as margin. Estimated stop
    risk = margin_fraction * leverage * stop_distance_fraction; this ignores
    gaps, slippage, exchange liquidation and fees.
    """
    action = proposal.get("decision")
    if action == "HOLD":
        return True, "HOLD"
    if action == "CLOSE":
        return (True, "CLOSE_ONLY") if symbol in guard.positions else (False, "NO_POSITION")
    if action not in ("LONG", "SHORT") or proposal.get("symbol") != symbol:
        return False, "INVALID_DECISION_OR_SYMBOL"
    if not all(_finite(v) for v in (market_price, atr_pct, setup_score)) or market_price <= 0 or atr_pct < 0:
        return False, "INVALID_MARKET_STATE"
    if setup_score < 75:
        return False, "INSUFFICIENT_SETUP"
    lev, size = proposal.get("leverage"), proposal.get("size_pct_of_equity")
    if not _finite(lev) or not _finite(size) or not 1 <= lev <= guard.max_leverage or not 0 < size <= 100:
        return False, "INVALID_SIZE_OR_LEVERAGE"
    if atr_pct > 0.03 and lev != 1:
        return False, "VOLATILITY_LEVERAGE_LOCK"
    can, reason = guard.entry_permission(symbol, action, float(lev))
    if not can:
        return False, reason
    if proposal.get("entry_type") not in ("MARKET", "LIMIT"):
        return False, "INVALID_ENTRY_TYPE"
    entry = market_price if proposal["entry_type"] == "MARKET" else proposal.get("limit_price")
    stop, target = proposal.get("stop_loss"), proposal.get("take_profit")
    if not all(_finite(v) and v > 0 for v in (entry, stop, target)):
        return False, "MISSING_PRICE_LIMITS"
    if action == "LONG" and not (stop < entry < target):
        return False, "INVALID_LONG_BRACKETS"
    if action == "SHORT" and not (target < entry < stop):
        return False, "INVALID_SHORT_BRACKETS"
    estimated_risk = size / 100 * lev * abs(entry - stop) / entry
    if estimated_risk > guard.max_stop_risk:
        return False, "MAX_STOP_RISK"
    confidence = proposal.get("confidence")
    if not _finite(confidence) or not 0 <= confidence <= 100:
        return False, "INVALID_CONFIDENCE"
    return True, "RESEARCH_APPROVED_NOT_EXECUTED"


def _enrich(df: pd.DataFrame) -> dict:
    required = ("open", "high", "low", "close", "volume")
    if any(col not in df for col in required) or len(df) < 50:
        raise ValueError("at least 50 closed OHLCV candles are required")
    if not df.index.is_monotonic_increasing or df[list(required)].isnull().any().any():
        raise ValueError("candles must be time-ordered without missing values")
    if not np.isfinite(df[list(required)].to_numpy(dtype=float)).all():
        raise ValueError("candles must contain finite values")
    c = df["close"].astype(float)
    if (c <= 0).any() or (df["high"] < df["low"]).any():
        raise ValueError("invalid candle prices")
    delta = c.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / 14, adjust=False, min_periods=14).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / 14, adjust=False, min_periods=14).mean()
    g, l = float(gain.iloc[-1]), float(loss.iloc[-1])
    rsi = 50.0 if g == 0 and l == 0 else (100.0 if l == 0 else 100 - 100 / (1 + g / l))
    tr = pd.concat([df["high"] - df["low"], (df["high"] - c.shift()).abs(), (df["low"] - c.shift()).abs()], axis=1).max(axis=1)
    atr = float(tr.ewm(alpha=1 / 14, adjust=False).mean().iloc[-1])
    macd = c.ewm(span=12, adjust=False).mean() - c.ewm(span=26, adjust=False).mean()
    signal = macd.ewm(span=9, adjust=False).mean()
    std_volume = float(df["volume"].std())
    return {
        "last_close": float(c.iloc[-1]), "ema20": float(c.ewm(span=20, adjust=False).mean().iloc[-1]),
        "ema50": float(c.ewm(span=50, adjust=False).mean().iloc[-1]),
        "ema200": float(c.ewm(span=200, adjust=False).mean().iloc[-1]) if len(c) >= 200 else None,
        "rsi14": rsi, "atr14": atr, "atr_pct": atr / float(c.iloc[-1]),
        "macd": {"line": float(macd.iloc[-1]), "signal": float(signal.iloc[-1]), "hist": float((macd - signal).iloc[-1])},
        "ret_1": float(c.pct_change().iloc[-1]),
        "vol_z": (float(df["volume"].iloc[-1]) - float(df["volume"].mean())) / std_volume if std_volume > 0 else 0.0,
    }


def build_state_payload(
    symbol: str,
    tf_data: Dict[str, pd.DataFrame],
    perp_state: dict,
    portfolio_state: dict,
    guard: Optional[PortfolioGuard] = None,
) -> str:
    if not symbol or not {"15m", "1h", "4h"}.issubset(tf_data):
        raise ValueError("symbol and closed 15m/1h/4h candles required")
    snapshot = guard.snapshot() if guard else {"no_new_positions": True, "entry_lock_reason": "NO_GUARD"}
    payload = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "symbol": symbol,
        "timeframes": {k: _enrich(tf_data[k]) for k in ("15m", "1h", "4h")},
        "perp": {k: perp_state.get(k) for k in ("open_interest_delta", "funding_rate", "orderbook_imbalance")},
        "portfolio": {k: portfolio_state.get(k) for k in ("equity", "unrealized_pnl", "margin_usage_pct", "time_in_trade_min", "current_drawdown_pct")},
        "constraints": {"min_setup_score_to_trade": 75, "allow_hold": True, "allow_add_to_loser": False, **snapshot},
        "execution_enabled": False,
        "numerology_affects_trading": False,
    }
    return json.dumps(payload, allow_nan=False, indent=2)

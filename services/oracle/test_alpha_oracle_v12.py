import json
import numpy as np
import pandas as pd
from alpha_oracle_v12 import (
    MahalanobisNoveltyGate, PortfolioGuard, Position, build_state_payload,
    validate_proposal,
)


def test_novelty_gate():
    x = np.random.default_rng(12).normal(size=(150, 3))
    gate = MahalanobisNoveltyGate(n_components=3).fit(x[:100])
    gate.calibrate_threshold(x[100:])
    assert gate.score(np.array([100, 100, 100])) < gate.score(x[120])
    assert not gate.allows(np.array([100, 100, 100]))


def test_one_column_covariance():
    gate = MahalanobisNoveltyGate().fit(np.arange(30).reshape(-1, 1))
    assert 0 < gate.score(np.array([10])) <= 1


def test_daily_and_hard_locks():
    guard = PortfolioGuard(1000)
    guard.positions["BTC"] = Position("BTC", "LONG", 100, 1)
    assert guard.add_permission("BTC", "LONG", 90, 1)[1] == "AVERAGING_DOWN_BLOCKED"
    assert guard.add_permission("BTC", "LONG", 110, 1)[0]
    guard.update_equity(-50)
    assert not guard.entry_permission("ETH", "LONG", 1)[0]
    assert not guard.add_permission("BTC", "LONG", 110, 1)[0]
    guard.update_equity(-120)
    assert guard.force_close_requested and guard.halt_reason == "HARD_DRAWDOWN"


def test_soft_entry_lock_across_days():
    guard = PortfolioGuard(1000)
    guard.peak_equity = 1060
    guard.day_start_equity = 1000
    guard.update_equity(-25)
    assert guard.total_drawdown > .08 and guard.daily_drawdown < .05
    assert guard.entry_permission("ETH", "LONG", 1)[1] == "ENTRY_LOCK_DRAWDOWN"


def test_proposal_policy():
    guard = PortfolioGuard(1000)
    proposal = dict(decision="LONG", symbol="BTC", leverage=2, size_pct_of_equity=10,
        entry_type="MARKET", limit_price=None, stop_loss=98, take_profit=110, confidence=80)
    assert validate_proposal(proposal, guard, "BTC", 100, .02, 80)[0]
    assert validate_proposal(proposal, guard, "BTC", 100, .04, 80)[1] == "VOLATILITY_LEVERAGE_LOCK"
    assert validate_proposal({**proposal, "size_pct_of_equity": 60}, guard, "BTC", 100, .02, 80)[1] == "MAX_STOP_RISK"
    assert validate_proposal(proposal, guard, "BTC", 100, .02, 70)[1] == "INSUFFICIENT_SETUP"


def test_structured_payload():
    close = np.linspace(100, 120, 220)
    df = pd.DataFrame({"open": close, "high": close + 1, "low": close - 1,
                       "close": close, "volume": np.full(220, 1000)})
    payload = json.loads(build_state_payload("BTC", {k: df for k in ("15m", "1h", "4h")},
        {}, {}, PortfolioGuard(1000)))
    assert payload["execution_enabled"] is False
    assert payload["numerology_affects_trading"] is False
    assert payload["timeframes"]["1h"]["vol_z"] == 0

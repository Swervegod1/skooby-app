from copy import deepcopy
import math
import pytest
from oracle.risk import POLICY, evaluate


def inputs():
    return (
        {"side": "BUY", "product": "BTC-USD", "expected_net_return": .02,
         "edge_margin": .005, "stop_price": 98, "requested_notional": 100,
         "evidence_eligible": True, "microcap": False},
        {"equity": 1000, "cash": 1000, "exposure": 0, "correlated_exposure": 0,
         "daily_realized_pnl": 0, "day_start_equity": 1000, "peak_equity": 1000,
         "paused": False, "anomaly_count": 0},
        {"price": 100, "bid": 99.99, "ask": 100.01, "depth_usd": 100000,
         "observed_at": 1000, "now": 1001, "volatility": .01, "reference_price": 100,
         "min_notional": 1, "base_increment": .00001, "feed_ok": True},
    )


def test_allowed_order_is_capped_to_risk_budget_including_costs():
    r, p, m = inputs()
    result = evaluate(r, p, m)
    assert result["allowed"]
    assert 0 < result["notional"] < 100
    assert result["planned_loss"] <= 2.5
    assert result["quantity"] > 0
    assert result["reasons"] == []


@pytest.mark.parametrize("group,key,value,reason", [
    (0, "evidence_eligible", False, "strategy_not_eligible"),
    (0, "microcap", True, "microcap_research_only"),
    (0, "side", "SELL", "close_workflow_required"),
    (0, "side", "SHORT", "unsupported_side"),
    (0, "product", "BTC-PERP", "unsupported_spot_product"),
    (0, "expected_net_return", .005, "insufficient_net_edge"),
    (0, "stop_price", 100, "invalid_long_stop"),
    (0, "stop_price", 0, "invalid_long_stop"),
    (0, "requested_notional", -1, "invalid_order"),
    (1, "paused", True, "manual_pause"),
    (1, "daily_realized_pnl", -10, "daily_loss_halt"),
    (1, "anomaly_count", 3, "execution_anomaly_halt"),
    (1, "cash", 0, "no_risk_capacity"),
    (1, "cash", 1001, "invalid_portfolio"),
    (2, "feed_ok", False, "feed_unavailable"),
    (2, "observed_at", 970, "stale_quote"),
    (2, "observed_at", 1002, "future_quote"),
    (2, "ask", 101, "spread_limit"),
    (2, "bid", 102, "invalid_market"),
    (2, "reference_price", 90, "price_deviation"),
    (2, "volatility", .10, "volatility_halt"),
    (2, "depth_usd", 1, "below_minimum_order"),
    (2, "min_notional", 100, "below_minimum_order"),
    (2, "base_increment", 1, "below_minimum_order"),
])
def test_mandatory_controls(group, key, value, reason):
    arguments = list(inputs())
    arguments[group][key] = value
    result = evaluate(*arguments)
    assert not result["allowed"]
    assert reason in result["reasons"]
    assert result["quantity"] == result["notional"] == result["planned_loss"] == 0


def test_drawdown_at_boundary_halts():
    r, p, m = inputs()
    p.update(equity=950, cash=950)
    assert "drawdown_halt" in evaluate(r, p, m)["reasons"]


def test_exposure_and_correlation_cap_new_orders():
    r, p, m = inputs()
    p.update(cash=805, exposure=195, correlated_exposure=195)
    result = evaluate(r, p, m)
    assert result["allowed"]
    assert result["notional"] <= 5
    p.update(cash=800, exposure=200, correlated_exposure=200)
    assert "no_risk_capacity" in evaluate(r, p, m)["reasons"]


def test_quote_age_boundary_is_accepted():
    r, p, m = inputs()
    m["observed_at"] = 971
    assert evaluate(r, p, m)["allowed"]


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), float("-inf"), "NaN", True, None])
def test_invalid_numbers_cannot_bypass_gate(bad):
    for group, arguments in enumerate(inputs()):
        for key, val in arguments.items():
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                cases = list(inputs())
                cases[group][key] = bad
                result = evaluate(*cases)
                assert not result["allowed"], (group, key, bad)
                assert result["quantity"] == 0


def test_every_required_field_is_required():
    for group, arguments in enumerate(inputs()):
        for key in arguments:
            cases = list(inputs())
            del cases[group][key]
            assert not evaluate(*cases)["allowed"], (group, key)


@pytest.mark.parametrize("change", [{"risk_fraction": .5}, {"fee_rate": 0},
                                    {"live": True}, {"max_quote_age": 1000},
                                    {"max_anomalies": 2.5}, {"max_spread": float("nan")}])
def test_policy_relaxations_rejected(change):
    assert evaluate(*inputs(), policy=change)["reasons"] == ["invalid_policy"]


def test_policy_can_only_tighten():
    old = evaluate(*inputs())
    new = evaluate(*inputs(), policy={"risk_fraction": .001})
    assert new["allowed"] and new["notional"] < old["notional"]
    with pytest.raises(TypeError):
        POLICY["risk_fraction"] = .5


def test_input_is_not_mutated_and_result_deterministic():
    cases = inputs()
    before = deepcopy(cases)
    assert evaluate(*cases) == evaluate(*cases)
    assert cases == before


def test_tiny_cash_account_does_not_create_activity():
    r, p, m = inputs()
    p.update(equity=1, cash=1, day_start_equity=1, peak_equity=1)
    assert "below_minimum_order" in evaluate(r, p, m)["reasons"]


def test_incoherent_quote_and_fractional_anomaly_count_rejected():
    r, p, m = inputs()
    m["price"] = 99
    assert "price_outside_quote" in evaluate(r, p, m)["reasons"]
    m["price"] = 100
    p["anomaly_count"] = 1.5
    assert "invalid_portfolio" in evaluate(r, p, m)["reasons"]

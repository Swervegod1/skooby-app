import copy
import json

import numpy as np
import pandas as pd
import pytest

from oracle.quant import analyze, feature_matrix, labeled_samples, net_return


def candles(n=650, seed=3):
    rng = np.random.default_rng(seed)
    close = 100 * np.exp(np.cumsum(rng.normal(0, 0.006, n)))
    opened = np.r_[100, close[:-1]]
    return [{"start": 1700002800 + i * 3600, "available_at": 1700002800 + (i + 1) * 3600 + 1,
             "open": float(opened[i]), "close": float(close[i]), "high": float(max(opened[i], close[i]) * 1.001),
             "low": float(min(opened[i], close[i]) * 0.999), "volume": float(rng.uniform(10, 100))} for i in range(n)]


def test_features_are_prefix_invariant():
    data = candles()
    full, prefix = feature_matrix(data), feature_matrix(data[:350])
    pd.testing.assert_frame_equal(full.iloc[:350], prefix)
    altered = copy.deepcopy(data)
    for row in altered[350:]:
        for k in ("open", "high", "low", "close"):
            row[k] *= 1000
    pd.testing.assert_frame_equal(feature_matrix(altered).iloc[:350], prefix)


def test_entry_and_labels_obey_availability():
    data = candles()
    sample = labeled_samples(data, 4)
    assert (sample.entry_time > sample.available_at).all()
    assert (sample.exit_row - sample.entry_row == 4).all()
    assert (sample.label_available_at > sample.exit_time).all()
    assert (sample.entry_row - sample.feature_row == 2).all()


def test_costs_are_charged_both_sides():
    assert net_return(0, 0.02) == pytest.approx(0.99 / 1.01 - 1)
    assert net_return(0.01, 0.02) < 0
    assert net_return(-0.5, 0.02) < -0.5


def test_walk_forward_purges_overlap_and_keeps_research_ineligible():
    result = analyze(candles(), horizon=4)
    for fold in result["validation"]["folds"]:
        assert fold["train_last_label_at"] < fold["calibration_first_feature_at"] - 4 * 3600
        assert fold["calibration_last_label_at"] < fold["test_first_feature_at"] - 4 * 3600
    assert result["validation"]["eligible"] is False
    assert 0 <= result["probability_up"] <= 1
    assert result["validation"]["test_samples"] >= 60
    json.dumps(result, allow_nan=False)
    fills = result["backtest"]["momentum"]["fills"]
    assert all(a["exit_time"] <= b["entry_time"] for a, b in zip(fills, fills[1:]))


def test_reproducible_forecast():
    data = candles()
    assert analyze(data) == analyze(data)


def test_more_expensive_costs_do_not_improve_fixed_momentum():
    data = candles()
    cheap = analyze(data, round_trip_cost=0)["backtest"]["momentum"]["net_return"]
    costly = analyze(data, round_trip_cost=0.02)["backtest"]["momentum"]["net_return"]
    assert costly <= cheap


@pytest.mark.parametrize("change", ["duplicate", "nan", "early", "gap", "bad_ohlc"])
def test_invalid_data_rejected(change):
    data = candles()
    if change == "duplicate": data[20]["start"] = data[19]["start"]
    if change == "nan": data[20]["close"] = float("nan")
    if change == "early": data[20]["available_at"] = data[20]["start"]
    if change == "gap": data.pop(20)
    if change == "bad_ohlc": data[20]["high"] = 1
    with pytest.raises(ValueError): analyze(data)


def test_short_history_and_unsupported_horizon_rejected():
    with pytest.raises(ValueError, match="Insufficient"): analyze(candles(300))
    with pytest.raises(ValueError, match="Insufficient"): analyze(candles(650), horizon=24)
    with pytest.raises(ValueError, match="Supported"): analyze(candles(), horizon=5)

"""ORACLE orchestrator: evidence workers cannot promote strategies or place live orders."""
from __future__ import annotations

import hashlib
import time
import uuid
from pathlib import Path
from threading import Lock

import numpy as np

from .connectors import CoinbasePublic, DataUnavailable, captured_history
from .quant import analyze as forecast
from .risk import evaluate
from .store import Store


class Oracle:
    def __init__(self, store: Store, capture: Path | None = None):
        self.store, self.capture = store, capture
        self.venue = CoinbasePublic()
        self._analysis_lock = Lock()
        self._cached_history = {}

    def _history(self, product):
        if self.capture:
            rows, source, observed = captured_history(self.capture, product)
            return rows, source, observed, "historical"
        cached = self._cached_history.get(product)
        if cached and time.time() - cached[0] < 60:
            return cached[1], self.venue.source, cached[0], "delayed"
        rows = self.venue.history(product)
        observed = time.time()
        self._cached_history[product] = (observed, rows)
        return rows, self.venue.source, observed, "delayed"

    def analyze(self, user, product="BTC-USD", horizon=1):
        if not self._analysis_lock.acquire(blocking=False):
            raise ValueError("An analysis is already running; retry shortly")
        try:
            return self._analyze(user, product, horizon)
        finally:
            self._analysis_lock.release()

    def _analyze(self, user, product, horizon):
        decision = {"id": str(uuid.uuid4()), "product": product, "horizon": horizon,
                    "created_at": time.time(), "market_status": "High Risk", "decision": "NO TRADE",
                    "reason": "No verified executable edge.", "forecast": None, "prices": [],
                    "source": None, "observed_at": None, "data_mode": "unavailable",
                    "risk": {"allowed": False, "reasons": ["data_unavailable"], "notional": 0, "stop_price": None}}
        try:
            rows, source, observed, mode = self._history(product)
            decision.update(source=source, observed_at=observed, data_mode=mode,
                            prices=[{"time": r["start"], "close": r["close"]} for r in rows[-168:]],
                            latest_candle_closed_at=rows[-1]["start"] + 3600)
            model = forecast(rows, horizon=horizon, round_trip_cost=.0124)
            decision["forecast"] = model
            self.store.experiment(user, {"product": product, "horizon": horizon, "status": "RESEARCH_ONLY",
                                        "data_mode": mode, "result": model})
            returns = np.diff(np.log([r["close"] for r in rows[-49:]]))
            volatility = float(np.std(returns))
            change = rows[-1]["close"] / rows[-25]["close"] - 1
            decision["market_status"] = "High Risk" if volatility > .03 else "Bullish" if change > .01 else "Bearish" if change < -.01 else "Neutral"
            stop = rows[-1]["close"] * (1 - min(.2, max(.02, 2 * volatility)))
            portfolio = self.store.status(user)["portfolio"]
            proposal = {"side": "BUY", "product": product,
                        "expected_net_return": model["expected_net_return"], "edge_margin": .001,
                        "stop_price": stop, "requested_notional": portfolio["equity"] * .1,
                        # Immutable release registry: NO strategy approved for forward paper orders yet.
                        # Model validation fields, browser inputs and worker opinions cannot change this.
                        "evidence_eligible": False, "microcap": False}
            decision["proposal"] = proposal
            if self.capture:
                decision["risk"] = {"allowed": False, "reasons": ["historical_replay", "strategy_not_eligible"], "notional": 0, "stop_price": None}
            else:
                market = self.venue.book(product)
                market.update(self.venue.product(product), now=time.time(), volatility=volatility,
                              reference_price=rows[-1]["close"])
                decision["risk"] = evaluate(proposal, portfolio, market)
            decision["decision"] = "WATCH" if model["expected_net_return"] > 0 else "NO TRADE"
            decision["reason"] = "Research forecast only; strategy has no approved forward track record. Keep paper funds unallocated."
        except (DataUnavailable, ValueError, KeyError, TypeError) as exc:
            reason = str(exc)[:240]
            decision.update(decision="NO TRADE", reason=reason, market_status="High Risk",
                            risk={"allowed": False, "reasons": ["data_or_validation_unavailable"], "notional": 0, "stop_price": None})
            self.store.experiment(user, {"product": product, "horizon": horizon, "status": "REJECTED", "reason": reason})
        decision["agents"] = [
            {"name": "THE SCOUT", "status": "OBSERVATION", "evidence": f"{product}; {decision['data_mode']} hourly candles. No universe-wide search."},
            {"name": "THE QUANT", "status": "RESEARCH", "evidence": "Walk-forward baselines and held-out calibration measured." if decision["forecast"] else "No eligible forecast."},
            {"name": "THE WHALE", "status": "ABSTAIN", "evidence": "No verified wallet histories connected; no smart-money claim."},
            {"name": "THE SENTINEL", "status": "BLOCK", "evidence": ", ".join(decision["risk"]["reasons"])},
            {"name": "THE EXECUTIONER", "status": "PAPER_ONLY", "evidence": "No live adapter. No order submitted by analysis."},
            {"name": "THE AUDITOR", "status": "DISAGREEMENT" if decision["decision"] == "WATCH" else "BLOCK", "evidence": "Positive predicted edge, if any, is not verified profitability. Historical arrival timestamps are assumed, not archived."},
        ]
        self.store.save_decision(user, decision)
        return self.store.status(user)

    def order(self, user, decision_id, key):
        decision = self.store.decision(user, decision_id)
        if self.capture or not decision.get("risk", {}).get("allowed"):
            raise ValueError("Decision is not eligible for paper execution")
        if not self.store.audit_valid(user):
            raise ValueError("Audit integrity check failed")
        market = self.venue.book(decision["product"])
        rows, _, _, _ = self._history(decision["product"])
        market.update(self.venue.product(decision["product"]), now=time.time(),
                      volatility=float(np.std(np.diff(np.log([r["close"] for r in rows[-49:]])))),
                      reference_price=rows[-1]["close"])
        # Recheck registry independently of the saved forecasting decision.
        def release_guard(proposal, portfolio, snapshot):
            return evaluate({**proposal, "evidence_eligible": False}, portfolio, snapshot)
        return self.store.fill_buy(user, key, decision, market, release_guard)

    def command(self, user, text):
        normalized = text.strip().lower().rstrip(".?!")
        if normalized in ("pause all trading", "pause trading", "pause"):
            self.store.pause(user, True)
            return {"message": "Paper entries paused. There is no live trading adapter.", "status": self.store.status(user)}
        if normalized in ("find the strongest opportunities", "analyze market"):
            return {"message": "Analyzing the BTC hourly baseline only; broader discovery remains pending.", "status": self.analyze(user)}
        if normalized in ("run a simulation using $100", "compare this trade with doing nothing"):
            status = self.analyze(user)
            return {"message": "Backtest returns are fractional and can be scaled to $100. See cash and passive comparisons; this is not a live return.", "status": status}
        if normalized == "what happens if bitcoin drops 5%":
            portfolio = self.store.status(user)["portfolio"]
            return {"message": "Scenario only: BTC spot market value falls 5%; fees and cross-asset contagion excluded.",
                    "btc_quantity": sum(p["quantity"] for p in portfolio["positions"] if p["product"] == "BTC-USD"),
                    "status": self.store.status(user)}
        if normalized in ("explain this signal like i'm a beginner", "show today's best validated strategy", "why did we lose money on that trade"):
            return {"message": "No strategy has earned approval. Inspect forecast validation and paper fills; no profitable track record is claimed.", "status": self.store.status(user)}
        return {"message": "Command unsupported. Use Analyze market, Compare this trade with doing nothing, Run a simulation using $100, or Pause all trading. No action taken."}


def user_key(value):
    return hashlib.sha256(value.encode()).hexdigest()

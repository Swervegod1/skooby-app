"""Paper-ledger invariants with internal synthetic eligibility, never live orders."""
import time
from concurrent.futures import ThreadPoolExecutor
import pytest
from oracle.risk import evaluate
from oracle.store import Store


@pytest.fixture
def store(tmp_path):
    return Store(tmp_path / "paper.sqlite3")


def market(now=None):
    now = time.time() if now is None else now
    return {"price": 100., "bid": 99.99, "ask": 100.01, "depth_usd": 100000.,
            "observed_at": now, "now": now, "volatility": .01, "reference_price": 100.,
            "min_notional": 1., "base_increment": .00001, "feed_ok": True}


def decision(key="research-fixture"):
    return {"id": key, "created_at": time.time(), "product": "BTC-USD", "horizon": 1,
            "proposal": {"side": "BUY", "product": "BTC-USD", "expected_net_return": .02,
                         "edge_margin": .005, "stop_price": 98., "requested_notional": 10.,
                         "evidence_eligible": True, "microcap": False},
            "risk": {"allowed": True}, "decision": "WATCH"}


def buy(store, user="alice", key="first-key", d=None):
    d = d or decision()
    store.save_decision(user, d)
    return d, store.fill_buy(user, key, d, market(), evaluate)


def test_fill_accounting_and_restart(store):
    _, fill = buy(store)
    assert fill["status"] == "FILLED"
    reopened = Store(store.path)
    p = reopened.status("alice", {"BTC-USD": 100.})["portfolio"]
    assert len(p["positions"]) == len(p["orders"]) == 1
    assert p["cash"] == pytest.approx(100 - fill["quantity"] * fill["price"] - fill["fee"])
    assert p["equity"] == pytest.approx(100 + p["realized_pnl"] + p["unrealized_pnl"])
    assert p["fees"] == pytest.approx(fill["fee"])
    assert reopened.audit_valid("alice")
    assert p["mode"] == "paper"


def test_idempotency_rejects_key_and_decision_duplicates(store):
    d, _ = buy(store)
    for key in ("first-key", "different-key"):
        with pytest.raises(ValueError, match="Duplicate"):
            store.fill_buy("alice", key, d, market(), evaluate)
    assert len(store.status("alice")["portfolio"]["orders"]) == 1


def test_concurrent_duplicate_calls_fill_once(store):
    d = decision()
    store.save_decision("alice", d)
    def attempt(_):
        try:
            return store.fill_buy("alice", "shared-key", d, market(), evaluate)["status"]
        except ValueError:
            return "DUPLICATE"
    with ThreadPoolExecutor(max_workers=4) as pool:
        outcomes = list(pool.map(attempt, range(4)))
    assert outcomes.count("FILLED") == 1
    assert len(store.status("alice")["portfolio"]["orders"]) == 1


def test_pause_survives_restart_and_blocks_entries(store):
    store.pause("alice", True)
    reopened = Store(store.path)
    assert reopened.status("alice")["paused"]
    d, result = buy(reopened)
    assert result["status"] == "REJECTED"
    assert "manual_pause" in result["risk"]["reasons"]
    assert reopened.status("alice")["portfolio"]["cash"] == 100


def test_tenant_reads_and_state_are_isolated(store):
    d, _ = buy(store)
    store.pause("alice", True)
    store.experiment("alice", {"name": "private-experiment"})
    b = store.status("bob")
    assert b["portfolio"]["cash"] == 100 and b["portfolio"]["positions"] == []
    assert not b["paused"] and b["last_analysis"] is None
    assert store.experiments("bob") == []
    with pytest.raises(ValueError, match="Unknown decision"):
        store.decision("bob", d["id"])


def test_fill_cannot_reuse_another_tenants_decision(store):
    d = decision()
    store.save_decision("alice", d)
    with pytest.raises(ValueError):
        store.fill_buy("bob", "stolen-decision", d, market(), evaluate)
    assert store.status("bob")["portfolio"]["orders"] == []


def test_protective_exit_works_while_paused_and_reconciles_once(store):
    _, fill = buy(store)
    store.pause("alice", True)
    quote = market()
    quote.update(price=97., bid=96.99, ask=97.01)
    result = store.reconcile("alice", "BTC-USD", quote)
    assert result["status"] == "CLOSED"
    assert store.reconcile("alice", "BTC-USD", quote)["status"] == "NO_EXIT"
    p = store.status("alice")["portfolio"]
    assert p["positions"] == [] and len(p["orders"]) == 2
    assert p["cash"] == pytest.approx(100 + p["realized_pnl"])
    assert p["unrealized_pnl"] == 0
    assert p["realized_pnl"] < 0 and p["fees"] > fill["fee"]
    assert p["daily_realized_pnl"] == pytest.approx(p["realized_pnl"])
    assert store.audit_valid("alice")


def test_horizon_exit_and_no_early_exit(store):
    buy(store)
    now = time.time()
    assert store.reconcile("alice", "BTC-USD", market(now), now=now)["status"] == "NO_EXIT"
    later = now + 3700
    assert store.reconcile("alice", "BTC-USD", market(later), now=later)["status"] == "CLOSED"


@pytest.mark.parametrize("override", [
    {"observed_at": 0}, {"observed_at": float("nan")}, {"feed_ok": False},
    {"bid": -1., "price": -1.}, {"bid": float("nan")}, {"bid": float("inf")},
    {"ask": -2.}, {"ask": 90., "bid": 97.}, {"price": 0.},
])
def test_malformed_exit_quote_is_rejected_without_mutation(store, override):
    buy(store)
    before = store.status("alice")["portfolio"]
    quote = market()
    quote.update(price=97., bid=96.99, ask=97.01)
    quote.update(override)
    with pytest.raises(ValueError):
        store.reconcile("alice", "BTC-USD", quote)
    after = store.status("alice")["portfolio"]
    assert after["cash"] == before["cash"]
    assert after["orders"] == before["orders"]
    assert after["positions"] == before["positions"]


def test_expired_and_future_decisions_rejected(store):
    for offset in (-31, 60):
        d = decision(str(offset))
        d["created_at"] += offset
        store.save_decision("alice", d)
        with pytest.raises(ValueError, match="expired"):
            store.fill_buy("alice", "some-key", d, market(), evaluate)


def test_audit_tampering_detected(store):
    store.status("alice")
    assert store.audit_valid("alice")
    with store.connect() as db:
        db.execute("UPDATE audit SET event=? WHERE user=?", ('{"tampered":true}', "alice"))
    assert not store.audit_valid("alice")


def test_unknown_marks_are_explicit_and_cannot_expand_positions(store):
    buy(store)
    p = store.status("alice")["portfolio"]
    assert p["valuation"] == "STALE_COST_BASIS"
    d = decision("eth-other")
    d["product"] = d["proposal"]["product"] = "ETH-USD"
    store.save_decision("alice", d)
    with pytest.raises(ValueError, match="Missing marks"):
        store.fill_buy("alice", "eth-key", d, market(), evaluate)


def test_caller_cannot_change_persisted_decision_eligibility_or_size(store):
    d = decision()
    d["proposal"]["evidence_eligible"] = False
    store.save_decision("alice", d)
    d["proposal"].update(evidence_eligible=True, requested_notional=10000)
    result = store.fill_buy("alice", "forged-copy", d, market(), evaluate)
    assert result["status"] == "REJECTED"
    assert "strategy_not_eligible" in result["risk"]["reasons"]
    assert store.status("alice")["portfolio"]["cash"] == 100


def test_corrupt_audit_blocks_entry_and_exit(store):
    d, _ = buy(store)
    with store.connect() as db:
        db.execute("UPDATE audit SET hash=? WHERE user=?", ("0" * 64, "alice"))
    with pytest.raises(ValueError, match="Audit integrity"):
        store.fill_buy("alice", "another-key", d, market(), evaluate)
    quote = market()
    quote.update(price=97., bid=96.99, ask=97.01)
    with pytest.raises(ValueError, match="Audit integrity"):
        store.reconcile("alice", "BTC-USD", quote)
    assert len(store.status("alice")["portfolio"]["positions"]) == 1

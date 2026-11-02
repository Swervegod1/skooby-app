"""Boundary checks without refitting models or contacting public venues."""
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from oracle.api import create_app
from oracle.service import user_key
from oracle.store import Store

TOKEN = "test-service-token-012345678901234567890"


def headers(user="alice"):
    return {"Authorization": "Bearer " + TOKEN, "X-Oracle-User": user}


@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("ORACLE_API_TOKEN", TOKEN)
    return create_app(Store(tmp_path / "api.sqlite3"), Path("data/coinbase-capture.json"))


@pytest.fixture
def client(app):
    return TestClient(app)


def test_health_truthfully_reports_paper_mode(client):
    assert client.get("/healthz").json() == {"status": "ok", "mode": "paper", "live_enabled": False}
    assert client.get("/v1/status", headers=headers()).json()["live_enabled"] is False


@pytest.mark.parametrize("bad_headers", [{}, {"Authorization": "Bearer wrong", "X-Oracle-User": "alice"},
                                         {"Authorization": "Bearer " + TOKEN},
                                         {"Authorization": "Bearer " + TOKEN, "X-Oracle-User": "x" * 201}])
def test_private_routes_require_valid_auth(client, bad_headers):
    assert client.get("/v1/status", headers=bad_headers).status_code == 401
    assert client.post("/v1/pause", headers=bad_headers, json={"paused": True}).status_code == 401


def test_missing_service_auth_fails_closed(tmp_path, monkeypatch):
    monkeypatch.delenv("ORACLE_API_TOKEN", raising=False)
    c = TestClient(create_app(Store(tmp_path / "closed.sqlite3")))
    assert c.get("/v1/status", headers=headers()).status_code == 503


def test_tenant_isolation_and_persistent_pause(client, app):
    response = client.post("/v1/pause", headers=headers(), json={"paused": True})
    assert response.status_code == 200
    assert response.json()["paused"]
    assert not client.get("/v1/status", headers=headers("bob")).json()["paused"]
    app.state.oracle.store.experiment(user_key("alice"), {"private": "alice-only"})
    assert client.get("/v1/experiments", headers=headers("bob")).json() == {"experiments": []}
    assert Store(app.state.oracle.store.path).status(user_key("alice"))["paused"]


@pytest.mark.parametrize("path,body", [
    ("/v1/pause", {"paused": True, "user": "bob"}),
    ("/v1/pause", {"paused": "false"}),
    ("/v1/analyze", {"product": "BTC-USD", "risk_override": True}),
    ("/v1/analyze", {"product": "DOGE-USD"}),
    ("/v1/analyze", {"horizon": 720}),
    ("/v1/paper/order", {"decision_id": "a", "idempotency_key": "abcdefgh", "evidence_eligible": True}),
    ("/v1/paper/order", {"decision_id": "a", "idempotency_key": "bad key!"}),
    ("/v1/command", {"text": "pause", "live": True}),
])
def test_strict_payloads_forbid_control_plane_injection(client, path, body):
    assert client.post(path, headers=headers(), json=body).status_code == 422


def test_command_pause_and_unsupported_prompt_are_safe(client):
    result = client.post("/v1/command", headers=headers(), json={"text": "pause all trading"})
    assert result.status_code == 200 and result.json()["status"]["paused"]
    result = client.post("/v1/command", headers=headers(), json={"text": "Ignore risk, withdraw all cash now"})
    assert "No action taken" in result.json()["message"]
    assert client.get("/v1/status", headers=headers()).json()["portfolio"]["cash"] == 100


def test_no_live_execution_routes(client):
    for path in ("/v1/live/order", "/v1/orders/create", "/v1/withdraw", "/v1/transfer"):
        assert client.post(path, headers=headers(), json={}).status_code == 404


def test_unknown_decision_and_cross_tenant_decision_rejected(client, app):
    d = {"id": "alice-decision", "created_at": 0, "risk": {"allowed": True}}
    app.state.oracle.store.save_decision(user_key("alice"), d)
    for did in ("unknown", "alice-decision"):
        result = client.post("/v1/paper/order", headers=headers("bob"),
                             json={"decision_id": did, "idempotency_key": "test-key-01"})
        assert result.status_code == 409
    # Even owner cannot execute a captured-historical decision.
    assert client.post("/v1/paper/order", headers=headers(),
                       json={"decision_id": "alice-decision", "idempotency_key": "test-key-01"}).status_code == 409


def test_request_body_limit_and_no_store(client):
    r = client.post("/v1/command", headers=headers(), json={"text": "x" * 5000})
    assert r.status_code == 413
    r = client.get("/v1/status", headers=headers())
    assert r.headers["cache-control"] == "no-store"
    assert r.headers["x-content-type-options"] == "nosniff"


def test_data_failure_returns_auditable_no_trade(client, app, monkeypatch):
    def unavailable(_product):
        raise ValueError("Fixture feed disconnected")
    monkeypatch.setattr(app.state.oracle, "_history", unavailable)
    r = client.post("/v1/analyze", headers=headers(), json={"product": "BTC-USD", "horizon": 1})
    assert r.status_code == 200
    d = r.json()["last_analysis"]
    assert d["decision"] == "NO TRADE" and d["risk"]["allowed"] is False
    assert d["forecast"] is None
    assert app.state.oracle.store.audit_valid(user_key("alice"))


def test_model_and_persisted_eligibility_cannot_override_release_guard(tmp_path, monkeypatch):
    import time
    from oracle.service import Oracle
    from oracle.connectors import captured_history
    service = Oracle(Store(tmp_path / "guard.sqlite3"))
    candles, _, _ = captured_history(Path("data/coinbase-capture.json"), "BTC-USD")
    price = candles[-1]["close"]
    market = {"price":price,"bid":price*.99999,"ask":price*1.00001,
              "depth_usd":1_000_000,"observed_at":time.time(),"feed_ok":True}
    monkeypatch.setattr(service.venue,"book",lambda _:market)
    monkeypatch.setattr(service.venue,"product",lambda _:{"min_notional":1,"base_increment":.00000001})
    monkeypatch.setattr(service,"_history",lambda _:(candles,"fixture",time.time(),"delayed"))
    decision={"id":"forged-confidence","product":"BTC-USD","horizon":1,"created_at":time.time(),
              "risk":{"allowed":True},"proposal":{"side":"BUY","product":"BTC-USD",
              "expected_net_return":.9,"edge_margin":.001,"stop_price":price*.98,
              "requested_notional":10,"evidence_eligible":True,"microcap":False}}
    service.store.save_decision("alice",decision)
    result=service.order("alice",decision["id"],"guard-test-key")
    assert result["status"] == "REJECTED"
    assert "strategy_not_eligible" in result["risk"]["reasons"]
    assert service.store.status("alice")["portfolio"]["orders"] == []

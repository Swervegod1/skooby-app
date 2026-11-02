import hmac
import os
import time
from pathlib import Path
from threading import Lock
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .service import Oracle, user_key
from .store import Store


def create_app(store=None, capture=None):
    token = os.getenv("ORACLE_API_TOKEN", "")
    service = Oracle(store or Store(os.getenv("ORACLE_DB", "data/oracle.sqlite3")), capture or
                     (Path(os.environ["ORACLE_CAPTURE"]) if os.getenv("ORACLE_CAPTURE") else None))
    app = FastAPI(title="ORACLE X · paper intelligence", version="0.1.0", docs_url=None, redoc_url=None)
    app.state.oracle = service
    budget, budget_lock = {}, Lock()

    def auth(authorization: str = Header(default=""), x_oracle_user: str = Header(default="")):
        if len(token) < 32:
            raise HTTPException(503, "Service authentication is not configured")
        if not hmac.compare_digest(authorization, "Bearer " + token) or not 1 <= len(x_oracle_user) <= 200:
            raise HTTPException(401, "Unauthorized")
        user = user_key(x_oracle_user)
        now = time.monotonic()
        with budget_lock:
            # Bound the in-memory bucket map. This is a single-process deployment.
            for key in [k for k, v in budget.items() if now - v[0] > 60]:
                del budget[key]
            start, count = budget.get(user, (now, 0))
            if count >= 60:
                raise HTTPException(429, "Request limit reached")
            if user not in budget and len(budget) >= 10000:
                raise HTTPException(503, "Capacity reached")
            budget[user] = (start, count + 1)
        return user

    class Strict(BaseModel):
        model_config = ConfigDict(extra="forbid", strict=True)

    class Analysis(Strict):
        product: Literal["BTC-USD", "ETH-USD"] = "BTC-USD"
        horizon: Literal[1, 4, 24] = 1

    class Pause(Strict):
        paused: bool

    class Order(Strict):
        decision_id: str = Field(min_length=1, max_length=100)
        idempotency_key: str = Field(min_length=8, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")

    class Command(Strict):
        text: str = Field(min_length=1, max_length=300)

    @app.middleware("http")
    async def bounds(request, call_next):
        from fastapi.responses import JSONResponse
        if request.method == "POST":
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 4096:
                    return JSONResponse({"detail": "Request too large"}, status_code=413)
                chunks.append(chunk)
            request._body = b"".join(chunks)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/healthz")
    def health():
        return {"status": "ok", "mode": "paper", "live_enabled": False}

    @app.get("/v1/status")
    def status(user=Depends(auth)):
        return service.store.status(user)

    @app.get("/v1/experiments")
    def experiments(user=Depends(auth)):
        return {"experiments": service.store.experiments(user)}

    @app.get("/v1/ledger")
    def ledger(user=Depends(auth)):
        return {"profiles": [], "status": "NOT_CONNECTED", "reason": "No verified trader history has been ingested."}

    @app.post("/v1/analyze")
    def analyze(body: Analysis, user=Depends(auth)):
        try:
            return service.analyze(user, body.product, body.horizon)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from None

    @app.post("/v1/pause")
    def pause(body: Pause, user=Depends(auth)):
        service.store.pause(user, body.paused)
        return service.store.status(user)

    @app.post("/v1/paper/order")
    def order(body: Order, user=Depends(auth)):
        try:
            return service.order(user, body.decision_id, body.idempotency_key)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from None

    @app.post("/v1/command")
    def command(body: Command, user=Depends(auth)):
        try:
            return service.command(user, body.text)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from None

    return app

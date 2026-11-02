"""Transactional paper ledger; deterministic idempotency; per-user audit chains."""
from __future__ import annotations

import hashlib
import json
import math
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript('''
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS accounts(user TEXT PRIMARY KEY, starting REAL NOT NULL, cash REAL NOT NULL,
                realized REAL NOT NULL DEFAULT 0, fees REAL NOT NULL DEFAULT 0, peak REAL NOT NULL,
                paused INTEGER NOT NULL DEFAULT 0, day TEXT NOT NULL, day_start REAL NOT NULL,
                day_realized REAL NOT NULL DEFAULT 0, anomalies INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS decisions(id TEXT PRIMARY KEY,user TEXT NOT NULL,created REAL NOT NULL,payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS experiments(id INTEGER PRIMARY KEY,user TEXT NOT NULL,created REAL NOT NULL,payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS positions(user TEXT NOT NULL,product TEXT NOT NULL,quantity REAL NOT NULL,
                cost REAL NOT NULL,stop REAL NOT NULL,expires REAL NOT NULL,PRIMARY KEY(user,product));
            CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,user TEXT NOT NULL,key TEXT NOT NULL,
                decision TEXT NOT NULL,product TEXT NOT NULL,side TEXT NOT NULL,quantity REAL NOT NULL,price REAL NOT NULL,
                fee REAL NOT NULL,created REAL NOT NULL,UNIQUE(user,key),UNIQUE(user,decision));
            CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,user TEXT NOT NULL,created REAL NOT NULL,
                event TEXT NOT NULL,previous TEXT NOT NULL,hash TEXT NOT NULL);
            ''')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def _audit(self, db, user, event):
        previous = db.execute("SELECT hash FROM audit WHERE user=? ORDER BY id DESC LIMIT 1", (user,)).fetchone()
        prev = previous[0] if previous else "0" * 64
        created = time.time()
        raw = canonical(event)
        digest = hashlib.sha256(canonical([user, created, prev, raw]).encode()).hexdigest()
        db.execute("INSERT INTO audit(user,created,event,previous,hash) VALUES(?,?,?,?,?)", (user, created, raw, prev, digest))

    def _ensure(self, db, user, capital=100.0):
        cursor = db.execute("INSERT OR IGNORE INTO accounts(user,starting,cash,peak,day,day_start) VALUES(?,?,?,?,?,?)",
                            (user, capital, capital, capital, time.strftime("%Y-%m-%d", time.gmtime()), capital))
        if cursor.rowcount:
            self._audit(db, user, {"type": "paper_account_created", "simulated_capital": capital})

    def _snapshot(self, db, user, marks=None):
        self._ensure(db, user)
        marks = marks or {}
        account = dict(db.execute("SELECT * FROM accounts WHERE user=?", (user,)).fetchone())
        positions = [dict(x) for x in db.execute("SELECT * FROM positions WHERE user=?", (user,))]
        # Unknown marks do not masquerade as current valuation.
        missing = any(p["product"] not in marks for p in positions)
        exposure = sum(p["quantity"] * marks.get(p["product"], p["cost"] / p["quantity"]) for p in positions)
        equity = account["cash"] + exposure
        if not missing:
            account["peak"] = max(account["peak"], equity)
            today = time.strftime("%Y-%m-%d", time.gmtime())
            if account["day"] != today:
                account.update(day=today, day_start=equity, day_realized=0.0)
            db.execute("UPDATE accounts SET peak=?,day=?,day_start=?,day_realized=? WHERE user=?",
                       (account["peak"], account["day"], account["day_start"], account["day_realized"], user))
        return {"starting_capital": account["starting"], "cash": account["cash"], "equity": equity,
                "realized_pnl": account["realized"], "unrealized_pnl": exposure - sum(p["cost"] for p in positions),
                "fees": account["fees"], "exposure": exposure, "correlated_exposure": exposure,
                "positions": positions, "paused": bool(account["paused"]), "peak_equity": account["peak"],
                "day_start_equity": account["day_start"], "daily_realized_pnl": account["day_realized"],
                "anomaly_count": account["anomalies"], "valuation": "STALE_COST_BASIS" if missing else "MARKED",
                "orders": [dict(x) for x in db.execute("SELECT * FROM orders WHERE user=? ORDER BY id DESC LIMIT 100", (user,))],
                "mode": "paper", "deposits": 0, "withdrawals": 0}

    def status(self, user, marks=None):
        with self.connect() as db:
            result = self._snapshot(db, user, marks)
            last = db.execute("SELECT payload FROM decisions WHERE user=? ORDER BY created DESC LIMIT 1", (user,)).fetchone()
            return {"mode": "paper", "live_enabled": False, "paused": result["paused"], "portfolio": result,
                    "last_analysis": json.loads(last[0]) if last else None}

    def save_decision(self, user, decision):
        with self.connect() as db:
            self._ensure(db, user)
            db.execute("INSERT INTO decisions VALUES(?,?,?,?)", (decision["id"], user, time.time(), canonical(decision)))
            self._audit(db, user, {"type": "decision", "payload": decision})

    def decision(self, user, decision_id):
        with self.connect() as db:
            row = db.execute("SELECT payload FROM decisions WHERE user=? AND id=?", (user, decision_id)).fetchone()
            if not row:
                raise ValueError("Unknown decision")
            return json.loads(row[0])

    def experiment(self, user, payload):
        with self.connect() as db:
            db.execute("INSERT INTO experiments(user,created,payload) VALUES(?,?,?)", (user, time.time(), canonical(payload)))
            self._audit(db, user, {"type": "experiment", "payload": payload})

    def experiments(self, user):
        with self.connect() as db:
            return [dict(id=r["id"], created=r["created"], **json.loads(r["payload"])) for r in
                    db.execute("SELECT * FROM experiments WHERE user=? ORDER BY id DESC LIMIT 100", (user,))]

    def pause(self, user, paused):
        with self.connect() as db:
            self._ensure(db, user)
            db.execute("UPDATE accounts SET paused=? WHERE user=?", (int(paused), user))
            self._audit(db, user, {"type": "pause", "paused": paused})

    def _audit_valid(self, db, user):
        previous = "0" * 64
        for r in db.execute("SELECT * FROM audit WHERE user=? ORDER BY id", (user,)):
            digest = hashlib.sha256(canonical([user, r["created"], previous, r["event"]]).encode()).hexdigest()
            if r["previous"] != previous or r["hash"] != digest:
                return False
            previous = digest
        return True

    def audit_valid(self, user):
        with self.connect() as db:
            return self._audit_valid(db, user)

    def fill_buy(self, user, key, decision, market, guard):
        """Guard runs inside the same write transaction as cash reservation and fill.

        Used by paper broker only. Callers cannot supply balance, price or approval.
        """
        with self.connect() as db:
            self._ensure(db, user)
            if not self._audit_valid(db, user):
                raise ValueError("Audit integrity check failed")
            saved = db.execute("SELECT payload FROM decisions WHERE user=? AND id=?",
                               (user, decision.get("id"))).fetchone()
            if not saved:
                raise ValueError("Unknown decision")
            # Bind approval, sizing inputs and freshness to the tenant's persisted
            # record, never a caller-supplied copy of a forecasting decision.
            decision = json.loads(saved["payload"])
            if db.execute("SELECT 1 FROM orders WHERE user=? AND (key=? OR decision=?)", (user, key, decision["id"])).fetchone():
                raise ValueError("Duplicate order rejected")
            created = decision.get("created_at")
            now = time.time()
            if (isinstance(created, bool) or not isinstance(created, (int, float))
                    or not math.isfinite(created) or not 0 <= now - created <= 30):
                raise ValueError("Decision expired")
            if db.execute("SELECT 1 FROM positions WHERE user=? AND product=?", (user, decision["product"])).fetchone():
                raise ValueError("Existing position; pyramiding disabled")
            portfolio = self._snapshot(db, user, {decision["product"]: market["price"]})
            if portfolio["valuation"] != "MARKED":
                raise ValueError("Missing marks for existing exposure")
            risk = guard(decision["proposal"], portfolio, market)
            if not risk["allowed"]:
                self._audit(db, user, {"type": "order_rejected", "reasons": risk["reasons"]})
                return {"status": "REJECTED", "risk": risk}
            quantity = risk["quantity"]
            price = market["ask"] * 1.0002
            fee = quantity * price * .006
            cost = quantity * price + fee
            if not all(math.isfinite(v) and v > 0 for v in (quantity, price, cost)) or cost > portfolio["cash"]:
                raise ValueError("Insufficient paper funds or invalid execution")
            db.execute("UPDATE accounts SET cash=cash-?,fees=fees+? WHERE user=?", (cost, fee, user))
            db.execute("INSERT INTO positions VALUES(?,?,?,?,?,?)", (user, decision["product"], quantity, cost,
                       risk["stop_price"], time.time() + decision["horizon"] * 3600))
            db.execute("INSERT INTO orders(user,key,decision,product,side,quantity,price,fee,created) VALUES(?,?,?,?,?,?,?,?,?)",
                       (user, key, decision["id"], decision["product"], "BUY", quantity, price, fee, time.time()))
            self._audit(db, user, {"type": "paper_fill", "decision": decision["id"], "quantity": quantity, "price": price, "fee": fee})
            return {"status": "FILLED", "mode": "paper", "quantity": quantity, "price": price, "fee": fee}

    def reconcile(self, user, product, market, *, now=None):
        now = time.time() if now is None else now
        try:
            values = [market[k] for k in ("bid", "ask", "price", "observed_at")] + [now]
            if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)
                   for v in values):
                raise ValueError("Invalid exit quote")
            if (market.get("feed_ok") is not True or not 0 <= now - market["observed_at"] <= 30
                    or min(market["bid"], market["ask"], market["price"]) <= 0
                    or not market["bid"] <= market["price"] <= market["ask"]):
                raise ValueError("Fresh coherent market required for reconciliation")
        except (KeyError, TypeError):
            raise ValueError("Fresh coherent market required for reconciliation") from None
        with self.connect() as db:
            if not self._audit_valid(db, user):
                raise ValueError("Audit integrity check failed")
            p = db.execute("SELECT * FROM positions WHERE user=? AND product=?", (user, product)).fetchone()
            if not p or (market["bid"] > p["stop"] and now < p["expires"]):
                return {"status": "NO_EXIT"}
            # Pause blocks new entries, never a protective simulated exit.
            price = market["bid"] * .9998
            fee = p["quantity"] * price * .006
            proceeds = p["quantity"] * price - fee
            pnl = proceeds - p["cost"]
            key = f"exit:{product}:{p['expires']}"
            self._snapshot(db, user, {product: market["price"]})
            db.execute("UPDATE accounts SET cash=cash+?,realized=realized+?,day_realized=day_realized+?,fees=fees+? WHERE user=?",
                       (proceeds, pnl, pnl, fee, user))
            db.execute("DELETE FROM positions WHERE user=? AND product=?", (user, product))
            db.execute("INSERT INTO orders(user,key,decision,product,side,quantity,price,fee,created) VALUES(?,?,?,?,?,?,?,?,?)",
                       (user, key, key, product, "SELL", p["quantity"], price, fee, now))
            self._audit(db, user, {"type": "paper_exit", "product": product, "pnl": pnl, "price": price})
            return {"status": "CLOSED", "realized_pnl": pnl}

    def open_accounts(self):
        with self.connect() as db:
            return [(r["user"], r["product"]) for r in db.execute("SELECT user,product FROM positions")]

    def anomaly(self, user):
        with self.connect() as db:
            self._ensure(db, user)
            db.execute("UPDATE accounts SET anomalies=anomalies+1 WHERE user=?", (user,))
            self._audit(db, user, {"type": "feed_or_execution_anomaly"})

"""Read-only connectors. Fixed hosts; external text never enters control flow."""
from __future__ import annotations

import json
import math
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from urllib.parse import quote

import httpx

PRODUCTS = frozenset({"BTC-USD", "ETH-USD"})
STEP = 3600


class DataUnavailable(ValueError):
    pass


def number(value, *, positive=False):
    if isinstance(value, bool):
        raise DataUnavailable("Boolean is not a market number")
    try:
        n = float(value)
    except (ValueError, TypeError, OverflowError):
        raise DataUnavailable("Missing or nonnumeric market field") from None
    if not math.isfinite(n) or (positive and n <= 0):
        raise DataUnavailable("Invalid market field")
    return n


def normalize(rows, *, now=None, step=STEP, latency=2):
    """Reject conflicts, gaps, malformed OHLCV; discard incomplete bars.

    Historical availability is assumed close+2s, NOT an archival arrival record.
    Ingestion time is captured separately. Point-in-time provenance is incomplete.
    """
    now = time.time() if now is None else now
    unique = {}
    for row in rows:
        start = number(row.get("start"))
        if start != int(start) or int(start) % step:
            raise DataUnavailable("Misaligned candle timestamp")
        if start + step + latency > now:
            continue
        bar = {k: number(row.get(k), positive=k != "volume")
               for k in ("open", "high", "low", "close", "volume")}
        if bar["volume"] < 0 or not (bar["low"] <= min(bar["open"], bar["close"]) <= max(bar["open"], bar["close"]) <= bar["high"]):
            raise DataUnavailable("Invalid candle range or volume")
        bar.update(start=int(start), available_at=int(start) + step + latency)
        if start in unique and unique[start] != bar:
            raise DataUnavailable("Conflicting duplicate candles")
        unique[start] = bar
    result = sorted(unique.values(), key=lambda r: r["start"])
    if not result or any(b["start"] - a["start"] != step for a, b in zip(result, result[1:])):
        raise DataUnavailable("Empty history or missing candles; no forward filling")
    return result


class PublicHTTP:
    def __init__(self, host, interval=0.25):
        self.host, self.interval = host, interval
        self._lock, self._last = Lock(), 0.0

    def get(self, path, params=None):
        with self._lock:
            wait = self.interval - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.monotonic()
            for attempt in range(3):
                try:
                    response = httpx.get(self.host + path, params=params, timeout=12,
                                         follow_redirects=False, headers={"User-Agent": "Skooby-OracleX/0.1"})
                    if response.status_code in (429, 502, 503, 504) and attempt < 2:
                        time.sleep(0.5 * 2 ** attempt)
                        continue
                    response.raise_for_status()
                    if len(response.content) > 5_000_000:
                        raise DataUnavailable("Oversized provider response")
                    return response.json()
                except (httpx.HTTPError, ValueError):
                    if attempt == 2:
                        raise DataUnavailable("Public data provider unavailable") from None
                    time.sleep(0.5 * 2 ** attempt)
        raise DataUnavailable("Public data provider unavailable")


class CoinbasePublic:
    source = "Coinbase Exchange public REST"

    def __init__(self):
        self.http = PublicHTTP("https://api.exchange.coinbase.com")

    def history(self, product, days=60):
        if product not in PRODUCTS or not 1 <= days <= 90:
            raise DataUnavailable("Unsupported product or lookback")
        end = int(time.time()) // STEP * STEP
        start = end - days * 24 * STEP
        rows = []
        for left in range(start, end, 299 * STEP):
            right = min(end, left + 299 * STEP)
            iso = lambda t: datetime.fromtimestamp(t, timezone.utc).isoformat()
            payload = self.http.get(f"/products/{product}/candles", {"granularity": STEP, "start": iso(left), "end": iso(right)})
            if not isinstance(payload, list):
                raise DataUnavailable("Unexpected candle schema")
            for r in payload:
                if not isinstance(r, list) or len(r) != 6:
                    raise DataUnavailable("Unexpected candle row")
                if start <= number(r[0]) < end:
                    rows.append(dict(zip(("start", "low", "high", "open", "close", "volume"), r)))
        result = normalize(rows)
        # The most recent closed bar needs a short finalization allowance.
        expected_last = end - STEP
        if time.time() - end < 2:
            expected_last -= STEP
        if result[0]["start"] != start or result[-1]["start"] != expected_last:
            raise DataUnavailable("Incomplete or stale history window")
        return result

    def book(self, product):
        if product not in PRODUCTS:
            raise DataUnavailable("Unsupported product")
        raw = self.http.get(f"/products/{product}/book", {"level": 2})
        def levels(key):
            out = []
            for row in raw.get(key, []):
                out.append({"price": number(row[0], positive=True), "size": number(row[1], positive=True)})
            if not out:
                raise DataUnavailable("Empty book")
            return out
        bids, asks = levels("bids"), levels("asks")
        bid, ask = max(r["price"] for r in bids), min(r["price"] for r in asks)
        if bid >= ask:
            raise DataUnavailable("Crossed order book")
        mid = (bid + ask) / 2
        depth = min(sum(r["price"] * r["size"] for r in bids if r["price"] >= mid * .999),
                    sum(r["price"] * r["size"] for r in asks if r["price"] <= mid * 1.001))
        return {"price": mid, "bid": bid, "ask": ask, "depth_usd": depth,
                "observed_at": time.time(), "feed_ok": True, "source": self.source,
                "timestamp_kind": "local_received_at; venue age not established", "bids": bids[:50], "asks": asks[:50]}

    def product(self, product):
        if product not in PRODUCTS:
            raise DataUnavailable("Unsupported product")
        raw = self.http.get(f"/products/{product}")
        if raw.get("status") != "online" or any(raw.get(k) for k in ("trading_disabled", "cancel_only", "post_only", "limit_only")):
            raise DataUnavailable("Product does not permit normal market trading")
        minimum = raw.get("min_market_funds")
        if minimum is None:
            # Unknown venue minimum is not silently defaulted to zero.
            raise DataUnavailable("Venue minimum order not available")
        return {"min_notional": number(minimum, positive=True), "base_increment": number(raw.get("base_increment"), positive=True)}


def captured_history(path: Path, product: str):
    payload = json.loads(path.read_text())
    rows = []
    for page in payload["pages"]:
        if page["request"]["product"] == product:
            if page["response"].get("truncated"):
                raise DataUnavailable("Truncated historical capture")
            rows.extend(page["response"].get("candles", []))
    captured = datetime.fromisoformat(payload["captured_at"].replace("Z", "+00:00")).timestamp()
    return normalize(rows, now=captured), payload["source"], captured


class DexScreener:
    """Discovery observations only; pair transactions are NOT unique traders."""
    def __init__(self):
        self.http = PublicHTTP("https://api.dexscreener.com", interval=1)

    def token(self, chain, address):
        if chain not in ("ethereum", "base", "solana") or not re.fullmatch(r"[A-Za-z0-9]{20,64}", address):
            raise DataUnavailable("Unsupported token identifier")
        data = self.http.get(f"/token-pairs/v1/{chain}/{quote(address, safe='')}")
        if not isinstance(data, list):
            raise DataUnavailable("Unexpected discovery schema")
        # All descriptive fields are omitted. Unknown security attributes stay unknown.
        result = []
        for pair in data[:20]:
            result.append({"chain": chain, "address": address, "pair": str(pair.get("pairAddress", ""))[:100],
                "liquidity_usd": (pair.get("liquidity") or {}).get("usd"), "market_cap": pair.get("marketCap"),
                "fdv": pair.get("fdv"), "volume_24h": (pair.get("volume") or {}).get("h24"),
                "created_at": pair.get("pairCreatedAt"), "unique_traders": None,
                "sellability": "UNKNOWN", "contract_permissions": "UNKNOWN", "decision": "NO TRADE",
                "reason": "Research only. DEX data does not establish sellability or safety.",
                "source": "DEX Screener", "observed_at": time.time()})
        return result

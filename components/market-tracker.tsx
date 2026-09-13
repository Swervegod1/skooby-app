'use client';

import { useEffect, useState } from 'react';

type MarketEntry = {
  usd?: number;
  usd_24h_change?: number;
  usd_market_cap?: number;
  last_updated_at?: number;
};

type MarketResponse = {
  provider?: string;
  fetchedAt?: string;
  data?: Record<string, MarketEntry>;
  error?: string;
};

const names: Record<string, { name: string; symbol: string }> = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
  ethereum: { name: 'Ethereum', symbol: 'ETH' },
  solana: { name: 'Solana', symbol: 'SOL' },
  'usd-coin': { name: 'USD Coin', symbol: 'USDC' },
  chainlink: { name: 'Chainlink', symbol: 'LINK' },
};

async function fetchMarket(): Promise<MarketResponse> {
  try {
    const response = await fetch('/api/market', { cache: 'no-store' });
    return await response.json();
  } catch {
    return { error: 'Unable to reach Skooby market feed.' };
  }
}

function money(value?: number) {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function compactMoney(value?: number) {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

export function MarketTracker() {
  const [payload, setPayload] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const next = await fetchMarket();
    setPayload(next);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    const load = async () => {
      const next = await fetchMarket();
      if (active) {
        setPayload(next);
        setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (loading && !payload) {
    return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60">Fetching live market trail…</div>;
  }

  if (payload?.error || !payload?.data) {
    return (
      <div className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
        <p className="font-black text-amber-200">Market feed temporarily unavailable</p>
        <p className="mt-2 text-white/60">{payload?.error ?? 'No data returned.'}</p>
        <button onClick={() => void refresh()} className="mt-5 rounded-full border border-white/15 px-5 py-2 text-sm font-bold">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-5">
        {Object.entries(payload.data).map(([id, entry]) => {
          const meta = names[id] ?? { name: id, symbol: id.toUpperCase() };
          const change = entry.usd_24h_change ?? 0;
          return (
            <article key={id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">{meta.name}</p>
                  <p className="text-xs font-bold text-white/35">{meta.symbol}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${change >= 0 ? 'bg-lime-300/10 text-lime-200' : 'bg-rose-400/10 text-rose-200'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </span>
              </div>
              <p className="mt-6 text-2xl font-black tracking-tight">{money(entry.usd)}</p>
              <p className="mt-2 text-xs text-white/40">MCap {compactMoney(entry.usd_market_cap)}</p>
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-5 py-4 text-xs text-white/40">
        <span>Provider: {payload.provider ?? 'market API'} · Auto-refreshes every 60s</span>
        <button onClick={() => void refresh()} disabled={loading} className="font-black text-lime-200 disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh now'}</button>
      </div>
    </div>
  );
}

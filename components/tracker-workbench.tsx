'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AddressGraph, type AddressGraphEdge, type AddressGraphNode } from '@/components/address-graph';
import type { MarketSnapshot } from '@/lib/market-data';

type Analysis = {
  chain: 'bitcoin' | 'ethereum';
  address: string;
  balance: number;
  unit: 'BTC' | 'ETH';
  transactionCount: number;
  provider: string;
  nodes: AddressGraphNode[];
  edges: AddressGraphEdge[];
};

const names: Record<string, { name: string; symbol: string }> = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
  ethereum: { name: 'Ethereum', symbol: 'ETH' },
  solana: { name: 'Solana', symbol: 'SOL' },
  'usd-coin': { name: 'USD Coin', symbol: 'USDC' },
  chainlink: { name: 'Chainlink', symbol: 'LINK' },
};

function money(value?: number) {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 4 : 2 }).format(value);
}

export function TrackerWorkbench({ market }: { market: MarketSnapshot | null }) {
  const [chain, setChain] = useState<'bitcoin' | 'ethereum'>('bitcoin');
  const [address, setAddress] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function investigate() {
    setLoading(true);
    setMessage(null);
    setAnalysis(null);
    try {
      const response = await fetch('/api/tracker/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, address: address.trim() }),
      });
      const payload = (await response.json()) as Analysis & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Address analysis failed.');
      setAnalysis(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Address analysis failed.');
    } finally {
      setLoading(false);
    }
  }

  async function saveCase() {
    if (!analysis) return;
    const response = await fetch('/api/casebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chain: analysis.chain, address: analysis.address, label: `${analysis.chain === 'bitcoin' ? 'BTC' : 'ETH'} investigation` }),
    });
    const payload = (await response.json()) as { error?: string };
    setMessage(response.ok ? 'Saved to your cloud casebook.' : payload.error || 'Sign in to save this investigation.');
  }

  async function createAlert() {
    if (!analysis) return;
    const response = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chain: analysis.chain, address: analysis.address }),
    });
    const payload = (await response.json()) as { error?: string };
    setMessage(response.ok ? 'Activity alert added to your account.' : payload.error || 'Sign in to create an alert.');
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {market ? Object.entries(market.data).map(([id, entry]) => {
          const meta = names[id] ?? { name: id, symbol: id.toUpperCase() };
          const change = entry.usd_24h_change ?? 0;
          return (
            <article key={id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-black">{meta.name}</p><p className="text-xs text-white/35">{meta.symbol}</p></div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${change >= 0 ? 'bg-lime-300/10 text-lime-200' : 'bg-rose-400/10 text-rose-200'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
              </div>
              <p className="mt-5 text-2xl font-black">{money(entry.usd)}</p>
            </article>
          );
        }) : <div className="md:col-span-2 xl:col-span-5 rounded-3xl border border-amber-300/15 bg-amber-300/[0.05] p-5 text-sm text-amber-100">Market cache is unavailable right now. Wallet investigations still work independently.</div>}
      </section>

      {market ? <p className="-mt-4 text-xs text-white/35">Server cache · {market.stale ? 'last good snapshot' : 'fresh snapshot'} · {new Date(market.fetchedAt).toLocaleString()}</p> : null}

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
          <label className="block lg:w-44">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Network</span>
            <select value={chain} onChange={(event) => setChain(event.target.value as 'bitcoin' | 'ethereum')} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d1914] px-4 py-3 font-bold outline-none">
              <option value="bitcoin">Bitcoin</option>
              <option value="ethereum">Ethereum</option>
            </select>
          </label>
          <label className="block flex-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Wallet address</span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void investigate(); }} placeholder={chain === 'bitcoin' ? 'bc1… or legacy BTC address' : '0x… Ethereum address'} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-sm outline-none focus:border-lime-300/40" />
          </label>
          <button type="button" onClick={() => void investigate()} disabled={loading || !address.trim()} className="rounded-2xl bg-lime-300 px-6 py-3.5 text-sm font-black text-black disabled:opacity-40">{loading ? 'Mapping…' : 'Map relationships'}</button>
        </div>
        {message ? <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">{message}</p> : null}
      </section>

      {analysis ? (
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] uppercase tracking-wider text-white/35">Balance</p><p className="mt-2 text-xl font-black">{analysis.balance.toLocaleString(undefined, { maximumFractionDigits: 8 })} {analysis.unit}</p></article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] uppercase tracking-wider text-white/35">Transactions</p><p className="mt-2 text-xl font-black">{analysis.transactionCount.toLocaleString()}</p></article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] uppercase tracking-wider text-white/35">Visible entities</p><p className="mt-2 text-xl font-black">{analysis.nodes.length}</p></article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] uppercase tracking-wider text-white/35">Provider</p><p className="mt-2 text-xl font-black">{analysis.provider}</p></article>
          </div>

          <AddressGraph nodes={analysis.nodes} edges={analysis.edges} />

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveCase()} className="rounded-full border border-lime-300/30 px-5 py-2.5 text-sm font-black text-lime-100">Save to cloud casebook</button>
            <button type="button" onClick={() => void createAlert()} className="rounded-full border border-fuchsia-200/30 px-5 py-2.5 text-sm font-black text-fuchsia-100">Create activity alert</button>
            <Link href="/account" className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-black text-white/60">Open command center</Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

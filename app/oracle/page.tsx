import type { Metadata } from 'next';
import Link from 'next/link';
import { getMarketSnapshot } from '@/lib/market-data';
import { buildResearchPayload } from '@/lib/oracle-v12';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Alpha Oracle V1.2 — Research Only',
  description: 'Read-only market evidence, drawdown safeguards, and missing-source diagnostics for Skooby.'
};

export default async function OraclePage() {
  const market = await getMarketSnapshot().catch(() => null);
  const research = buildResearchPayload({
    symbol: 'BTC',
    marketAsOf: market?.fetchedAt ?? new Date().toISOString(),
    evidence: market && !market.stale ? [{ family: 'spot', source: 'CoinGecko', observedAt: market.fetchedAt, status: 'VERIFIED' }] : [],
    portfolio: null,
  });
  return (
    <main className="min-h-screen bg-[#06100c] px-5 py-9 text-white">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-9 flex items-center justify-between gap-4">
          <Link href="/" className="font-black tracking-wide text-lime-300">SKOOBY.APP</Link>
          <Link href="/tracker" className="rounded-full border border-lime-300/30 px-4 py-2 text-xs font-bold text-lime-200">Live Tracker</Link>
        </nav>
        <div className="rounded-3xl border border-lime-300/20 bg-[#102116] p-7">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-lime-300">Trinity AI OS · Security first</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Alpha Oracle <span className="text-lime-300">V1.2</span></h1>
          <p className="mt-4 text-white/60">Research-only mode. Cross-platform evidence must be independently verified before any setup can qualify. Wallet signing and autonomous execution are disabled.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Decision', research.decision],
            ['Execution', 'DISABLED'],
            ['Evidence families', `${6 - research.reasons.filter(x => x.startsWith('MISSING_')).length} / 6`],
            ['Market provider', market?.provider ?? 'Unavailable'],
          ].map(([label, value]) => (
            <section key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs text-white/50">{label}</p><p className="mt-2 font-black text-lime-200">{value}</p>
            </section>
          ))}
        </div>
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-bold">Live public market reference</h2>
          <p className="mt-2 text-sm text-white/50">CoinGecko spot data, timestamped; prices are not executable quotes.</p>
          {market ? <p className="mt-2 text-xs text-white/50">Fetched: {market.fetchedAt} · {market.stale ? 'STALE' : 'FRESH'}</p> : null}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {['bitcoin', 'ethereum', 'solana'].map(id => <div key={id} className="rounded-xl bg-black/20 p-4">
              <p className="text-xs uppercase text-white/50">{id}</p>
              <p className="mt-2 text-xl font-black">{market?.data[id]?.usd != null ? `$${market.data[id].usd.toLocaleString('en-US')}` : 'Unavailable'}</p>
            </div>)}
          </div>
        </section>
        <section className="mt-5 rounded-3xl border border-rose-300/20 bg-rose-300/[0.03] p-6">
          <h2 className="text-xl font-bold">Mandatory validation gaps</h2>
          <p className="mt-2 text-sm text-white/60">No data was fabricated to satisfy the trade-report schema.</p>
          <div className="mt-4 flex flex-wrap gap-2">{research.reasons.map(reason => <code key={reason} className="rounded-full border border-white/10 px-3 py-2 text-xs text-rose-200">{reason}</code>)}</div>
        </section>
        <p className="mt-6 text-xs text-white/40">This Oracle is an informational research system, not a broker, automated trading client, or guaranteed prediction service.</p>
      </div>
    </main>
  );
}

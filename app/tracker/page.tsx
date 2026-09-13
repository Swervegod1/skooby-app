import type { Metadata } from 'next';
import Link from 'next/link';
import { TrackerWorkbench } from '@/components/tracker-workbench';
import { getMarketSnapshot } from '@/lib/market-data';

export const metadata: Metadata = {
  title: 'Crypto Tracker | Skooby',
  description: 'Server-cached market data, wallet relationship graphs, cloud casebooks, and activity monitoring.',
};

export default async function TrackerPage() {
  const market = await getMarketSnapshot().catch(() => null);

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(34,197,94,0.12),transparent_26%),radial-gradient(circle_at_10%_35%,rgba(217,70,239,0.08),transparent_24%)]" />
      <nav className="relative mx-auto flex max-w-[1500px] items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <div className="flex items-center gap-5 text-sm font-bold text-white/55">
          <Link href="/learn" className="hover:text-white">Learn</Link>
          <Link href="/account" className="hover:text-white">Account</Link>
          <Link href="/wallet" className="hover:text-white">Wallet</Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-[1500px] px-6 pb-24 pt-10">
        <div className="max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Wallet Intelligence Command Center</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-7xl">Markets on top. Relationships underneath.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/55">Market pricing is fetched once on the server and reused from cache. Address investigations render connected-wallet graphs, while signed-in users can sync cases and monitoring across devices.</p>
        </div>
        <div className="mt-10"><TrackerWorkbench market={market} /></div>
      </section>
    </main>
  );
}

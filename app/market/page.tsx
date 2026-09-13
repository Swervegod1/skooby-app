import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketTracker } from '@/components/market-tracker';

export const metadata: Metadata = {
  title: 'Crypto Market Tracker',
  description: 'Track major crypto prices and 24-hour moves with Skooby.app.',
};

export default function MarketPage() {
  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(34,197,94,0.12),transparent_28%)]" />
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <div className="flex items-center gap-5 text-sm font-bold text-white/55">
          <Link href="/wallet" className="hover:text-white">Wallet</Link>
          <Link href="/casino" className="hover:text-white">Casino demo</Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-14">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Market tracker</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-0.05em] sm:text-7xl">See the market without the noise.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">Live USD pricing, market caps, and 24-hour movement for major assets. The feed is proxied server-side so provider details can evolve without rewriting the client.</p>
        <div className="mt-10"><MarketTracker /></div>
      </section>
    </main>
  );
}

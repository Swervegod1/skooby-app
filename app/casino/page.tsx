import type { Metadata } from 'next';
import Link from 'next/link';
import { CasinoHub } from '@/components/casino-hub';

export const metadata: Metadata = {
  title: 'Skooby Game Hub | Web3 Casino Simulation',
  description: 'Play-credit casino simulations for Slots, Blackjack, Roulette, Crash, Dice, Baccarat, and Poker with Skooby wallet authentication.',
};

export default function CasinoPage() {
  return (
    <main className="min-h-screen bg-[#050b08] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(217,70,239,0.12),transparent_30%),radial-gradient(circle_at_10%_15%,rgba(163,230,53,0.10),transparent_26%)]" />
      <nav className="relative mx-auto flex max-w-[1500px] items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <div className="flex items-center gap-5 text-sm font-bold text-white/55">
          <Link href="/wallet" className="transition hover:text-white">Wallet</Link>
          <Link href="/market" className="transition hover:text-white">Market</Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-[1500px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-10 max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-200">Skooby Web3 Game Hub</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-7xl">Seven casino-style games. One Skooby gateway.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/55">Skooby now uses a sandbox provider layer modeled on the referenced Web3 casino API contract while keeping Privy authentication and the existing wallet stack intact. Play credits have no cash value.</p>
        </div>
        <CasinoHub />
      </section>
    </main>
  );
}

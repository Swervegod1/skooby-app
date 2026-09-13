import type { Metadata } from 'next';
import Link from 'next/link';
import { CasinoHub } from '@/components/casino-hub';

export const metadata: Metadata = {
  title: 'Casino Integration Hub',
  description: 'Skooby casino integration shell with isolated game-provider architecture and safety boundaries.',
};

export default function CasinoPage() {
  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(232,121,249,0.12),transparent_28%),radial-gradient(circle_at_15%_20%,rgba(163,230,53,0.08),transparent_24%)]" />
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <div className="flex items-center gap-5 text-sm font-bold text-white/55">
          <Link href="/wallet" className="hover:text-white">Wallet</Link>
          <Link href="/market" className="hover:text-white">Market</Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-14">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-200">Casino integration</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-black tracking-[-0.05em] sm:text-7xl">A modern game hub, isolated from the rest of Skooby.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/60">This route establishes the game catalog and provider boundary inspired by the external casino project you referenced, without copying its unlicensed top-level code or enabling real-money wagering.</p>
        <div className="mt-10"><CasinoHub /></div>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { CasinoHub } from '@/components/casino-hub';

export const metadata: Metadata = {
  title: 'Skooby Game Hub | Web3 Casino Simulation',
  description: 'Play-credit casino simulations for Slots, Blackjack, Roulette, Crash, Dice, Baccarat, and Poker with Skooby wallet authentication.',
};

export default function CasinoPage() {
  const providerUrl = process.env.CASINO_PUBLIC_LAUNCH_URL;
  const providerName = process.env.CASINO_PROVIDER_NAME || 'External casino provider';

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
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/55">Skooby keeps Privy authentication and the existing wallet stack intact while separating gameplay from any external provider account or funding systems. Play credits inside Skooby have no cash value.</p>
        </div>

        {providerUrl ? (
          <div className="mb-8 rounded-[2rem] border border-lime-300/15 bg-lime-300/[0.05] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-200">Provider handoff</p>
              <h2 className="mt-2 text-2xl font-black">Continue with {providerName}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">Skooby does not process provider deposits, withdrawals, custody, payouts, or regulated gaming transactions. Those functions, if offered, stay entirely on the provider&apos;s own service and terms.</p>
            </div>
            <a
              href={providerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex shrink-0 items-center justify-center rounded-full bg-lime-300 px-6 py-3 text-sm font-black text-black transition hover:bg-lime-200 sm:mt-0"
            >
              Open provider
            </a>
          </div>
        ) : null}

        <CasinoHub />
      </section>
    </main>
  );
}

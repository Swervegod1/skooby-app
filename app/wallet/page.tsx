import type { Metadata } from 'next';
import Link from 'next/link';
import { ConnectWallet } from '@/components/connect-wallet';
import { WalletDashboard } from '@/components/wallet-dashboard';

export const metadata: Metadata = {
  title: 'Wallet Intelligence',
  description: 'Connect a wallet and inspect Base network identity and balance data with Skooby.app.',
};

export default function WalletPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(163,230,53,0.13),transparent_30%)]" />
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <div className="flex items-center gap-3">
          <Link href="/market" className="hidden text-sm font-bold text-white/55 hover:text-white sm:block">Market</Link>
          <Link href="/casino" className="hidden text-sm font-bold text-white/55 hover:text-white sm:block">Casino demo</Link>
          <ConnectWallet />
        </div>
      </nav>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-14">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Wallet intelligence</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-0.05em] sm:text-7xl">Your wallet, translated into human.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">Connect through Privy to inspect live wallet identity and Base network balance data. Skooby never needs your seed phrase.</p>

        <div className="mt-10">
          {configured ? (
            <WalletDashboard />
          ) : (
            <div className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
              <p className="font-black text-amber-200">Privy configuration required</p>
              <p className="mt-2 leading-7 text-white/60">Add <code className="rounded bg-black/30 px-2 py-1">NEXT_PUBLIC_PRIVY_APP_ID</code> to the deployment environment. The application intentionally does not store a Privy app secret in GitHub.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

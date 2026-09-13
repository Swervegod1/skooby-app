import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { CasinoHub } from '@/components/casino-hub';
import { ProviderLaunchButton } from '@/components/provider-launch-button';
import { getBrandConfig } from '@/lib/brand-config';

export const metadata: Metadata = {
  title: 'Skooby Game Hub | Secure Play-Credit Games',
  description: 'Server-authoritative play-credit games with verified sessions, provider health checks, and fairness tools.',
};

type CasinoPageProps = {
  searchParams: Promise<{ provider_return?: string }>;
};

export default async function CasinoPage({ searchParams }: CasinoPageProps) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  const returnStatus = params.provider_return;
  const brand = getBrandConfig(requestHeaders.get('host'));

  return (
    <main className="min-h-screen bg-[#050b08] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(217,70,239,0.12),transparent_30%),radial-gradient(circle_at_10%_15%,rgba(163,230,53,0.10),transparent_26%)]" />
      <nav className="relative mx-auto flex max-w-[1500px] items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">{brand.logoText}</Link>
        <div className="flex items-center gap-5 text-sm font-bold text-white/55"><Link href="/wallet">Wallet</Link><Link href="/market">Market</Link></div>
      </nav>

      <section className="relative mx-auto max-w-[1500px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8 max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: brand.secondaryHex }}>{brand.productName} Secure Game Hub</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-7xl">Play-credit games with a real security boundary.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/55">Balances are authoritative on the server, Privy sessions are verified before game mutations and provider handoffs, and provider returns are matched with short-lived signed state.</p>
        </div>

        {returnStatus === 'verified' ? <div className="mb-6 rounded-2xl border border-lime-300/20 bg-lime-300/[0.06] p-4 text-sm text-lime-100">Provider return verified and matched to the originating Skooby session.</div> : null}
        {returnStatus === 'rejected' ? <div className="mb-6 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">Provider return was rejected because the signed state did not match the originating session.</div> : null}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6" style={{ boxShadow: `inset 0 0 0 1px ${brand.accentHex}22` }}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: brand.accentHex }}>Secure provider handoff</p>
            <h2 className="mt-2 text-2xl font-black">Verified session + allowlisted destination</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">The launch button disables itself when the provider is unavailable. Skooby validates the configured hostname and issues a five-minute signed return state before leaving the site.</p>
          </div>
          <div className="mt-5 shrink-0 sm:mt-0"><ProviderLaunchButton /></div>
        </div>

        <CasinoHub />
      </section>
    </main>
  );
}

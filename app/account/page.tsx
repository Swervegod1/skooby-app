import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountLogin, AccountSignOut } from '@/components/account-auth';
import { getServerSession } from '@/lib/auth-session';
import { getApiUsage, listAlerts, listCasebook } from '@/lib/cloud-store';

export const metadata: Metadata = {
  title: 'Account Command Center | Skooby',
  description: 'Manage your Skooby research history, wallet alerts, API usage, and subscription access.',
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await getServerSession();

  if (!session) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"><Link href="/" className="text-xl font-black">SKOOBY<span className="text-lime-300">.APP</span></Link><Link href="/tracker" className="text-sm font-black text-white/55">Tracker</Link></nav>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-16"><AccountLogin /></section>
      </main>
    );
  }

  let cloudAvailable = true;
  const [casebook, alerts, usage] = await Promise.all([
    listCasebook(session.userId).catch(() => { cloudAvailable = false; return []; }),
    listAlerts(session.userId).catch(() => { cloudAvailable = false; return []; }),
    getApiUsage(session.userId).catch(() => { cloudAvailable = false; return {}; }),
  ]);
  const walletAnalyses = usage.wallet_analysis ?? 0;
  const monthlyLimit = 250;
  const usagePercent = Math.min(100, Math.round((walletAnalyses / monthlyLimit) * 100));

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(163,230,53,0.10),transparent_25%),radial-gradient(circle_at_5%_25%,rgba(217,70,239,0.08),transparent_24%)]" />
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <div className="flex items-center gap-4"><Link href="/tracker" className="text-sm font-black text-white/55">Tracker</Link><AccountSignOut /></div>
      </nav>

      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Personal command center</p><h1 className="mt-4 text-5xl font-black tracking-[-0.05em] sm:text-6xl">Your Skooby research, synced.</h1><p className="mt-4 max-w-2xl leading-7 text-white/55">Recent investigations, wallet alerts, and usage are rendered from your secure server session instead of waiting on a client-side auth promise.</p></div>
          <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.06] px-5 py-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">Current plan</p><p className="mt-1 text-2xl font-black">Skooby Free</p></div>
        </div>

        {!cloudAvailable ? <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Cloud sync is not configured yet. Add the Redis environment variables to activate cross-device casebooks, alerts, and usage history.</div> : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Monthly wallet analyses</p>
            <p className="mt-3 text-4xl font-black">{walletAnalyses}<span className="text-lg text-white/35"> / {monthlyLimit}</span></p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime-300" style={{ width: `${usagePercent}%` }} /></div>
            <p className="mt-3 text-xs text-white/40">Free-tier usage meter. Higher limits can map directly to a future Pro/API subscription.</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Saved cases</p><p className="mt-3 text-4xl font-black">{casebook.length}</p><p className="mt-3 text-sm text-white/45">Cross-device investigations tied to your account.</p></article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Active alerts</p><p className="mt-3 text-4xl font-black">{alerts.filter((alert) => alert.enabled).length}</p><p className="mt-3 text-sm text-white/45">Saved public-wallet activity monitors.</p></article>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Recent investigations</p><h2 className="mt-2 text-2xl font-black">Cloud casebook</h2></div><Link href="/tracker" className="text-sm font-black text-lime-200">New investigation →</Link></div>
            <div className="mt-5 space-y-3">
              {casebook.slice(0, 8).map((entry) => <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-black uppercase text-white/35">{entry.chain}</span><span className="text-[10px] text-white/30">{new Date(entry.updatedAt).toLocaleString()}</span></div><p className="mt-2 font-black">{entry.label ?? 'Saved investigation'}</p><p className="mt-1 break-all font-mono text-xs text-white/45">{entry.address}</p></div>)}
              {!casebook.length ? <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/35">No saved investigations yet. Open the tracker and save an address to begin your casebook.</p> : null}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-lime-200">Wallet monitoring</p><h2 className="mt-2 text-2xl font-black">Active alerts</h2><div className="mt-4 space-y-3">{alerts.slice(0, 6).map((alert) => <div key={alert.id} className="rounded-2xl bg-black/20 p-4"><div className="flex justify-between gap-3"><span className="text-xs font-black uppercase text-white/35">{alert.chain}</span><span className="text-xs font-black text-lime-200">{alert.enabled ? 'Active' : 'Paused'}</span></div><p className="mt-2 break-all font-mono text-xs text-white/50">{alert.address}</p></div>)}{!alerts.length ? <p className="text-sm text-white/35">No saved wallet alerts yet.</p> : null}</div></section>

            <section className="rounded-[2rem] border border-fuchsia-200/15 bg-fuchsia-200/[0.04] p-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Skooby Pro foundation</p><h2 className="mt-2 text-2xl font-black">Ready for paid capability gates.</h2><p className="mt-3 text-sm leading-6 text-white/50">The account model now has the surfaces needed for higher API limits, deeper graph history, exports, and premium research modules without changing the core tracker workflow.</p></section>
          </div>
        </div>
      </section>
    </main>
  );
}

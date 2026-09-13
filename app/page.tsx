import Link from 'next/link';
import { ConnectWallet } from '@/components/connect-wallet';

const modules = [
  {
    title: 'Crypto Tracker',
    description: 'Server-cached market data, wallet relationship graphs, cloud casebooks, and account-linked activity monitoring.',
    href: '/tracker',
    eyebrow: 'INTELLIGENCE',
  },
  {
    title: 'Skooby Learn',
    description: 'Interactive Bitcoin and Ethereum lessons with live calculators, public-address tools, and visual transaction flows.',
    href: '/learn',
    eyebrow: 'INTERACTIVE',
  },
  {
    title: 'Account Command Center',
    description: 'Open your synced investigations, alerts, usage meter, and personalized Skooby launchpad.',
    href: '/account',
    eyebrow: 'CLOUD SYNC',
  },
  {
    title: 'Wallet Intelligence',
    description: 'Connect through Privy and inspect live Base wallet identity and native balance data.',
    href: '/wallet',
    eyebrow: 'LIVE WEB3',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07110d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(163,230,53,0.14),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.09),transparent_30%)]" />

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <div className="flex items-center gap-4">
          <div className="hidden gap-5 text-sm font-bold text-white/55 md:flex">
            <Link href="/tracker" className="hover:text-white">Tracker</Link>
            <Link href="/learn" className="hover:text-white">Learn</Link>
            <Link href="/account" className="hover:text-white">Account</Link>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-28">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-lime-200">Web3 intelligence without the detective board</div>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl lg:text-8xl">See the chain.<span className="block text-lime-300">Understand the trail.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65 sm:text-xl">Skooby turns crypto wallets, transactions, tokens, and on-chain activity into research tools that feel human instead of hexadecimal.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/tracker" className="rounded-full bg-lime-300 px-6 py-3.5 text-sm font-black text-black transition hover:scale-[1.02] hover:bg-lime-200">Open Crypto Tracker</Link>
            <Link href="/learn" className="rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">Learn interactively</Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Skooby signal</p><p className="mt-1 text-lg font-bold">Research stack</p></div>
              <span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-200">SERVER + WEB3</span>
            </div>
            <div className="space-y-3">
              {['Server-cached market radar', 'Wallet relationship graphs', 'Cloud casebooks + alerts', 'Interactive crypto education'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-lime-300 text-sm font-black text-black">{index + 1}</div>
                  <div className="min-w-0 flex-1"><p className="font-semibold">{item}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full w-[88%] rounded-full bg-lime-300" /></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <Link key={module.title} href={module.href} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:bg-white/[0.06]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-300/70">{module.eyebrow}</p>
              <h2 className="mt-5 text-xl font-black tracking-tight">{module.title}</h2>
              <p className="mt-3 leading-7 text-white/55">{module.description}</p>
              <p className="mt-6 text-sm font-black text-lime-200">Open module →</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-white/8 px-6 py-8 text-center text-sm text-white/40">Skooby.app · Web3 research tools that help you understand the trail.</footer>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { guideCategories, guides } from '@/lib/learn-content';

export const metadata: Metadata = {
  title: 'Learn Crypto | Skooby',
  description: 'Interactive Bitcoin, Ethereum, markets, workflow, and wallet safety guides with live tools and visual explanations.',
};

const difficultyClass = {
  Beginner: 'bg-lime-300/10 text-lime-200',
  Intermediate: 'bg-amber-300/10 text-amber-200',
  Advanced: 'bg-fuchsia-300/10 text-fuchsia-200',
};

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(163,230,53,0.10),transparent_26%),radial-gradient(circle_at_85%_10%,rgba(217,70,239,0.10),transparent_26%)]" />
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <div className="flex items-center gap-5 text-sm font-bold text-white/55"><Link href="/tracker">Tracker</Link><Link href="/account">Account</Link></div>
      </nav>

      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-12">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-200">Skooby Academy</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] sm:text-7xl">Learn it. Touch it. See it move.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/55">Guides pair clear explanations with calculators, public-address readers, and interactive transaction diagrams so every lesson has an immediate hands-on step.</p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {guideCategories.map((category) => <span key={category} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white/55">{category}</span>)}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {guides.map((guide) => (
            <Link key={guide.slug} href={`/learn/${guide.slug}`} className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-lime-300/20 hover:bg-white/[0.06]">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-white/45">{guide.category}</span>
                <span className={`rounded-full px-3 py-1.5 ${difficultyClass[guide.difficulty]}`}>{guide.difficulty}</span>
                <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-white/45">{guide.minutes} min</span>
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight group-hover:text-lime-200">{guide.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/50">{guide.description}</p>
              <div className="mt-6 text-sm font-black text-lime-200">Open interactive guide →</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

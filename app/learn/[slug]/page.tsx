import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LearnWidget } from '@/components/learn-widgets';
import { getGuide, guides } from '@/lib/learn-content';
import { getMarketSnapshot } from '@/lib/market-data';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return guide ? { title: `${guide.title} | Skooby Learn`, description: guide.description } : {};
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const market = guide.widget === 'gas' ? await getMarketSnapshot().catch(() => null) : null;
  const ethUsd = market?.data.ethereum?.usd;

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/learn" className="text-sm font-black text-white/55 hover:text-white">← All guides</Link>
        <Link href="/tracker" className="text-sm font-black text-lime-200">Open tracker</Link>
      </nav>
      <article className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
          <span className="rounded-full border border-white/10 px-3 py-1.5">{guide.category}</span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">{guide.difficulty}</span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">{guide.minutes} min read</span>
        </div>
        <h1 className="mt-6 text-5xl font-black tracking-[-0.05em] sm:text-7xl">{guide.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/55">{guide.description}</p>

        {guide.widget ? <div className="mt-10"><LearnWidget type={guide.widget} ethUsd={ethUsd} /></div> : null}

        <div className="mt-12 space-y-10">
          {guide.sections.map((section, index) => (
            <section key={section.heading} className="grid gap-4 border-t border-white/10 pt-8 md:grid-cols-[70px_1fr]">
              <div className="text-3xl font-black text-lime-300/40">0{index + 1}</div>
              <div><h2 className="text-2xl font-black">{section.heading}</h2><p className="mt-3 max-w-3xl text-base leading-8 text-white/55">{section.body}</p></div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}

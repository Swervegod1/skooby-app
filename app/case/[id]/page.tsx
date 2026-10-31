import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { CaseReport } from '@/components/case-report';
import { EventPing } from '@/components/event-ping';
import { readSharedReport } from '@/lib/share-store';
export const dynamic = 'force-dynamic';
const getReport = cache(async (id: string) => readSharedReport(id).catch(() => null));
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const report = await getReport(id);
  return { title: report ? report.analysis.unit + ' wallet case file' : 'Case unavailable', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer',
    ...(report ? { description: 'A limited, source-linked public-address snapshot captured ' + report.analysis.capturedAt.slice(0, 10) + '.',
      openGraph: { title: report.analysis.unit + ' wallet case file | Skooby', type: 'article', images: [{ url: '/case/' + id + '/image', width: 1200, height: 630, alt: 'Skooby wallet case snapshot' }] },
      twitter: { card: 'summary_large_image', images: ['/case/' + id + '/image'] } } : {}),
  };
}
export default async function SharedCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const report = await getReport(id);
  if (!report) notFound();
  return <main className="case-shell"><SiteHeader /><EventPing event="share_opened" /><section className="case-container case-tracker"><div className="case-shared-banner"><div><p className="case-eyebrow">SOMEONE FOLLOWED THE TRAIL</p><h1>A case worth a closer look.</h1><p>This is a saved snapshot, not live data. Link expires {new Date(report.expiresAt).toISOString().slice(0, 10)}.</p></div><Link className="case-button case-button-primary" href="/tracker?from=case">Investigate your own address →</Link></div><CaseReport analysis={report.analysis} shared /></section></main>;
}

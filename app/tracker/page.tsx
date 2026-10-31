import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { TrackerWorkbench } from '@/components/tracker-workbench';
import type { Chain } from '@/lib/wallet-analysis';
export const metadata: Metadata = {
  title: 'Wallet case builder',
  description: 'Inspect a public Bitcoin or Ethereum address, follow transaction evidence, and create a shareable case report. No wallet connection required.',
  alternates: { canonical: '/tracker' },
};
export default async function TrackerPage({ searchParams }: { searchParams: Promise<{ demo?: string; chain?: string; address?: string; from?: string }> }) {
  const params = await searchParams;
  const chain: Chain = params.chain === 'ethereum' ? 'ethereum' : 'bitcoin';
  return <main className="case-shell"><SiteHeader /><section className="case-container case-tracker"><div className="case-tracker-heading"><p className="case-eyebrow">THE CASE BUILDER</p><h1>Follow the trail.</h1><p>One public address. A readable snapshot. Every claim connected to its source.</p></div><TrackerWorkbench initialDemo={params.demo === '1'} initialChain={chain} initialAddress={typeof params.address === 'string' ? params.address.slice(0, 100) : ''} referred={params.from === 'case'} /></section></main>;
}


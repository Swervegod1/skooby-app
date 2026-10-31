import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SharedLinks } from '@/components/shared-links';
export const metadata: Metadata = { title: 'Manage shared links', robots: { index: false, follow: false } };
export default function LinksPage() { return <main className="case-shell"><SiteHeader /><section className="case-container case-tracker"><div className="case-tracker-heading"><p className="case-eyebrow">SHARING CONTROLS</p><h1>Your links. Your choice.</h1></div><SharedLinks /></section></main>; }

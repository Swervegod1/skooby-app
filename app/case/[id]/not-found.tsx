import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
export default function CaseNotFound() {
  return <main className="case-shell"><SiteHeader /><section className="case-container case-empty"><p className="case-eyebrow">CASE UNAVAILABLE</p><h1>This trail isn’t available.</h1><p>The link may have expired, been removed, or be temporarily unavailable.</p><Link className="case-button case-button-primary" href="/tracker">Open a new case →</Link></section></main>;
}

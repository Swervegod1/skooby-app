import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="case-header">
      <Link href="/" className="case-brand" aria-label="Skooby home"><span className="case-brand-icon" aria-hidden="true">S</span>SKOOBY<span className="case-brand-dot">.</span></Link>
      <nav aria-label="Main navigation" className="case-nav"><Link href="/tracker">Investigate</Link><Link href="/learn">Learn</Link><Link href="/account">My cases</Link></nav>
    </header>
  );
}

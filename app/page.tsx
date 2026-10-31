import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: { absolute: 'Skooby — Follow the blockchain trail' },
  description: 'Turn a public Bitcoin or Ethereum address into a readable case file: transaction maps, source-linked evidence and shareable cards. No wallet connection required.',
  alternates: { canonical: '/' },
};
const questions = [
  ['Do I need to connect my wallet?', 'No. Paste a public Bitcoin or Ethereum address. The case builder is read-only and never requests a signature or seed phrase.'],
  ['What does a case report prove?', 'It shows activity returned by a data provider at the time of capture. It does not establish who owns an address, why a transaction happened, or whether an investment is safe.'],
  ['Is this a complete transaction history?', 'No. Quick reports examine up to 14 recent transactions and show up to 6 on the map. Every report explains its sample and data source.'],
  ['What happens when I share a case?', 'You explicitly choose to create an unlisted snapshot link. Anyone with the link can view it. Links expire after seven days; removal controls remain in the browser tab that created them.'],
];
export default function Home() {
  const structured = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Skooby', url: 'https://skooby.app', applicationCategory: 'FinanceApplication', operatingSystem: 'Web', description: 'Read-only Bitcoin and Ethereum public-address research with source-linked case reports.' };
  return <main className="case-shell">
    <SiteHeader />
    <section className="case-hero case-container">
      <div className="case-hero-copy"><p className="case-eyebrow"><span className="case-live-dot" /> YOUR BLOCKCHAIN DETECTIVE</p><h1>A wallet address.<br />A trail worth<br /><em>understanding.</em></h1><p className="case-lede">Turn public blockchain activity into a case you can actually read. Follow transactions, inspect the evidence, and share what you found.</p><div className="case-actions"><Link href="/tracker" className="case-button case-button-primary">Open your first case →</Link><Link href="/tracker?demo=1" className="case-button">Explore the demo ↗</Link></div><p className="case-hero-note">BITCOIN + ETHEREUM <span>·</span> NO WALLET CONNECTION</p></div>
      <div className="case-hero-art" aria-label="Illustrated sample of a fictional wallet case">
        <div className="case-demo-top"><span>CASE FILE / 001</span><span className="case-tag">FICTIONAL DEMO</span></div>
        <div className="case-demo-title">The trail is in the transactions.<span>Start connecting the dots.</span></div>
        <svg viewBox="0 0 440 280" role="img" aria-label="Fictional transaction diagram: two inputs enter a transaction and branch to a focus wallet and change">
          <defs><pattern id="case-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#304334" /></pattern></defs><rect width="440" height="280" fill="url(#case-grid)" />
          <path d="M80 65 L210 140 L355 95 M80 215 L210 140 L355 215" fill="none" stroke="#89af62" strokeWidth="2" />
          <circle cx="80" cy="65" r="25" fill="#213326" stroke="#789671" /><circle cx="80" cy="215" r="25" fill="#213326" stroke="#789671" />
          <rect x="182" y="112" width="56" height="56" rx="14" fill="#d7efb7" /><circle cx="355" cy="95" r="34" fill="#c5f773" /><circle cx="355" cy="215" r="25" fill="#213326" stroke="#789671" />
          <g fontFamily="monospace" fontSize="11" textAnchor="middle" fill="#d8e6d4"><text x="80" y="70">IN A</text><text x="80" y="220">IN B</text><text x="210" y="145" fill="#101512">TX</text><text x="355" y="100" fill="#101512">FOCUS</text><text x="355" y="220">CHANGE</text></g>
        </svg>
        <div className="case-demo-receipt"><span className="case-eyebrow">THE IMPORTANT DETAIL</span><p>Two inputs. One transaction.<br />No invented ownership story.</p><Link href="/tracker?demo=1">Inspect the sample evidence →</Link></div>
        <div className="case-demo-bottom"><span>OBSERVE. VERIFY. UNDERSTAND.</span><span>SKOOBY.</span></div>
      </div>
    </section>
    <section className="case-how case-container" aria-labelledby="case-how-title"><div className="case-section-intro"><p className="case-eyebrow">LESS NOISE. MORE CONTEXT.</p><h2 id="case-how-title">From an address<br />to an understandable case.</h2></div><div className="case-steps">{[
      ['01', 'Open a case', 'Paste a public address. No sign-in, wallet signature or complicated dashboard.'],
      ['02', 'Follow the evidence', 'See transactions, readable summaries and receipts linked to the original explorer.'],
      ['03', 'Share the picture', 'Download a case card or deliberately create an expiring report link.'],
    ].map(([number, title, text]) => <article key={number}><span className="case-step-number">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="case-principle case-container"><p className="case-eyebrow">BUILT FOR CURIOSITY. GROUNDED IN EVIDENCE.</p><h2>Connections are visible.<br /><span>Ownership isn’t assumed.</span></h2><p>Every case names its source, capture time and coverage. Bitcoin inputs stay connected to their transaction, so a shared input never becomes an unsupported accusation.</p><Link href="/learn" className="case-inline-link">Learn how to read the chain →</Link></section>
    <section className="case-faq case-container" aria-labelledby="case-faq-title"><div><p className="case-eyebrow">BEFORE YOU FOLLOW THE TRAIL</p><h2 id="case-faq-title">A few good questions.</h2></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="case-final-cta case-container"><h2>Find the story in the data.</h2><Link href="/tracker" className="case-button case-button-primary">Start an investigation →</Link></section>
    <footer className="case-footer case-container"><Link href="/" className="case-brand">SKOOBY.</Link><p>Public data. Clear context. Your curiosity.</p><div><Link href="/privacy">Privacy</Link><Link href="/shared-links">Shared links</Link><a href="https://github.com/Swervegod1/skooby-app" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
  </main>;
}


'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AddressGraph } from './address-graph';
import { downloadCaseCard } from '@/lib/case-card';
import { explorerUrl, formatAtomic, shortAddress, type WalletAnalysis } from '@/lib/wallet-analysis';
import { trackEvent } from './event-ping';
import { forgetShare, rememberShare } from './shared-links';

export function CaseReport({ analysis, shared = false }: { analysis: WalletAnalysis; shared?: boolean }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [link, setLink] = useState<{ id: string; url: string; revokeToken: string; expiresAt: string } | null>(null);
  async function download() {
    try { await downloadCaseCard(analysis); trackEvent('card_downloaded'); setStatus('Case card downloaded.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to download this card.'); }
  }
  async function createLink() {
    setBusy(true); setStatus('');
    try {
      const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chain: analysis.chain, address: analysis.address, consent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create a share link.');
      const value = { ...data, url: window.location.origin + data.path };
      rememberShare(value); setLink(value); setStatus('Share link created from a fresh provider snapshot.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to create a share link.'); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(link?.url || window.location.href); setStatus('Link copied.'); }
    catch { setStatus('Copy the link from the text field or your browser address bar.'); }
  }
  async function nativeShare() {
    try { await navigator.share({ title: 'A Skooby wallet case file', text: 'A source-linked snapshot of public blockchain activity.', url: link?.url || window.location.href }); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setStatus('Sharing is unavailable. Use Copy link instead.'); }
  }
  async function revoke() {
    if (!link) return;
    setBusy(true);
    try {
      const response = await fetch('/api/reports/' + link.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: link.revokeToken }) });
      if (!response.ok) throw new Error('The link could not be removed.');
      forgetShare(link.id); setLink(null); setConsent(false); setStatus('Shared link removed.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'The link could not be removed.'); }
    finally { setBusy(false); }
  }
  async function saveCase() {
    setBusy(true); setStatus('');
    try {
      const response = await fetch('/api/casebook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chain: analysis.chain, address: analysis.address, label: analysis.unit + ' case file' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Sign in through My cases to save this address.' : data.error || 'Unable to save this case.');
      setStatus('Address saved to your private casebook.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to save this case.'); }
    finally { setBusy(false); }
  }
  return <article className="case-report" aria-label="Wallet case report">
    <div className="case-result-heading"><div><p className="case-eyebrow">{analysis.demo ? 'DEMO / FICTIONAL ACTIVITY' : 'CASE FILE / PUBLIC ADDRESS'}</p><h2>{analysis.demo ? 'A small trail. A clearer picture.' : analysis.unit + ' wallet snapshot'}</h2><p className="case-mono case-break">{analysis.address}</p></div><span className="case-status">{analysis.demo ? 'Sample case' : 'Provider snapshot'}</span></div>
    {analysis.demo && <p className="case-notice">This is a synthetic demonstration. Values and transactions are fictional.</p>}
    <div className="case-stat-grid"><div><span>Balance at capture</span><strong className="case-balance">{analysis.balance} <small>{analysis.unit}</small></strong></div><div><span>Transactions sampled</span><strong>{analysis.coverage.sampledTransactions}<small> / {analysis.transactionCount} reported</small></strong></div><div><span>Data source</span><strong className="case-source">{analysis.provider}</strong><span>{new Date(analysis.capturedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</span></div></div>
    <section className="case-summary"><p className="case-eyebrow">WHAT THE DATA SAYS</p><ol>{analysis.summary.map(item => <li key={item}>{item}</li>)}</ol></section>
    <AddressGraph nodes={analysis.nodes} edges={analysis.edges} chain={analysis.chain} demo={analysis.demo} />
    <details className="case-evidence" open><summary>Transaction receipts <span>{analysis.transactions.length} in this sample</span></summary><div className="case-table-scroll"><table><caption className="sr-only">Observed transactions and the focus address&apos;s net change</caption><thead><tr><th scope="col">Transaction</th><th scope="col">State</th><th scope="col">Net change for this address</th></tr></thead><tbody>{analysis.transactions.map(tx => <tr key={tx.id}><td>{analysis.demo ? <span className="case-mono">{shortAddress(tx.id)}</span> : <a className="case-mono" href={explorerUrl(analysis.chain, tx.id, 'tx')} target="_blank" rel="noopener noreferrer">{shortAddress(tx.id)} ↗</a>}<small>{tx.timestamp ? new Date(tx.timestamp).toISOString().slice(0, 10) : 'Time unavailable'}</small></td><td>{tx.confirmed ? 'Confirmed' : 'Unconfirmed'}</td><td className="case-mono">{formatAtomic(tx.netAtomic, analysis.chain)} {analysis.unit}</td></tr>)}</tbody></table></div>{!analysis.transactions.length && <p className="case-muted">No usable transactions were returned in this provider sample.</p>}</details>
    <section className="case-limitations"><h3>Read this with the evidence</h3><ul>{analysis.limitations.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section className="case-share" aria-label="Share or save this case"><div><p className="case-eyebrow">MAKE THE TRAIL UNDERSTANDABLE</p><h3>Take the case with you.</h3><p className="case-muted">Download a 1080 × 1350 card. Your saved casebook stays private.</p></div><div className="case-actions"><button className="case-button case-button-primary" onClick={() => void download()}>Download case card ↓</button>{!analysis.demo && !shared && <button className="case-button" disabled={busy} onClick={() => void saveCase()}>Save address privately</button>}{(shared || link) && <><button className="case-button" onClick={() => void copyLink()}>Copy link</button><button className="case-button" onClick={() => void nativeShare()}>Share…</button></>}</div>
      {!analysis.demo && !shared && !link && <div className="case-consent"><label><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I want to share this address and its snapshot with anyone who has the link.</label><p className="case-muted">Sharing refreshes the data. The unlisted link expires in seven days and can be removed from this tab.</p><button className="case-button" disabled={!consent || busy} onClick={() => void createLink()}>{busy ? 'Preparing…' : 'Create share link ↗'}</button></div>}
      {link && <div className="case-created-link"><label className="case-label" htmlFor="created-share-link">Your unlisted report link</label><input id="created-share-link" readOnly value={link.url} onFocus={event => event.target.select()} /><p className="case-muted">Expires {new Date(link.expiresAt).toLocaleDateString()}. <Link href="/shared-links">Manage links from this tab</Link></p><button className="case-button case-button-small" disabled={busy} onClick={() => void revoke()}>Remove shared link</button></div>}
      <p className="case-feedback" role="status" aria-live="polite">{status}</p>
      {analysis.demo && <Link className="case-inline-link" href="/tracker">Ready for a real address? Open your own case →</Link>}
    </section>
  </article>;
}

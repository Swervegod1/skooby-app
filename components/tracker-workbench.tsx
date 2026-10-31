'use client';
import { useState, type FormEvent } from 'react';
import { CaseReport } from './case-report';
import { demoCase } from '@/lib/demo-case';
import { parseWalletInput, type Chain, type WalletAnalysis } from '@/lib/wallet-analysis';
import { EventPing, trackEvent } from './event-ping';

export function TrackerWorkbench({ initialDemo = false, initialChain = 'bitcoin', initialAddress = '', referred = false }: { initialDemo?: boolean; initialChain?: Chain; initialAddress?: string; referred?: boolean }) {
  const [chain, setChain] = useState<Chain>(initialChain);
  const [address, setAddress] = useState(initialAddress);
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(initialDemo ? demoCase() : null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  async function investigate(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setMessage('');
    let input;
    try { input = parseWalletInput({ chain, address }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Enter a public address.'); return; }
    setLoading(true); setAnalysis(null);
    try {
      const response = await fetch('/api/tracker/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(25000) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to inspect this address.');
      setAnalysis(payload as WalletAnalysis);
      if (referred) trackEvent('referral_started');
    } catch (error) { setMessage(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'The data provider took too long. Please try again.'); }
    finally { setLoading(false); }
  }
  function showDemo() { setAnalysis(demoCase()); setMessage(''); trackEvent('demo_opened'); }
  return <div className="case-workbench">
    {initialDemo && <EventPing event="demo_opened" />}
    <form className="case-search" onSubmit={event => void investigate(event)} aria-busy={loading}>
      <div className="case-form-grid"><label><span className="case-label">Network</span><select value={chain} disabled={loading} onChange={event => setChain(event.target.value as Chain)}><option value="bitcoin">Bitcoin</option><option value="ethereum">Ethereum</option></select></label><label className="case-address-input"><span className="case-label">Public wallet address</span><input value={address} disabled={loading} onChange={event => setAddress(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={chain === 'bitcoin' ? 'bc1… or a legacy Bitcoin address' : '0x… Ethereum address'} maxLength={100} aria-describedby="address-help" /></label><button className="case-button case-button-primary" disabled={loading || !address.trim()}>{loading ? 'Following the trail…' : 'Open case →'}</button></div>
      <div className="case-form-footer"><p id="address-help">Read-only research. No wallet connection or signature required.</p><button type="button" className="case-text-button" onClick={showDemo} disabled={loading}>Try the demo instead</button></div>
      {message && <p className="case-error" role="alert">{message}</p>}
    </form>
    {loading && <div className="case-loading" role="status"><span className="case-loading-dot" />Reading the provider and organizing transaction evidence…</div>}
    {analysis ? <CaseReport key={analysis.address + analysis.capturedAt} analysis={analysis} /> : !loading && <div className="case-empty"><span className="case-eyebrow">YOUR FIRST CASE</span><h2>Start with an address.<br />Leave with a clearer picture.</h2><p>Explore transaction connections, read a source-linked summary, and share a case card.</p><button className="case-button" onClick={showDemo}>Explore a sample case ↗</button></div>}
  </div>;
}


'use client';
import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
type LocalShare = { id: string; revokeToken: string; expiresAt: string };
const key = 'skooby:share-controls:v1';
function snapshot() { try { return sessionStorage.getItem(key) || '[]'; } catch { return '[]'; } }
function subscribe(callback: () => void) { window.addEventListener('skooby-shares', callback); return () => window.removeEventListener('skooby-shares', callback); }
function read(): LocalShare[] { try { return JSON.parse(snapshot()) as LocalShare[]; } catch { return []; } }
function write(values: LocalShare[]) { try { sessionStorage.setItem(key, JSON.stringify(values)); window.dispatchEvent(new Event('skooby-shares')); } catch { /* The immediate revoke button still works without browser storage. */ } }
export function rememberShare(value: LocalShare) { write([value, ...read()].slice(0, 25)); }
export function forgetShare(id: string) { write(read().filter(value => value.id !== id)); }
export function SharedLinks() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '[]');
  const links = useMemo(() => { try { return JSON.parse(raw) as LocalShare[]; } catch { return []; } }, [raw]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  async function revoke(link: LocalShare) {
    setBusy(link.id); setStatus('');
    try {
      const response = await fetch('/api/reports/' + link.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: link.revokeToken }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not remove this link.');
      forgetShare(link.id); setStatus('Shared link removed.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not remove this link.'); }
    finally { setBusy(null); }
  }
  return <section className="case-panel"><h2>Links created in this tab</h2><p className="case-muted">Removal controls stay in this browser tab. Every shared report expires after seven days.</p><div className="case-link-list">{links.map(link => <div key={link.id}><Link href={'/case/' + link.id} prefetch={false}>Open report · {link.id.slice(0, 6)}</Link><span className="case-muted">Expires {new Date(link.expiresAt).toLocaleDateString()}</span><button className="case-button case-button-small" disabled={busy !== null} onClick={() => void revoke(link)}>{busy === link.id ? 'Removing…' : 'Remove link'}</button></div>)}</div>{!links.length && <p className="case-muted">No shared links were created in this tab.</p>}<p role="status">{status}</p></section>;
}

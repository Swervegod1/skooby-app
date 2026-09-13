'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export function AccountLogin() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [error, setError] = useState<string | null>(null);
  const syncing = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || syncing.current) return;
    syncing.current = true;
    const sync = async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Unable to verify the signed-in session.');
        const response = await fetch('/api/session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error || 'Session synchronization failed.');
        window.location.reload();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Session synchronization failed.');
        syncing.current = false;
      }
    };
    void sync();
  }, [ready, authenticated, getAccessToken]);

  return (
    <section className="grid gap-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 lg:grid-cols-[1.2fr_.8fr] lg:p-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-200">Account access</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Your research command center starts here.</h1>
        <p className="mt-4 max-w-xl leading-7 text-white/55">Sign in with your configured Privy methods, including email or a supported wallet. After authentication, Skooby creates a secure HttpOnly server session so the page can render account state immediately on future visits.</p>
        {error ? <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-3 text-sm text-rose-100">{error}</p> : null}
        <button type="button" onClick={() => login()} disabled={!ready || authenticated} className="mt-6 rounded-full bg-lime-300 px-6 py-3 text-sm font-black text-black disabled:opacity-50">
          {!ready ? 'Preparing sign-in…' : authenticated ? 'Securing session…' : 'Sign in with email or wallet'}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {['Cloud-synced casebooks', 'Saved wallet activity alerts', 'Monthly API usage meter', 'Wallet-native identity'].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-bold text-white/70">✓ {item}</div>)}
      </div>
    </section>
  );
}

export function AccountSignOut() {
  const { logout } = usePrivy();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch('/api/session', { method: 'DELETE' }).catch(() => undefined);
    await logout().catch(() => undefined);
    window.location.reload();
  }

  return <button type="button" onClick={() => void signOut()} disabled={busy} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-black text-white/60 disabled:opacity-40">{busy ? 'Signing out…' : 'Sign out'}</button>;
}

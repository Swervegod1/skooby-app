'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export default function ProviderHandoff() {
  const { ready, authenticated, getAccessToken, user } = usePrivy();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setError('Sign in with Skooby before opening the provider.');
      return;
    }

    let cancelled = false;
    const launch = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error('Your Skooby session could not be verified.');

        const response = await fetch('/api/casino/handoff', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        const payload = (await response.json()) as { redirectUrl?: string; error?: string };
        if (!response.ok || !payload.redirectUrl) throw new Error(payload.error || 'Provider connection is unavailable.');
        if (!cancelled) window.location.replace(payload.redirectUrl);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Unable to connect to the provider.');
      }
    };

    void launch();
    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050b08] px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Connection Error</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <button type="button" onClick={() => window.location.assign('/casino')} className="mt-5 rounded-lg bg-lime-300 px-5 py-2.5 font-semibold text-black">Return to Casino</button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b08] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-lime-300" />
        <p className="font-medium">Validating your Skooby session…</p>
        <p className="mt-2 text-sm text-white/50">The provider URL and return state are being verified before transfer.</p>
        {user?.wallet?.address ? <p className="mx-auto mt-3 max-w-xs truncate text-[11px] text-white/30">Connected wallet: {user.wallet.address}</p> : null}
      </div>
    </main>
  );
}

'use client';

import { useEffect } from 'react';

export default function ProviderHandoff() {
  const providerUrl = process.env.NEXT_PUBLIC_CASINO_PROVIDER_URL;

  useEffect(() => {
    if (!providerUrl) return;
    window.location.replace(providerUrl);
  }, [providerUrl]);

  if (!providerUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050b08] px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Connection Error</h1>
          <p className="mt-2 text-sm text-white/50">Provider connection is currently unavailable.</p>
          <button
            type="button"
            onClick={() => window.location.assign('/casino')}
            className="mt-5 rounded-lg bg-lime-300 px-5 py-2.5 font-semibold text-black transition hover:bg-lime-200"
          >
            Return to Casino
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b08] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-lime-300" />
        <p className="font-medium">Transferring to secure provider...</p>
        <p className="mt-2 text-sm text-white/50">Please do not close this window.</p>
      </div>
    </main>
  );
}

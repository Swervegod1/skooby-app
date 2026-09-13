'use client';

import { useEffect, useState } from 'react';

export default function ProviderHandoff() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const providerUrl = process.env.NEXT_PUBLIC_CASINO_PROVIDER_URL;

    if (!providerUrl) {
      console.error('Configuration Error: Provider URL missing.');
      setError('Provider connection is currently unavailable.');
      return;
    }

    try {
      window.location.replace(providerUrl);
    } catch (err) {
      console.error('Provider redirect failed:', err);
      setError('Unable to connect to the provider.');
    }
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050b08] px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Connection Error</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-lime-300 px-5 py-2.5 font-semibold text-black transition hover:bg-lime-200"
          >
            Try Again
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

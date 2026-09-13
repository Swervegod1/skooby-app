'use client';

import { usePrivy } from '@privy-io/react-auth';

function ConfiguredConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <button className="rounded-full border border-white/15 px-5 py-3 text-sm text-white/60" disabled>
        Loading wallet…
      </button>
    );
  }

  if (authenticated) {
    return (
      <button
        onClick={() => void logout()}
        className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
        title={user?.wallet?.address ?? 'Connected'}
      >
        Disconnect
      </button>
    );
  }

  return (
    <button
      onClick={() => login()}
      className="rounded-full bg-lime-300 px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02] hover:bg-lime-200"
    >
      Connect with Skooby
    </button>
  );
}

export function ConnectWallet() {
  return <ConfiguredConnectButton />;
}

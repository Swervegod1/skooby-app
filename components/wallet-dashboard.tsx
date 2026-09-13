'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatUnits } from 'viem';

function shortAddress(address?: string) {
  if (!address) return 'Not connected';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletDashboard() {
  const { ready, authenticated, login, user } = usePrivy();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const balance = useBalance({ address });

  if (!ready) {
    return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60">Loading wallet intelligence…</div>;
  }

  if (!authenticated || !isConnected || !address) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-300">Wallet intelligence</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight">Connect to follow the trail.</h2>
        <p className="mt-3 max-w-xl leading-7 text-white/60">Sign in with Privy and Skooby will use your connected or embedded wallet to surface Base network balance and identity details.</p>
        <button onClick={() => login()} className="mt-6 rounded-full bg-lime-300 px-6 py-3 text-sm font-black text-black transition hover:bg-lime-200">Connect wallet</button>
      </div>
    );
  }

  const nativeBalance = balance.data
    ? Number(formatUnits(balance.data.value, balance.data.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })
    : '—';

  const cards = [
    { label: 'Wallet', value: shortAddress(address), detail: address },
    { label: 'Network', value: chainId === 8453 ? 'Base' : `Chain ${chainId}`, detail: 'Configured default: Base mainnet' },
    { label: 'Native balance', value: `${nativeBalance} ${balance.data?.symbol ?? 'ETH'}`, detail: balance.isFetching ? 'Refreshing…' : 'Live RPC read' },
    { label: 'Privy identity', value: user?.email?.address ?? 'Authenticated', detail: user?.wallet?.address ? `Embedded/linked: ${shortAddress(user.wallet.address)}` : 'Wallet linked through Privy' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{card.label}</p>
            <p className="mt-3 break-all text-xl font-black">{card.value}</p>
            <p className="mt-2 break-all text-sm leading-6 text-white/45">{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="rounded-3xl border border-lime-300/15 bg-lime-300/[0.05] p-6">
        <p className="text-sm font-black text-lime-200">Skooby signal</p>
        <p className="mt-2 leading-7 text-white/65">The wallet connection is live. This module is ready for token balances, transaction history, address labels, risk flags, and human-readable transaction summaries without ever asking for a seed phrase.</p>
      </div>
    </div>
  );
}

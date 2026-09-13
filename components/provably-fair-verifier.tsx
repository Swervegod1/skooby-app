'use client';

import { useState } from 'react';

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function ProvablyFairVerifier() {
  const [serverSeed, setServerSeed] = useState('');
  const [commitment, setCommitment] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState('0');
  const [result, setResult] = useState<{ seedHash: string; outcomeDigest: string; matches: boolean } | null>(null);

  async function verify() {
    const seedHash = await sha256(serverSeed);
    const outcomeDigest = await sha256(`${serverSeed}:${clientSeed}:${nonce}`);
    setResult({ seedHash, outcomeDigest, matches: seedHash.toLowerCase() === commitment.trim().toLowerCase() });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">Provably fair verifier</p>
      <p className="mt-2 text-xs leading-5 text-white/45">Verify a provider&apos;s revealed server seed against its pre-round SHA-256 commitment. The outcome digest is calculated locally in your browser.</p>
      <div className="mt-4 space-y-3">
        <input value={commitment} onChange={(event) => setCommitment(event.target.value)} placeholder="Server seed commitment (SHA-256)" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none" />
        <input value={serverSeed} onChange={(event) => setServerSeed(event.target.value)} placeholder="Revealed server seed" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <input value={clientSeed} onChange={(event) => setClientSeed(event.target.value)} placeholder="Client seed" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none" />
          <input value={nonce} onChange={(event) => setNonce(event.target.value)} placeholder="Nonce" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none" />
        </div>
        <button type="button" onClick={() => void verify()} disabled={!commitment || !serverSeed} className="w-full rounded-xl bg-fuchsia-200 px-3 py-2 text-xs font-black text-black disabled:opacity-40">Verify locally</button>
      </div>
      {result ? (
        <div className={`mt-4 rounded-xl border p-3 text-xs ${result.matches ? 'border-lime-300/20 bg-lime-300/[0.05] text-lime-100' : 'border-red-300/20 bg-red-300/[0.05] text-red-100'}`}>
          <p className="font-black">{result.matches ? 'Commitment verified' : 'Commitment mismatch'}</p>
          <p className="mt-2 break-all text-[10px] opacity-60">Seed hash: {result.seedHash}</p>
          <p className="mt-1 break-all text-[10px] opacity-60">Outcome digest: {result.outcomeDigest}</p>
        </div>
      ) : null}
    </section>
  );
}

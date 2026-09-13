'use client';

import { useMemo, useState } from 'react';
import { AddressGraph, type AddressGraphEdge, type AddressGraphNode } from '@/components/address-graph';

type Analysis = {
  balance: number;
  unit: 'BTC' | 'ETH';
  transactionCount: number;
  provider: string;
  nodes: AddressGraphNode[];
  edges: AddressGraphEdge[];
  error?: string;
};

function GasCalculator({ ethUsd }: { ethUsd?: number }) {
  const [gas, setGas] = useState(21000);
  const [baseFee, setBaseFee] = useState(18);
  const [priorityFee, setPriorityFee] = useState(1.5);
  const totalGwei = gas * (baseFee + priorityFee);
  const eth = totalGwei / 1_000_000_000;

  return (
    <div className="rounded-3xl border border-lime-300/15 bg-lime-300/[0.04] p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-200">Live gas calculator</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="text-xs text-white/45">Gas used<input type="number" min="21000" value={gas} onChange={(e) => setGas(Math.max(21000, Number(e.target.value) || 21000))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white" /></label>
        <label className="text-xs text-white/45">Base fee (gwei)<input type="number" min="0" step="0.1" value={baseFee} onChange={(e) => setBaseFee(Math.max(0, Number(e.target.value) || 0))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white" /></label>
        <label className="text-xs text-white/45">Priority fee (gwei)<input type="number" min="0" step="0.1" value={priorityFee} onChange={(e) => setPriorityFee(Math.max(0, Number(e.target.value) || 0))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white" /></label>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-black/25 p-4"><p className="text-[10px] uppercase tracking-wider text-white/35">Effective fee</p><p className="mt-2 text-xl font-black">{(baseFee + priorityFee).toFixed(2)} gwei</p></div>
        <div className="rounded-2xl bg-black/25 p-4"><p className="text-[10px] uppercase tracking-wider text-white/35">Estimated cost</p><p className="mt-2 text-xl font-black">{eth.toFixed(8)} ETH</p></div>
        <div className="rounded-2xl bg-black/25 p-4"><p className="text-[10px] uppercase tracking-wider text-white/35">Approx. USD</p><p className="mt-2 text-xl font-black">{ethUsd ? `$${(eth * ethUsd).toFixed(2)}` : '—'}</p></div>
      </div>
    </div>
  );
}

function BitcoinAddressWidget() {
  const [address, setAddress] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);

  async function inspect() {
    setLoading(true);
    const response = await fetch('/api/tracker/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chain: 'bitcoin', address }) });
    const data = (await response.json()) as Analysis;
    setAnalysis(data);
    setLoading(false);
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Try a public Bitcoin address</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="bc1… or legacy address" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-xs outline-none" />
        <button type="button" onClick={() => void inspect()} disabled={loading || !address} className="rounded-xl bg-fuchsia-200 px-5 py-3 text-sm font-black text-black disabled:opacity-40">{loading ? 'Reading…' : 'Inspect'}</button>
      </div>
      {analysis?.error ? <p className="mt-4 text-sm text-rose-200">{analysis.error}</p> : null}
      {analysis && !analysis.error ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-black/20 p-4"><p className="text-[10px] uppercase text-white/35">Balance</p><p className="mt-2 font-black">{analysis.balance.toFixed(8)} {analysis.unit}</p></div>
            <div className="rounded-2xl bg-black/20 p-4"><p className="text-[10px] uppercase text-white/35">Transactions</p><p className="mt-2 font-black">{analysis.transactionCount}</p></div>
            <div className="rounded-2xl bg-black/20 p-4"><p className="text-[10px] uppercase text-white/35">Provider</p><p className="mt-2 font-black">{analysis.provider}</p></div>
          </div>
          <AddressGraph nodes={analysis.nodes} edges={analysis.edges} />
        </div>
      ) : null}
    </div>
  );
}

function TransactionFlowWidget() {
  const [step, setStep] = useState(0);
  const steps = useMemo(() => [
    { title: 'Input UTXO', text: 'A wallet selects a previously received output worth 1.00 BTC.' },
    { title: 'Recipient output', text: '0.35 BTC is assigned to the intended recipient.' },
    { title: 'Network fee', text: '0.0002 BTC is consumed as the miner fee.' },
    { title: 'Change output', text: 'The remainder returns to an address controlled by the sender. It is not a second payment.' },
  ], []);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#08110e] p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-200">Click through a Bitcoin transaction</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {steps.map((item, index) => <button key={item.title} type="button" onClick={() => setStep(index)} className={`rounded-2xl border p-4 text-left transition ${step === index ? 'border-lime-300/40 bg-lime-300/[0.08]' : 'border-white/10 bg-white/[0.03]'}`}><span className="text-[10px] font-black text-white/35">STEP {index + 1}</span><p className="mt-2 font-black">{item.title}</p></button>)}
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5"><p className="font-black">{steps[step].title}</p><p className="mt-2 text-sm leading-6 text-white/55">{steps[step].text}</p></div>
      <svg viewBox="0 0 800 220" className="mt-5 w-full" aria-label="Transaction flow diagram">
        <line x1="120" y1="110" x2="340" y2="70" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
        <line x1="120" y1="110" x2="340" y2="150" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
        <line x1="460" y1="70" x2="680" y2="70" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
        <circle cx="120" cy="110" r="48" fill={step === 0 ? '#bef264' : '#173b2d'} /><text x="120" y="116" textAnchor="middle" fontWeight="800" fontSize="15" fill={step === 0 ? '#07110d' : '#fff'}>1.00 BTC</text>
        <circle cx="400" cy="70" r="48" fill={step === 1 ? '#f5d0fe' : '#173b2d'} /><text x="400" y="76" textAnchor="middle" fontWeight="800" fontSize="14" fill={step === 1 ? '#07110d' : '#fff'}>0.35 BTC</text>
        <circle cx="400" cy="150" r="48" fill={step === 3 ? '#bef264' : '#173b2d'} /><text x="400" y="156" textAnchor="middle" fontWeight="800" fontSize="14" fill={step === 3 ? '#07110d' : '#fff'}>CHANGE</text>
        <circle cx="680" cy="70" r="42" fill={step === 2 ? '#fde68a' : '#173b2d'} /><text x="680" y="76" textAnchor="middle" fontWeight="800" fontSize="13" fill={step === 2 ? '#07110d' : '#fff'}>FEE</text>
      </svg>
    </div>
  );
}

export function LearnWidget({ type, ethUsd }: { type?: 'gas' | 'bitcoin-address' | 'transaction-flow'; ethUsd?: number }) {
  if (type === 'gas') return <GasCalculator ethUsd={ethUsd} />;
  if (type === 'bitcoin-address') return <BitcoinAddressWidget />;
  if (type === 'transaction-flow') return <TransactionFlowWidget />;
  return null;
}

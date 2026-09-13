'use client';

import { useMemo, useState } from 'react';

export function GasFeeCalculator() {
  const [gas, setGas] = useState(21_000);
  const [baseFee, setBaseFee] = useState(12);
  const [priorityFee, setPriorityFee] = useState(1.5);
  const [ethUsd, setEthUsd] = useState(3500);

  const result = useMemo(() => {
    const gwei = Math.max(0, baseFee) + Math.max(0, priorityFee);
    const eth = Math.max(0, gas) * gwei * 1e-9;
    return { gwei, eth, usd: eth * Math.max(0, ethUsd) };
  }, [gas, baseFee, priorityFee, ethUsd]);

  return (
    <section className="rounded-[2rem] border border-lime-300/15 bg-lime-300/[0.05] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-lime-200">Interactive lab</p><h3 className="mt-2 text-2xl font-black">Ethereum gas calculator</h3></div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">Runs locally</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <NumberField label="Gas used / limit" value={gas} onChange={setGas} step={1000} />
        <NumberField label="Base fee (gwei)" value={baseFee} onChange={setBaseFee} step={0.1} />
        <NumberField label="Priority fee (gwei)" value={priorityFee} onChange={setPriorityFee} step={0.1} />
        <NumberField label="ETH price (USD)" value={ethUsd} onChange={setEthUsd} step={10} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Effective gas price" value={`${result.gwei.toFixed(2)} gwei`} />
        <Metric label="Estimated network fee" value={`${result.eth.toFixed(6)} ETH`} />
        <Metric label="Estimated USD cost" value={`$${result.usd.toFixed(2)}`} />
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (value: number) => void; step: number }) {
  return <label className="block"><span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">{label}</span><input type="number" min="0" step={step} value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 font-bold outline-none focus:border-lime-300/40" /></label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</p><p className="mt-2 text-lg font-black text-lime-100">{value}</p></div>;
}

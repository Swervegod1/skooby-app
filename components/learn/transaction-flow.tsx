'use client';

import { useState } from 'react';

const nodes = [
  { id: 'input', x: 70, y: 110, label: 'Input UTXO', detail: '0.80 BTC selected by the sender wallet.' },
  { id: 'tx', x: 250, y: 110, label: 'Transaction', detail: 'The full input is consumed and new outputs are created.' },
  { id: 'recipient', x: 445, y: 55, label: 'Recipient', detail: '0.30 BTC payment output.' },
  { id: 'change', x: 445, y: 165, label: 'Change', detail: '0.4998 BTC returns to a sender-controlled address.' },
];

export function TransactionFlow() {
  const [selected, setSelected] = useState(nodes[1]);
  return (
    <section className="rounded-[2rem] border border-fuchsia-200/15 bg-fuchsia-200/[0.04] p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Interactive transaction map</p>
      <h3 className="mt-2 text-2xl font-black">Click a node to follow the flow</h3>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-3">
        <svg viewBox="0 0 520 220" className="min-w-[520px]">
          <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
          <g className="text-white/25" stroke="currentColor" strokeWidth="2" fill="none" markerEnd="url(#arrow)"><path d="M120 110 L200 110"/><path d="M300 105 L392 60"/><path d="M300 115 L392 160"/></g>
          {nodes.map((node) => (
            <g key={node.id} onClick={() => setSelected(node)} className="cursor-pointer">
              <circle cx={node.x} cy={node.y} r="38" fill={selected.id === node.id ? '#bef264' : '#111d18'} stroke={selected.id === node.id ? '#bef264' : '#ffffff22'} strokeWidth="2" />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill={selected.id === node.id ? '#061108' : 'white'}>{node.label}</text>
            </g>
          ))}
          <text x="430" y="108" fontSize="10" fill="#ffffff66">Fee: 0.0002 BTC</text>
        </svg>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="font-black text-lime-100">{selected.label}</p><p className="mt-1 text-sm leading-6 text-white/50">{selected.detail}</p></div>
    </section>
  );
}

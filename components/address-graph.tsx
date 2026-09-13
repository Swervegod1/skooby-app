'use client';

import { useState } from 'react';

export type AddressGraphNode = { id: string; label: string; kind: 'focus' | 'wallet'; value?: number };
export type AddressGraphEdge = { id: string; from: string; to: string; value: number; txid: string };

function short(value: string) {
  return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

export function AddressGraph({ nodes, edges }: { nodes: AddressGraphNode[]; edges: AddressGraphEdge[] }) {
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? '');
  const width = 820;
  const height = 520;
  const centerX = width / 2;
  const centerY = height / 2;
  const positions = new Map<string, { x: number; y: number }>();
  const focus = nodes.find((node) => node.kind === 'focus') ?? nodes[0];
  if (focus) positions.set(focus.id, { x: centerX, y: centerY });
  const others = nodes.filter((node) => node.id !== focus?.id);
  others.forEach((node, index) => {
    const ring = index < 10 ? 1 : 2;
    const ringItems = ring === 1 ? Math.min(10, others.length) : Math.max(1, others.length - 10);
    const ringIndex = ring === 1 ? index : index - 10;
    const radius = ring === 1 ? 155 : 225;
    const angle = (Math.PI * 2 * ringIndex) / ringItems - Math.PI / 2;
    positions.set(node.id, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius });
  });

  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const relatedEdges = selected ? edges.filter((edge) => edge.from === selected.id || edge.to === selected.id) : [];

  if (!nodes.length) {
    return <div className="grid min-h-72 place-items-center rounded-3xl border border-white/10 bg-black/20 text-sm text-white/40">No relationship data returned.</div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07100d]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-h-[360px] w-full" role="img" aria-label="Wallet relationship graph">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,.28)" /></marker>
          </defs>
          {edges.map((edge) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return null;
            return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(255,255,255,.18)" strokeWidth="1.5" markerEnd="url(#arrow)" />;
          })}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const active = node.id === selected?.id;
            const radius = node.kind === 'focus' ? 34 : active ? 25 : 20;
            const select = () => setSelectedId(node.id);
            return (
              <g
                key={node.id}
                onClick={select}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') select(); }}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Select ${node.kind === 'focus' ? 'focus address' : 'connected wallet'} ${node.label}`}
              >
                <circle cx={pos.x} cy={pos.y} r={radius} fill={node.kind === 'focus' ? '#bef264' : active ? '#f5d0fe' : '#173b2d'} stroke={active ? '#ffffff' : 'rgba(255,255,255,.18)'} strokeWidth={active ? 3 : 1.5} />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill={node.kind === 'focus' ? '#07110d' : '#ffffff'} fontSize="10" fontWeight="800">{node.kind === 'focus' ? 'FOCUS' : node.label.slice(0, 8)}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">Selected entity</p>
        <p className="mt-3 break-all text-sm font-black">{selected ? short(selected.id) : '—'}</p>
        <p className="mt-2 text-xs text-white/40">{selected?.kind === 'focus' ? 'Investigation focus' : 'Connected wallet'}</p>
        <div className="mt-5 space-y-2">
          {relatedEdges.slice(0, 8).map((edge) => (
            <div key={edge.id} className="rounded-xl border border-white/8 bg-black/20 p-3 text-[11px] text-white/50">
              <div className="font-bold text-white/75">{edge.from === selected?.id ? 'Outbound' : 'Inbound'}</div>
              <div className="mt-1 truncate">TX {short(edge.txid)}</div>
            </div>
          ))}
          {!relatedEdges.length ? <p className="text-xs text-white/35">No visible edges for this entity.</p> : null}
        </div>
      </aside>
    </div>
  );
}

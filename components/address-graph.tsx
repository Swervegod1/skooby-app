'use client';
import { useId, useState } from 'react';
import { explorerUrl, formatAtomic, shortAddress, type Chain, type GraphEdge, type GraphNode } from '@/lib/wallet-analysis';
export type AddressGraphNode = GraphNode;
export type AddressGraphEdge = GraphEdge;

export function AddressGraph({ nodes, edges, chain, demo = false }: { nodes: GraphNode[]; edges: GraphEdge[]; chain: Chain; demo?: boolean }) {
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? '');
  const marker = useId().replace(/:/g, '');
  const focus = nodes.find(node => node.kind === 'focus');
  const transactions = nodes.filter(node => node.kind === 'transaction');
  const wallets = nodes.filter(node => node.kind === 'wallet');
  const positions = new Map<string, { x: number; y: number }>();
  if (focus) positions.set(focus.id, { x: 400, y: 270 });
  for (const [items, radius] of [[transactions, 130], [wallets, 230]] as const) {
    items.forEach((node, index) => {
      const angle = Math.PI * 2 * index / Math.max(1, items.length) - Math.PI / 2;
      positions.set(node.id, { x: 400 + Math.cos(angle) * radius * 1.4, y: 270 + Math.sin(angle) * radius });
    });
  }
  const selected = nodes.find(node => node.id === selectedId) ?? focus;
  const related = edges.filter(edge => edge.from === selected?.id || edge.to === selected?.id);
  if (!focus) return <p className="case-muted">No transaction relationships were returned.</p>;
  return <section className="case-map" aria-label="Transaction evidence map">
    <div className="case-map-canvas">
      <div className="case-map-heading"><h3>Follow the trail</h3><span className="case-tag">TRANSACTION MAP</span></div>
      <svg viewBox="0 0 800 540" role="group" aria-label="Addresses connect through transaction nodes. Select a node for evidence.">
        <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="16" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#637866" /></marker></defs>
        <circle cx="400" cy="270" r="205" fill="none" stroke="#203026" strokeDasharray="3 9" />
        {edges.map(edge => {
          const from = positions.get(edge.from); const to = positions.get(edge.to);
          if (!from || !to) return null;
          const active = edge.from === selected?.id || edge.to === selected?.id;
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={active ? '#b9eb72' : '#38513f'} strokeWidth={active ? 2 : 1} markerEnd={'url(#' + marker + ')'} />;
        })}
        {nodes.map(node => {
          const pos = positions.get(node.id); if (!pos) return null;
          const active = node.id === selected?.id;
          return <g key={node.id} role="button" tabIndex={0} aria-pressed={active} aria-label={'Select ' + node.kind + ' ' + node.label} onClick={() => setSelectedId(node.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(node.id); } }} className="case-map-node">
            {node.kind === 'transaction' ? <rect x={pos.x - 23} y={pos.y - 18} width="46" height="36" rx="9" fill={active ? '#e8f4df' : '#26392b'} stroke={active ? '#c5f773' : '#718b74'} /> : <circle cx={pos.x} cy={pos.y} r={node.kind === 'focus' ? 34 : 20} fill={node.kind === 'focus' ? '#c5f773' : active ? '#e8f4df' : '#16251b'} stroke={active ? '#c5f773' : '#718b74'} strokeWidth={active ? 3 : 1} />}
            <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={node.kind === 'focus' || active ? '#101512' : '#d6e8da'}>{node.kind === 'focus' ? 'FOCUS' : node.kind === 'transaction' ? 'TX' : node.id.slice(0, 5)}</text>
          </g>;
        })}
      </svg>
      <p className="case-map-legend"><span>● Address</span><span>▣ Transaction</span><span>Arrows show observed inputs / outputs</span></p>
    </div>
    <aside className="case-map-detail">
      <label className="case-label" htmlFor={marker + '-select'}>Inspect a node</label>
      <select id={marker + '-select'} value={selected?.id} onChange={event => setSelectedId(event.target.value)}>{nodes.map(node => <option key={node.id} value={node.id}>{node.kind === 'transaction' ? node.label : shortAddress(node.id)}</option>)}</select>
      <p className="case-eyebrow">{selected?.kind === 'transaction' ? 'Observed transaction' : 'Observed address'}</p>
      <p className="case-mono case-break">{selected?.id.replace(/^tx:/, '')}</p>
      <p className="case-muted">{related.length} visible connection{related.length === 1 ? '' : 's'}. Connections do not establish ownership.</p>
      <div className="case-edge-list">{related.slice(0, 8).map(edge => <div key={edge.id}><span>{edge.from === selected?.id ? 'Outgoing edge' : 'Incoming edge'}</span><strong>{formatAtomic(edge.valueAtomic, chain)} {chain === 'bitcoin' ? 'BTC' : 'ETH'}</strong>{!demo && <a href={explorerUrl(chain, edge.txid, 'tx')} target="_blank" rel="noopener noreferrer">View transaction ↗</a>}</div>)}</div>
    </aside>
  </section>;
}


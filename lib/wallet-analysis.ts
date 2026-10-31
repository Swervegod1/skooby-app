export type Chain = 'bitcoin' | 'ethereum';
export type Atomic = string | number;
export type GraphNode = { id: string; label: string; kind: 'focus' | 'wallet' | 'transaction' };
export type GraphEdge = { id: string; from: string; to: string; valueAtomic: string; txid: string };
export type EvidenceTransaction = {
  id: string;
  confirmed: boolean;
  timestamp: string | null;
  receivedAtomic: string;
  spentAtomic: string;
  netAtomic: string;
};
export type WalletAnalysis = {
  version: 1;
  chain: Chain;
  address: string;
  unit: 'BTC' | 'ETH';
  balance: string;
  transactionCount: number;
  provider: string;
  capturedAt: string;
  demo: boolean;
  coverage: { sampledTransactions: number; graphTransactions: number; truncated: boolean };
  summary: string[];
  limitations: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  transactions: EvidenceTransaction[];
};

const SAMPLE_LIMIT = 14;
const GRAPH_TX_LIMIT = 6;
const GRAPH_NODE_LIMIT = 42;
const GRAPH_EDGE_LIMIT = 72;

export function parseWalletInput(value: unknown): { chain: Chain; address: string } {
  if (!value || typeof value !== 'object') throw new Error('Choose a network and enter a public wallet address.');
  const { chain, address } = value as Record<string, unknown>;
  if (chain !== 'bitcoin' && chain !== 'ethereum') throw new Error('Choose Bitcoin or Ethereum.');
  if (typeof address !== 'string' || address.length > 100) throw new Error('Enter a valid public wallet address.');
  let clean = address.trim();
  if (chain === 'ethereum') {
    if (!/^0x[0-9a-fA-F]{40}$/.test(clean)) throw new Error('Enter a 0x Ethereum address with 40 hexadecimal characters.');
    clean = clean.toLowerCase();
  } else if (/^bc1/i.test(clean)) {
    if (clean !== clean.toLowerCase() && clean !== clean.toUpperCase()) throw new Error('Bitcoin bech32 addresses cannot mix uppercase and lowercase.');
    clean = clean.toLowerCase();
    if (!/^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}$/.test(clean)) throw new Error('Enter a Bitcoin mainnet address.');
  } else if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(clean)) {
    throw new Error('Enter a Bitcoin mainnet address.');
  }
  return { chain, address: clean };
}

export function atomic(value: Atomic): bigint {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) throw new Error('Provider returned an imprecise amount.');
  if (!/^\d{1,80}$/.test(String(value))) throw new Error('Provider returned an invalid amount.');
  return BigInt(value);
}

export function formatAtomic(value: string | bigint, chain: Chain): string {
  const amount = BigInt(value);
  const decimals = chain === 'bitcoin' ? 8 : 18;
  const digits = (amount < BigInt(0) ? -amount : amount).toString().padStart(decimals + 1, '0');
  const fraction = digits.slice(-decimals).replace(/0+$/, '');
  return `${amount < BigInt(0) ? '-' : ''}${digits.slice(0, -decimals)}${fraction ? `.${fraction}` : ''}`;
}

// Preserve large integer JSON tokens before JSON.parse rounds wei values.
// Quoted JSON strings (including escaped quotes) are matched and left untouched.
export function parseExactJson(text: string): unknown {
  return JSON.parse(text.replace(/"(?:\\.|[^"\\])*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, (token, number: string | undefined) =>
    number && /^-?\d{16,}$/.test(number) ? `"${number}"` : token));
}

export function shortAddress(value: string): string {
  return value.length > 22 ? `${value.slice(0, 9)}…${value.slice(-7)}` : value;
}

export function explorerUrl(chain: Chain, value: string, type: 'address' | 'tx' = 'address'): string {
  const identifier = chain === 'ethereum' && !value.startsWith('0x') ? '0x' + value : value;
  return `${chain === 'bitcoin' ? 'https://mempool.space' : 'https://etherscan.io'}/${type}/${encodeURIComponent(identifier)}`;
}

function count(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Provider returned an invalid transaction count.');
  return value;
}

function txId(value: string): string {
  const clean = value?.replace(/^0x/, '');
  if (!/^[a-fA-F0-9]{64}$/.test(clean)) throw new Error('Provider returned an invalid transaction ID.');
  return clean.toLowerCase();
}

function timestamp(value?: string | number): string | null {
  if (!value) return null;
  const date = new Date(typeof value === 'number' ? value * 1000 : value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

type Flow = { address: string; amount: bigint };
function graphBuilder(address: string) {
  const nodes = new Map<string, GraphNode>([[address, { id: address, label: shortAddress(address), kind: 'focus' }]]);
  const edges: GraphEdge[] = [];
  let graphTransactions = 0;
  let truncated = false;
  function add(id: string, inputs: Flow[], outputs: Flow[]) {
    if (graphTransactions >= GRAPH_TX_LIMIT || nodes.size >= GRAPH_NODE_LIMIT) { truncated = true; return; }
    const transaction = `tx:${id}`;
    nodes.set(transaction, { id: transaction, label: `TX ${id.slice(0, 6)}`, kind: 'transaction' });
    graphTransactions += 1;
    for (const [direction, flows] of [['in', inputs], ['out', outputs]] as const) {
      const grouped = new Map<string, bigint>();
      for (const flow of flows) grouped.set(flow.address, (grouped.get(flow.address) ?? BigInt(0)) + flow.amount);
      // Put the focus first so a large transaction cannot hide its observed edge.
      const ordered = [...grouped].sort(([a], [b]) => Number(b === address) - Number(a === address));
      for (const [wallet, value] of ordered) {
        if (edges.length >= GRAPH_EDGE_LIMIT || (!nodes.has(wallet) && nodes.size >= GRAPH_NODE_LIMIT)) { truncated = true; continue; }
        if (!nodes.has(wallet)) nodes.set(wallet, { id: wallet, label: shortAddress(wallet), kind: 'wallet' });
        edges.push({ id: `${id}:${direction}:${wallet}`, from: direction === 'in' ? wallet : transaction, to: direction === 'in' ? transaction : wallet, valueAtomic: value.toString(), txid: id });
      }
    }
  }
  return { nodes, edges, add, coverage: () => ({ graphTransactions, truncated }) };
}

function finish(analysis: Omit<WalletAnalysis, 'summary' | 'demo' | 'version'>): WalletAnalysis {
  const net = analysis.transactions.reduce((sum, tx) => sum + BigInt(tx.netAtomic), BigInt(0));
  return {
    ...analysis, version: 1, demo: false,
    summary: [
      `The provider reports a balance of ${analysis.balance} ${analysis.unit} for this address.`,
      `This snapshot examines ${analysis.coverage.sampledTransactions} of ${analysis.transactionCount} reported transactions.`,
      `The address's observed net change in this sample is ${formatAtomic(net, analysis.chain)} ${analysis.unit}.`,
    ],
  };
}

export type BitcoinSummary = {
  chain_stats: { funded_txo_sum: Atomic; spent_txo_sum: Atomic; tx_count: number };
  mempool_stats: { funded_txo_sum: Atomic; spent_txo_sum: Atomic; tx_count: number };
};
export type BitcoinTransaction = {
  txid: string;
  vin: Array<{ is_coinbase?: boolean; prevout?: { scriptpubkey_address?: string; value: Atomic } }>;
  vout: Array<{ scriptpubkey_address?: string; value: Atomic }>;
  status?: { confirmed?: boolean; block_time?: number };
};

export function analyzeBitcoinData(address: string, summary: BitcoinSummary, txs: BitcoinTransaction[], capturedAt: string): WalletAnalysis {
  if (!summary?.chain_stats || !summary.mempool_stats || !Array.isArray(txs)) throw new Error('Bitcoin data is incomplete.');
  const confirmed = summary.chain_stats;
  const pending = summary.mempool_stats;
  const balance = atomic(confirmed.funded_txo_sum) - atomic(confirmed.spent_txo_sum) + atomic(pending.funded_txo_sum) - atomic(pending.spent_txo_sum);
  const total = count(confirmed.tx_count) + count(pending.tx_count);
  const graph = graphBuilder(address);
  const seen = new Set<string>();
  const transactions: EvidenceTransaction[] = [];
  for (const tx of txs) {
    const id = txId(tx.txid);
    if (seen.has(id)) continue;
    seen.add(id);
    if (transactions.length >= SAMPLE_LIMIT) break;
    if (!Array.isArray(tx.vin) || !Array.isArray(tx.vout)) throw new Error('Bitcoin transaction details are incomplete.');
    const inputs: Flow[] = [];
    const outputs: Flow[] = [];
    for (const input of tx.vin) {
      if (!input.is_coinbase && !input.prevout) throw new Error('Bitcoin input details are incomplete.');
      if (input.prevout?.scriptpubkey_address) inputs.push({ address: input.prevout.scriptpubkey_address, amount: atomic(input.prevout.value) });
    }
    for (const output of tx.vout) {
      const amount = atomic(output.value);
      if (output.scriptpubkey_address) outputs.push({ address: output.scriptpubkey_address, amount });
    }
    const received = outputs.filter(f => f.address === address).reduce((sum, f) => sum + f.amount, BigInt(0));
    const spent = inputs.filter(f => f.address === address).reduce((sum, f) => sum + f.amount, BigInt(0));
    if (!inputs.some(f => f.address === address) && !outputs.some(f => f.address === address)) continue;
    graph.add(id, inputs, outputs);
    transactions.push({ id, confirmed: tx.status?.confirmed === true, timestamp: timestamp(tx.status?.block_time), receivedAtomic: received.toString(), spentAtomic: spent.toString(), netAtomic: (received - spent).toString() });
  }
  return finish({ chain: 'bitcoin', address, unit: 'BTC', balance: formatAtomic(balance, 'bitcoin'), transactionCount: total, provider: 'mempool.space', capturedAt, nodes: [...graph.nodes.values()], edges: graph.edges, transactions,
    coverage: { sampledTransactions: transactions.length, ...graph.coverage(), truncated: graph.coverage().truncated || transactions.length < total },
    limitations: ['A sample of recent transactions, not a complete history or ownership investigation.', 'Bitcoin lines connect addresses to transactions. Multiple inputs do not reveal which person paid a particular output.', 'Net change includes change outputs and fees spent by this address. It is not trading profit or loss.', 'The graph displays up to 6 transactions and 42 nodes; outputs without a decoded address are omitted.'],
  });
}

export type EthereumData = {
  final_balance: Atomic;
  final_n_tx: number;
  txs?: Array<{ hash: string; fees?: Atomic; confirmed?: string; received?: string; inputs: Array<{ addresses?: string[] }>; outputs: Array<{ addresses?: string[]; value: Atomic }> }>;
};

export function analyzeEthereumData(address: string, data: EthereumData, capturedAt: string): WalletAnalysis {
  if (!data || (count(data.final_n_tx) > 0 && !Array.isArray(data.txs))) throw new Error('Ethereum data is incomplete.');
  const focus = address.toLowerCase();
  const normalize = (value: string) => parseWalletInput({ chain: 'ethereum', address: `0x${value.replace(/^0x/i, '')}` }).address;
  const graph = graphBuilder(focus);
  const seen = new Set<string>();
  const transactions: EvidenceTransaction[] = [];
  let ambiguous = false;
  for (const tx of data.txs ?? []) {
    const id = txId(tx.hash);
    if (seen.has(id)) continue;
    seen.add(id);
    if (transactions.length >= SAMPLE_LIMIT) break;
    if (!Array.isArray(tx.inputs) || !Array.isArray(tx.outputs)) throw new Error('Ethereum transaction details are incomplete.');
    const senders = [...new Set(tx.inputs.flatMap(input => input.addresses ?? []).map(normalize))];
    // Avoid attributing a complete transfer to each address in an ambiguous provider record.
    if (senders.length !== 1 || tx.outputs.some(output => output.addresses?.length !== 1)) { ambiguous = true; continue; }
    const outputs = tx.outputs.map(output => ({ address: normalize(output.addresses![0]), amount: atomic(output.value) }));
    const transferred = outputs.reduce((sum, output) => sum + output.amount, BigInt(0));
    const isSender = senders[0] === focus;
    const received = outputs.filter(f => f.address === focus).reduce((sum, f) => sum + f.amount, BigInt(0));
    if (!isSender && !outputs.some(f => f.address === focus)) continue;
    if (isSender && tx.fees === undefined) throw new Error('Ethereum fee details are incomplete.');
    const spent = isSender ? transferred + atomic(tx.fees!) : BigInt(0);
    graph.add(id, [{ address: senders[0], amount: transferred }], outputs);
    transactions.push({ id, confirmed: Boolean(tx.confirmed), timestamp: timestamp(tx.confirmed ?? tx.received), receivedAtomic: received.toString(), spentAtomic: spent.toString(), netAtomic: (received - spent).toString() });
  }
  return finish({ chain: 'ethereum', address: focus, unit: 'ETH', balance: formatAtomic(atomic(data.final_balance), 'ethereum'), transactionCount: count(data.final_n_tx), provider: 'BlockCypher', capturedAt, nodes: [...graph.nodes.values()], edges: graph.edges, transactions,
    coverage: { sampledTransactions: transactions.length, ...graph.coverage(), truncated: graph.coverage().truncated || transactions.length < data.final_n_tx || ambiguous },
    limitations: ['Native ETH activity reported by BlockCypher only; tokens, NFTs and internal contract traces are not covered.', 'A transaction relationship does not establish identity, intent or ownership.', 'Activity and confirmation are provider-reported; contract execution status is not independently verified.', 'Graph values show transferred ETH; sample net change also includes the sender fees reported by the provider.', 'The graph displays up to 6 transactions and 42 nodes. Ambiguous provider records are excluded.'],
  });
}

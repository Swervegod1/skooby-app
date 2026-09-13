import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { incrementApiUsage } from '@/lib/cloud-store';

type GraphNode = { id: string; label: string; kind: 'focus' | 'wallet'; value?: number };
type GraphEdge = { id: string; from: string; to: string; value: number; txid: string };

type Analysis = {
  chain: 'bitcoin' | 'ethereum';
  address: string;
  balance: number;
  unit: 'BTC' | 'ETH';
  transactionCount: number;
  provider: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function short(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function isBitcoinAddress(address: string) {
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{20,90}$/.test(address);
}

function isEthereumAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function analyzeBitcoin(address: string): Promise<Analysis> {
  const base = 'https://mempool.space/api';
  const [summaryResponse, txResponse] = await Promise.all([
    fetch(`${base}/address/${encodeURIComponent(address)}`, { next: { revalidate: 60 }, headers: { Accept: 'application/json' } }),
    fetch(`${base}/address/${encodeURIComponent(address)}/txs`, { next: { revalidate: 60 }, headers: { Accept: 'application/json' } }),
  ]);
  if (!summaryResponse.ok || !txResponse.ok) throw new Error('Bitcoin data provider is temporarily unavailable.');

  const summary = (await summaryResponse.json()) as {
    chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number; tx_count?: number };
    mempool_stats?: { funded_txo_sum?: number; spent_txo_sum?: number; tx_count?: number };
  };
  const txs = (await txResponse.json()) as Array<{
    txid: string;
    vin?: Array<{ prevout?: { scriptpubkey_address?: string; value?: number } }>;
    vout?: Array<{ scriptpubkey_address?: string; value?: number }>;
  }>;

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  nodes.set(address, { id: address, label: short(address), kind: 'focus' });

  for (const tx of txs.slice(0, 14)) {
    const inputs = tx.vin ?? [];
    const outputs = tx.vout ?? [];
    const sentByFocus = inputs.some((input) => input.prevout?.scriptpubkey_address === address);

    if (sentByFocus) {
      for (const output of outputs) {
        const target = output.scriptpubkey_address;
        if (!target || target === address) continue;
        nodes.set(target, { id: target, label: short(target), kind: 'wallet' });
        edges.push({ id: `${tx.txid}:${edges.length}`, from: address, to: target, value: output.value ?? 0, txid: tx.txid });
        if (nodes.size >= 26) break;
      }
    } else {
      const received = outputs.filter((output) => output.scriptpubkey_address === address).reduce((sum, output) => sum + (output.value ?? 0), 0);
      for (const input of inputs) {
        const source = input.prevout?.scriptpubkey_address;
        if (!source || source === address) continue;
        nodes.set(source, { id: source, label: short(source), kind: 'wallet' });
        edges.push({ id: `${tx.txid}:${edges.length}`, from: source, to: address, value: received, txid: tx.txid });
        if (nodes.size >= 26) break;
      }
    }
    if (nodes.size >= 26) break;
  }

  const chain = summary.chain_stats ?? {};
  const mempool = summary.mempool_stats ?? {};
  const sats = (chain.funded_txo_sum ?? 0) - (chain.spent_txo_sum ?? 0) + (mempool.funded_txo_sum ?? 0) - (mempool.spent_txo_sum ?? 0);
  return {
    chain: 'bitcoin',
    address,
    balance: sats / 100_000_000,
    unit: 'BTC',
    transactionCount: (chain.tx_count ?? 0) + (mempool.tx_count ?? 0),
    provider: 'mempool.space',
    nodes: [...nodes.values()],
    edges: edges.slice(0, 40),
  };
}

async function analyzeEthereum(address: string): Promise<Analysis> {
  const token = process.env.BLOCKCYPHER_API_TOKEN;
  const url = new URL(`https://api.blockcypher.com/v1/eth/main/addrs/${encodeURIComponent(address)}/full`);
  url.searchParams.set('limit', '12');
  url.searchParams.set('txlimit', '12');
  if (token) url.searchParams.set('token', token);

  const response = await fetch(url, { next: { revalidate: 60 }, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Ethereum data provider is temporarily unavailable.');
  const data = (await response.json()) as {
    final_balance?: number;
    final_n_tx?: number;
    txs?: Array<{
      hash: string;
      inputs?: Array<{ addresses?: string[] }>;
      outputs?: Array<{ addresses?: string[]; value?: number }>;
    }>;
  };

  const normalized = address.toLowerCase();
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  nodes.set(normalized, { id: normalized, label: short(normalized), kind: 'focus' });

  for (const tx of (data.txs ?? []).slice(0, 12)) {
    const inputAddresses = (tx.inputs ?? []).flatMap((input) => input.addresses ?? []).map((item) => `0x${item.replace(/^0x/, '').toLowerCase()}`);
    const sentByFocus = inputAddresses.includes(normalized);
    if (sentByFocus) {
      for (const output of tx.outputs ?? []) {
        for (const raw of output.addresses ?? []) {
          const target = `0x${raw.replace(/^0x/, '').toLowerCase()}`;
          if (target === normalized) continue;
          nodes.set(target, { id: target, label: short(target), kind: 'wallet' });
          edges.push({ id: `${tx.hash}:${edges.length}`, from: normalized, to: target, value: output.value ?? 0, txid: tx.hash });
          if (nodes.size >= 26) break;
        }
      }
    } else {
      const source = inputAddresses.find((item) => item !== normalized);
      if (source) {
        const received = (tx.outputs ?? []).filter((output) => (output.addresses ?? []).some((raw) => `0x${raw.replace(/^0x/, '').toLowerCase()}` === normalized)).reduce((sum, output) => sum + (output.value ?? 0), 0);
        nodes.set(source, { id: source, label: short(source), kind: 'wallet' });
        edges.push({ id: `${tx.hash}:${edges.length}`, from: source, to: normalized, value: received, txid: tx.hash });
      }
    }
    if (nodes.size >= 26) break;
  }

  return {
    chain: 'ethereum',
    address,
    balance: (data.final_balance ?? 0) / 1e18,
    unit: 'ETH',
    transactionCount: data.final_n_tx ?? 0,
    provider: 'BlockCypher',
    nodes: [...nodes.values()],
    edges: edges.slice(0, 40),
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as { chain?: 'bitcoin' | 'ethereum'; address?: string };
  const chain = body.chain;
  const address = body.address?.trim() ?? '';
  if (!chain || !address || (chain === 'bitcoin' ? !isBitcoinAddress(address) : !isEthereumAddress(address))) {
    return NextResponse.json({ error: 'Enter a valid Bitcoin or Ethereum address.' }, { status: 400 });
  }

  try {
    const analysis = chain === 'bitcoin' ? await analyzeBitcoin(address) : await analyzeEthereum(address);
    const session = await getServerSession();
    if (session) void incrementApiUsage(session.userId, 'wallet_analysis').catch(() => undefined);
    return NextResponse.json(analysis, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to analyze address.' }, { status: 502 });
  }
}

import { analyzeBitcoinData, analyzeEthereumData, parseExactJson, parseWalletInput, type BitcoinSummary, type BitcoinTransaction, type EthereumData } from './wallet-analysis';

async function providerJson(url: URL | string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(response.status === 429 ? 'The data provider is busy. Please try again shortly.' : 'The data provider could not read this address. Check the address or try again shortly.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The data provider returned an empty response.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) throw new Error('This address returned too much data for a quick report.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return parseExactJson(new TextDecoder().decode(bytes));
}

export async function analyzeWallet(input: unknown) {
  const { chain, address } = parseWalletInput(input);
  const capturedAt = new Date().toISOString();
  if (chain === 'bitcoin') {
    const base = `https://mempool.space/api/address/${encodeURIComponent(address)}`;
    const [summary, transactions] = await Promise.all([providerJson(base), providerJson(`${base}/txs`)]);
    return analyzeBitcoinData(address, summary as BitcoinSummary, transactions as BitcoinTransaction[], capturedAt);
  }
  const url = new URL(`https://api.blockcypher.com/v1/eth/main/addrs/${encodeURIComponent(address)}/full`);
  url.searchParams.set('limit', '14');
  url.searchParams.set('txlimit', '14');
  if (process.env.BLOCKCYPHER_API_TOKEN) url.searchParams.set('token', process.env.BLOCKCYPHER_API_TOKEN);
  return analyzeEthereumData(address, await providerJson(url) as EthereumData, capturedAt);
}

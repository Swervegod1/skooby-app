import { NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/market-data';
import { buildResearchPayload, type OracleEvidence } from '@/lib/oracle-v12';

export const dynamic = 'force-dynamic';

export async function GET() {
  const fetchedAt = new Date().toISOString();
  let market: Awaited<ReturnType<typeof getMarketSnapshot>> | null = null;
  try { market = await getMarketSnapshot(); } catch { /* fail closed */ }
  const evidence: OracleEvidence[] = market && !market.stale && Object.keys(market.data).length
    ? [{ family: 'spot', source: 'CoinGecko', observedAt: market.fetchedAt, status: 'VERIFIED', detail: 'Cached public spot reference prices; NOT an executable quote' }]
    : [{ family: 'spot', source: 'CoinGecko', observedAt: fetchedAt, status: 'UNAVAILABLE' }];

  const research = buildResearchPayload({
    symbol: 'BTC', marketAsOf: market?.fetchedAt ?? fetchedAt,
    portfolio: null, evidence,
  });

  return NextResponse.json({
    readOnly: true, dataConnected: Boolean(market && !market.stale),
    market: market ? { provider: market.provider, fetchedAt: market.fetchedAt, stale: market.stale, data: market.data } : null,
    research,
    integrations: {
      gmgn: 'NOT_CONNECTED', vultisig: 'NOT_CONNECTED',
      social: 'NOT_CONNECTED', derivatives: 'NOT_CONNECTED',
      noveltyModel: 'UNCALIBRATED', execution: 'DISABLED',
    },
  }, { headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}

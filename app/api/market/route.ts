import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ids = ['bitcoin', 'ethereum', 'solana', 'usd-coin', 'chainlink'];

export async function GET() {
  try {
    const params = new URLSearchParams({
      ids: ids.join(','),
      vs_currencies: 'usd',
      include_24hr_change: 'true',
      include_market_cap: 'true',
      include_last_updated_at: 'true',
    });

    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Market provider unavailable' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ provider: 'CoinGecko', data, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: 'Unable to fetch market data' }, { status: 502 });
  }
}

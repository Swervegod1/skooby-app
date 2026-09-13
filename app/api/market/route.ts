import { NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getMarketSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to fetch market data' }, { status: 502 });
  }
}

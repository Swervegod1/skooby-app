import { NextResponse } from 'next/server';
import { getPlayCreditLeaderboard } from '@/lib/play-credit-store';

export const runtime = 'edge';

export async function GET() {
  try {
    const leaders = await getPlayCreditLeaderboard(20);
    return NextResponse.json({ leaders }, { headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=20' } });
  } catch {
    return NextResponse.json({ leaders: [], error: 'Leaderboard unavailable.' }, { status: 503 });
  }
}

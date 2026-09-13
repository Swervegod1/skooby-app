import { NextResponse } from 'next/server';
import { probeProvider } from '@/lib/casino-security';

export async function GET() {
  const health = await probeProvider();
  return NextResponse.json(health, {
    status: health.configured && health.healthy ? 200 : 503,
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=30' },
  });
}

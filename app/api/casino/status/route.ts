import { NextResponse } from 'next/server';
import { casinoProviderStatus } from '@/lib/casino-server';

export function GET() {
  const status = casinoProviderStatus();

  return NextResponse.json({
    ok: true,
    provider: status.configured ? 'external' : 'demo',
    configured: status.configured,
    demoFallback: status.demoFallback,
    games: ['slots', 'blackjack', 'roulette', 'crash', 'dice', 'baccarat', 'poker'],
  });
}

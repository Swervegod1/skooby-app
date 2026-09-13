import { NextResponse } from 'next/server';
import { requirePrivySession } from '@/lib/casino-security';
import { getPlayCreditBalanceCents } from '@/lib/play-credit-store';

export async function GET(request: Request) {
  try {
    const session = await requirePrivySession(request);
    const balanceCents = await getPlayCreditBalanceCents(session.userId);
    return NextResponse.json({ credits: balanceCents / 100, authoritative: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load play credits.' },
      { status: 401 },
    );
  }
}

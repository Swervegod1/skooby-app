import { NextResponse } from 'next/server';
import { getValidatedProviderUrl, probeProvider, requirePrivySession, signHandoffState } from '@/lib/casino-security';

export async function POST(request: Request) {
  try {
    const session = await requirePrivySession(request);
    const providerUrl = getValidatedProviderUrl();
    if (!providerUrl) return NextResponse.json({ error: 'Provider URL is not approved.' }, { status: 503 });

    const health = await probeProvider();
    if (!health.healthy) return NextResponse.json({ error: 'Provider is temporarily unavailable.' }, { status: 503 });

    const state = await signHandoffState(session.userId, session.sessionId);
    const returnUrl = new URL('/api/casino/return', request.url);
    providerUrl.searchParams.set('state', state);
    providerUrl.searchParams.set('return_url', returnUrl.toString());

    const response = NextResponse.json({ redirectUrl: providerUrl.toString() });
    response.cookies.set('skooby-casino-state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/casino/return',
      maxAge: 5 * 60,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Secure handoff failed.' },
      { status: 401 },
    );
  }
}

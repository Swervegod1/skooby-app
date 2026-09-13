import { NextResponse } from 'next/server';
import { verifyPrivyToken } from '@/lib/auth-session';
import {
  createHandoffState,
  getValidatedProviderUrl,
  handoffCookieName,
  probeProvider,
} from '@/lib/provider-handoff';

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    await verifyPrivyToken(token);

    const providerUrl = getValidatedProviderUrl();
    if (!providerUrl) {
      return NextResponse.json(
        { error: 'Provider URL is not configured or approved.' },
        { status: 503 },
      );
    }

    const healthy = await probeProvider(providerUrl);
    if (!healthy) {
      return NextResponse.json(
        { error: 'Provider is temporarily unavailable.' },
        { status: 503 },
      );
    }

    const state = await createHandoffState();
    const returnUrl = new URL('/api/casino/return', request.url);

    providerUrl.searchParams.set('state', state);
    providerUrl.searchParams.set('return_url', returnUrl.toString());

    const response = NextResponse.json({ redirectUrl: providerUrl.toString() });
    response.cookies.set(handoffCookieName(), state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/casino/return',
      maxAge: 5 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Secure provider handoff failed.',
      },
      { status: 401 },
    );
  }
}

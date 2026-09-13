import { NextResponse } from 'next/server';
import { createAppSession, getServerSession, sessionCookieName, sessionTtlSeconds, verifyPrivyToken } from '@/lib/auth-session';

export async function GET() {
  const session = await getServerSession();
  return NextResponse.json({ authenticated: Boolean(session) });
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Missing Privy access token.' }, { status: 401 });

  try {
    const privy = await verifyPrivyToken(token);
    const sessionToken = await createAppSession(privy.userId, privy.sessionId);
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(sessionCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionTtlSeconds(),
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Session verification failed.' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(sessionCookieName(), '', { httpOnly: true, path: '/', maxAge: 0, sameSite: 'lax' });
  return response;
}

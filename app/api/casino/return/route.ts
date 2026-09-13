import { NextRequest, NextResponse } from 'next/server';
import { handoffCookieName, verifyHandoffState } from '@/lib/provider-handoff';

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get(handoffCookieName())?.value;

  if (!state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL('/casino?handoff=invalid', request.url));
  }

  try {
    await verifyHandoffState(state);
    const response = NextResponse.redirect(new URL('/casino?handoff=returned', request.url));
    response.cookies.set(handoffCookieName(), '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/casino/return',
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL('/casino?handoff=invalid', request.url));
  }
}

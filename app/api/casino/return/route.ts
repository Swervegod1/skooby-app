import { NextRequest, NextResponse } from 'next/server';
import { verifyHandoffState } from '@/lib/casino-security';

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get('skooby-casino-state')?.value;

  try {
    if (!state || !cookieState || state !== cookieState) throw new Error('Provider return state mismatch.');
    await verifyHandoffState(state);

    const destination = new URL('/casino', request.url);
    destination.searchParams.set('provider_return', 'verified');
    const response = NextResponse.redirect(destination);
    response.cookies.delete('skooby-casino-state');
    return response;
  } catch {
    const destination = new URL('/casino', request.url);
    destination.searchParams.set('provider_return', 'rejected');
    const response = NextResponse.redirect(destination);
    response.cookies.delete('skooby-casino-state');
    return response;
  }
}

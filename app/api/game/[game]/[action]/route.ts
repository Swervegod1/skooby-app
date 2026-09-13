import { NextResponse } from 'next/server';
import { dispatchCasinoRequest } from '@/lib/casino-server';
import { requirePrivySession } from '@/lib/casino-security';
import { applyPlayCreditDeltaCents, getPlayCreditBalanceCents } from '@/lib/play-credit-store';

type RouteContext = {
  params: Promise<{ game: string; action: string }>;
};

function extractBalanceDeltaCents(body: unknown) {
  if (!body || typeof body !== 'object') return 0;
  const delta = (body as Record<string, unknown>).balanceDelta;
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return 0;
  return Math.round(delta * 100);
}

async function handle(request: Request, context: RouteContext, method: 'GET' | 'POST') {
  const { game, action } = await context.params;
  let payload: Record<string, unknown> | undefined;
  let session: { userId: string; sessionId: string } | null = null;

  if (method === 'POST') {
    try {
      session = await requirePrivySession(request);
    } catch (error) {
      return NextResponse.json(
        { ok: false, game, action, data: { error: error instanceof Error ? error.message : 'Authentication required.' } },
        { status: 401 },
      );
    }

    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }

  const result = await dispatchCasinoRequest({
    game,
    action,
    method,
    payload,
    authorization: request.headers.get('authorization'),
  });

  let authoritativeCredits: number | null = null;
  if (session) {
    try {
      if (result.ok && result.mode === 'demo') {
        const deltaCents = extractBalanceDeltaCents(result.body);
        const balanceCents = deltaCents === 0
          ? await getPlayCreditBalanceCents(session.userId)
          : await applyPlayCreditDeltaCents(session.userId, deltaCents);
        authoritativeCredits = balanceCents / 100;
      } else {
        authoritativeCredits = (await getPlayCreditBalanceCents(session.userId)) / 100;
      }
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          mode: result.mode,
          game,
          action,
          data: { error: error instanceof Error ? error.message : 'Play-credit validation failed.' },
        },
        { status: 409 },
      );
    }
  }

  return NextResponse.json(
    {
      ok: result.ok,
      mode: result.mode,
      game,
      action,
      data: result.body,
      authoritativeCredits,
    },
    { status: result.status },
  );
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context, 'GET');
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context, 'POST');
}

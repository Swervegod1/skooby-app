import { NextResponse } from 'next/server';
import { dispatchCasinoRequest } from '@/lib/casino-server';

type RouteContext = {
  params: Promise<{ game: string; action: string }>;
};

async function handle(request: Request, context: RouteContext, method: 'GET' | 'POST') {
  const { game, action } = await context.params;
  let payload: Record<string, unknown> | undefined;

  if (method === 'POST') {
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

  return NextResponse.json(
    {
      ok: result.ok,
      mode: result.mode,
      game,
      action,
      data: result.body,
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

import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/casino-security';
import { applySignedProviderBalance } from '@/lib/play-credit-store';

type ProviderEvent = {
  eventId?: string;
  type?: string;
  userId?: string;
  playCreditBalanceCents?: number;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-skooby-signature');

  if (!(await verifyWebhookSignature(rawBody, signature))) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as ProviderEvent;
    if (event.type !== 'session.closed') {
      return NextResponse.json({ accepted: true, ignored: true });
    }
    if (!event.eventId || !event.userId || !Number.isSafeInteger(event.playCreditBalanceCents)) {
      return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
    }

    const result = await applySignedProviderBalance(event.userId, event.playCreditBalanceCents as number, event.eventId);
    return NextResponse.json({ accepted: true, duplicate: result === -1 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed.' },
      { status: 400 },
    );
  }
}

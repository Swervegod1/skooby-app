import { after } from 'next/server';
import { isGrowthEvent, recordEvent } from '@/lib/growth-events';
import { readJson, requireSameOrigin } from '@/lib/request-guards';
import { rateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
const clientEvents = new Set(['demo_opened', 'card_downloaded', 'share_opened', 'referral_started']);
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, 128);
    if (!body || typeof body !== 'object' || !('event' in body) || !isGrowthEvent(body.event) || !clientEvents.has(body.event)) return new Response(null, { status: 400 });
    await rateLimit(request, 'events', 90);
    const event = body.event;
    after(() => recordEvent(event));
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 400 }); }
}

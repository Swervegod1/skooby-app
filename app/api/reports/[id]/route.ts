import { after, NextResponse } from 'next/server';
import { revokeSharedReport } from '@/lib/share-store';
import { validShareId } from '@/lib/share-security';
import { privateHeaders, readJson, RequestError, requireSameOrigin } from '@/lib/request-guards';
import { rateLimit } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/growth-events';
export const runtime = 'nodejs';
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    if (!validShareId(id)) throw new RequestError('Report not found.', 404);
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || !('token' in body)) throw new RequestError('The removal key is missing.');
    await rateLimit(request, 'revoke-report', 20, 60, true);
    if (!await revokeSharedReport(id, body.token)) throw new RequestError('The link is unavailable or its removal key does not match.', 404);
    after(() => recordEvent('share_revoked'));
    return NextResponse.json({ revoked: true }, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'The link could not be removed.' }, { status: error instanceof RequestError ? error.status : 503, headers: privateHeaders });
  }
}

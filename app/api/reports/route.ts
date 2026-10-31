import { after, NextResponse } from 'next/server';
import { analyzeWallet } from '@/lib/wallet-provider';
import { parseWalletInput } from '@/lib/wallet-analysis';
import { createSharedReport } from '@/lib/share-store';
import { privateHeaders, readJson, RequestError, requireSameOrigin } from '@/lib/request-guards';
import { rateLimit } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/growth-events';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let input;
  try {
    requireSameOrigin(request);
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || !('consent' in body) || body.consent !== true) throw new RequestError('Confirm that you want to share this public-address snapshot.');
    input = parseWalletInput(body);
    await rateLimit(request, 'create-report', 6, 3600, true);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request.' }, { status: error instanceof RequestError ? error.status : 400, headers: privateHeaders });
  }
  try {
    // Re-read the provider on the server. Never publish client-supplied balances or claims.
    const analysis = await analyzeWallet(input);
    const report = await createSharedReport(analysis);
    after(() => recordEvent('share_created'));
    return NextResponse.json({ ...report, path: '/case/' + report.id }, { status: 201, headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'A verified share link could not be created. Your card is still available to download.' }, { status: 503, headers: privateHeaders });
  }
}

import { NextResponse, after } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { incrementApiUsage } from '@/lib/cloud-store';
import { analyzeWallet } from '@/lib/wallet-provider';
import { parseWalletInput } from '@/lib/wallet-analysis';
import { readJson, privateHeaders, RequestError } from '@/lib/request-guards';
import { rateLimit } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/growth-events';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let input;
  try {
    input = parseWalletInput(await readJson(request));
    await rateLimit(request, 'analysis', 30);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request.' }, { status: error instanceof RequestError ? error.status : 400, headers: privateHeaders });
  }
  try {
    const analysis = await analyzeWallet(input);
    const session = await getServerSession();
    after(async () => {
      await Promise.allSettled([recordEvent('analysis_completed'), ...(session ? [incrementApiUsage(session.userId, 'wallet_analysis')] : [])]);
    });
    return NextResponse.json(analysis, { headers: privateHeaders });
  } catch (error) {
    const message = error instanceof Error && !['AbortError', 'TimeoutError'].includes(error.name) ? error.message : 'The data provider timed out. Please try again.';
    return NextResponse.json({ error: message }, { status: 502, headers: privateHeaders });
  }
}


import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { oracleRequestBody } from '@/lib/oracle-types';
import { privateHeaders, readJson, RequestError, requireSameOrigin } from '@/lib/request-guards';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context) {
  try {
    const path = (await context.params).path.join('/');
    const allowed = request.method === 'GET' ? ['status', 'experiments', 'ledger'] : ['analyze', 'pause', 'paper/order', 'command'];
    if (!allowed.includes(path)) throw new RequestError('Unknown ORACLE endpoint.', 404);
    const session = await getServerSession();
    if (!session) throw new RequestError('Sign in to use your ORACLE research workspace.', 401);
    if (request.method === 'POST') requireSameOrigin(request);
    await rateLimit(request, 'oracle:' + session.userId, request.method === 'GET' ? 90 : 10);
    const base = process.env.ORACLE_API_URL;
    const token = process.env.ORACLE_API_TOKEN;
    if (!base || !token) throw new RequestError('ORACLE is not connected yet. Your account has not been changed.', 503);
    const url = new URL(base);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', 'oracle'].includes(url.hostname))) throw new RequestError('ORACLE service configuration is invalid.', 503);
    url.pathname = url.pathname.replace(/\/$/, '') + '/v1/' + path;
    url.search = '';
    let body: Record<string, unknown> | undefined;
    if (request.method === 'POST') {
      const raw = await readJson(request, 2048);
      try { body = oracleRequestBody(path, raw); }
      catch (error) { throw new RequestError(error instanceof Error ? error.message : 'Invalid request.'); }
    }
    const response = await fetch(url, {
      method: request.method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(50_000),
      headers: { Authorization: `Bearer ${token}`, 'X-Oracle-User': session.userId, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      // Do not forward upstream exceptions, configuration, credentials or provider payloads.
      const message = response.status === 409 ? 'The request was rejected by risk controls or was already processed. Refresh the workspace before retrying.' : response.status === 422 ? 'ORACLE could not validate this request.' : 'ORACLE is temporarily unavailable. No live order was placed.';
      return NextResponse.json({ error: message }, { status: [409, 422, 429].includes(response.status) ? response.status : 502, headers: privateHeaders });
    }
    return NextResponse.json(await response.json(), { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'ORACLE could not respond. Please try again.' }, { status: error instanceof RequestError ? error.status : 502, headers: privateHeaders });
  }
}
export const GET = proxy;
export const POST = proxy;

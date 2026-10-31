export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readJson(request: Request, maxBytes = 2048): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new RequestError('Send a JSON request.', 415);
  if (Number(request.headers.get('content-length')) > maxBytes) throw new RequestError('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('Request body is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) throw new RequestError('Request is too large.', 413);
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new RequestError('The request contains invalid JSON.'); }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') throw new RequestError('Use the Skooby app to perform this action.', 403);
  if (origin && origin !== new URL(request.url).origin) throw new RequestError('Use the Skooby app to perform this action.', 403);
}

export const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

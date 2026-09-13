const APPROVED_PROVIDER_HOSTS = new Set([
  'polycasino.io',
  'www.polycasino.io',
  'mock.polycasino.io',
]);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJsonPart<T>(value: string): T {
  return JSON.parse(decoder.decode(base64UrlDecode(value))) as T;
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export function getValidatedProviderUrl(raw = process.env.NEXT_PUBLIC_CASINO_PROVIDER_URL) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const isLocalDev = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
    const approvedHost = APPROVED_PROVIDER_HOSTS.has(url.hostname.toLowerCase());
    const approvedProtocol = url.protocol === 'https:' || (isLocalDev && url.protocol === 'http:');
    if (!approvedProtocol || (!approvedHost && !isLocalDev)) return null;
    url.username = '';
    url.password = '';
    return url;
  } catch {
    return null;
  }
}

function pemToBytes(pem: string) {
  const body = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

type PrivyJwtClaims = {
  sub?: string;
  sid?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
};

export async function verifyPrivyAccessToken(token: string) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const verificationKey = process.env.PRIVY_JWT_VERIFICATION_KEY;
  if (!appId || !verificationKey) throw new Error('Privy server verification is not configured.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid auth token.');
  const header = decodeJsonPart<{ alg?: string }>(parts[0]);
  if (header.alg !== 'ES256') throw new Error('Unexpected auth token algorithm.');

  const key = await crypto.subtle.importKey('spki', toArrayBuffer(pemToBytes(verificationKey)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const verified = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    toArrayBuffer(base64UrlDecode(parts[2])),
    toArrayBuffer(encoder.encode(`${parts[0]}.${parts[1]}`)),
  );
  if (!verified) throw new Error('Invalid auth token signature.');

  const claims = decodeJsonPart<PrivyJwtClaims>(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (claims.iss !== 'privy.io' || !audiences.includes(appId)) throw new Error('Invalid auth token issuer or audience.');
  if (!claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now + 30)) throw new Error('Auth token expired or not active.');
  if (!claims.sub || !claims.sid) throw new Error('Auth token missing session claims.');
  return { userId: claims.sub, sessionId: claims.sid };
}

export async function requirePrivySession(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error('Authentication required.');
  return verifyPrivyAccessToken(token);
}

type HandoffClaims = {
  iss: 'skooby.app';
  aud: 'casino-provider-handoff';
  sub: string;
  sid: string;
  nonce: string;
  iat: number;
  exp: number;
};

async function hmac(data: string) {
  const secret = process.env.CASINO_SESSION_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error('Casino session signing secret must be at least 32 characters.');
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(encoder.encode(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, toArrayBuffer(encoder.encode(data))));
}

export async function signHandoffState(userId: string, sessionId: string) {
  const now = Math.floor(Date.now() / 1000);
  const claims: HandoffClaims = {
    iss: 'skooby.app',
    aud: 'casino-provider-handoff',
    sub: userId,
    sid: sessionId,
    nonce: crypto.randomUUID(),
    iat: now,
    exp: now + 5 * 60,
  };
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const unsigned = `${header}.${payload}`;
  const signature = base64UrlEncode(await hmac(unsigned));
  return `${unsigned}.${signature}`;
}

export async function verifyHandoffState(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid handoff state.');
  const header = decodeJsonPart<{ alg?: string }>(parts[0]);
  if (header.alg !== 'HS256') throw new Error('Invalid handoff algorithm.');
  const expected = base64UrlEncode(await hmac(`${parts[0]}.${parts[1]}`));
  if (!constantTimeEqual(expected, parts[2])) throw new Error('Invalid handoff signature.');
  const claims = decodeJsonPart<HandoffClaims>(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== 'skooby.app' || claims.aud !== 'casino-provider-handoff' || claims.exp <= now || claims.iat > now + 30) throw new Error('Invalid or expired handoff state.');
  return claims;
}

export async function verifyWebhookSignature(body: string, signature: string | null) {
  const secret = process.env.CASINO_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(encoder.encode(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, toArrayBuffer(encoder.encode(body))));
  const expected = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(expected, signature.toLowerCase());
}

export async function probeProvider() {
  const url = getValidatedProviderUrl();
  if (!url) return { configured: false, healthy: false };
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(2500) });
    return { configured: true, healthy: response.status < 500 };
  } catch {
    return { configured: true, healthy: false };
  }
}

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
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(decoder.decode(base64UrlDecode(value))) as T;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function getValidatedProviderUrl() {
  const raw = process.env.CASINO_PROVIDER_URL || process.env.NEXT_PUBLIC_CASINO_PROVIDER_URL;
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const localDev = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(hostname);
    const approvedHost = APPROVED_PROVIDER_HOSTS.has(hostname);
    const approvedProtocol = url.protocol === 'https:' || (localDev && url.protocol === 'http:');

    if (!approvedProtocol || (!approvedHost && !localDev)) return null;

    url.username = '';
    url.password = '';
    return url;
  } catch {
    return null;
  }
}

async function hmac(input: string) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('APP_SESSION_SECRET must be at least 32 characters.');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  return new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      key,
      toArrayBuffer(encoder.encode(`provider-handoff:${input}`)),
    ),
  );
}

type HandoffClaims = {
  iss: 'skooby.app';
  aud: 'provider-handoff';
  nonce: string;
  iat: number;
  exp: number;
};

export async function createHandoffState() {
  const now = Math.floor(Date.now() / 1000);
  const claims: HandoffClaims = {
    iss: 'skooby.app',
    aud: 'provider-handoff',
    nonce: crypto.randomUUID(),
    iat: now,
    exp: now + 5 * 60,
  };

  const header = base64UrlEncode(
    encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  );
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const unsigned = `${header}.${payload}`;
  const signature = base64UrlEncode(await hmac(unsigned));
  return `${unsigned}.${signature}`;
}

export async function verifyHandoffState(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid handoff state.');

  const header = decodeJson<{ alg?: string }>(parts[0]);
  if (header.alg !== 'HS256') throw new Error('Invalid handoff algorithm.');

  const expected = base64UrlEncode(await hmac(`${parts[0]}.${parts[1]}`));
  if (!safeEqual(expected, parts[2])) throw new Error('Invalid handoff signature.');

  const claims = decodeJson<HandoffClaims>(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (
    claims.iss !== 'skooby.app' ||
    claims.aud !== 'provider-handoff' ||
    claims.exp <= now ||
    claims.iat > now + 30 ||
    !claims.nonce
  ) {
    throw new Error('Invalid or expired handoff state.');
  }

  return claims;
}

export async function probeProvider(url: URL) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

export function handoffCookieName() {
  return 'skooby_provider_state';
}

import { cookies } from 'next/headers';
import { PRIVY_APP_ID, PRIVY_DEFAULT_JWKS_URL } from '@/lib/privy-config';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_COOKIE = 'skooby_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function b64urlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(decoder.decode(b64urlDecode(value))) as T;
}

function pemToBytes(pem: string) {
  const body = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type PrivyHeader = { alg?: string; kid?: string; typ?: string };
type PrivyClaims = {
  sub?: string;
  sid?: string;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
  nbf?: number;
};
type PrivyJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type JwksResponse = { keys?: PrivyJwk[] };

async function fetchPrivyJwks(url: string, bypassCache = false) {
  const response = await fetch(
    url,
    bypassCache
      ? { cache: 'no-store', headers: { Accept: 'application/json' } }
      : { next: { revalidate: 300 }, headers: { Accept: 'application/json' } },
  );
  if (!response.ok) throw new Error(`Privy JWKS request failed (${response.status}).`);
  const payload = (await response.json()) as JwksResponse;
  return payload.keys ?? [];
}

function selectPrivyJwk(keys: PrivyJwk[], header: PrivyHeader) {
  const eligible = keys.filter(
    (key) =>
      key.kty === 'EC' &&
      key.crv === 'P-256' &&
      (!key.alg || key.alg === 'ES256') &&
      (!key.use || key.use === 'sig'),
  );

  if (header.kid) return eligible.find((key) => key.kid === header.kid) ?? null;
  return eligible.length === 1 ? eligible[0] : null;
}

async function importPrivyVerificationKey(header: PrivyHeader) {
  const jwksUrl = process.env.PRIVY_JWKS_URL || PRIVY_DEFAULT_JWKS_URL;

  try {
    let keys = await fetchPrivyJwks(jwksUrl);
    let jwk = selectPrivyJwk(keys, header);

    if (!jwk) {
      keys = await fetchPrivyJwks(jwksUrl, true);
      jwk = selectPrivyJwk(keys, header);
    }

    if (jwk) {
      return crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
    }
  } catch {
    // Fall through to the optional static verification-key fallback below.
  }

  const verificationKey = process.env.PRIVY_JWT_VERIFICATION_KEY;
  if (!verificationKey) {
    throw new Error('Privy token verification is unavailable: JWKS could not be resolved.');
  }

  return crypto.subtle.importKey(
    'spki',
    toArrayBuffer(pemToBytes(verificationKey)),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
}

export async function verifyPrivyToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid Privy access token.');

  const header = decodeJson<PrivyHeader>(parts[0]);
  if (header.alg !== 'ES256') throw new Error('Unexpected Privy token algorithm.');

  const key = await importPrivyVerificationKey(header);
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    toArrayBuffer(b64urlDecode(parts[2])),
    toArrayBuffer(encoder.encode(`${parts[0]}.${parts[1]}`)),
  );
  if (!valid) throw new Error('Invalid Privy token signature.');

  const claims = decodeJson<PrivyClaims>(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];

  if (claims.iss !== 'privy.io' || !audiences.includes(PRIVY_APP_ID)) {
    throw new Error('Invalid Privy token issuer or audience.');
  }
  if (!claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now + 30)) {
    throw new Error('Expired or not-yet-valid Privy token.');
  }
  if (claims.iat && claims.iat > now + 60) throw new Error('Invalid Privy token issue time.');
  if (!claims.sub || !claims.sid) throw new Error('Privy session claims are incomplete.');

  return { userId: claims.sub, sessionId: claims.sid };
}

type AppSession = { sub: string; sid: string; iat: number; exp: number };

async function sign(input: string) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('APP_SESSION_SECRET must be at least 32 characters.');
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return b64urlEncode(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, toArrayBuffer(encoder.encode(input)))),
  );
}

export async function createAppSession(userId: string, sessionId: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AppSession = { sub: userId, sid: sessionId, iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await sign(body)}`;
}

export async function verifyAppSession(token: string | undefined | null) {
  if (!token) return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra) return null;
  const expected = await sign(body);
  if (!safeEqual(expected, signature)) return null;
  const session = decodeJson<AppSession>(body);
  if (!session.sub || !session.sid || session.exp <= Math.floor(Date.now() / 1000)) return null;
  return { userId: session.sub, sessionId: session.sid };
}

export async function getServerSession() {
  try {
    const store = await cookies();
    return verifyAppSession(store.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function sessionTtlSeconds() {
  return SESSION_TTL_SECONDS;
}

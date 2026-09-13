import { cookies } from 'next/headers';

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
  const body = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type PrivyClaims = { sub?: string; sid?: string; iss?: string; aud?: string | string[]; exp?: number; nbf?: number };

export async function verifyPrivyToken(token: string) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const verificationKey = process.env.PRIVY_JWT_VERIFICATION_KEY;
  if (!appId || !verificationKey) throw new Error('Privy server verification is not configured.');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid Privy access token.');
  const header = decodeJson<{ alg?: string }>(parts[0]);
  if (header.alg !== 'ES256') throw new Error('Unexpected Privy token algorithm.');

  const key = await crypto.subtle.importKey('spki', toArrayBuffer(pemToBytes(verificationKey)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
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
  if (claims.iss !== 'privy.io' || !audiences.includes(appId)) throw new Error('Invalid Privy token issuer or audience.');
  if (!claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now + 30)) throw new Error('Expired Privy token.');
  if (!claims.sub || !claims.sid) throw new Error('Privy session claims are incomplete.');
  return { userId: claims.sub, sessionId: claims.sid };
}

type AppSession = { sub: string; sid: string; iat: number; exp: number };

async function sign(input: string) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('APP_SESSION_SECRET must be at least 32 characters.');
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(encoder.encode(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64urlEncode(new Uint8Array(await crypto.subtle.sign('HMAC', key, toArrayBuffer(encoder.encode(input)))));
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

import { createHash, timingSafeEqual } from 'node:crypto';
export const SHARE_TTL_SECONDS = 7 * 24 * 60 * 60;
export function validShareId(value: string) { return /^[a-f0-9]{32}$/.test(value); }
export function hashRevocationToken(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function canRevoke(token: unknown, expectedHash: string) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  return timingSafeEqual(Buffer.from(hashRevocationToken(token), 'hex'), Buffer.from(expectedHash, 'hex'));
}

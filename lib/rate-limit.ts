import { createHash } from 'node:crypto';
import { cloudConfigured, redis } from './cloud-store';
import { RequestError } from './request-guards';
const buckets = new Map<string, { count: number; expires: number }>();
export async function rateLimit(request: Request, category: string, limit: number, seconds = 60, requireDurable = false) {
  const now = Date.now();
  // Enable only behind an ingress that overwrites forwarded headers.
  const address = process.env.TRUST_PROXY_HEADERS === 'true'
    ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 80) || 'shared'
    : 'shared';
  const window = Math.floor(now / (seconds * 1000));
  const hash = createHash('sha256').update((process.env.APP_SESSION_SECRET || 'local') + ':' + window + ':' + address).digest('hex').slice(0, 32);
  const key = 'skooby:rate:v1:' + category + ':' + window + ':' + hash;
  let used: number;
  if (cloudConfigured()) {
    try {
      used = await redis<number>(['EVAL', "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n", 1, key, seconds + 5]);
    } catch { throw new RequestError('The service is temporarily busy. Please try again shortly.', 503); }
  } else {
    if (requireDurable) throw new RequestError('Share links are unavailable right now. You can still download your case card.', 503);
    for (const [id, bucket] of buckets) if (bucket.expires < now) buckets.delete(id);
    if (buckets.size >= 5000 && !buckets.has(key)) throw new RequestError('The service is busy. Please try again shortly.', 429);
    const bucket = buckets.get(key) ?? { count: 0, expires: now + seconds * 1000 };
    used = ++bucket.count;
    buckets.set(key, bucket);
  }
  if (used > limit) throw new RequestError('Too many requests. Please try again in a moment.', 429);
}

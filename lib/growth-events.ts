import { cloudConfigured, redis } from './cloud-store';
export const growthEvents = ['demo_opened', 'analysis_completed', 'share_created', 'share_revoked', 'card_downloaded', 'share_opened', 'referral_started'] as const;
export type GrowthEvent = typeof growthEvents[number];
export function isGrowthEvent(event: unknown): event is GrowthEvent {
  return typeof event === 'string' && growthEvents.includes(event as GrowthEvent);
}
// Daily counters only: no addresses, report IDs, IPs or user identifiers in analytics.
export async function recordEvent(event: GrowthEvent) {
  if (!cloudConfigured()) return;
  const key = 'skooby:growth:v1:' + new Date().toISOString().slice(0, 10);
  await redis(['EVAL', "local n=redis.call('HINCRBY',KEYS[1],ARGV[1],1); redis.call('EXPIRE',KEYS[1],7776000); return n", 1, key, event]).catch(() => undefined);
}

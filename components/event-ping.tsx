'use client';
import { useEffect, useRef } from 'react';
import type { GrowthEvent } from '@/lib/growth-events';

export function trackEvent(event: GrowthEvent) {
  if (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  void fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }), keepalive: true }).catch(() => undefined);
}
export function EventPing({ event }: { event: GrowthEvent }) {
  const sent = useRef(false);
  useEffect(() => { if (!sent.current) { sent.current = true; trackEvent(event); } }, [event]);
  return null;
}

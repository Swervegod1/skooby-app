'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Health = { configured?: boolean; healthy?: boolean };

export function ProviderLaunchButton() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch('/api/casino/provider-health', { cache: 'no-store' });
        const data = (await response.json()) as Health;
        if (active) setHealth(data);
      } catch {
        if (active) setHealth({ configured: true, healthy: false });
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!health) {
    return <button disabled className="rounded-full border border-white/10 px-6 py-3 text-sm font-black text-white/40">Checking provider…</button>;
  }

  if (!health.configured || !health.healthy) {
    return <button disabled className="rounded-full border border-amber-200/15 bg-amber-200/[0.05] px-6 py-3 text-sm font-black text-amber-100/60">Provider maintenance</button>;
  }

  return <Link href="/casino/provider" className="inline-flex items-center justify-center rounded-full bg-lime-300 px-6 py-3 text-sm font-black text-black transition hover:bg-lime-200">Open secure provider</Link>;
}

'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export function SessionSync() {
  const { ready, authenticated, getAccessToken } = usePrivy();

  useEffect(() => {
    if (!ready) return;
    let active = true;

    const sync = async () => {
      if (authenticated) {
        const token = await getAccessToken();
        if (!token || !active) return;
        await fetch('/api/session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'same-origin',
        }).catch(() => undefined);
        return;
      }

      await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
    };

    void sync();
    return () => { active = false; };
  }, [ready, authenticated, getAccessToken]);

  return null;
}

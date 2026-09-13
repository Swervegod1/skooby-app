import { createHash } from 'node:crypto';

export type GiveawayEntry = {
  id: string;
  name: string;
  email: string;
  reason: string;
  createdAt: string;
};

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Giveaway storage is not configured.');
  return { url, token };
}

async function redis<T>(command: Array<string | number>) {
  const { url, token } = config();
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Giveaway store request failed (${response.status}).`);
  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result as T;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function emailKey(email: string) {
  const hash = createHash('sha256').update(normalizeEmail(email)).digest('hex');
  return `skooby:giveaway:rtx5090:v1:email:${hash}`;
}

const ENTRY_LIST_KEY = 'skooby:giveaway:rtx5090:v1:entries';

export async function saveGiveawayEntry(input: Omit<GiveawayEntry, 'id' | 'createdAt'>) {
  const email = normalizeEmail(input.email);
  const duplicateKey = emailKey(email);
  const id = crypto.randomUUID();
  const claim = await redis<string | null>(['SET', duplicateKey, id, 'NX']);

  if (claim !== 'OK') {
    return { duplicate: true as const, entry: null };
  }

  const entry: GiveawayEntry = {
    id,
    name: input.name.trim(),
    email,
    reason: input.reason.trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    await redis(['LPUSH', ENTRY_LIST_KEY, JSON.stringify(entry)]);
    return { duplicate: false as const, entry };
  } catch (error) {
    await redis(['DEL', duplicateKey]).catch(() => undefined);
    throw error;
  }
}

const INITIAL_CREDITS_CENTS = 100_000;
const MAX_CREDITS_CENTS = 100_000_000;
const LEADERBOARD_KEY = 'skooby:casino:leaderboard:v1';

function requireRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Authoritative play-credit storage is not configured.');
  return { url: url.replace(/\/$/, ''), token };
}

async function redisCommand<T = unknown>(command: Array<string | number>) {
  const { url, token } = requireRedisConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Play-credit database request failed (${response.status}).`);
  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result as T;
}

function balanceKey(userId: string) {
  return `skooby:casino:credits:v1:${userId}`;
}

export async function getPlayCreditBalanceCents(userId: string) {
  const key = balanceKey(userId);
  let value = await redisCommand<string | null>(['GET', key]);
  if (value === null) {
    await redisCommand(['SET', key, INITIAL_CREDITS_CENTS, 'NX']);
    value = await redisCommand<string | null>(['GET', key]);
  }
  const parsed = Number(value ?? INITIAL_CREDITS_CENTS);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_CREDITS_CENTS) throw new Error('Stored play-credit balance is invalid.');
  await redisCommand(['ZADD', LEADERBOARD_KEY, parsed, userId]);
  return parsed;
}

export async function applyPlayCreditDeltaCents(userId: string, deltaCents: number) {
  if (!Number.isSafeInteger(deltaCents) || Math.abs(deltaCents) > MAX_CREDITS_CENTS) throw new Error('Invalid play-credit adjustment.');

  const script = `
local current = tonumber(redis.call('GET', KEYS[1]) or ARGV[1])
local nextValue = current + tonumber(ARGV[2])
local maximum = tonumber(ARGV[4])
if nextValue < 0 then return -1 end
if nextValue > maximum then return -2 end
redis.call('SET', KEYS[1], nextValue)
redis.call('ZADD', KEYS[2], nextValue, ARGV[3])
return nextValue
`;

  const result = await redisCommand<number>([
    'EVAL', script, 2, balanceKey(userId), LEADERBOARD_KEY,
    INITIAL_CREDITS_CENTS, deltaCents, userId, MAX_CREDITS_CENTS,
  ]);
  if (result === -1) throw new Error('Insufficient play credits.');
  if (result === -2) throw new Error('Play-credit balance limit exceeded.');
  return result;
}

export async function applySignedProviderBalance(userId: string, balanceCents: number, eventId: string) {
  if (!eventId || !Number.isSafeInteger(balanceCents) || balanceCents < 0 || balanceCents > MAX_CREDITS_CENTS) {
    throw new Error('Invalid provider play-credit update.');
  }

  const eventKey = `skooby:casino:webhook:v1:${eventId}`;
  const script = `
if redis.call('EXISTS', KEYS[3]) == 1 then return -1 end
redis.call('SET', KEYS[3], '1', 'EX', 604800)
redis.call('SET', KEYS[1], ARGV[1])
redis.call('ZADD', KEYS[2], ARGV[1], ARGV[2])
return tonumber(ARGV[1])
`;
  return redisCommand<number>([
    'EVAL', script, 3, balanceKey(userId), LEADERBOARD_KEY, eventKey,
    balanceCents, userId,
  ]);
}

async function publicLabel(userId: string) {
  const bytes = new TextEncoder().encode(userId);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer));
  const tag = Array.from(digest.slice(0, 4), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `Player ${tag}`;
}

export async function getPlayCreditLeaderboard(limit = 20) {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const values = await redisCommand<string[]>(['ZREVRANGE', LEADERBOARD_KEY, 0, safeLimit - 1, 'WITHSCORES']);
  const rows: Array<{ rank: number; player: string; credits: number }> = [];
  for (let index = 0; index < values.length; index += 2) {
    rows.push({
      rank: rows.length + 1,
      player: await publicLabel(values[index]),
      credits: Number(values[index + 1]) / 100,
    });
  }
  return rows;
}

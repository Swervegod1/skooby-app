export type CasebookEntry = {
  id: string;
  chain: 'bitcoin' | 'ethereum';
  address: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletAlert = {
  id: string;
  address: string;
  chain: 'bitcoin' | 'ethereum';
  type: 'activity';
  enabled: boolean;
  createdAt: string;
};

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Cloud sync is not configured.');
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
  if (!response.ok) throw new Error(`Cloud store request failed (${response.status}).`);
  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result as T;
}

function casebookKey(userId: string) { return `skooby:casebook:v1:${userId}`; }
function alertsKey(userId: string) { return `skooby:alerts:v1:${userId}`; }
function usageKey(userId: string) { return `skooby:usage:v1:${userId}:${new Date().toISOString().slice(0, 7)}`; }

export async function listCasebook(userId: string): Promise<CasebookEntry[]> {
  const rows = await redis<string[]>(['LRANGE', casebookKey(userId), 0, 49]);
  return (rows ?? []).map((row) => JSON.parse(row) as CasebookEntry);
}

export async function saveCasebookEntry(userId: string, input: Omit<CasebookEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const entry: CasebookEntry = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await redis(['LPUSH', casebookKey(userId), JSON.stringify(entry)]);
  await redis(['LTRIM', casebookKey(userId), 0, 49]);
  return entry;
}

export async function deleteCasebookEntry(userId: string, id: string) {
  const entries = await listCasebook(userId);
  const match = entries.find((entry) => entry.id === id);
  if (!match) return false;
  await redis(['LREM', casebookKey(userId), 0, JSON.stringify(match)]);
  return true;
}

export async function listAlerts(userId: string): Promise<WalletAlert[]> {
  const rows = await redis<string[]>(['LRANGE', alertsKey(userId), 0, 49]);
  return (rows ?? []).map((row) => JSON.parse(row) as WalletAlert);
}

export async function saveAlert(userId: string, address: string, chain: 'bitcoin' | 'ethereum') {
  const alert: WalletAlert = { id: crypto.randomUUID(), address, chain, type: 'activity', enabled: true, createdAt: new Date().toISOString() };
  await redis(['LPUSH', alertsKey(userId), JSON.stringify(alert)]);
  await redis(['LTRIM', alertsKey(userId), 0, 49]);
  return alert;
}

export async function incrementApiUsage(userId: string, bucket: string) {
  const key = usageKey(userId);
  await redis(['HINCRBY', key, bucket, 1]);
  await redis(['EXPIRE', key, 60 * 60 * 24 * 62]);
}

export async function getApiUsage(userId: string) {
  const values = await redis<string[]>(['HGETALL', usageKey(userId)]);
  const result: Record<string, number> = {};
  for (let index = 0; index < (values ?? []).length; index += 2) result[values[index]] = Number(values[index + 1]);
  return result;
}

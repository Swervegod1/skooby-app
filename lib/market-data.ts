export type MarketEntry = {
  usd?: number;
  usd_24h_change?: number;
  usd_market_cap?: number;
  last_updated_at?: number;
};

export type MarketSnapshot = {
  provider: 'CoinGecko';
  fetchedAt: string;
  stale: boolean;
  data: Record<string, MarketEntry>;
};

const IDS = ['bitcoin', 'ethereum', 'solana', 'usd-coin', 'chainlink'];
const CACHE_KEY = 'skooby:market:snapshot:v2';
const FRESH_MS = 60_000;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis<T>(command: Array<string | number>): Promise<T | null> {
  const config = redisConfig();
  if (!config) return null;
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { result?: T };
    return body.result ?? null;
  } catch {
    return null;
  }
}

async function getRedisSnapshot() {
  const raw = await redis<string>(['GET', CACHE_KEY]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MarketSnapshot;
  } catch {
    return null;
  }
}

async function saveRedisSnapshot(snapshot: MarketSnapshot) {
  await redis(['SET', CACHE_KEY, JSON.stringify(snapshot), 'EX', 1800]);
}

async function fetchCoinGecko(): Promise<MarketSnapshot> {
  const params = new URLSearchParams({
    ids: IDS.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
    include_market_cap: 'true',
    include_last_updated_at: 'true',
  });

  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 },
  });
  if (!response.ok) throw new Error(`CoinGecko returned ${response.status}.`);

  return {
    provider: 'CoinGecko',
    fetchedAt: new Date().toISOString(),
    stale: false,
    data: (await response.json()) as Record<string, MarketEntry>,
  };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const cached = await getRedisSnapshot();
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) return { ...cached, stale: false };

  try {
    const fresh = await fetchCoinGecko();
    void saveRedisSnapshot(fresh);
    return fresh;
  } catch (error) {
    if (cached) return { ...cached, stale: true };
    throw error;
  }
}

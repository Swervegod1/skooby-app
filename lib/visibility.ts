const SITE_HOSTS = new Set(['skooby.app', 'www.skooby.app']);

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function verifyVisibilitySecret(value: string | null) {
  const secret = process.env.VISIBILITY_WEBHOOK_SECRET;
  if (!secret || secret.length < 32 || !value) return false;
  const token = value.replace(/^Bearer\s+/i, '');
  return safeEqual(token, secret);
}

export function normalizeSkoobyUrls(input: unknown) {
  if (!Array.isArray(input)) return [] as string[];
  const unique = new Set<string>();

  for (const item of input.slice(0, 100)) {
    if (typeof item !== 'string') continue;
    try {
      const url = new URL(item, 'https://skooby.app');
      if (url.protocol !== 'https:' || !SITE_HOSTS.has(url.hostname.toLowerCase())) continue;
      url.hostname = 'skooby.app';
      url.hash = '';
      unique.add(url.toString());
    } catch {
      // Ignore malformed URLs.
    }
  }

  return [...unique];
}

export async function submitIndexNow(urls: string[]) {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || !urls.length) return { provider: 'indexnow', status: 'skipped' as const };

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      host: 'skooby.app',
      key,
      keyLocation: 'https://skooby.app/indexnow-key.txt',
      urlList: urls,
    }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`IndexNow returned ${response.status}.`);
  return { provider: 'indexnow', status: 'sent' as const };
}

function isAllowedWebhook(raw: string, provider: 'discord' | 'slack') {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (provider === 'discord') {
      if (!['discord.com', 'discordapp.com'].includes(url.hostname)) return null;
      if (!url.pathname.startsWith('/api/webhooks/')) return null;
    } else {
      if (url.hostname !== 'hooks.slack.com' || !url.pathname.startsWith('/services/')) return null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function sendVisibilityAnnouncements(input: {
  title: string;
  message: string;
  urls: string[];
}) {
  const results: Array<{ provider: string; status: 'sent' | 'skipped' }> = [];
  const text = [input.title, input.message, ...input.urls.slice(0, 8)].filter(Boolean).join('\n').slice(0, 1800);

  const discordRaw = process.env.DISCORD_ANNOUNCEMENT_WEBHOOK_URL?.trim();
  const discord = discordRaw ? isAllowedWebhook(discordRaw, 'discord') : null;
  if (discord) {
    const response = await fetch(discord, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: text }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Discord webhook returned ${response.status}.`);
    results.push({ provider: 'discord', status: 'sent' });
  } else {
    results.push({ provider: 'discord', status: 'skipped' });
  }

  const slackRaw = process.env.SLACK_ANNOUNCEMENT_WEBHOOK_URL?.trim();
  const slack = slackRaw ? isAllowedWebhook(slackRaw, 'slack') : null;
  if (slack) {
    const response = await fetch(slack, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Slack webhook returned ${response.status}.`);
    results.push({ provider: 'slack', status: 'sent' });
  } else {
    results.push({ provider: 'slack', status: 'skipped' });
  }

  return results;
}

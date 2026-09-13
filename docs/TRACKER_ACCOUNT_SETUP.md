# Tracker + Account deployment settings

The Learn, Tracker, and Account modules fail closed when required infrastructure is missing.

## Required for account sessions

- `NEXT_PUBLIC_PRIVY_APP_ID` — the public Privy application ID already used by the client.
- `PRIVY_JWT_VERIFICATION_KEY` — Privy's ES256 public verification key. Keep this server-side.
- `APP_SESSION_SECRET` — a random secret of at least 32 characters used to sign Skooby's HttpOnly session cookie.

The browser never creates an authoritative Skooby account session itself. `/api/session` validates the Privy access token first and then issues the signed cookie.

## Required for cloud sync and durable market caching

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Redis stores synced casebooks, wallet activity alerts, monthly usage counters, and the most recent successful CoinGecko market snapshot. If Redis is unavailable, the account page renders a clear cloud-sync warning instead of hanging.

## Optional Ethereum provider quota

- `BLOCKCYPHER_API_TOKEN`

The public Ethereum address endpoint can operate without a token, but a provider token gives the deployment its own API quota. Never expose the token through a `NEXT_PUBLIC_` variable.

## Data flow

1. `/tracker` requests market data on the server.
2. The server reuses a fresh Redis snapshot before contacting CoinGecko again.
3. Address analysis is performed through Skooby server routes, not directly from every browser.
4. Signed-in users can save an investigation or activity alert to Redis.
5. `/account` reads the Skooby session cookie during server rendering and immediately renders either the login UI or the personalized command center.

## Production checklist

- Use HTTPS.
- Rotate `APP_SESSION_SECRET` through the hosting platform's secret manager rather than source control.
- Keep Privy verification material and Redis/API credentials server-only.
- Set provider quotas and alerts before increasing public traffic.
- Review privacy and retention policy before storing additional user-derived research metadata.

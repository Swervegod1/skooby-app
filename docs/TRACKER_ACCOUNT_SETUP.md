# Tracker + Account deployment settings

The Learn, Tracker, and Account modules fail closed when required server infrastructure is missing.

## Privy authentication

Skooby ships with the public Privy app ID `cmtz0m84b01jy0bl5127de4iv` as its default client identifier. `NEXT_PUBLIC_PRIVY_APP_ID` can still override that value for another deployment.

Server-side access-token verification is JWKS-first. By default Skooby reads signing keys from:

`https://auth.privy.io/api/v1/apps/cmtz0m84b01jy0bl5127de4iv/jwks.json`

The verifier requires ES256, validates the JWT signature, checks `iss = privy.io`, requires the configured app ID in `aud`, checks token timing, and requires both the Privy user DID (`sub`) and session ID (`sid`). When the JWT contains a `kid`, Skooby selects the matching P-256 signing key. If that key is not present in the cached JWKS response, Skooby performs an uncached refresh to handle signing-key rotation.

Optional overrides:

- `NEXT_PUBLIC_PRIVY_APP_ID` — override the built-in public app ID.
- `PRIVY_JWKS_URL` — override the default app-specific JWKS endpoint.
- `PRIVY_JWT_VERIFICATION_KEY` — optional static PEM fallback if JWKS resolution is unavailable.

Required server secret:

- `APP_SESSION_SECRET` — a random secret of at least 32 characters used to sign Skooby's HttpOnly session cookie. Generate and store this in the hosting platform's secret manager; never commit it to GitHub or expose it through a `NEXT_PUBLIC_` variable.

The browser never creates an authoritative Skooby account session itself. `/api/session` validates the Privy access token first and only then issues the signed HttpOnly cookie.

## Required for cloud sync and durable market caching

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Redis stores synced casebooks, wallet activity alerts, monthly usage counters, and the most recent successful CoinGecko market snapshot. If Redis is unavailable, the account page renders a clear cloud-sync warning instead of hanging.

## Optional Ethereum provider quota

- `BLOCKCYPHER_API_TOKEN`

The public Ethereum address endpoint can operate without a token, but a provider token gives the deployment its own API quota. Never expose the token through a `NEXT_PUBLIC_` variable.

## Data flow

1. Privy authenticates the user in the browser and issues an ES256 access token.
2. `/api/session` verifies that token against the app-specific JWKS and validates issuer, audience, expiration, DID, and session ID.
3. Skooby issues its own signed HttpOnly session cookie.
4. `/tracker` requests market and public-chain data through Skooby server routes.
5. Signed-in users can save investigations and activity alerts to Redis.
6. `/account` reads the Skooby session cookie during server rendering and immediately renders either login or the personalized command center.

## Production checklist

- Use HTTPS.
- Generate `APP_SESSION_SECRET` directly in the hosting platform's secret manager.
- Keep Redis/API credentials and any static fallback verification key server-only.
- Prefer the JWKS endpoint over pinning a single verification key so Privy key rotation can be handled automatically.
- Set provider quotas and alerts before increasing public traffic.
- Review privacy and retention policy before storing additional user-derived research metadata.

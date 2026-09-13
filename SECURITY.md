# Security Policy

Skooby.app includes wallet and Web3 integrations. Treat authentication, signing, provider redirects, webhook processing, and balance state as security-sensitive.

## Never commit

- Private keys or seed phrases
- Privy app secrets
- Privy JWT verification private material
- Redis credentials
- Provider bearer tokens
- Provider webhook secrets
- Session signing keys
- Production `.env` files

Public browser identifiers such as `NEXT_PUBLIC_PRIVY_APP_ID` may be exposed to the client by design, but server-side secrets must never use a `NEXT_PUBLIC_` prefix.

## Play-credit integrity

- The React credit value is display-only and is never accepted as authoritative input.
- Authoritative balances are stored in Redis and mutated atomically by server code.
- Client game requests require a verified Privy ES256 access token.
- External provider API responses do not directly mutate Skooby credits.
- Provider credit updates require an HMAC-signed webhook and an idempotent event ID.
- Credits have no cash value and are not a wallet balance.

## Session and redirect integrity

- Provider URLs are parsed and validated against the hardcoded hostname allowlist in `lib/casino-security.ts`.
- Production handoffs require HTTPS.
- The handoff API verifies Privy JWT signature, issuer (`privy.io`), audience, expiration, user ID, and session ID.
- Each handoff receives a five-minute HS256 state token stored in an HttpOnly, SameSite=Lax cookie.
- Provider returns are accepted only when the returned state exactly matches the originating cookie and the JWT validates.
- Provider health is checked before launch; unavailable providers are disabled in the UI.

## Wallet safety

- Never request or store a user's seed phrase.
- Do not sign transactions as part of a game or provider handoff.
- Treat connected wallet addresses as identity/display context only in this integration.
- Treat third-party contract integrations as untrusted until reviewed.
- Use testnets or low-value test wallets during development.

## Provider webhooks

`POST /api/casino/webhooks/provider` expects a raw-body HMAC-SHA256 digest in `x-skooby-signature`. The endpoint accepts only the documented play-credit session event, rejects invalid signatures, caps balances, and de-duplicates event IDs for seven days.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, private keys, or user data. Contact the repository owner privately with a concise reproduction and impact description.
